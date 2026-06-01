import { useCallback, useEffect, useRef, useState } from 'react';
import { getContentSocket } from '../core/socket/contentSocket';

const normalizePayload = (response) => {
  const payload = response?.data?.data ?? response?.data ?? response;
  if (Array.isArray(payload)) return payload;
  if (payload == null) return [];
  return [payload];
};

const typeMatches = (eventType, contentType) => {
  if (!eventType || !contentType) return true;
  if (eventType === contentType) return true;

  const aliases = {
    'hero-banner': 'hero-banners',
    destination: 'destinations',
    offer: 'offers',
    membership: 'memberships',
    footer: 'footer',
    about: 'about',
    'site-settings': 'site-settings',
    'featured-hotels': 'featured-hotels',
  };

  return aliases[eventType] === contentType;
};

export const useContent = (contentType, fetchFn, options = {}) => {
  const { initialData = [], pollInterval = 60000, enabled = true } = options;
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(Boolean(enabled));
  const [error, setError] = useState(null);
  const mountedRef = useRef(false);
  const fetchRef = useRef(fetchFn);

  useEffect(() => {
    fetchRef.current = fetchFn;
  }, [fetchFn]);

  const refetch = useCallback(async () => {
    if (!enabled || typeof fetchRef.current !== 'function') return [];

    setLoading(true);
    setError(null);
    try {
      const response = await fetchRef.current();
      const normalized = normalizePayload(response);
      if (mountedRef.current) setData(normalized);
      return normalized;
    } catch (err) {
      if (mountedRef.current) setError(err);
      return [];
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    mountedRef.current = true;
    if (!enabled) {
      setLoading(false);
      return () => {
        mountedRef.current = false;
      };
    }

    let pollTimer;
    const socket = getContentSocket();

    const schedulePolling = () => {
      window.clearInterval(pollTimer);
      pollTimer = window.setInterval(() => {
        if (!socket.connected) refetch();
      }, pollInterval);
    };

    const handleUpdate = (payload) => {
      if (typeMatches(payload?.type, contentType)) refetch();
    };

    refetch();
    socket.on('content:updated', handleUpdate);
    socket.on('connect_error', schedulePolling);
    socket.on('disconnect', schedulePolling);
    socket.on('connect', () => window.clearInterval(pollTimer));
    schedulePolling();

    return () => {
      mountedRef.current = false;
      window.clearInterval(pollTimer);
      socket.off('content:updated', handleUpdate);
      socket.off('connect_error', schedulePolling);
      socket.off('disconnect', schedulePolling);
      socket.off('connect');
    };
  }, [contentType, enabled, pollInterval, refetch]);

  return { data, loading, error, refetch, setData };
};

export default useContent;
