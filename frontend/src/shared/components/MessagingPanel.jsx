/**
 * MessagingPanel - Facebook Messenger Style Chat & Calls
 * 
 * Features:
 * - Recent Chats tab (conversations sorted by latest message time)
 * - Real-time messaging via Socket.io
 * - Direct messages & channel-based chats
 * - Voice call initiation & management
 * - Contact list with online indicators
 * - Typing indicators shown in chat header
 * - Blue double-tick for read messages, gray for sent
 * - Unread message counts
 * - Dark mode support
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
    MessageCircle, X, Search, Send, Phone, PhoneOff, PhoneIncoming,
    ArrowLeft, Mic, MicOff, Volume2, VolumeX, Users, User, Loader2,
    CheckCheck, Check, MoreVertical, Video, Clock, Smile
} from 'lucide-react';
import { useSocket } from '../../core/context/SocketContext';
import { useStaffAuth } from '../../core/context/StaffAuthContext';
import { useTheme } from '../../hooks/useTheme';
import * as messagingApi from '../../core/api/services/messaging.service';
import EmojiPicker from './EmojiPicker';
import {
    startDialTone, stopDialTone, startRingTone, stopRingTone,
    playConnectedSound, playEndedSound, stopAllCallSounds,
    unlockAudio,
} from '../utils/callSounds';
import webrtcManager from '../utils/webrtcManager';
import './MessagingPanel.css';

// Avatar color palette
const AVATAR_COLORS = [
    '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#ef4444',
    '#f97316', '#eab308', '#22c55e', '#14b8a6', '#06b6d4',
    '#3b82f6', '#0ea5e9',
];

const getAvatarColor = (name) => {
    let hash = 0;
    for (let i = 0; i < (name || '').length; i++) {
        hash = ((hash << 5) - hash) + name.charCodeAt(i);
        hash = hash & hash;
    }
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

const getInitials = (name) => {
    return (name || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
};

const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h`;

    if (d.toDateString() === new Date(now - 86400000).toDateString()) return 'Yesterday';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const formatMessageTime = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleTimeString('en-US', {
        hour: 'numeric', minute: '2-digit', hour12: true
    });
};

const formatCallDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

/**
 * ContactAvatar - Reusable avatar component
 */
const ContactAvatar = ({ contact, size = 42 }) => {
    const bgColor = getAvatarColor(contact?.fullname || contact?.name);
    const pic = contact?.profilePicture;
    const initials = getInitials(contact?.fullname || contact?.name);

    return (
        <div
            className="msg-contact-avatar"
            style={{ width: size, height: size, background: bgColor, fontSize: size * 0.35 }}
        >
            {pic ? (
                <img src={pic} alt={contact?.fullname || contact?.name} />
            ) : (
                initials
            )}
        </div>
    );
};

/**
 * MessageBubble - Individual message display
 * Shows timestamp on every message, blue double-tick for read, gray check for sent
 */
const MessageBubble = ({ message, isSent }) => {
    if (message.messageType === 'call_request') {
        const iconClass = message.callStatus === 'missed' || message.callStatus === 'declined'
            ? 'missed'
            : message.callStatus === 'answered' || message.callStatus === 'ended'
                ? 'answered'
                : 'outgoing';

        const callLabel = message.callStatus === 'missed' ? 'Missed Call'
            : message.callStatus === 'declined' ? 'Declined'
                : message.callStatus === 'answered' ? 'Call Connected'
                    : message.callStatus === 'ended' ? `Call Ended`
                        : 'Calling...';

        return (
            <div className="msg-call-bubble" style={{ alignSelf: isSent ? 'flex-end' : 'flex-start' }}>
                <div className={`msg-call-icon ${iconClass}`}>
                    {message.callStatus === 'missed' || message.callStatus === 'declined'
                        ? <PhoneOff size={18} />
                        : <Phone size={18} />
                    }
                </div>
                <div className="msg-call-info">
                    <h4>{callLabel}</h4>
                    <p>
                        {message.callDuration > 0 && formatCallDuration(message.callDuration)}
                        {' '}{formatMessageTime(message.createdAt)}
                    </p>
                </div>
            </div>
        );
    }

    if (message.messageType === 'system') {
        return (
            <div className="msg-system">
                <span>{message.content}</span>
            </div>
        );
    }

    return (
        <div className={`msg-bubble-wrapper ${isSent ? 'sent' : 'received'}`}>
            {!isSent && (
                <div
                    className="msg-bubble-avatar"
                    style={{ background: getAvatarColor(message.sender?.fullname) }}
                >
                    {getInitials(message.sender?.fullname)}
                </div>
            )}
            <div>
                <div className="msg-bubble">
                    {message.content}
                </div>
                <div className="msg-bubble-time">
                    {formatMessageTime(message.createdAt)}
                    {isSent && (
                        message.isRead
                            ? <CheckCheck size={13} style={{ color: '#3b82f6' }} />
                            : <Check size={13} style={{ opacity: 0.5 }} />
                    )}
                </div>
            </div>
        </div>
    );
};

/**
 * CallModal - Voice call UI with sound effects
 */
