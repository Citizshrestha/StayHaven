import React, { useState } from 'react';
import axiosClient from '../../axiosClient';
import './Mybooking.css';

export default function UserSettings({ embedded = false, onNavigate }) {
  const [changingPassword, setChangingPassword] = useState(false);
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');

  const handleChangePassword = async () => {
    if (newPass !== confirmPass) {
      return alert('New password and confirmation do not match');
    }
    setChangingPassword(true);
    try {
      const token = localStorage.getItem('accessToken');
      if (token) {
        await axiosClient.post('/api/auth/change-password', { oldPassword: oldPass, newPassword: newPass });
        alert('Password changed');
      } else {
        alert('No auth token available — cannot change password here.');
      }
      setOldPass(''); setNewPass(''); setConfirmPass('');
      if (onNavigate) onNavigate('home');
    } catch (err) {
      console.error(err);
      alert('Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="mybooking-root">
      <div className="mybooking-header">
        <h2>Settings</h2>
      </div>

      <div className="mybooking-content">
        <section style={{ maxWidth: 640 }}>
          <h3>Security</h3>
          <label>Old password</label>
          <input type="password" value={oldPass} onChange={(e) => setOldPass(e.target.value)} />
          <label>New password</label>
          <input type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)} />
          <label>Confirm new password</label>
          <input type="password" value={confirmPass} onChange={(e) => setConfirmPass(e.target.value)} />
          <div style={{ marginTop: 12 }}>
            <button className="primary" onClick={handleChangePassword} disabled={changingPassword}>{changingPassword ? 'Saving…' : 'Change Password'}</button>
          </div>
        </section>

        <section style={{ marginTop: 24 }}>
          <h3>Preferences</h3>
          <p>You can toggle email notifications and other preferences in the full app settings (not implemented in demo).</p>
        </section>
      </div>
    </div>
  );
}
