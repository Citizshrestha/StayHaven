import { useEffect, useRef, useCallback } from "react";

/**
 * Hook to handle auto-refresh functionality
 * @param {Function} fetchFunction - The function to call on refresh
 * @param {string} interval - Interval string: "off", "30s", "1m", "2m", "5m"
 * @param {boolean} enabled - Whether auto-refresh is enabled
 */
export const useAutoRefresh = (fetchFunction, interval = "off", enabled = true) => {
  const intervalRef = useRef(null);
  const fetchRef = useRef(fetchFunction);

  // Keep fetch function ref updated
  useEffect(() => {
    fetchRef.current = fetchFunction;
  }, [fetchFunction]);

  // Convert interval string to milliseconds
  const getIntervalMs = useCallback((intervalStr) => {
    switch (intervalStr) {
      case "30s":
        return 30 * 1000;
      case "1m":
        return 60 * 1000;
      case "2m":
        return 2 * 60 * 1000;
      case "5m":
        return 5 * 60 * 1000;
      case "off":
      default:
        return null;
    }
  }, []);

  useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // If disabled or interval is "off", don't set up new interval
    if (!enabled || interval === "off") {
      return;
    }

    const ms = getIntervalMs(interval);
    if (!ms) return;

    // Set up the interval
    intervalRef.current = setInterval(() => {
      console.log(`[Auto-refresh] Refreshing at ${new Date().toLocaleTimeString()}`);
      fetchRef.current();
    }, ms);

    // Cleanup on unmount or when dependencies change
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [interval, enabled, getIntervalMs]);

  // Return a function to manually trigger refresh
  const manualRefresh = useCallback(() => {
    fetchRef.current();
  }, []);

  return { manualRefresh };
};

export default useAutoRefresh;