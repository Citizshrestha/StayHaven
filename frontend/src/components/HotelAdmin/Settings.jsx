import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import './HoteladminDashboard.css';

const DEFAULTS = {
  hotelName: '',
  hotelAddress: '',
  timeZone: 'UTC',
  adminEmail: '',
  numberOfUsers: 1,
  bookingPlatform: '',
  paymentGateway: '',
  language: 'en',
  theme: 'light',
  dataRetention: 365,
  privacyPolicyUrl: ''
};

const Settings = () => {
  const [form, setForm] = useState(DEFAULTS);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('hotel_settings');
      if (raw) setForm(JSON.parse(raw));
    } catch (e) {
      // ignore
    }
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;
    setForm(prev => ({ ...prev, [name]: val }));
    setErrors(prev => ({ ...prev, [name]: undefined }));
  };

  const validate = () => {
    const err = {};
    if (!form.hotelName || form.hotelName.trim().length < 2) err.hotelName = 'Enter hotel name';
    if (form.adminEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.adminEmail)) err.adminEmail = 'Invalid email';
    if (!form.adminEmail) err.adminEmail = 'Admin email required';
    if (!Number.isFinite(Number(form.dataRetention)) || Number(form.dataRetention) < 0) err.dataRetention = 'Invalid number';
    return err;
  };

  const handleSave = async (e) => {
    e && e.preventDefault();
    const err = validate();
    if (Object.keys(err).length) {
      setErrors(err);
      toast.error('Please fix errors');
      return;
    }

    setSaving(true);
    // Simulate save API
    setTimeout(() => {
      try {
        localStorage.setItem('hotel_settings', JSON.stringify(form));
        toast.success('Settings saved');
      } catch (e) {
        toast.error('Failed to save settings');
      } finally {
        setSaving(false);
      }
    }, 700);
  };

  const handleReset = () => {
    setForm(DEFAULTS);
    setErrors({});
    toast.info('Reset to defaults (local only)');
  };

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h1>Settings</h1>
        <p>Manage your hotel's settings and configurations.</p>
      </div>

      <form className="settings-form" onSubmit={handleSave}>
        <details open>
          <summary>General Settings</summary>
          <div className="form-grid">
            <div className="form-row">
              <label>Hotel Name</label>
              <input name="hotelName" value={form.hotelName} onChange={handleChange} placeholder="My Hotel" />
              {errors.hotelName && <div className="form-error">{errors.hotelName}</div>}
            </div>

            <div className="form-row">
              <label>Hotel Address</label>
              <input name="hotelAddress" value={form.hotelAddress} onChange={handleChange} placeholder="Street, City" />
            </div>

            <div className="form-row">
              <label>Time Zone</label>
              <select name="timeZone" value={form.timeZone} onChange={handleChange}>
                <option value="UTC">UTC</option>
                <option value="America/New_York">America/New_York</option>
                <option value="Europe/London">Europe/London</option>
                <option value="Asia/Kathmandu">Asia/Kathmandu</option>
              </select>
            </div>
          </div>
        </details>

        <details>
          <summary>User Management</summary>
          <div className="form-grid">
            <div className="form-row">
              <label>Admin Email</label>
              <input type="email" name="adminEmail" value={form.adminEmail} onChange={handleChange} placeholder="admin@hotel.com" />
              {errors.adminEmail && <div className="form-error">{errors.adminEmail}</div>}
            </div>

            <div className="form-row">
              <label>Number of Users</label>
              <input type="number" min={1} name="numberOfUsers" value={form.numberOfUsers} onChange={handleChange} />
            </div>
          </div>
        </details>

        <details>
          <summary>Integrations</summary>
          <div className="form-grid">
            <div className="form-row">
              <label>Booking Platform</label>
              <input name="bookingPlatform" value={form.bookingPlatform} onChange={handleChange} placeholder="e.g., Booking.com" />
            </div>

            <div className="form-row">
              <label>Payment Gateway</label>
              <input name="paymentGateway" value={form.paymentGateway} onChange={handleChange} placeholder="Stripe, PayPal" />
            </div>
          </div>
        </details>

        <details>
          <summary>System Preferences</summary>
          <div className="form-grid">
            <div className="form-row">
              <label>Language</label>
              <select name="language" value={form.language} onChange={handleChange}>
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
              </select>
            </div>

            <div className="form-row">
              <label>Theme</label>
              <select name="theme" value={form.theme} onChange={handleChange}>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="teal">Teal</option>
              </select>
            </div>
          </div>
        </details>

        <details>
          <summary>Data & Privacy</summary>
          <div className="form-grid">
            <div className="form-row">
              <label>Data Retention (days)</label>
              <input type="number" min={0} name="dataRetention" value={form.dataRetention} onChange={handleChange} />
              {errors.dataRetention && <div className="form-error">{errors.dataRetention}</div>}
            </div>

            <div className="form-row">
              <label>Privacy Policy URL</label>
              <input name="privacyPolicyUrl" value={form.privacyPolicyUrl} onChange={handleChange} placeholder="https://" />
            </div>
          </div>
        </details>

        <div className="settings-actions">
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save Settings'}
          </button>
          <button type="button" className="btn-secondary" onClick={handleReset} style={{ marginLeft: 12 }}>
            Reset
          </button>
        </div>
      </form>
    </div>
  );
};

export default Settings;
