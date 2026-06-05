import React, { useEffect, useState } from 'react';
import './MaintenanceMessageModal.css';

const MaintenanceMessageModal = ({
  isOpen,
  defaultMessage,
  onConfirm,
  onCancel,
  isSubmitting = false,
}) => {
  const [message, setMessage] = useState(defaultMessage || '');

  useEffect(() => {
    if (isOpen) {
      setMessage(defaultMessage || "Under maintenance. We'll be back soon!");
    }
  }, [isOpen, defaultMessage]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = message.trim();
    if (!trimmed) return;
    onConfirm(trimmed);
  };

  return (
    <div className="maint-msg-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="maint-msg-title">
      <div className="maint-msg-modal-backdrop" onClick={onCancel} />
      <div className="maint-msg-modal">
        <div className="maint-msg-modal-header">
          <span className="material-symbols-outlined">construction</span>
          <h3 id="maint-msg-title">Enable Maintenance Mode</h3>
        </div>
        <p className="maint-msg-modal-desc">
          Guest-facing website pages will show this message. Staff portals and dashboards will continue to work normally.
        </p>
        <form onSubmit={handleSubmit}>
          <label htmlFor="maintenanceMessage">Maintenance Message</label>
          <textarea
            id="maintenanceMessage"
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Under maintenance. We'll be back soon!"
            required
          />
          <div className="maint-msg-modal-actions">
            <button type="button" className="btn-ghost" onClick={onCancel} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="btn-danger" disabled={isSubmitting || !message.trim()}>
              {isSubmitting ? 'Enabling...' : 'Enable Maintenance'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MaintenanceMessageModal;
