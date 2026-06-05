import React from 'react';
import './MaintenanceOverlay.css';

const MaintenanceOverlay = ({ message, scheduledEnd }) => {
  return (
    <div className="maintenance-overlay" role="dialog" aria-modal="true" aria-labelledby="maintenance-title">
      <div className="maintenance-overlay-backdrop" />
      <div className="maintenance-overlay-card">
        <div className="maintenance-overlay-icon">
          <span className="material-symbols-outlined">construction</span>
        </div>
        <h2 id="maintenance-title">We'll Be Back Soon</h2>
        <p className="maintenance-overlay-message">
          {message || "Under maintenance. We'll be back soon!"}
        </p>
        {scheduledEnd && (
          <p className="maintenance-overlay-schedule">
            Expected back: {new Date(scheduledEnd).toLocaleString()}
          </p>
        )}
        <p className="maintenance-overlay-hint">
          Staff members can continue using{' '}
          <a href="/staff/login">Staff Portal</a>.
        </p>
      </div>
    </div>
  );
};

export default MaintenanceOverlay;
