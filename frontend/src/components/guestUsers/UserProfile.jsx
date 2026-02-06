import React, { useState, useEffect } from 'react';
import axiosClient from '../../axiosClient';
import './Mybooking.css';

export default function UserProfile({ embedded = false, onNavigate }) {
  const [user, setUser] = useState({ username: '', email: '', phone: '', location: '', profilePicture: '' });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const username = localStorage.getItem('username');
    const email = localStorage.getItem('email');
    const phone = localStorage.getItem('phone');
    const profilePicture = localStorage.getItem('profilePicture');
    setUser(prev => ({ ...prev, username: username || '', email: email || '', phone: phone || '', profilePicture: profilePicture || '' }));
  }, []);

  const handleChange = (k, v) => setUser(prev => ({ ...prev, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      // Try to call user profile update endpoint if available
      const token = localStorage.getItem('accessToken');
      if (token) {
        await axiosClient.patch('/api/user/profile', user);
      }

      // persist locally as fallback
      if (user.username) localStorage.setItem('username', user.username);
      if (user.email) localStorage.setItem('email', user.email);
      if (user.phone) localStorage.setItem('phone', user.phone);

      alert('Profile saved');
      if (onNavigate) onNavigate('home');
    } catch (err) {
      console.error(err);
      setError('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mybooking-root">
      <div className="mybooking-header">
        <h2>Profile</h2>
        <div className="header-actions">
          <button className="primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </div>

      <div className="mybooking-content">
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 12 }}>
          <img src={user.profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username || 'Guest')}`} alt="avatar" style={{ width: 72, height: 72, borderRadius: 12, objectFit: 'cover' }} />
          <div style={{ flex: 1 }}>
            <label>Username</label>
            <input value={user.username} onChange={(e) => handleChange('username', e.target.value)} />
            <label style={{ marginTop: 8 }}>Email</label>
            <input value={user.email} onChange={(e) => handleChange('email', e.target.value)} />
            <label style={{ marginTop: 8 }}>Phone</label>
            <input value={user.phone} onChange={(e) => handleChange('phone', e.target.value)} />
            <label style={{ marginTop: 8 }}>Location</label>
            <input value={user.location} onChange={(e) => handleChange('location', e.target.value)} />
          </div>
        </div>

        {error && <div className="status error">{error}</div>}
      </div>
    </div>
  );
}
