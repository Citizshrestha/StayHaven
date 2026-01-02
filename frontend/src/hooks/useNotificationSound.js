/**
 * useNotificationSound Hook
 * 
 * This hook manages sound notifications for the waiter dashboard.
 * 
 * WHY SOUND NOTIFICATIONS?
 * In a busy restaurant, waiters can't always look at their screen.
 * Sound notifications alert them immediately when:
 * - A new order arrives
 * - An order is ready for pickup
 * - A guest calls for assistance
 * 
 * BROWSER LIMITATIONS:
 * - Browsers block autoplay of sounds by default
 * - User must interact with page first (click, tap, etc.)
 * - We handle this by playing a silent sound on first interaction
 */

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

/**
 * Custom hook for playing notification sounds
 * @returns {object} - { playSound, isEnabled, setIsEnabled, hasInteracted }
 */
const useNotificationSound = () => {
  // Refs to store Audio objects (persist across renders)
  const audioRefs = useRef({});
  
  // State for sound enabled/disabled (persisted in localStorage)
  const [isEnabled, setIsEnabled] = useState(() => {
    const saved = localStorage.getItem("waiterSettings");
    if (saved) {
      const settings = JSON.parse(saved);
      return settings.sound !== false; // Default to true
    }
    return true;
  });

  // Track if user has interacted with page (required for autoplay)
  const [hasInteracted, setHasInteracted] = useState(false);

  // Initialize Audio objects
  useEffect(() => {
    Object.entries(SOUND_URLS).forEach(([key, url]) => {
      const audio = new Audio(url);
      audio.preload = "auto";
      audio.volume = 0.7; // 70% volume
      audioRefs.current[key] = audio;
    });

    // Cleanup on unmount
    return () => {
      Object.values(audioRefs.current).forEach(audio => {
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
        // Play a silent "unlock" to enable audio
        Object.values(audioRefs.current).forEach(audio => {
          audio.play().then(() => {
            audio.pause();
            audio.currentTime = 0;
          }).catch(() => {
            // Ignore errors - will work after more interaction
          });
        });
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

  // Save preference to localStorage when changed
  useEffect(() => {
    const saved = localStorage.getItem("waiterSettings");
    const settings = saved ? JSON.parse(saved) : {};
    settings.sound = isEnabled;
    localStorage.setItem("waiterSettings", JSON.stringify(settings));
  }, [isEnabled]);

  /**
   * Play a notification sound
   * @param {string} type - Type of sound: 'newOrder', 'orderReady', 'waiterCall', 'notification'
   */
  const playSound = useCallback((type = "notification") => {
    // Don't play if disabled or browser hasn't allowed audio yet
    if (!isEnabled) {
      console.log("🔇 Sound disabled by user");
      return;
    }

    const audio = audioRefs.current[type] || audioRefs.current.notification;
    
    if (audio) {
      // Reset to beginning in case it's still playing
      audio.currentTime = 0;
      
      // Play the sound
      audio.play().catch(error => {
        console.warn("⚠️ Could not play sound:", error.message);
        // This usually happens if user hasn't interacted with page yet
      });
    }
  }, [isEnabled]);

  /**
   * Play sound with vibration (for mobile devices)
   * @param {string} type - Type of sound
   */
  const playWithVibration = useCallback((type = "notification") => {
    playSound(type);
    
    // Vibrate if supported and enabled
    const saved = localStorage.getItem("waiterSettings");
    const settings = saved ? JSON.parse(saved) : {};
    
    if (settings.vibration && navigator.vibrate) {
      // Different vibration patterns for different notifications
      switch (type) {
        case "waiterCall":
          navigator.vibrate([200, 100, 200, 100, 200]); // Urgent pattern
          break;
        case "orderReady":
          navigator.vibrate([200, 100, 200]); // Medium pattern
          break;
        default:
          navigator.vibrate(200); // Single vibration
      }
    }
  }, [playSound]);

  return {
    playSound,
    playWithVibration,
    isEnabled,
    setIsEnabled,
    hasInteracted,
  };
};

export default useNotificationSound;
