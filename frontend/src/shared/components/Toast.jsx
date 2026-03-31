/* eslint-disable react-refresh/only-export-components */
/**
 * Toast Notification System
 * 
 * A lightweight, self-contained toast notification system for the reception dashboard.
 * No external dependencies — uses pure React + CSS.
 * 
 * Usage:
 *   import { toast, ToastContainer } from './Toast';
 * 
 *   // In your component JSX (render once at the app/dashboard level):
 *   <ToastContainer />
 * 
 *   // To show toasts anywhere:
 *   toast.success('Booking created!');
 *   toast.error('Failed to check in guest.');
 *   toast.info('Room 204 is now available.');
 *   toast.warning('Payment is still pending.');
 */

import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react';

// ── Global event bus for toasts ──
const listeners = new Set();
let toastId = 0;

const emit = (type, message, options = {}) => {
  const id = ++toastId;
  const toast = { id, type, message, duration: options.duration || 4000, ...options };
  listeners.forEach((fn) => fn(toast));
  return id;
};

export const toast = {
  success: (msg, opts) => emit('success', msg, opts),
  error: (msg, opts) => emit('error', msg, { duration: 6000, ...opts }),
  info: (msg, opts) => emit('info', msg, opts),
  warning: (msg, opts) => emit('warning', msg, { duration: 5000, ...opts }),
};

// ── Config per type ──
const CONFIG = {
  success: { icon: CheckCircle, bg: 'linear-gradient(135deg, #059669, #10b981)', border: '#34d399' },
  error: { icon: XCircle, bg: 'linear-gradient(135deg, #dc2626, #ef4444)', border: '#f87171' },
  info: { icon: Info, bg: 'linear-gradient(135deg, #2563eb, #3b82f6)', border: '#60a5fa' },
  warning: { icon: AlertTriangle, bg: 'linear-gradient(135deg, #d97706, #f59e0b)', border: '#fbbf24' },
};

// ── Single Toast Item ──
const ToastItem = ({ toast: t, onRemove }) => {
  const [exiting, setExiting] = useState(false);
  const cfg = CONFIG[t.type] || CONFIG.info;
  const Icon = cfg.icon;

  const handleClose = useCallback(() => {
    setExiting(true);
    setTimeout(() => onRemove(t.id), 300);
  }, [t.id, onRemove]);

  useEffect(() => {
    const timer = setTimeout(() => handleClose(), t.duration);
    return () => clearTimeout(timer);
  }, [t.duration, handleClose]);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '14px 18px',
        borderRadius: '12px',
        background: cfg.bg,
        boxShadow: '0 8px 32px rgba(0,0,0,0.25), 0 2px 8px rgba(0,0,0,0.15)',
        color: '#fff',
        fontSize: '14px',
        fontWeight: '500',
        fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
        maxWidth: '420px',
        minWidth: '300px',
        backdropFilter: 'blur(8px)',
        border: `1px solid ${cfg.border}33`,
        animation: exiting ? 'toast-exit 0.3s ease-in forwards' : 'toast-enter 0.35s ease-out',
        pointerEvents: 'all',
        cursor: 'default',
        lineHeight: '1.4',
      }}
      role="alert"
      aria-live="assertive"
    >
      <Icon size={20} style={{ flexShrink: 0, opacity: 0.95 }} />
      <span style={{ flex: 1 }}>{t.message}</span>
      <button
        onClick={handleClose}
        style={{
          background: 'rgba(255,255,255,0.15)',
          border: 'none',
          borderRadius: '6px',
          padding: '4px',
          cursor: 'pointer',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          transition: 'background 0.2s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.25)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  );
};

// ── Toast Container ──
export const ToastContainer = () => {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const handler = (t) => setToasts((prev) => [...prev, t]);
    listeners.add(handler);
    return () => listeners.delete(handler);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  if (toasts.length === 0) return null;

  return (
    <>
      <style>{`
        @keyframes toast-enter {
          from { opacity: 0; transform: translateX(40px) scale(0.95); }
          to { opacity: 1; transform: translateX(0) scale(1); }
        }
        @keyframes toast-exit {
          from { opacity: 1; transform: translateX(0) scale(1); }
          to { opacity: 0; transform: translateX(40px) scale(0.95); }
        }
      `}</style>
      <div
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 99999,
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          pointerEvents: 'none',
        }}
        aria-label="Notifications"
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onRemove={removeToast} />
        ))}
      </div>
    </>
  );
};

export default toast;