const CallModal = ({ call, onAnswer, onDecline, onEnd }) => {
    const [duration, setDuration] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [isSpeaker, setIsSpeaker] = useState(false);
    const timerRef = useRef(null);

    // Sound management based on call status.
    // NOTE: We intentionally do NOT use a prevStatusRef guard here.
    // React 18 StrictMode double-mounts components (mount → unmount → mount).
    // A ref-based "skip if same status" check survives across the unmount/remount
    // cycle, but the sounds are stopped by cleanup. Without the guard, the second
    // mount restarts sounds correctly. The dependency array already prevents
    // re-running when deps haven't changed.
    useEffect(() => {
        if (call.status === 'ringing') {
            if (call.direction === 'incoming') {
                stopDialTone();
                startRingTone();
            } else {
                stopRingTone();
                startDialTone();
            }
        } else if (call.status === 'answered') {
            stopAllCallSounds();
            playConnectedSound();
        } else if (call.status === 'ended' || call.status === 'declined' || call.status === 'missed') {
            stopAllCallSounds();
            playEndedSound();
        }

        // Cleanup: stop looping tones when effect re-runs or component unmounts
        return () => {
            stopAllCallSounds();
        };
    }, [call.status, call.direction]);

    // Timer for connected call
    useEffect(() => {
        if (call.status === 'answered') {
            timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
        } else {
            setDuration(0);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [call.status]);

    const isIncoming = call.direction === 'incoming';

    return (
        <div className="msg-call-overlay">
            <div className="msg-call-modal">
                <div className={`msg-call-avatar ${call.status === 'ringing' ? 'ringing' : ''}`}>
                    {call.contact?.profilePicture ? (
                        <img src={call.contact.profilePicture} alt={call.contact.fullname} />
                    ) : (
                        getInitials(call.contact?.fullname)
                    )}
                </div>
                <h2 className="msg-call-name">{call.contact?.fullname || 'Unknown'}</h2>
                {call.contact?.role && (
                    <p style={{ fontSize: 13, opacity: 0.7, margin: '2px 0 0', textTransform: 'capitalize' }}>
                        {call.contact.role === 'chief' ? 'Kitchen Staff' : call.contact.role}
                    </p>
                )}
                <p className="msg-call-label">
                    {call.status === 'ringing' && isIncoming && 'Incoming call...'}
                    {call.status === 'ringing' && !isIncoming && 'Calling...'}
                    {call.status === 'answered' && 'Connected'}
                    {call.status === 'declined' && 'Call Declined'}
                    {call.status === 'ended' && 'Call Ended'}
                </p>

                {call.status === 'answered' && (
                    <div className="msg-call-timer">
                        {formatCallDuration(duration)}
                    </div>
                )}

                <div className="msg-call-actions">
                    {call.status === 'ringing' && isIncoming && (
                        <>
                            <button className="msg-call-btn decline" onClick={onDecline} title="Decline">
                                <PhoneOff size={22} />
                            </button>
                            <button className="msg-call-btn accept" onClick={onAnswer} title="Accept">
                                <Phone size={22} />
                            </button>
                        </>
                    )}

                    {call.status === 'ringing' && !isIncoming && (
                        <button className="msg-call-btn decline" onClick={onEnd} title="Cancel">
                            <PhoneOff size={22} />
                        </button>
                    )}

                    {call.status === 'answered' && (
                        <>
                            <button
                                className={`msg-call-btn mute ${isMuted ? 'active' : ''}`}
                                onClick={() => { setIsMuted(!isMuted); webrtcManager.setMuted(!isMuted); }}
                                title={isMuted ? 'Unmute' : 'Mute'}
                            >
                                {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
                            </button>
                            <button className="msg-call-btn decline" onClick={() => onEnd(duration)} title="End Call">
                                <PhoneOff size={22} />
                            </button>
                            <button
                                className={`msg-call-btn speaker ${isSpeaker ? 'active' : ''}`}
                                onClick={() => { setIsSpeaker(!isSpeaker); webrtcManager.setSpeaker(!isSpeaker); }}
                                title={isSpeaker ? 'Speaker Off' : 'Speaker On'}
                            >
                                {isSpeaker ? <Volume2 size={20} /> : <VolumeX size={20} />}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

/**
 * Main MessagingPanel Component
 */
const MessagingPanel = ({
    isOpen,
    onToggle,
    defaultRecipient = null,
    showFab = true
}) => {
    const { isDark } = useTheme();
    const { subscribe, emit, isConnected } = useSocket();

    let staffUser = null;
    let activeProperty = null;
    try {
        const auth = useStaffAuth();
        staffUser = auth?.staffUser;
        activeProperty = auth?.activeProperty;
    } catch { /* guest/public context */ }

    // State
    const [activeTab, setActiveTab] = useState('chats'); // chats | contacts | channels
    const [contacts, setContacts] = useState({ waiters: [], chefs: [], receptionists: [], managers: [], other: [] });
    const [conversations, setConversations] = useState([]);
    const [activeChat, setActiveChat] = useState(null); // { type: 'direct'|'channel', contact, channel }
    const [messages, setMessages] = useState([]);
    const [messageInput, setMessageInput] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoadingContacts, setIsLoadingContacts] = useState(false);
    const [isLoadingConversations, setIsLoadingConversations] = useState(false);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [typingUsers, setTypingUsers] = useState([]);
    const [activeCall, setActiveCall] = useState(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);

    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const webrtcStartedRef = useRef(null); // tracks callId for which WebRTC was started
    const currentUserId = staffUser?._id;
    const hotelId = activeProperty?._id;

    // Load contacts
    const loadContacts = useCallback(async () => {
        if (!hotelId) return;
        setIsLoadingContacts(true);
        try {
            const res = await messagingApi.getContacts(hotelId);
            if (res?.success) {
                setContacts(res.contacts || {});
            }
        } catch (err) {
            console.error('Failed to load contacts:', err);
        } finally {
            setIsLoadingContacts(false);
        }
    }, [hotelId]);

    // Load recent conversations
    const loadConversations = useCallback(async () => {
        if (!hotelId) return;
        setIsLoadingConversations(true);
        try {
            const res = await messagingApi.getConversations(hotelId);
            if (res?.success) {
                setConversations(res.data || []);
                // Calculate total unread
                const total = (res.data || []).reduce((sum, c) => sum + (c.unreadCount || 0), 0);
                setUnreadCount(total);
            }
        } catch (err) {
            console.error('Failed to load conversations:', err);
        } finally {
            setIsLoadingConversations(false);
        }
    }, [hotelId]);

    // Load messages for current chat
    const loadMessages = useCallback(async () => {
        if (!activeChat || !hotelId) return;
        setIsLoadingMessages(true);
        try {
            const params = { hotelId, limit: 50 };
            if (activeChat.type === 'direct' && activeChat.contact?._id) {
                params.channel = 'direct';
                params.recipientId = activeChat.contact._id;
            } else if (activeChat.type === 'channel') {
                params.channel = activeChat.channel;
            }
            const res = await messagingApi.getMessages(params);
            if (res?.success) {
                setMessages(res.data || []);
            }
        } catch (err) {
            console.error('Failed to load messages:', err);
        } finally {
            setIsLoadingMessages(false);
        }
    }, [activeChat, hotelId]);

    // Mark messages read
    const markRead = useCallback(async () => {
        if (!activeChat || !hotelId) return;
        try {
            if (activeChat.type === 'channel') {
                await messagingApi.markMessagesRead({ channel: activeChat.channel, hotelId });
            } else if (activeChat.type === 'direct') {
                const unreadIds = messages
                    .filter(m => !m.isRead && m.sender?._id !== currentUserId)
                    .map(m => m._id);
                if (unreadIds.length > 0) {
                    await messagingApi.markMessagesRead({ messageIds: unreadIds, hotelId });
                    // Update local messages to show as read
                    setMessages(prev => prev.map(m =>
                        unreadIds.includes(m._id) ? { ...m, isRead: true } : m
                    ));
                }
            }
        } catch (err) {
            console.error('Failed to mark read:', err);
        }
    }, [activeChat, messages, currentUserId, hotelId]);

    // Load data on open
    useEffect(() => {
        if (isOpen && hotelId) {
            loadConversations();
            loadContacts();
        }
    }, [isOpen, hotelId, loadConversations, loadContacts]);

    // Load messages when chat changes
    useEffect(() => {
        if (activeChat) {
            loadMessages();
        }
    }, [activeChat, loadMessages]);

    // Mark read when viewing messages
    useEffect(() => {
        if (messages.length > 0 && activeChat) {
            const hasUnread = messages.some(m => !m.isRead && m.sender?._id !== currentUserId);
            if (hasUnread) {
                markRead();
            }
        }
    }, [messages, activeChat, markRead, currentUserId]);

    // Default recipient handling (opens from guest/staff view)
    useEffect(() => {
        if (defaultRecipient && isOpen) {
            setActiveChat({
                type: 'direct',
                contact: defaultRecipient,
            });
        }
    }, [defaultRecipient, isOpen]);

    // Scroll to bottom on new messages
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, typingUsers]);

    // Focus input when chat opens
    useEffect(() => {
        if (activeChat && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [activeChat]);

    // Socket event listeners
    useEffect(() => {
        if (!subscribe) return;

        const unsubNewMsg = subscribe('new-message', (msg) => {
            // If current chat is open and matches, add message
            if (activeChat) {
                const isDirectMatch = activeChat.type === 'direct' && (
                    (msg.sender?._id === activeChat.contact?._id) ||
                    (msg.sender?._id === currentUserId && msg.recipient === activeChat.contact?._id)
                );
                const isChannelMatch = activeChat.type === 'channel' && msg.channel === activeChat.channel;

                if (isDirectMatch || isChannelMatch) {
                    setMessages(prev => {
                        if (prev.some(m => m._id === msg._id)) return prev;
                        return [...prev, msg];
                    });
                    // Mark as read immediately
                    if (msg.sender?._id !== currentUserId) {
                        messagingApi.markMessagesRead({ messageIds: [msg._id], hotelId }).catch(() => { });
                    }
                    return;
                }
            }
            // Otherwise increment unread and update conversations
            if (msg.sender?._id !== currentUserId) {
                setUnreadCount(prev => prev + 1);
            }
            // Refresh conversations list to show new message at top
            loadConversations();
        });

        // Listen for read receipts so sent messages show blue double-tick
        const unsubReadReceipt = subscribe('messages-read', ({ messageIds, readBy }) => {
            if (readBy !== currentUserId) {
                setMessages(prev => prev.map(m =>
                    messageIds.includes(m._id) ? { ...m, isRead: true } : m
                ));
            }
        });

        const unsubTyping = subscribe('user-typing', ({ userId, fullname }) => {
            if (userId !== currentUserId) {
                setTypingUsers(prev => {
                    if (prev.some(u => u.userId === userId)) return prev;
                    return [...prev, { userId, fullname }];
                });
            }
        });

        const unsubStopTyping = subscribe('user-stop-typing', ({ userId }) => {
            setTypingUsers(prev => prev.filter(u => u.userId !== userId));
        });

        const unsubIncomingCall = subscribe('incoming-call', (data) => {
            // Don't show incoming call if we're the one who initiated it
            if (data.sender?._id === currentUserId) return;

            setActiveCall({
                id: data._id,
                contact: {
                    _id: data.sender?._id,
                    fullname: data.sender?.fullname || 'Unknown',
                    profilePicture: data.sender?.profilePicture || null,
                    role: data.sender?.role || data.sender?.companyRole || '',
                },
                status: 'ringing',
                direction: 'incoming',
            });
        });

        const handleCallStatusChange = (data) => {
            setActiveCall(prev => {
                if (!prev) return prev;
                // Match by id if available, or accept if we have a pending call with no id
                if (prev.id && prev.id !== data._id && data._id) return prev;
                const newStatus = data.callStatus || data.status;

                if (newStatus === 'ended' || newStatus === 'declined' || newStatus === 'missed') {
                    webrtcManager.cleanup();
                    setTimeout(() => setActiveCall(null), 2000);
                    return { ...prev, status: newStatus };
                }

                const extra = (newStatus === 'answered' && !prev.startTime)
                    ? { startTime: Date.now() }
                    : {};
                return { ...prev, status: newStatus, id: data._id || prev.id, ...extra };
            });
        };

        const unsubCallStatus = subscribe('call-status-update', handleCallStatusChange);
        // Also listen for socket relay events from socket.js (map callId → _id)
        const unsubCallAnswered = subscribe('call-answered', (data) => handleCallStatusChange({ _id: data.callId || data._id, callStatus: 'answered' }));
        const unsubCallDeclined = subscribe('call-declined', (data) => handleCallStatusChange({ _id: data.callId || data._id, callStatus: 'declined' }));
        const unsubCallEnded = subscribe('call-ended', (data) => handleCallStatusChange({ _id: data.callId || data._id, callStatus: 'ended' }));

        // ── WebRTC signaling listeners ─────────────────────
        const unsubWebrtcOffer = subscribe('webrtc-offer', async (data) => {
            console.log('📞 Received WebRTC offer from', data.fromUserId);
            try {
                webrtcManager.init({ emit, hotelId, userId: currentUserId });
                await webrtcManager.handleOffer(data);
            } catch (e) {
                console.error('WebRTC offer handling failed:', e);
            }
        });

        const unsubWebrtcAnswer = subscribe('webrtc-answer', async (data) => {
            console.log('📞 Received WebRTC answer');
            try {
                await webrtcManager.handleAnswer(data);
            } catch (e) {
                console.error('WebRTC answer handling failed:', e);
            }
        });

        const unsubWebrtcIce = subscribe('webrtc-ice-candidate', async (data) => {
            try {
                await webrtcManager.handleIceCandidate(data);
            } catch (e) {
                console.error('WebRTC ICE candidate failed:', e);
            }
        });

        return () => {
            unsubNewMsg();
            unsubReadReceipt();
            unsubTyping();
            unsubStopTyping();
            unsubIncomingCall();
            unsubCallStatus();
            unsubCallAnswered();
            unsubCallDeclined();
            unsubCallEnded();
            unsubWebrtcOffer();
            unsubWebrtcAnswer();
            unsubWebrtcIce();
        };
    }, [subscribe, emit, activeChat, currentUserId, hotelId, loadConversations]);

    // ── WebRTC: start call when outgoing call transitions to "answered" ──
    // Uses a ref guard so React 18 StrictMode double-mount cannot send
    // duplicate offers (which would corrupt the peer connection + mute).
    useEffect(() => {
        if (
            activeCall?.status === 'answered' &&
            activeCall?.direction === 'outgoing' &&
            activeCall?.id &&
            activeCall?.contact?._id
        ) {
            // Skip if we already started WebRTC for this exact call
            if (webrtcStartedRef.current === activeCall.id) return;
            webrtcStartedRef.current = activeCall.id;

            webrtcManager.init({ emit, hotelId, userId: currentUserId });
            webrtcManager.startCall({
                callId: activeCall.id,
                peerId: activeCall.contact._id,
            }).catch(e => console.error('WebRTC start failed:', e));
        }

        return () => {
            // Cleanup: if the effect re-runs (status change or unmount),
            // allow a fresh startCall for a DIFFERENT call.
            // We do NOT reset for the same id — the guard prevents duplicates.
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeCall?.status, activeCall?.direction, activeCall?.id]);

    // Reset the WebRTC guard when the call is fully cleared
    useEffect(() => {
        if (!activeCall) {
            webrtcStartedRef.current = null;
        }
    }, [activeCall]);

    // ── 30-second auto-timeout for unanswered calls ──
    useEffect(() => {
        if (activeCall?.status !== 'ringing') return;

        const timeout = setTimeout(() => {
            setActiveCall(prev => {
                if (!prev || prev.status !== 'ringing') return prev;
                webrtcManager.cleanup();
                // If outgoing call, end it; if incoming, mark as missed
                if (prev.id) {
                    const newStatus = prev.direction === 'outgoing' ? 'ended' : 'missed';
                    messagingApi.updateCallStatus(prev.id, { callStatus: newStatus }).catch(() => {});
                    if (emit) {
                        emit(newStatus === 'ended' ? 'end-call' : 'decline-call', {
                            callId: prev.id, hotelId,
                        });
                    }
                    setTimeout(() => setActiveCall(null), 1500);
                    return { ...prev, status: newStatus };
                }
                return null;
            });
        }, 30_000);

        return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeCall?.status, activeCall?.id]);

    // Send message
    const sendMessage = async () => {
        if (!messageInput.trim() || !activeChat || isSending) return;

        const content = messageInput.trim();
        setMessageInput('');
        setShowEmojiPicker(false);
        setIsSending(true);

        // Stop typing
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
            emit('stop-typing', {
                hotelId,
                channel: activeChat.channel || 'direct',
                userId: currentUserId,
                recipientId: activeChat.type === 'direct' ? activeChat.contact?._id : undefined,
            });
        }

        try {
            const params = {
                content,
                hotelId,
                messageType: 'text',
            };

            if (activeChat.type === 'direct') {
                params.channel = 'direct';
                params.recipientId = activeChat.contact?._id;
            } else {
                params.channel = activeChat.channel;
            }

            const res = await messagingApi.sendMessage(params);
            if (res?.success && res.data) {
                setMessages(prev => {
                    if (prev.some(m => m._id === res.data._id)) return prev;
                    return [...prev, res.data];
                });
                // Refresh conversations list so this chat moves to top
                loadConversations();
            }
        } catch (err) {
            console.error('Failed to send message:', err);
            setMessageInput(content);
        } finally {
            setIsSending(false);
        }
    };

    // Handle typing
    const handleTyping = () => {
        if (!activeChat || !emit) return;

        const recipientId = activeChat.type === 'direct' ? activeChat.contact?._id : undefined;

        emit('typing', {
            hotelId,
            channel: activeChat.channel || 'direct',
            userId: currentUserId,
            fullname: staffUser?.fullname,
            recipientId,
        });

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            emit('stop-typing', {
                hotelId,
                channel: activeChat.channel || 'direct',
                userId: currentUserId,
                recipientId,
            });
        }, 2000);
    };

    // Initiate call
    const handleCall = async (contact) => {
        if (!contact?._id || !hotelId) return;
        unlockAudio(); // Unlock AudioContext on user gesture so sounds work later

        // Ensure contact has role info for display
        const callContact = {
            _id: contact._id,
            fullname: contact.fullname,
            profilePicture: contact.profilePicture,
            role: contact.companyRole || contact.role || '',
        };

        setActiveCall({
            id: null,
            contact: callContact,
            status: 'ringing',
            direction: 'outgoing',
        });

        try {
            const res = await messagingApi.initiateCall({
                recipientId: contact._id,
                channel: 'direct',
                hotelId,
            });
            if (res?.success) {
                setActiveCall(prev => prev ? { ...prev, id: res.data._id } : null);
            }
        } catch (err) {
            console.error('Failed to initiate call:', err);
            setActiveCall(null);
        }
    };

    // Answer call + start WebRTC
    const handleAnswerCall = async () => {
        if (!activeCall?.id) return;
        unlockAudio(); // Unlock AudioContext on user gesture so sounds work later
        try {
            // Emit socket event immediately for fast UI update on caller side
            emit('answer-call', { callId: activeCall.id, hotelId });
            // Update local state
            setActiveCall(prev => prev ? { ...prev, status: 'answered', startTime: Date.now() } : null);
            // Persist to backend (also triggers call-status-update to both users)
            await messagingApi.updateCallStatus(activeCall.id, { callStatus: 'answered' });

            // WebRTC: callee side — offer will arrive via 'webrtc-offer' listener
            // (manager is initialized in the offer listener)
        } catch (err) {
            console.error('Failed to answer call:', err);
        }
    };

    // Decline call
    const handleDeclineCall = async () => {
        if (!activeCall) return;

        webrtcManager.cleanup();

        // If no id yet (REST hasn't returned), just clear locally
        if (!activeCall.id) {
            setActiveCall(null);
            return;
        }

        try {
            setActiveCall(prev => prev ? { ...prev, status: 'declined' } : null);
            await messagingApi.updateCallStatus(activeCall.id, { callStatus: 'declined' });
            emit('decline-call', { callId: activeCall.id, hotelId });
            setTimeout(() => setActiveCall(null), 1500);
        } catch (err) {
            console.error('Failed to decline call:', err);
            setActiveCall(null);
        }
    };

    // End call (also handles cancel before REST response)
    const handleEndCall = async (duration) => {
        if (!activeCall) return;

        webrtcManager.cleanup();

        // If no id yet (REST hasn't returned), just clear locally
        if (!activeCall.id) {
            setActiveCall(null);
            return;
        }

        try {
            await messagingApi.updateCallStatus(activeCall.id, {
                callStatus: 'ended',
                callDuration: duration || 0,
            });
            emit('end-call', { callId: activeCall.id, hotelId, duration: duration || 0 });
            setActiveCall(prev => prev ? { ...prev, status: 'ended' } : null);
            setTimeout(() => setActiveCall(null), 1500);
        } catch (err) {
            console.error('Failed to end call:', err);
            setActiveCall(null);
        }
    };

    // Open direct chat
    const openDirectChat = (contact) => {
        setActiveChat({ type: 'direct', contact });
        setMessages([]);
        setTypingUsers([]);
    };

    // Open channel chat
    const openChannelChat = (channel) => {
        setActiveChat({ type: 'channel', channel });
        setMessages([]);
        setTypingUsers([]);
    };

    // Get all contacts flattened
    const allContacts = useMemo(() => {
        const all = [
            ...contacts.receptionists,
            ...contacts.waiters,
            ...contacts.chefs,
            ...contacts.managers,
            ...contacts.other
        ];
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            return all.filter(c =>
                c.fullname?.toLowerCase().includes(q) ||
                c.companyRole?.toLowerCase().includes(q) ||
                c.email?.toLowerCase().includes(q)
            );
        }
        return all;
    }, [contacts, searchQuery]);

    // Filter conversations by search
    const filteredConversations = useMemo(() => {
        if (!searchQuery) return conversations;
        const q = searchQuery.toLowerCase();
        return conversations.filter(c =>
            c.partner?.fullname?.toLowerCase().includes(q) ||
            c.partner?.companyRole?.toLowerCase().includes(q)
        );
    }, [conversations, searchQuery]);

    // Check if a specific user is typing
    const isPartnerTyping = useCallback((partnerId) => {
        return typingUsers.some(u => u.userId === partnerId);
    }, [typingUsers]);

    // Channel definitions
    const channels = [
        { id: 'waiter', label: 'Waiters', icon: '🍽️' },
        { id: 'chef', label: 'Kitchen', icon: '👨‍🍳' },
        { id: 'receptionist', label: 'Reception', icon: '🏨' },
        { id: 'all', label: 'Broadcast', icon: '📢' },
    ];

    // Handle key press in input
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    // ─── Render: Recent Chats List ───
    const renderChatsList = () => {
        if (isLoadingConversations) {
            return (
                <div className="msg-loading">
                    <Loader2 size={24} />
                </div>
            );
        }

        if (filteredConversations.length === 0) {
            return (
                <div className="msg-empty">
                    <div className="msg-empty-icon">
                        <MessageCircle size={28} />
                    </div>
                    <h4>{searchQuery ? 'No matches' : 'No conversations yet'}</h4>
                    <p>{searchQuery ? 'Try a different search term.' : 'Start a chat from the Contacts tab!'}</p>
                </div>
            );
        }

        return (
            <div className="msg-list">
                {filteredConversations.map(conv => {
                    const isSentByMe = conv.lastMessage?.senderId?.toString() === currentUserId;
                    const msgPreview = conv.lastMessage?.messageType === 'call_request'
                        ? '📞 Call'
                        : conv.lastMessage?.content || '';
                    const isChannel = conv.isChannel || conv.channel;

                    return (
                        <button
                            key={conv.partner?._id || conv.channel}
                            className={`msg-contact-item ${activeChat?.contact?._id === conv.partner?._id && !isChannel ? 'active' : ''} ${activeChat?.channel === conv.channel && isChannel ? 'active' : ''}`}
                            onClick={() => isChannel ? openChannelChat(conv.channel) : openDirectChat(conv.partner)}
                        >
                            <ContactAvatar contact={conv.partner} />
                            <div className="msg-contact-info">
                                <span className="msg-contact-name">{conv.partner?.fullname || 'Unknown'}</span>
                                <span className={`msg-conv-preview ${conv.unreadCount > 0 ? 'unread' : ''}`}>
                                    {!isChannel && isSentByMe && (
                                        conv.lastMessage?.isRead
                                            ? <CheckCheck size={13} style={{ color: '#3b82f6', marginRight: 3, verticalAlign: 'middle', display: 'inline' }} />
                                            : <Check size={13} style={{ opacity: 0.4, marginRight: 3, verticalAlign: 'middle', display: 'inline' }} />
                                    )}
                                    {!isChannel && isSentByMe ? 'You: ' : ''}{msgPreview.length > 30 ? msgPreview.slice(0, 30) + '...' : msgPreview}
                                </span>
                            </div>
                            <div className="msg-contact-meta">
                                <span className="msg-contact-time">{formatTime(conv.lastMessage?.createdAt)}</span>
                                {conv.unreadCount > 0 && (
                                    <span className="msg-contact-unread">{conv.unreadCount > 99 ? '99+' : conv.unreadCount}</span>
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>
        );
    };

    // ─── Render: Contact List ───
    const renderContactList = () => {
        if (isLoadingContacts) {
            return (
                <div className="msg-loading">
                    <Loader2 size={24} />
                </div>
            );
        }

        if (allContacts.length === 0) {
            return (
                <div className="msg-empty">
                    <div className="msg-empty-icon">
                        <Users size={28} />
                    </div>
                    <h4>No contacts found</h4>
                    <p>There are no other staff members in your hotel to message.</p>
                </div>
            );
        }

        const groups = [
            { label: 'Receptionists', items: contacts.receptionists },
            { label: 'Waiters', items: contacts.waiters },
            { label: 'Kitchen Staff', items: contacts.chefs },
            { label: 'Managers', items: contacts.managers },
            { label: 'Other', items: contacts.other },
        ].filter(g => g.items.length > 0);

        if (searchQuery) {
            return (
                <div className="msg-list">
                    {allContacts.map(contact => (
                        <button
                            key={contact._id}
                            className="msg-contact-item"
                            onClick={() => openDirectChat(contact)}
                        >
                            <ContactAvatar contact={contact} />
                            <div className="msg-contact-info">
                                <span className="msg-contact-name">{contact.fullname}</span>
                                <span className="msg-contact-role">{contact.companyRole || 'Staff'}</span>
                            </div>
                        </button>
                    ))}
                </div>
            );
        }

        return (
            <div className="msg-list">
                {groups.map(group => (
                    <React.Fragment key={group.label}>
                        <div className="msg-group-label">{group.label}</div>
                        {group.items.map(contact => (
                            <button
                                key={contact._id}
                                className="msg-contact-item"
                                onClick={() => openDirectChat(contact)}
                            >
                                <ContactAvatar contact={contact} />
                                <div className="msg-contact-info">
                                    <span className="msg-contact-name">{contact.fullname}</span>
                                    <span className="msg-contact-role">
                                        {contact.email || contact.companyRole || 'Staff'}
                                    </span>
                                </div>
                                <div className="msg-contact-meta">
                                    <Phone size={14} style={{ color: '#6366f1', cursor: 'pointer' }}
                                        onClick={(e) => { e.stopPropagation(); handleCall(contact); }}
                                    />
                                </div>
                            </button>
                        ))}
                    </React.Fragment>
                ))}
            </div>
        );
    };

    // ─── Render: Channel List ───
    const renderChannelList = () => (
        <div className="msg-list">
            <div className="msg-group-label">Team Channels</div>
            {channels.map(ch => (
                <button
                    key={ch.id}
                    className="msg-contact-item"
                    onClick={() => openChannelChat(ch.id)}
                >
                    <div
                        className="msg-contact-avatar"
                        style={{ background: '#6366f1', fontSize: 20 }}
                    >
                        {ch.icon}
                    </div>
                    <div className="msg-contact-info">
                        <span className="msg-contact-name">{ch.label}</span>
                        <span className="msg-contact-role">
                            {ch.id === 'all' ? 'Message all hotel staff' : `Message all ${ch.label.toLowerCase()}`}
                        </span>
                    </div>
                </button>
            ))}
        </div>
    );

    // ─── Render: Chat View ───
    const renderChatView = () => {
        const chatName = activeChat?.type === 'direct'
            ? activeChat.contact?.fullname || 'Unknown'
            : channels.find(c => c.id === activeChat?.channel)?.label || activeChat?.channel;

        // Check if the chat partner is currently typing
        const partnerTyping = activeChat?.type === 'direct'
            ? isPartnerTyping(activeChat.contact?._id)
            : false;

        return (
            <div className="msg-chat">
                {/* Chat Header */}
                <div className="msg-chat-header">
                    <button className="msg-chat-back" onClick={() => { setActiveChat(null); setMessages([]); setTypingUsers([]); loadConversations(); }}>
                        <ArrowLeft size={18} />
                    </button>

                    {activeChat?.type === 'direct' ? (
                        <ContactAvatar contact={activeChat.contact} size={36} />
                    ) : (
                        <div className="msg-contact-avatar" style={{ width: 36, height: 36, background: '#6366f1', fontSize: 18 }}>
                            {channels.find(c => c.id === activeChat?.channel)?.icon || '💬'}
                        </div>
                    )}

                    <div className="msg-chat-user-info">
                        <span className="msg-chat-user-name">{chatName}</span>
                        {partnerTyping ? (
                            <span className="msg-chat-user-status" style={{ color: '#6366f1', fontWeight: 600 }}>
                                typing...
                            </span>
                        ) : (
                            <span className={`msg-chat-user-status ${isConnected ? '' : 'offline'}`}>
                                <span className="dot" />
                                {isConnected ? 'Online' : 'Offline'}
                            </span>
                        )}
                    </div>

                    {activeChat?.type === 'direct' && (
                        <div className="msg-chat-actions">
                            <button
                                className="msg-chat-action-btn"
                                onClick={() => handleCall(activeChat.contact)}
                                title="Voice Call"
                            >
                                <Phone size={18} />
                            </button>
                        </div>
                    )}
                </div>

                {/* Messages */}
                <div className="msg-messages">
                    {isLoadingMessages ? (
                        <div className="msg-loading">
                            <Loader2 size={24} />
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="msg-empty">
                            <div className="msg-empty-icon">
                                <MessageCircle size={28} />
                            </div>
                            <h4>Start a conversation</h4>
                            <p>Send a message to begin chatting with {chatName}.</p>
                        </div>
                    ) : (
                        <>
                            {messages.map((msg, idx) => {
                                const isSent = msg.sender?._id === currentUserId;
                                const showDate = idx === 0 || (
                                    new Date(msg.createdAt).toDateString() !==
                                    new Date(messages[idx - 1]?.createdAt).toDateString()
                                );

                                return (
                                    <React.Fragment key={msg._id || idx}>
                                        {showDate && (
                                            <div className="msg-date-divider">
                                                <span>{new Date(msg.createdAt).toLocaleDateString('en-US', {
                                                    weekday: 'short', month: 'short', day: 'numeric'
                                                })}</span>
                                            </div>
                                        )}
                                        <MessageBubble
                                            message={msg}
                                            isSent={isSent}
                                        />
                                    </React.Fragment>
                                );
                            })}
                        </>
                    )}

                    {/* Typing indicator in messages area */}
                    {typingUsers.length > 0 && (
                        <div className="msg-typing">
                            <div className="msg-typing-dots">
                                <span /><span /><span />
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="msg-input-area">
                    <button
                        className="msg-emoji-btn"
                        onClick={() => setShowEmojiPicker(prev => !prev)}
                        title="Emoji"
                        type="button"
                    >
                        <Smile size={20} />
                    </button>
                    <div className="msg-input-wrapper">
                        {showEmojiPicker && (
                            <EmojiPicker
                                onSelect={(emoji) => {
                                    setMessageInput(prev => prev + emoji);
                                    inputRef.current?.focus();
                                }}
                                onClose={() => setShowEmojiPicker(false)}
                            />
                        )}
                        <textarea
                            ref={inputRef}
                            className="msg-input"
                            placeholder="Type a message..."
                            value={messageInput}
                            onChange={(e) => { setMessageInput(e.target.value); handleTyping(); }}
                            onKeyDown={handleKeyDown}
                            rows={1}
                        />
                    </div>
                    <button
                        className="msg-send-btn"
                        onClick={sendMessage}
                        disabled={!messageInput.trim() || isSending}
                        title="Send"
                    >
                        <Send size={16} />
                    </button>
                </div>
            </div>
        );
    };

    return (
        <>
            {/* Floating Action Button */}
            {showFab && (
                <button className="msg-fab" onClick={onToggle} title="Messages">
                    {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
                    {!isOpen && unreadCount > 0 && (
                        <span className="msg-fab-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
                    )}
                </button>
            )}

            {/* Panel */}
            <div className={`msg-panel ${isOpen ? 'open' : ''} ${isDark ? 'dark' : ''}`}>
                {activeChat ? (
                    renderChatView()
                ) : (
                    <>
                        {/* Header */}
                        <div className="msg-header">
                            <div className="msg-header-left">
                                <h3>Messages</h3>
                                {isConnected && (
                                    <span className="msg-online-count">
                                        • {allContacts.length} contacts
                                    </span>
                                )}
                            </div>
                            <div className="msg-header-actions">
                                <button className="msg-header-btn" onClick={onToggle} title="Close">
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="msg-tabs">
                            <button
                                className={`msg-tab ${activeTab === 'chats' ? 'active' : ''}`}
                                onClick={() => setActiveTab('chats')}
                            >
                                <Clock size={15} />
                                Chats
                                {unreadCount > 0 && (
                                    <span className="msg-tab-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
                                )}
                            </button>
                            <button
                                className={`msg-tab ${activeTab === 'contacts' ? 'active' : ''}`}
                                onClick={() => setActiveTab('contacts')}
                            >
                                <User size={15} />
                                Contacts
                            </button>
                            <button
                                className={`msg-tab ${activeTab === 'channels' ? 'active' : ''}`}
                                onClick={() => setActiveTab('channels')}
                            >
                                <Users size={15} />
                                Channels
                            </button>
                        </div>

                        {/* Search */}
                        {(activeTab === 'contacts' || activeTab === 'chats') && (
                            <div className="msg-search">
                                <div className="msg-search-input-wrapper">
                                    <Search size={15} className="msg-search-icon" />
                                    <input
                                        className="msg-search-input"
                                        placeholder={activeTab === 'chats' ? 'Search conversations...' : 'Search contacts...'}
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Content */}
                        {activeTab === 'chats' && renderChatsList()}
                        {activeTab === 'contacts' && renderContactList()}
                        {activeTab === 'channels' && renderChannelList()}
                    </>
                )}
            </div>

            {/* Call Modal */}
            {activeCall && (
                <CallModal
                    call={activeCall}
                    onAnswer={handleAnswerCall}
                    onDecline={handleDeclineCall}
                    onEnd={handleEndCall}
                />
            )}
        </>
    );
};

export default MessagingPanel;
