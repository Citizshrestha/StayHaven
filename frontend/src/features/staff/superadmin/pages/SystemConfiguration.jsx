import React, { useState, useEffect, useCallback, useRef } from 'react';
import SuperAdminLayout from './SuperAdminLayout';
import MaintenanceMessageModal from '../components/MaintenanceMessageModal';
import { useStaffAuth } from '../../../../core/context/StaffAuthContext';
import { toast } from 'react-toastify';
import {
  getProfile,
  updateProfile,
  updateProfilePicture,
  uploadProfilePictureFile,
  changePassword
} from '../../../../core/api/services/profile.service';
import {
  getPlatformSettings,
  updatePlatformSettings,
  toggleMaintenanceMode,
  testKhaltiWebhook,
  testSmtp,
  getIntegrationStatus,
} from '../../../../core/api/services/systemConfig.service';
import './SystemConfiguration.css';

const SystemConfiguration = () => {
  const { updateUser, staffUser } = useStaffAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [profileError, setProfileError] = useState(null);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [togglingMaintenance, setTogglingMaintenance] = useState(false);

  // Profile state
  const [profile, setProfile] = useState(null);
  const [profileForm, setProfileForm] = useState({
    fullname: '',
    username: '',
    email: '',
  });
  const [profilePictureUrl, setProfilePictureUrl] = useState('');
  const [pictureUploadMode, setPictureUploadMode] = useState('file');
  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState('');
  const fileInputRef = useRef(null);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPicture, setSavingPicture] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [showPasswordFields, setShowPasswordFields] = useState(false);

  // Platform settings state
  const [settings, setSettings] = useState(null);
  const [integrations, setIntegrations] = useState(null);

  useEffect(() => {
    if (activeTab === 'profile') loadProfile();
    else if (activeTab === 'platform') loadSettings();
    else if (activeTab === 'integrations') loadIntegrations();
    else if (activeTab === 'maintenance') loadSettings();
  }, [activeTab]);

  const syncStaffContext = useCallback((userData, refreshAvatar = false) => {
    if (!userData) return;
    updateUser({
      fullname: userData.fullname,
      username: userData.username,
      email: userData.email,
      profilePicture: userData.profilePicture,
      ...(refreshAvatar ? { avatarUpdatedAt: Date.now() } : {}),
    });
    localStorage.setItem('email', userData.email || '');
    localStorage.setItem('username', userData.username || '');
  }, [updateUser]);

  const loadProfile = async () => {
    setLoading(true);
    setProfileError(null);
    try {
      const result = await getProfile();
      const userData = result.data;
      setProfile(userData);
      setProfileForm({
        fullname: userData.fullname || '',
        username: userData.username || '',
        email: userData.email || '',
      });
      setProfilePictureUrl(userData.profilePicture || '');
      syncStaffContext(userData);
    } catch (error) {
      const message = error?.response?.data?.message || 'Failed to load profile';
      setProfileError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    setLoading(true);
    try {
      const result = await getPlatformSettings();
      setSettings(result.data);
    } catch (error) {
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const loadIntegrations = async () => {
    setLoading(true);
    try {
      const result = await getIntegrationStatus();
      setIntegrations(result.data);
    } catch (error) {
      toast.error('Failed to load integration status');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();

    if (!profileForm.fullname.trim() || !profileForm.username.trim() || !profileForm.email.trim()) {
      toast.error('All fields are required');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(profileForm.email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setSavingProfile(true);
    try {
      const result = await updateProfile(profileForm);
      const userData = result.data;
      setProfile(userData);
      syncStaffContext(userData);
      toast.success('Profile updated successfully');
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const applyProfilePictureUpdate = (userData) => {
    setProfile(userData);
    setProfilePictureUrl(userData.profilePicture || '');
    syncStaffContext(userData, true);
  };

  const activeProfilePicture = staffUser?.profilePicture || profile?.profilePicture;
  const profileAvatarSrc = imagePreviewUrl || (
    activeProfilePicture
      ? `${activeProfilePicture}${activeProfilePicture.includes('?') ? '&' : '?'}v=${staffUser?.avatarUpdatedAt || 0}`
      : ''
  );

  const handleUpdateProfilePictureUrl = async () => {
    if (!profilePictureUrl.trim()) {
      toast.error('Please enter a valid image URL');
      return;
    }

    setSavingPicture(true);
    try {
      const result = await updateProfilePicture(profilePictureUrl.trim());
      applyProfilePictureUpdate(result.data);
      toast.success('Profile picture updated successfully');
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to update profile picture');
    } finally {
      setSavingPicture(false);
    }
  };

  const handleImageFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      e.target.value = '';
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only JPEG, PNG, and WEBP images are allowed');
      e.target.value = '';
      return;
    }

    setSelectedImageFile(file);
    setImagePreviewUrl(URL.createObjectURL(file));
  };

  const handleUploadProfilePictureFile = async () => {
    if (!selectedImageFile) {
      toast.error('Please select an image file');
      return;
    }

    setSavingPicture(true);
    try {
      const result = await uploadProfilePictureFile(selectedImageFile);
      applyProfilePictureUpdate(result.data);
      setSelectedImageFile(null);
      setImagePreviewUrl('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      toast.success('Profile picture updated successfully');
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to upload profile picture');
    } finally {
      setSavingPicture(false);
    }
  };

  const clearSelectedImage = () => {
    setSelectedImageFile(null);
    setImagePreviewUrl('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast.error('All password fields are required');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return;
    }

    setChangingPassword(true);
    try {
      await changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });
      toast.success('Password changed successfully');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowPasswordFields(false);
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleUpdateSettings = async (updates) => {
    try {
      await updatePlatformSettings(updates);
      toast.success('Settings updated successfully');
      loadSettings();
    } catch (error) {
      toast.error('Failed to update settings');
    }
  };

  const handleToggleMaintenance = async () => {
    if (!settings) return;

    if (!settings.maintenanceMode) {
      setShowMaintenanceModal(true);
      return;
    }

    setTogglingMaintenance(true);
    try {
      await toggleMaintenanceMode({ enabled: false, message: settings.maintenanceMessage });
      toast.success('Maintenance mode disabled');
      loadSettings();
    } catch (error) {
      toast.error('Failed to toggle maintenance mode');
    } finally {
      setTogglingMaintenance(false);
    }
  };

  const handleConfirmMaintenance = async (message) => {
    setTogglingMaintenance(true);
    try {
      await toggleMaintenanceMode({ enabled: true, message });
      toast.success('Maintenance mode enabled');
      setShowMaintenanceModal(false);
      loadSettings();
    } catch (error) {
      toast.error('Failed to toggle maintenance mode');
    } finally {
      setTogglingMaintenance(false);
    }
  };

  const handleTestKhalti = async () => {
    try {
      const result = await testKhaltiWebhook();
      if (result.data.connected) {
        toast.success(`Khalti connected successfully (${result.data.latency}ms)`);
      } else {
        toast.error('Khalti connection failed');
      }
      loadIntegrations();
    } catch (error) {
      toast.error('Failed to test Khalti connection');
    }
  };

  const handleTestSmtp = async () => {
    try {
      const result = await testSmtp();
      if (result.data.sent) {
        toast.success('SMTP test email sent successfully');
      } else {
        toast.error('SMTP test failed');
      }
    } catch (error) {
      toast.error('Failed to test SMTP');
    }
  };

  const getInitials = () => {
    if (!profile) return 'SA';
    const name = profile.fullname || profile.username || 'SuperAdmin';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <SuperAdminLayout pageTitle="System Configuration">
      <div className="system-config-page">
        <div className="config-header">
          <div className="tab-navigation">
            <button
              className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
              onClick={() => setActiveTab('profile')}
            >
              <span className="material-symbols-outlined">person</span>
              Profile
            </button>
            <button
              className={`tab-btn ${activeTab === 'platform' ? 'active' : ''}`}
              onClick={() => setActiveTab('platform')}
            >
              <span className="material-symbols-outlined">settings</span>
              Platform
            </button>
            <button
              className={`tab-btn ${activeTab === 'integrations' ? 'active' : ''}`}
              onClick={() => setActiveTab('integrations')}
            >
              <span className="material-symbols-outlined">extension</span>
              Integrations
            </button>
            <button
              className={`tab-btn ${activeTab === 'maintenance' ? 'active' : ''}`}
              onClick={() => setActiveTab('maintenance')}
            >
              <span className="material-symbols-outlined">construction</span>
              Maintenance
            </button>
          </div>
        </div>

        {loading && (
          (activeTab === 'profile' && !profile && !profileError) ||
          (activeTab !== 'profile' && !settings && !integrations)
        ) ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading...</p>
          </div>
        ) : activeTab === 'profile' && profileError && !profile ? (
          <div className="profile-error-state">
            <span className="material-symbols-outlined">error</span>
            <h3>Unable to load profile</h3>
            <p>{profileError}</p>
            <button type="button" className="btn-primary" onClick={loadProfile}>
              Retry
            </button>
          </div>
        ) : (
          <>
            {/* PROFILE TAB */}
            {activeTab === 'profile' && profile && (
              <div className="profile-tab">
                <div className="profile-container">
                  {/* Profile Picture Section */}
                  <div className="profile-section profile-picture-section">
                    <div className="section-header">
                      <h3>
                        <span className="material-symbols-outlined">account_circle</span>
                        Profile Picture
                      </h3>
                      <p className="section-description">
                        Upload an image file to Cloudinary or use a direct image URL
                      </p>
                    </div>

                    <div className="profile-picture-content">
                      <div className="profile-avatar-large">
                        {profileAvatarSrc ? (
                          <img
                            key={profileAvatarSrc}
                            src={profileAvatarSrc}
                            alt={profile.fullname}
                          />
                        ) : (
                          <span className="avatar-initials">{getInitials()}</span>
                        )}
                      </div>

                      <div className="profile-picture-form">
                        <div className="picture-mode-toggle">
                          <button
                            type="button"
                            className={`picture-mode-btn ${pictureUploadMode === 'file' ? 'active' : ''}`}
                            onClick={() => setPictureUploadMode('file')}
                          >
                            <span className="material-symbols-outlined">upload_file</span>
                            Upload File
                          </button>
                          <button
                            type="button"
                            className={`picture-mode-btn ${pictureUploadMode === 'url' ? 'active' : ''}`}
                            onClick={() => setPictureUploadMode('url')}
                          >
                            <span className="material-symbols-outlined">link</span>
                            Image URL
                          </button>
                        </div>

                        {pictureUploadMode === 'file' ? (
                          <div className="file-upload-section">
                            <input
                              ref={fileInputRef}
                              id="profilePictureFile"
                              type="file"
                              accept="image/jpeg,image/png,image/jpg,image/webp"
                              className="file-input-hidden"
                              onChange={handleImageFileSelect}
                            />
                            <label htmlFor="profilePictureFile" className="file-drop-zone">
                              <span className="material-symbols-outlined">cloud_upload</span>
                              <span className="file-drop-title">
                                {selectedImageFile ? selectedImageFile.name : 'Choose an image or drag here'}
                              </span>
                              <span className="file-drop-hint">JPEG, PNG, WEBP up to 5MB</span>
                            </label>
                            <small className="form-hint">
                              Saved to Cloudinary: StayHaven/superadmin/{profile.username}/profilepic
                            </small>
                            <div className="picture-action-row">
                              {selectedImageFile && (
                                <button type="button" className="btn-ghost" onClick={clearSelectedImage} disabled={savingPicture}>
                                  Clear
                                </button>
                              )}
                              <button
                                type="button"
                                className="btn-primary"
                                onClick={handleUploadProfilePictureFile}
                                disabled={savingPicture || !selectedImageFile}
                              >
                                {savingPicture ? (
                                  <>
                                    <div className="btn-spinner"></div>
                                    Updating...
                                  </>
                                ) : (
                                  <>
                                    <span className="material-symbols-outlined">save</span>
                                    Update
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="url-upload-section">
                            <div className="form-group">
                              <label htmlFor="profilePicture">
                                Image URL
                                <span className="required">*</span>
                              </label>
                              <input
                                id="profilePicture"
                                type="url"
                                className="form-input"
                                placeholder="https://example.com/image.jpg"
                                value={profilePictureUrl}
                                onChange={(e) => setProfilePictureUrl(e.target.value)}
                              />
                              <small className="form-hint">Enter a direct link to your profile image</small>
                            </div>
                            <button
                              type="button"
                              className="btn-primary"
                              onClick={handleUpdateProfilePictureUrl}
                              disabled={savingPicture || !profilePictureUrl.trim()}
                            >
                              {savingPicture ? (
                                <>
                                  <div className="btn-spinner"></div>
                                  Updating...
                                </>
                              ) : (
                                <>
                                  <span className="material-symbols-outlined">save</span>
                                  Update
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Profile Information Section */}
                  <div className="profile-section">
                    <div className="section-header">
                      <h3>
                        <span className="material-symbols-outlined">badge</span>
                        Profile Information
                      </h3>
                      <p className="section-description">Manage your personal information and account details</p>
                    </div>

                    <form onSubmit={handleUpdateProfile} className="profile-form">
                      <div className="form-row">
                        <div className="form-group">
                          <label htmlFor="fullname">
                            Full Name
                            <span className="required">*</span>
                          </label>
                          <input
                            id="fullname"
                            type="text"
                            className="form-input"
                            placeholder="Enter your full name"
                            value={profileForm.fullname}
                            onChange={(e) => setProfileForm({ ...profileForm, fullname: e.target.value })}
                            required
                          />
                        </div>

                        <div className="form-group">
                          <label htmlFor="username">
                            Username
                            <span className="required">*</span>
                          </label>
                          <input
                            id="username"
                            type="text"
                            className="form-input"
                            placeholder="Enter your username"
                            value={profileForm.username}
                            onChange={(e) => setProfileForm({ ...profileForm, username: e.target.value })}
                            required
                          />
                        </div>
                      </div>

                      <div className="form-group">
                        <label htmlFor="email">
                          Email Address
                          <span className="required">*</span>
                        </label>
                        <input
                          id="email"
                          type="email"
                          className="form-input"
                          placeholder="Enter your email address"
                          value={profileForm.email}
                          onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label>Role</label>
                        <input
                          type="text"
                          className="form-input"
                          value={profile.role?.name || profile.companyRole || 'SuperAdmin'}
                          disabled
                          readOnly
                        />
                        <small className="form-hint">Your role cannot be changed</small>
                      </div>

                      <div className="form-actions">
                        <button
                          type="submit"
                          className="btn-primary"
                          disabled={savingProfile}
                        >
                          {savingProfile ? (
                            <>
                              <div className="btn-spinner"></div>
                              Saving...
                            </>
                          ) : (
                            <>
                              <span className="material-symbols-outlined">save</span>
                              Save Changes
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Password Section */}
                  <div className="profile-section">
                    <div className="section-header">
                      <h3>
                        <span className="material-symbols-outlined">lock</span>
                        Password & Security
                      </h3>
                      <p className="section-description">Change your password to keep your account secure</p>
                    </div>

                    {!showPasswordFields ? (
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => setShowPasswordFields(true)}
                      >
                        <span className="material-symbols-outlined">lock_reset</span>
                        Change Password
                      </button>
                    ) : (
                      <form onSubmit={handleChangePassword} className="profile-form">
                        <div className="form-group">
                          <label htmlFor="currentPassword">
                            Current Password
                            <span className="required">*</span>
                          </label>
                          <input
                            id="currentPassword"
                            type="password"
                            className="form-input"
                            placeholder="Enter your current password"
                            value={passwordForm.currentPassword}
                            onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                            required
                          />
                        </div>

                        <div className="form-group">
                          <label htmlFor="newPassword">
                            New Password
                            <span className="required">*</span>
                          </label>
                          <input
                            id="newPassword"
                            type="password"
                            className="form-input"
                            placeholder="Enter your new password"
                            value={passwordForm.newPassword}
                            onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                            required
                          />
                          <small className="form-hint">
                            Must be at least 8 characters with uppercase, lowercase, number, and special character
                          </small>
                        </div>

                        <div className="form-group">
                          <label htmlFor="confirmPassword">
                            Confirm New Password
                            <span className="required">*</span>
                          </label>
                          <input
                            id="confirmPassword"
                            type="password"
                            className="form-input"
                            placeholder="Confirm your new password"
                            value={passwordForm.confirmPassword}
                            onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                            required
                          />
                        </div>

                        <div className="form-actions">
                          <button
                            type="button"
                            className="btn-ghost"
                            onClick={() => {
                              setShowPasswordFields(false);
                              setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                            }}
                            disabled={changingPassword}
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="btn-primary"
                            disabled={changingPassword}
                          >
                            {changingPassword ? (
                              <>
                                <div className="btn-spinner"></div>
                                Changing...
                              </>
                            ) : (
                              <>
                                <span className="material-symbols-outlined">check</span>
                                Change Password
                              </>
                            )}
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* PLATFORM TAB */}
            {activeTab === 'platform' && settings && (
              <div className="platform-tab">
                <div className="settings-card">
                  <h3>Platform Settings</h3>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const formData = new FormData(e.target);
                      const updates = {
                        currency: formData.get('currency'),
                        timezone: formData.get('timezone'),
                        locale: formData.get('locale'),
                        dateFormat: formData.get('dateFormat'),
                        globalCommissionRate: parseFloat(formData.get('globalCommissionRate')),
                      };
                      handleUpdateSettings(updates);
                    }}
                  >
                    <div className="form-group">
                      <label>Currency</label>
                      <input type="text" name="currency" defaultValue={settings.currency} readOnly />
                      <small>Currency is fixed to NRS for Nepal market</small>
                    </div>

                    <div className="form-group">
                      <label>Timezone</label>
                      <select name="timezone" defaultValue={settings.timezone}>
                        <option value="Asia/Kathmandu">Asia/Kathmandu</option>
                        <option value="UTC">UTC</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Locale</label>
                      <select name="locale" defaultValue={settings.locale}>
                        <option value="ne-NP">Nepali (ne-NP)</option>
                        <option value="en-US">English (en-US)</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Date Format</label>
                      <select name="dateFormat" defaultValue={settings.dateFormat}>
                        <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                        <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                        <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Global Commission Rate (%)</label>
                      <input
                        type="number"
                        name="globalCommissionRate"
                        defaultValue={settings.globalCommissionRate}
                        min="0"
                        max="100"
                        step="0.1"
                      />
                    </div>

                    <button type="submit" className="btn-primary">
                      Save Settings
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* INTEGRATIONS TAB */}
            {activeTab === 'integrations' && integrations && (
              <div className="integrations-tab">
                <div className="integration-card">
                  <div className="integration-header">
                    <h3>Khalti Payment Gateway</h3>
                    <span className={`status-indicator ${integrations.khalti.configured ? 'active' : 'inactive'}`}>
                      {integrations.khalti.configured ? 'Configured' : 'Not Configured'}
                    </span>
                  </div>
                  <div className="integration-details">
                    <p>Webhook Status: <strong>{integrations.khalti.webhookStatus}</strong></p>
                    <p>Mode: <strong>{integrations.khalti.isLive ? 'Live' : 'Test'}</strong></p>
                  </div>
                  <button className="btn-secondary" onClick={handleTestKhalti}>
                    Test Connection
                  </button>
                </div>

                <div className="integration-card">
                  <div className="integration-header">
                    <h3>SMTP Email Service</h3>
                    <span className={`status-indicator ${integrations.smtp.configured ? 'active' : 'inactive'}`}>
                      {integrations.smtp.configured ? 'Configured' : 'Not Configured'}
                    </span>
                  </div>
                  <button className="btn-secondary" onClick={handleTestSmtp}>
                    Send Test Email
                  </button>
                </div>

                <div className="integration-card">
                  <div className="integration-header">
                    <h3>Cloudinary Media Storage</h3>
                    <span className={`status-indicator ${integrations.cloudinary.configured ? 'active' : 'inactive'}`}>
                      {integrations.cloudinary.configured ? 'Configured' : 'Not Configured'}
                    </span>
                  </div>
                </div>

                <div className="integration-card">
                  <div className="integration-header">
                    <h3>Sentry Error Tracking</h3>
                    <span className={`status-indicator ${integrations.sentry.configured ? 'active' : 'inactive'}`}>
                      {integrations.sentry.configured ? 'Configured' : 'Not Configured'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* MAINTENANCE TAB */}
            {activeTab === 'maintenance' && settings && (
              <div className="maintenance-tab">
                <div className="maintenance-card">
                  <div className="maintenance-status">
                    <h3>Maintenance Mode</h3>
                    <div className={`status-large ${settings.maintenanceMode ? 'maintenance-on' : 'online'}`}>
                      {settings.maintenanceMode ? (
                        <>
                          <span className="material-symbols-outlined">warning</span>
                          MAINTENANCE MODE
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined">check_circle</span>
                          ONLINE
                        </>
                      )}
                    </div>
                  </div>

                  {settings.maintenanceMode && (
                    <div className="maintenance-info">
                      <p><strong>Message:</strong> {settings.maintenanceMessage}</p>
                      {settings.maintenanceScheduledEnd && (
                        <p>
                          <strong>Scheduled End:</strong>{' '}
                          {new Date(settings.maintenanceScheduledEnd).toLocaleString()}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="maintenance-warning">
                    <span className="material-symbols-outlined">info</span>
                    <p>
                      {settings.maintenanceMode
                        ? 'Guest-facing website pages are showing the maintenance message. Staff portals remain active.'
                        : 'Enabling maintenance mode will show a maintenance message on the public website. Staff dashboards will continue to work.'}
                    </p>
                  </div>

                  <button
                    className={`btn-large ${settings.maintenanceMode ? 'btn-success' : 'btn-danger'}`}
                    onClick={handleToggleMaintenance}
                    disabled={togglingMaintenance}
                  >
                    {togglingMaintenance
                      ? 'Updating...'
                      : settings.maintenanceMode
                        ? 'Disable Maintenance Mode'
                        : 'Enable Maintenance Mode'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
        <MaintenanceMessageModal
          isOpen={showMaintenanceModal}
          defaultMessage={settings?.maintenanceMessage}
          onConfirm={handleConfirmMaintenance}
          onCancel={() => setShowMaintenanceModal(false)}
          isSubmitting={togglingMaintenance}
        />
      </div>
    </SuperAdminLayout>
  );
};

export default SystemConfiguration;
