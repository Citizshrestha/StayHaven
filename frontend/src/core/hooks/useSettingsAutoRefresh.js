import { useEffect, useRef } from "react";

const INTERVAL_MS = {
  "30s": 30_000,
  "1m": 60_000,
  "2m": 120_000,
  "5m": 300_000,
};

/**
 * Reads the "Auto-refresh" interval from Settings (kitchenSettings /
 * waiterSettings in localStorage) and periodically calls `fetchFn` as a
 * reconciliation safety net on top of the primary socket-driven updates.
 *
 * Live-updates when the setting is changed in the currently open tab via
 * the "staff-settings-updated" event dispatched by StaffSettings on save.
 *
 * @param {string} storageKey - "kitchenSettings" | "waiterSettings"
 * @param {Function} fetchFn - called with { silent: true } on each tick
 */
const useSettingsAutoRefresh = (storageKey, fetchFn) => {
  const fetchFnRef = useRef(fetchFn);
  fetchFnRef.current = fetchFn;

  useEffect(() => {
    let intervalId = null;

    const readIntervalMs = () => {
      try {
        const saved = localStorage.getItem(storageKey);
        const settings = saved ? JSON.parse(saved) : null;
        return INTERVAL_MS[settings?.autoRefresh] || null;
      } catch {
        return null;
      }
    };

    const setup = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
      const ms = readIntervalMs();
      if (ms) {
        intervalId = setInterval(() => {
          fetchFnRef.current?.({ silent: true });
        }, ms);
      }
    };

    setup();

    // Re-read the interval whenever settings are saved in this tab
    window.addEventListener("staff-settings-updated", setup);

    return () => {
      if (intervalId) clearInterval(intervalId);
      window.removeEventListener("staff-settings-updated", setup);
    };
  }, [storageKey]);
};

export default useSettingsAutoRefresh;
