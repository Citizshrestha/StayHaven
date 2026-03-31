/**
 * WebRTC Voice Call Manager
 * 
 * Handles peer-to-peer audio connections using WebRTC.
 * Uses Socket.io for signaling (ICE candidates + SDP offer/answer).
 * 
 * Flow:
 * 1. Caller creates RTCPeerConnection, gets local stream, creates offer
 * 2. Offer sent via socket → server relays to callee
 * 3. Callee creates RTCPeerConnection, gets local stream, sets remote offer, creates answer
 * 4. Answer sent via socket → server relays to caller
 * 5. ICE candidates exchanged via socket in both directions
 * 6. Audio streams connected — both parties hear each other
 */

/**
 * ICE Servers for NAT traversal
 * STUN: Discovers public IP address
 * TURN: Relays traffic when direct connection fails (not included in free tier)
 */
const ICE_SERVERS = [
    // Google STUN servers (free, reliable)
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    // Additional STUN servers for redundancy
    { urls: 'stun:stun.services.mozilla.com' },
    { urls: 'stun:stun.stunprotocol.org:3478' },
];

/**
 * Inject bandwidth and codec preferences into SDP for optimal voice quality.
 * - Sets audio bitrate to 128 kbps (high quality Opus)
 * - Prioritizes Opus codec with optimal settings
 */
function setAudioBitrate(sdp, bitrateKbps = 128) {
    // Insert b=AS line after every "m=audio ..." section's c= line
    let modifiedSdp = sdp.replace(
        /(m=audio[^\r\n]*\r\n(?:.*\r\n)*?)(c=IN [^\r\n]*\r\n)/g,
        `$1$2b=AS:${bitrateKbps}\r\n`
    );

    // Prioritize Opus codec and set optimal parameters
    // maxaveragebitrate=128000 (128 kbps)
    // stereo=0 (mono for voice)
    // useinbandfec=1 (forward error correction)
    // usedtx=0 (disable discontinuous transmission for consistent quality)
    modifiedSdp = modifiedSdp.replace(
        /(a=rtpmap:(\d+) opus\/48000\/2\r\n)/g,
        '$1a=fmtp:$2 maxaveragebitrate=128000;stereo=0;useinbandfec=1;usedtx=0\r\n'
    );

    return modifiedSdp;
}

class WebRTCCallManager {
    constructor() {
        this.peerConnection = null;
        this.localStream = null;
        this.remoteStream = null;
        this.remoteAudio = null;
        this._audioCtx = null;
        this._remoteSource = null;
        this._remoteGain = null;
        this.emit = null;
        this.hotelId = null;
        this.callId = null;
        this.userId = null;
        this.peerId = null;
        this.isMuted = false;
        this._pendingCandidates = [];
        this._onRemoteStream = null;
    }

    /**
     * Initialize with socket emit function and user context
     */
    init({ emit, hotelId, userId }) {
        this.emit = emit;
        this.hotelId = hotelId;
        this.userId = userId;
    }

