

import { useCallback, useRef, useEffect, useState } from "react";

// Sound file URLs (using free sound effects)
const SOUND_URLS = {
  // Short "ding" for new orders
  newOrder: "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3",
  // Bell sound for order ready
  orderReady: "https://assets.mixkit.co/active_storage/sfx/2867/2867-preview.mp3",
  // Urgent alert for waiter calls
  waiterCall: "https://assets.mixkit.co/active_storage/sfx/2870/2870-preview.mp3",
  // Soft notification
  notification: "https://assets.mixkit.co/active_storage/sfx/2866/2866-preview.mp3",
};

// Maps a playSound() sound key to the "ALERT TYPES" chip that governs it
// in Settings > Notifications. Sound types not listed here (e.g. the
// waiter-call alert) are always allowed through — they're not opt-out.
const SOUND_TYPE_TO_ALERT_TYPE = {
  newOrder: "newOrders",
  orderReady: "ready",
};

/**
 * Helper function to check if a given sound type is currently enabled in
 * settings. Reads directly from localStorage to always get the latest value.
 * Supports both waiter and kitchen settings, and honors both the master
 * "Sound" toggle and the per-category "ALERT TYPES" chips.
 */
const isSoundEnabledInSettings = (type) => {
  // Get role directly from sessionStorage (simpler and more reliable)
  const currentRole = sessionStorage.getItem("staffRole");

  const storageKey =
    currentRole === 'chief' || currentRole === 'kitchen' ? "kitchenSettings"
      : currentRole === 'waiter' ? "waiterSettings"
        : null;

  if (!storageKey) return true; // Unknown role — default to enabled

  const saved = localStorage.getItem(storageKey);
  if (!saved) return true; // No settings saved yet — default to enabled

  try {
    const settings = JSON.parse(saved);
    if (settings.sound === false) return false; // Master toggle off

    const alertType = SOUND_TYPE_TO_ALERT_TYPE[type];
    if (alertType && Array.isArray(settings.alertTypes)) {
      return settings.alertTypes.includes(alertType);
    }
    return true;
  } catch {
    return true; // Ignore parse errors, default to enabled
  }
};

/**
 * Custom hook for playing notification sounds
 * @returns {object} - { playSound, playWithVibration, hasInteracted }
 */
const useNotificationSound = () => {
  // Refs to store Audio objects (persist across renders)
  const audioRefs = useRef({});

  // Track if user has interacted with page (required for autoplay)
  const [hasInteracted, setHasInteracted] = useState(false);

  // Initialize Audio objects
  useEffect(() => {
    const audios = audioRefs.current;
    Object.entries(SOUND_URLS).forEach(([key, url]) => {
      const audio = new Audio(url);
      audio.preload = "auto";
      audio.volume = 0.7; // 70% volume
      audios[key] = audio;
    });

    // Cleanup on unmount
    return () => {
      Object.values(audios).forEach(audio => {
        audio.pause();
        audio.src = "";
      });
    };
  }, []);

  // Listen for user interaction to enable sound
  useEffect(() => {
    const handleInteraction = () => {
      if (!hasInteracted) {
        setHasInteracted(true);
        // Note: Using HTML5 Audio elements (not Web Audio API)
        // Browser autoplay restrictions are handled by the .play() call catching errors
      }
    };

    // Listen for any user interaction
    document.addEventListener("click", handleInteraction);
    document.addEventListener("touchstart", handleInteraction);
    document.addEventListener("keydown", handleInteraction);

    return () => {
      document.removeEventListener("click", handleInteraction);
      document.removeEventListener("touchstart", handleInteraction);
      document.removeEventListener("keydown", handleInteraction);
    };
  }, [hasInteracted]);

  /**
   * Play a notification sound
   * IMPORTANT: Reads sound setting directly from localStorage each time
   * to ensure it always respects the current setting
   * @param {string} type - Type of sound: 'newOrder', 'orderReady', 'waiterCall', 'notification'
   */
  const playSound = useCallback((type = "notification") => {
    // Read current sound setting directly from localStorage (not from React state)
    // This ensures the setting is always up-to-date even if changed in settings
    const soundEnabled = isSoundEnabledInSettings(type);
    const currentRole = sessionStorage.getItem("staffRole") || 'unknown';
    
    if (!soundEnabled) {
      console.log(`🔇 [${currentRole}] Sound disabled in settings`);
      return;
    }

    const audio = audioRefs.current[type] || audioRefs.current.notification;
    
    if (audio) {
      // Reset to beginning in case it's still playing
      audio.currentTime = 0;
      
      // Play the sound
      audio.play()
        .then(() => {
          console.log(`🔊 [${currentRole}] Sound played: ${type}`);
        })
        .catch(error => {
          console.warn(`⚠️ [${currentRole}] Could not play sound (${type}):`, error.message);
        });
    }
  }, []);

  /**
   * Play sound (vibration removed as per requirements)
   * @param {string} type - Type of sound
   */
  const playWithVibration = useCallback((type = "notification") => {
    // Just play the sound - vibration feature has been removed
    playSound(type);
  }, [playSound]);

  return {
    playSound,
    playWithVibration,
    hasInteracted,
  };
};

export default useNotificationSound;
