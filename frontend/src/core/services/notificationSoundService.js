/**
 * Notification Sound Service
 * Handles playing notification sounds with volume control and user preferences
 */

import { playAlert, installGestureUnlock } from '../audio/alertSounds';

class NotificationSoundService {
  constructor() {
    this.enabled = this.loadPreference();
    this.volume = this.loadVolume();
    installGestureUnlock();
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
    // The bundled /sounds/notification.mp3 is a 322-byte placeholder, so route
    // through the synthesized alert engine (no network, reliable, deduped).
    const map = { order: 'orderReady', call: 'waiterCall', alert: 'waiterCall', message: 'notification', notification: 'notification' };
    playAlert(map[type] || 'notification', { volume: this.volume, force });
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