    /**
     * Get user's microphone stream with professional-grade audio settings
     */
    async getLocalStream() {
        if (this.localStream) return this.localStream;
        try {
            this.localStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    // Echo cancellation - CRITICAL for preventing feedback
                    echoCancellation: { ideal: true },
                    // Noise suppression - removes background noise
                    noiseSuppression: { ideal: true },
                    // Auto gain control - normalizes volume levels
                    autoGainControl: { ideal: true },
                    // High sample rate for crystal clear audio
                    sampleRate: { ideal: 48000 },
                    // 16-bit audio depth
                    sampleSize: { ideal: 16 },
                    // Mono audio (reduces bandwidth, improves quality)
                    channelCount: { ideal: 1 },
                    // Latency - lower is better for real-time
                    latency: { ideal: 0.01 },
                    // Voice-optimized processing
                    googEchoCancellation: { ideal: true },
                    googAutoGainControl: { ideal: true },
                    googNoiseSuppression: { ideal: true },
                    googHighpassFilter: { ideal: true },
                    googTypingNoiseDetection: { ideal: true },
                    googAudioMirroring: { ideal: false },
                },
                video: false,
            });
            console.log('🎤 Mic stream acquired with professional audio settings');
            console.log('🎤 Track settings:', this.localStream.getAudioTracks()[0]?.getSettings());
            return this.localStream;
        } catch (err) {
            console.error('Failed to get microphone access:', err);
            throw new Error('Microphone access denied. Please allow microphone permission.');
        }
    }

    /**
     * Create peer connection with optimized settings for voice calls
     */
    _createPeerConnection() {
        if (this.peerConnection) {
            this.peerConnection.close();
        }

        this.peerConnection = new RTCPeerConnection({
            iceServers: ICE_SERVERS,
            // Optimize for low latency voice calls
            iceCandidatePoolSize: 10,
            // Bundle policy - max-bundle reduces latency
            bundlePolicy: 'max-bundle',
            // RTC configuration for better audio
            rtcpMuxPolicy: 'require',
        });

        // Send ICE candidates to the other peer via signaling
        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate && this.emit) {
                this.emit('webrtc-ice-candidate', {
                    callId: this.callId,
                    candidate: event.candidate,
                    targetUserId: this.peerId,
                    hotelId: this.hotelId,
                });
            }
        };

        // Handle remote stream — attach to a hidden <audio> element.
        // We deliberately avoid AudioContext here because it starts suspended
        // when created outside a user-gesture context (ontrack fires async).
        // A MediaStream-backed <audio> element plays without that restriction.
        this.peerConnection.ontrack = (event) => {
            console.log('🔊 Remote audio track received');
            this.remoteStream = event.streams[0];

            // Create or reuse a DOM audio element for reliable cross-browser playback
            if (!this.remoteAudio) {
                this.remoteAudio = document.createElement('audio');
                this.remoteAudio.autoplay = true;
                this.remoteAudio.playsInline = true;
                this.remoteAudio.volume = 1.0;
                // Hidden element — no visual presence
                Object.assign(this.remoteAudio.style, {
                    position: 'fixed', width: '0', height: '0',
                    opacity: '0', pointerEvents: 'none',
                });
                document.body.appendChild(this.remoteAudio);
            }

            this.remoteAudio.srcObject = this.remoteStream;
            this.remoteAudio.play().catch(err => console.warn('Remote audio play error:', err));

            if (this._onRemoteStream) this._onRemoteStream(this.remoteStream);
        };

        this.peerConnection.oniceconnectionstatechange = () => {
            const state = this.peerConnection?.iceConnectionState;
            console.log('🧊 ICE state:', state);
            if (state === 'connected' || state === 'completed') {
                console.log('✅ WebRTC audio connected!');
            } else if (state === 'failed') {
                console.error('❌ WebRTC ICE connection failed');
            }
        };

        return this.peerConnection;
    }

    /**
     * Start a call as the CALLER — create offer.
     * Guarded against duplicate invocations for the same callId
     * (React 18 StrictMode fires useEffects twice).
     */
    async startCall({ callId, peerId }) {
        // Skip if already started for this exact call
        if (this.callId === callId && this.peerConnection && this.peerConnection.signalingState !== 'closed') {
            console.log('📞 startCall skipped — already in progress for', callId);
            return;
        }

        this.callId = callId;
        this.peerId = peerId;

        const pc = this._createPeerConnection();
        const stream = await this.getLocalStream();

        // Add local audio tracks to the connection
        stream.getTracks().forEach(track => pc.addTrack(track, stream));

        // Create and send SDP offer with audio bitrate hint
        const offer = await pc.createOffer();
        const enhancedOffer = new RTCSessionDescription({
            type: offer.type,
            sdp: setAudioBitrate(offer.sdp),
        });
        await pc.setLocalDescription(enhancedOffer);

        this.emit('webrtc-offer', {
            callId: this.callId,
            offer: pc.localDescription,
            targetUserId: this.peerId,
            hotelId: this.hotelId,
        });

        console.log('📞 WebRTC offer sent to', this.peerId);
    }

    /**
     * Handle incoming SDP offer as the CALLEE — create answer.
     * Guarded against duplicate invocations for the same callId.
     */
    async handleOffer({ callId, offer, fromUserId }) {
        // Skip if already handling this exact call
        if (this.callId === callId && this.peerConnection && this.peerConnection.signalingState !== 'closed') {
            console.log('📞 handleOffer skipped — already handling', callId);
            return;
        }

        this.callId = callId;
        this.peerId = fromUserId;

        const pc = this._createPeerConnection();
        const stream = await this.getLocalStream();

        stream.getTracks().forEach(track => pc.addTrack(track, stream));

        await pc.setRemoteDescription(new RTCSessionDescription(offer));

        // Apply any buffered ICE candidates
        for (const c of this._pendingCandidates) {
            await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => { });
        }
        this._pendingCandidates = [];

        const answer = await pc.createAnswer();
        const enhancedAnswer = new RTCSessionDescription({
            type: answer.type,
            sdp: setAudioBitrate(answer.sdp),
        });
        await pc.setLocalDescription(enhancedAnswer);

        this.emit('webrtc-answer', {
            callId: this.callId,
            answer: pc.localDescription,
            targetUserId: this.peerId,
            hotelId: this.hotelId,
        });

        console.log('📞 WebRTC answer sent to', this.peerId);
    }

    /**
     * Handle incoming SDP answer (caller receives this)
     */
    async handleAnswer({ answer }) {
        if (!this.peerConnection) return;
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));

        // Apply any buffered ICE candidates
        for (const c of this._pendingCandidates) {
            await this.peerConnection.addIceCandidate(new RTCIceCandidate(c)).catch(() => { });
        }
        this._pendingCandidates = [];

        console.log('📞 WebRTC answer applied');
    }

    /**
     * Handle incoming ICE candidate
     */
    async handleIceCandidate({ candidate }) {
        if (!candidate) return;
        if (!this.peerConnection || !this.peerConnection.remoteDescription) {
            // Buffer candidate until remote description is set
            this._pendingCandidates.push(candidate);
            return;
        }
        try {
            await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
            console.warn('ICE candidate error:', e);
        }
    }

    /**
     * Toggle mute — uses the standard WebRTC mute mechanism.
     *
     * Setting `track.enabled = false` on a MediaStreamTrack that is
     * attached to an RTCRtpSender makes the sender transmit silence.
     * This is the most reliable cross-browser mute approach.
     *
     * We toggle BOTH the shared localStream track AND every sender's
     * track reference (they point to the same object, but iterating
     * senders acts as a safety net if the reference was ever detached).
     */
    setMuted(muted) {
        this.isMuted = muted;

        let trackCount = 0;
        let senderCount = 0;

        // Toggle the localStream audio track(s)
        if (this.localStream) {
            this.localStream.getAudioTracks().forEach(track => {
                track.enabled = !muted;
                trackCount++;
                console.log(`🎤 [Mute] Stream track ${track.id}: enabled=${track.enabled}`);
            });
        }

        // Also toggle through senders as a safety net
        if (this.peerConnection) {
            this.peerConnection.getSenders().forEach(sender => {
                if (sender.track && sender.track.kind === 'audio') {
                    sender.track.enabled = !muted;
                    senderCount++;
                    console.log(`🎤 [Mute] Sender track ${sender.track.id}: enabled=${sender.track.enabled}`);
                }
            });
        }

        console.log(`🎤 setMuted(${muted}): toggled ${trackCount} stream tracks, ${senderCount} sender tracks`);
    }

    /**
     * Set speaker volume (for the remote audio)
     */
    setSpeaker(enabled) {
        if (this.remoteAudio) {
            this.remoteAudio.volume = enabled ? 1.0 : 0.6;
        }
        // AudioContext gain path (legacy — kept for safety)
        if (this._remoteGain) {
            this._remoteGain.gain.value = enabled ? 1.0 : 0.6;
        }
    }

    /**
     * Clean up everything
     */
    cleanup() {
        // Stop local stream tracks
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }

        // Remove DOM audio element used for remote playback
        if (this.remoteAudio) {
            this.remoteAudio.pause();
            this.remoteAudio.srcObject = null;
            if (this.remoteAudio.parentNode) {
                this.remoteAudio.parentNode.removeChild(this.remoteAudio);
            }
            this.remoteAudio = null;
        }
        this.remoteStream = null;

        // Disconnect AudioContext nodes (legacy path)
        if (this._remoteSource) {
            try { this._remoteSource.disconnect(); } catch { /* */ }
            this._remoteSource = null;
        }
        if (this._remoteGain) {
            try { this._remoteGain.disconnect(); } catch { /* */ }
            this._remoteGain = null;
        }
        if (this._audioCtx && this._audioCtx.state !== 'closed') {
            this._audioCtx.close().catch(() => { });
            this._audioCtx = null;
        }

        // Close peer connection
        if (this.peerConnection) {
            this.peerConnection.close();
            this.peerConnection = null;
        }

        this._pendingCandidates = [];
        this.callId = null;
        this.peerId = null;
        this.isMuted = false;
    }
}

// Singleton instance
const webrtcManager = new WebRTCCallManager();
export default webrtcManager;
