import { useCallback, useEffect, useState } from "react";
import {
  playAlert,
  getAudioState,
  onAudioStateChange,
  installGestureUnlock,
  unlockAudio,
} from "../audio/alertSounds";

// Maps a sound type to the "ALERT TYPES" chip that governs it in the waiter /
// kitchen Settings > Notifications. Types not listed (e.g. waiter calls) are
// always allowed — they're not opt-out.
const SOUND_TYPE_TO_ALERT_TYPE = {
  newOrder: "newOrders",
  orderReady: "ready",
};

const readJSON = (key) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

/**
 * Is this sound type enabled in the current staff member's settings?
 * Read from storage on every call so a change in Settings applies instantly.
 */
export const isSoundEnabledInSettings = (type) => {
  const role = sessionStorage.getItem("staffRole");

  if (role === "receptionist") {
    const settings = readJSON("receptionSettings");
    return settings?.soundEnabled !== false; // default on
  }

  const storageKey =
    role === "chief" || role === "kitchen" ? "kitchenSettings"
      : role === "waiter" ? "waiterSettings"
        : null;
  if (!storageKey) return true;

  const settings = readJSON(storageKey);
  if (!settings) return true;
  if (settings.sound === false) return false;

  const alertType = SOUND_TYPE_TO_ALERT_TYPE[type];
  if (alertType && Array.isArray(settings.alertTypes)) {
    let types = settings.alertTypes;
    // The old default was only ["newOrders"], which silently muted the
    // "order ready" sound for anyone who ever saved settings. Treat that
    // untouched legacy default as including "ready"; settings saved after this
    // change carry alertTypesV2 and are respected exactly.
    if (!settings.alertTypesV2 && types.length === 1 && types[0] === "newOrders") {
      types = ["newOrders", "ready"];
    }
    return types.includes(alertType);
  }
  return true;
};

/**
 * Notification sounds for staff dashboards.
 * @returns {{ playSound, playWithVibration, hasInteracted, audioState, enableSound }}
 *  - audioState: 'running' | 'suspended' | 'unsupported'
 *  - enableSound(): call from a click handler to unlock audio (plays a test chime)
 */
const useNotificationSound = () => {
  const [audioState, setAudioState] = useState(getAudioState);

  useEffect(() => {
    installGestureUnlock();
    setAudioState(getAudioState());
    return onAudioStateChange(setAudioState);
  }, []);

  const playSound = useCallback((type = "notification") => {
    if (!isSoundEnabledInSettings(type)) return false;
    return playAlert(type);
  }, []);

  // Vibration was removed; kept as an alias so existing callers keep working.
  const playWithVibration = playSound;

  const enableSound = useCallback(async () => {
    const ok = await unlockAudio();
    if (ok) playAlert("notification", { force: true });
    return ok;
  }, []);

  return {
    playSound,
    playWithVibration,
    hasInteracted: audioState === "running",
    audioState,
    enableSound,
  };
};

export default useNotificationSound;
