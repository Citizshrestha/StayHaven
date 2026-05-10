/**
 * Notification Sound Service
 * Handles playing notification sounds with volume control and user preferences
 */

class NotificationSoundService {
  constructor() {
    this.sounds = {
      notification: '/sounds/notification.mp3',
      order: '/sounds/notification.mp3',
      message: '/sounds/notification.mp3',
      call: '/sounds/notification.mp3',
      alert: '/sounds/notification.mp3',
    };

    this.audioCache = {};
    this.enabled = this.loadPreference();
    this.volume = this.loadVolume();

    // Preload sounds
    this.preloadSounds();
  }

  /**
   * Preload all sound files for instant playback
   */
  preloadSounds() {
    Object.entries(this.sounds).forEach(([key, path]) => {
      const audio = new Audio(path);
      audio.volume = this.volume;
      audio.preload = 'auto';
      this.audioCache[key] = audio;
    });
  }

  /**
   * Load sound preference from localStorage
   */
  loadPreference() {
    const saved = localStorage.getItem('notificationSoundEnabled');
    return saved === null ? true : saved === 'true'; // Default enabled
  }

  /**
   * Load volume preference from localStorage
   */
  loadVolume() {
    const saved = localStorage.getItem('notificationSoundVolume');
    return saved ? parseFloat(saved) : 0.7; // Default 70%
  }

  /**
   * Save sound preference to localStorage
   */
  savePreference(enabled) {
    this.enabled = enabled;
    localStorage.setItem('notificationSoundEnabled', enabled.toString());
  }

  /**
   * Save volume preference to localStorage
   */
  saveVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume)); // Clamp between 0 and 1
    localStorage.setItem('notificationSoundVolume', this.volume.toString());

    // Update volume for all cached audio
    Object.values(this.audioCache).forEach(audio => {
      audio.volume = this.volume;
    });
  }

  /**
   * Play a notification sound
   * @param {string} type - Type of notification (notification, order, message, call, alert)
   * @param {boolean} force - Force play even if disabled
   */
  async play(type = 'notification', force = false) {
    if (!this.enabled && !force) {
      return;
    }

    try {
      const audio = this.audioCache[type] || this.audioCache.notification;

      // Clone the audio to allow multiple simultaneous plays
      const sound = audio.cloneNode();
      sound.volume = this.volume;

      // Play the sound
      const playPromise = sound.play();

      if (playPromise !== undefined) {
        await playPromise;
      }
    } catch (error) {
      // Handle autoplay restrictions
      if (error.name === 'NotAllowedError') {
        console.warn('Notification sound blocked by browser. User interaction required.');
      } else {
        console.error('Error playing notification sound:', error);
      }
    }
  }

  /**
   * Enable notification sounds
   */
  enable() {
    this.savePreference(true);
  }

  /**
   * Disable notification sounds
   */
  disable() {
    this.savePreference(false);
  }

  /**
   * Toggle notification sounds
   */
  toggle() {
    this.savePreference(!this.enabled);
    return this.enabled;
  }

  /**
   * Check if sounds are enabled
   */
  isEnabled() {
    return this.enabled;
  }

  /**
   * Get current volume
   */
  getVolume() {
    return this.volume;
  }

  /**
   * Set volume (0.0 to 1.0)
   */
  setVolume(volume) {
    this.saveVolume(volume);
  }

  /**
   * Test play a sound
   */
  test(type = 'notification') {
    this.play(type, true); // Force play for testing
  }
}

// Create singleton instance
const notificationSoundService = new NotificationSoundService();

export default notificationSoundService;
