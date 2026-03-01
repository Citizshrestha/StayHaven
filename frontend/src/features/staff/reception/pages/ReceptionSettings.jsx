import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../../../../hooks/useTheme';
import { useStaffAuth } from '../../../../context/StaffAuthContext';
import { changePassword, updateProfilePicture, updateStaffProfile } from '../../../../api/staff';
import { toast } from 'react-toastify';
import {
  User,
  Bell,
  Moon,
  Sun,
  Monitor,
  Globe,
  Lock,
  Shield,
  Mail,
  Phone,
  Volume2,
  VolumeX,
  Eye,
  EyeOff,
  Save,
  Check,
  X,
  ChevronRight,
  Loader2,
  AlertCircle,
  RefreshCw,
  LogOut,
  Camera
} from 'lucide-react';
import './ReceptionSettings.css';

const ReceptionSettings = ({ onClose }) => {
  const { isDark, toggleTheme } = useTheme();
  const { staffUser, updateUser } = useStaffAuth();
  const [activeSection, setActiveSection] = useState('profile');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPic, setIsUploadingPic] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // User profile state — populated from auth context (backend data)
  const [profile, setProfile] = useState(() => {
    const nameParts = (staffUser?.fullname || 'Staff User').split(' ');
    return {
      firstName: nameParts[0] || '',
      lastName: nameParts.slice(1).join(' ') || '',
      email: staffUser?.email || '',
      phone: staffUser?.contact || '',
      username: staffUser?.username || '',
      role: staffUser?.role ? staffUser.role.charAt(0).toUpperCase() + staffUser.role.slice(1) : 'Receptionist',
      employeeId: staffUser?._id ? `EMP-${staffUser._id.slice(-8).toUpperCase()}` : '',
      department: 'Front Office',
      joinDate: staffUser?.createdAt || '',
    };
  });

  // Sync profile state when staffUser changes (e.g., after login refresh)
  useEffect(() => {
    if (staffUser) {
      const nameParts = (staffUser.fullname || 'Staff User').split(' ');
      setProfile(prev => ({
        ...prev,
        firstName: nameParts[0] || '',
        lastName: nameParts.slice(1).join(' ') || '',
        email: staffUser.email || '',
        phone: staffUser.contact || '',
        username: staffUser.username || '',
        role: staffUser.role ? staffUser.role.charAt(0).toUpperCase() + staffUser.role.slice(1) : 'Receptionist',
        employeeId: staffUser._id ? `EMP-${staffUser._id.slice(-8).toUpperCase()}` : '',
        joinDate: staffUser.createdAt || '',
      }));
    }
  }, [staffUser]);

  // Notification settings
  const [notifications, setNotifications] = useState({
    newBookings: true,
    checkInReminders: true,
    checkOutReminders: true,
    vipAlerts: true,
    housekeepingUpdates: false,
    maintenanceAlerts: true,
    guestRequests: true,
    systemUpdates: false,
    emailNotifications: true,
    soundEnabled: true,
    desktopNotifications: true
  });

  // Display settings
  const [display, setDisplay] = useState({
    theme: isDark ? 'dark' : 'light',
    language: 'en',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h',
    autoRefresh: true,
    refreshInterval: 30,
    compactView: false,
    showTips: true
  });

  // Password change state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [passwordError, setPasswordError] = useState('');

  // Profile picture: prefer staffUser.profilePicture from DB, fallback to localStorage
  const [profilePic, setProfilePic] = useState(() => {
    return staffUser?.profilePicture || null;
  });

  // Keep profilePic in sync with staffUser context (e.g., after login)
  useEffect(() => {
    if (staffUser?.profilePicture) {
      setProfilePic(staffUser.profilePicture);
    }
  }, [staffUser?.profilePicture]);

  const fileInputRef = useRef(null);

  // Upload profile picture to Cloudinary via backend
  const handleProfilePicChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    // Show a local preview immediately
    const reader = new FileReader();
    reader.onload = (event) => {
      setProfilePic(event.target.result);
    };
    reader.readAsDataURL(file);

    // Upload to backend → Cloudinary
    setIsUploadingPic(true);
    try {
      const data = await updateProfilePicture(file);
      if (data.success) {
        // Update with the actual Cloudinary URL
        setProfilePic(data.profilePicture);
        // Sync context and localStorage so it persists
        updateUser({ profilePicture: data.profilePicture });
        toast.success('Profile picture updated!');
      } else {
        toast.error(data.message || 'Failed to update profile picture');
      }
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to upload image';
      toast.error(msg);
      // Revert preview on failure
      setProfilePic(staffUser?.profilePicture || null);
    } finally {
      setIsUploadingPic(false);
      // Reset file input so same file can be re-selected if needed
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  useEffect(() => {
    setDisplay(prev => ({ ...prev, theme: isDark ? 'dark' : 'light' }));
  }, [isDark]);

  // Save profile info (name, phone) to backend DB
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const fullname = [profile.firstName, profile.lastName].filter(Boolean).join(' ').trim();
      const data = await updateStaffProfile({
        fullname: fullname || undefined,
        contact: profile.phone || undefined,
        username: profile.username || undefined,
      });

      if (data.success) {
        // Sync context and localStorage with updated user
        updateUser({
          fullname: data.user.fullname,
          contact: data.user.contact,
          username: data.user.username,
        });
        setSaveSuccess(true);
        toast.success('Profile saved successfully!');
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to save profile';
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    setPasswordError('');

    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setPasswordError('All fields are required');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return;
    }

    setIsSaving(true);
    try {
      const response = await changePassword(passwordForm.currentPassword, passwordForm.newPassword);
      if (response.success) {
        toast.success('Password changed successfully');
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to change password';
      setPasswordError(msg);
      // Show validation errors from backend if available
      if (error.response?.data?.errors) {
        setPasswordError(error.response.data.errors.join('. '));
      }
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleThemeChange = (theme) => {
    setDisplay(prev => ({ ...prev, theme }));
    if ((theme === 'dark' && !isDark) || (theme === 'light' && isDark)) {
      toggleTheme();
    }
  };

  const sections = [
    { id: 'profile', label: 'Profile', icon: <User size={18} /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell size={18} /> },
    { id: 'display', label: 'Display', icon: <Monitor size={18} /> },
    { id: 'security', label: 'Security', icon: <Shield size={18} /> }
  ];

  return (
    <div className={`reception-settings ${isDark ? 'dark' : ''} flex min-h-full`}>
      {/* Settings Navigation */}
      <div className="rs-sidebar w-64 p-6 flex-shrink-0">
        <h2 className="text-xl font-bold mb-6">Settings</h2>
        <nav className="rs-nav flex flex-col gap-1">
          {sections.map(section => (
            <button
              key={section.id}
              className={`rs-nav-item flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${activeSection === section.id ? 'active' : ''}`}
              onClick={() => setActiveSection(section.id)}
            >
              {section.icon}
              <span className="flex-1 text-left">{section.label}</span>
              <ChevronRight size={16} className="rs-nav-arrow opacity-50" />
            </button>
          ))}
        </nav>
      </div>

      {/* Settings Content */}
      <div className="rs-content flex-1 p-6 overflow-y-auto">
        {/* Profile Section */}
        {activeSection === 'profile' && (
          <div className="rs-section">
            <div className="rs-section-header mb-6">
              <h3 className="text-lg font-semibold mb-1">Profile Settings</h3>
              <p className="text-sm text-slate-500">Manage your personal information and account details</p>
            </div>

            <div className="rs-profile-card flex items-center gap-4 p-5 rounded-xl mb-6">
              <div
                className="rs-avatar w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold cursor-pointer relative overflow-hidden group"
                onClick={() => !isUploadingPic && fileInputRef.current?.click()}
                title={isUploadingPic ? 'Uploading...' : 'Click to change profile picture'}
                style={{ cursor: isUploadingPic ? 'wait' : 'pointer' }}
              >
                {profilePic ? (
                  <img src={profilePic} alt="Profile" className="rs-avatar-img" />
                ) : (
                  <span>{profile.firstName[0]}{profile.lastName?.[0] || ''}</span>
                )}
                <div className="rs-avatar-overlay">
                  {isUploadingPic ? <Loader2 size={18} className="animate-spin" /> : <Camera size={18} />}
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleProfilePicChange}
                  accept="image/jpeg,image/png,image/jpg,image/webp"
                  className="rs-file-input"
                  style={{ display: 'none' }}
                  disabled={isUploadingPic}
                />
              </div>
              <div className="rs-profile-info flex flex-col">
                <h4 className="text-lg font-semibold">{profile.firstName} {profile.lastName}</h4>
                <p className="text-sm">{profile.role}</p>
                <span className="rs-employee-id text-xs font-medium mt-1">{profile.employeeId}</span>
                {isUploadingPic && <span className="text-xs text-indigo-500 mt-1 animate-pulse">Uploading photo...</span>}
              </div>
            </div>

            <div className="rs-form flex flex-col gap-4">
              <div className="rs-form-row grid grid-cols-1 md:grid-cols-2 gap-4" style={{ animationDelay: '0.15s' }}>
                <div className="rs-form-group flex flex-col gap-2">
                  <label className="text-sm font-medium">First Name</label>
                  <input
                    type="text"
                    value={profile.firstName}
                    onChange={(e) => setProfile(prev => ({ ...prev, firstName: e.target.value }))}
                    className="h-11 px-4 rounded-xl text-sm"
                    placeholder="First name"
                  />
                </div>
                <div className="rs-form-group flex flex-col gap-2">
                  <label className="text-sm font-medium">Last Name</label>
                  <input
                    type="text"
                    value={profile.lastName}
                    onChange={(e) => setProfile(prev => ({ ...prev, lastName: e.target.value }))}
                    className="h-11 px-4 rounded-xl text-sm"
                    placeholder="Last name"
                  />
                </div>
              </div>

              <div className="rs-form-group flex flex-col gap-2">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <User size={16} className="text-slate-500" />
                  Username
                </label>
                <input
                  type="text"
                  value={profile.username}
                  onChange={(e) => setProfile(prev => ({ ...prev, username: e.target.value }))}
                  className="h-11 px-4 rounded-xl text-sm"
                  placeholder="username"
                />
              </div>

              <div className="rs-form-group disabled flex flex-col gap-2 opacity-60">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <Mail size={16} className="text-slate-500" />
                  Email Address
                  <span className="text-xs text-slate-400 font-normal">(read-only)</span>
                </label>
                <input
                  type="email"
                  value={profile.email}
                  readOnly
                  disabled
                  className="h-11 px-4 rounded-xl text-sm cursor-not-allowed"
                />
              </div>

              <div className="rs-form-group flex flex-col gap-2">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <Phone size={16} className="text-slate-500" />
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={profile.phone}
                  onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
                  className="h-11 px-4 rounded-xl text-sm"
                  placeholder="e.g. +977-9800000000"
                />
              </div>

              <div className="rs-form-row grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rs-form-group disabled flex flex-col gap-2 opacity-60">
                  <label className="text-sm font-medium">Department</label>
                  <input type="text" value={profile.department} disabled className="h-11 px-4 rounded-xl text-sm cursor-not-allowed" />
                </div>
                <div className="rs-form-group disabled flex flex-col gap-2 opacity-60">
                  <label className="text-sm font-medium">Member Since</label>
                  <input
                    type="text"
                    value={profile.joinDate ? new Date(profile.joinDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}
                    disabled
                    className="h-11 px-4 rounded-xl text-sm cursor-not-allowed"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Notifications Section */}
        {activeSection === 'notifications' && (
          <div className="rs-section">
            <div className="rs-section-header mb-6">
              <h3 className="text-lg font-semibold mb-1">Notification Preferences</h3>
              <p className="text-sm text-slate-500">Choose what notifications you want to receive</p>
            </div>

            <div className="rs-notification-group mb-6">
              <h4 className="text-sm font-semibold mb-4">Booking Notifications</h4>
              <div className="rs-toggle-list flex flex-col gap-3">
                <div className="rs-toggle-item flex items-center justify-between p-4 rounded-xl">
                  <div className="rs-toggle-info flex flex-col">
                    <span className="label text-sm font-medium">New Bookings</span>
                    <span className="description text-xs text-slate-500">Get notified when new bookings are made</span>
                  </div>
                  <label className="rs-toggle relative inline-block w-12 h-6">
                    <input
                      type="checkbox"
                      checked={notifications.newBookings}
                      onChange={(e) => setNotifications(prev => ({ ...prev, newBookings: e.target.checked }))}
                      className="sr-only"
                    />
                    <span className="rs-toggle-slider absolute inset-0 rounded-full cursor-pointer transition-all duration-200"></span>
                  </label>
                </div>

                <div className="rs-toggle-item flex items-center justify-between p-4 rounded-xl">
                  <div className="rs-toggle-info flex flex-col">
                    <span className="label text-sm font-medium">Check-in Reminders</span>
                    <span className="description text-xs text-slate-500">Reminders for upcoming guest arrivals</span>
                  </div>
                  <label className="rs-toggle relative inline-block w-12 h-6">
                    <input
                      type="checkbox"
                      checked={notifications.checkInReminders}
                      onChange={(e) => setNotifications(prev => ({ ...prev, checkInReminders: e.target.checked }))}
                      className="sr-only"
                    />
                    <span className="rs-toggle-slider absolute inset-0 rounded-full cursor-pointer transition-all duration-200"></span>
                  </label>
                </div>

                <div className="rs-toggle-item flex items-center justify-between p-4 rounded-xl">
                  <div className="rs-toggle-info flex flex-col">
                    <span className="label text-sm font-medium">Check-out Reminders</span>
                    <span className="description text-xs text-slate-500">Alerts for guest departures</span>
                  </div>
                  <label className="rs-toggle relative inline-block w-12 h-6">
                    <input
                      type="checkbox"
                      checked={notifications.checkOutReminders}
                      onChange={(e) => setNotifications(prev => ({ ...prev, checkOutReminders: e.target.checked }))}
                      className="sr-only"
                    />
                    <span className="rs-toggle-slider absolute inset-0 rounded-full cursor-pointer transition-all duration-200"></span>
                  </label>
                </div>

                <div className="rs-toggle-item flex items-center justify-between p-4 rounded-xl">
                  <div className="rs-toggle-info flex flex-col">
                    <span className="label text-sm font-medium">VIP Guest Alerts</span>
                    <span className="description text-xs text-slate-500">Priority notifications for VIP arrivals</span>
                  </div>
                  <label className="rs-toggle relative inline-block w-12 h-6">
                    <input
                      type="checkbox"
                      checked={notifications.vipAlerts}
                      onChange={(e) => setNotifications(prev => ({ ...prev, vipAlerts: e.target.checked }))}
                      className="sr-only"
                    />
                    <span className="rs-toggle-slider absolute inset-0 rounded-full cursor-pointer transition-all duration-200"></span>
                  </label>
                </div>
              </div>
            </div>

            <div className="rs-notification-group mb-6">
              <h4 className="text-sm font-semibold mb-4">Operations Notifications</h4>
              <div className="rs-toggle-list flex flex-col gap-3">
                <div className="rs-toggle-item flex items-center justify-between p-4 rounded-xl">
                  <div className="rs-toggle-info flex flex-col">
                    <span className="label text-sm font-medium">Housekeeping Updates</span>
                    <span className="description text-xs text-slate-500">Room cleaning status changes</span>
                  </div>
                  <label className="rs-toggle relative inline-block w-12 h-6">
                    <input
                      type="checkbox"
                      checked={notifications.housekeepingUpdates}
                      onChange={(e) => setNotifications(prev => ({ ...prev, housekeepingUpdates: e.target.checked }))}
                      className="sr-only"
                    />
                    <span className="rs-toggle-slider absolute inset-0 rounded-full cursor-pointer transition-all duration-200"></span>
                  </label>
                </div>

                <div className="rs-toggle-item flex items-center justify-between p-4 rounded-xl">
                  <div className="rs-toggle-info flex flex-col">
                    <span className="label text-sm font-medium">Maintenance Alerts</span>
                    <span className="description text-xs text-slate-500">Room maintenance issues and updates</span>
                  </div>
                  <label className="rs-toggle relative inline-block w-12 h-6">
                    <input
                      type="checkbox"
                      checked={notifications.maintenanceAlerts}
                      onChange={(e) => setNotifications(prev => ({ ...prev, maintenanceAlerts: e.target.checked }))}
                      className="sr-only"
                    />
                    <span className="rs-toggle-slider absolute inset-0 rounded-full cursor-pointer transition-all duration-200"></span>
                  </label>
                </div>

                <div className="rs-toggle-item flex items-center justify-between p-4 rounded-xl">
                  <div className="rs-toggle-info flex flex-col">
                    <span className="label text-sm font-medium">Guest Requests</span>
                    <span className="description text-xs text-slate-500">Special requests from guests</span>
                  </div>
                  <label className="rs-toggle relative inline-block w-12 h-6">
                    <input
                      type="checkbox"
                      checked={notifications.guestRequests}
                      onChange={(e) => setNotifications(prev => ({ ...prev, guestRequests: e.target.checked }))}
                      className="sr-only"
                    />
                    <span className="rs-toggle-slider absolute inset-0 rounded-full cursor-pointer transition-all duration-200"></span>
                  </label>
                </div>
              </div>
            </div>

            <div className="rs-notification-group mb-6">
              <h4 className="text-sm font-semibold mb-4">Delivery Methods</h4>
              <div className="rs-toggle-list flex flex-col gap-3">
                <div className="rs-toggle-item flex items-center justify-between p-4 rounded-xl">
                  <div className="rs-toggle-info flex items-center gap-3">
                    <Mail size={18} className="text-slate-500 flex-shrink-0" />
                    <div className="flex flex-col">
                      <span className="label text-sm font-medium">Email Notifications</span>
                      <span className="description text-xs text-slate-500">Receive notifications via email</span>
                    </div>
                  </div>
                  <label className="rs-toggle relative inline-block w-12 h-6">
                    <input
                      type="checkbox"
                      checked={notifications.emailNotifications}
                      onChange={(e) => setNotifications(prev => ({ ...prev, emailNotifications: e.target.checked }))}
                      className="sr-only"
                    />
                    <span className="rs-toggle-slider absolute inset-0 rounded-full cursor-pointer transition-all duration-200"></span>
                  </label>
                </div>

                <div className="rs-toggle-item flex items-center justify-between p-4 rounded-xl">
                  <div className="rs-toggle-info flex items-center gap-3">
                    {notifications.soundEnabled ? <Volume2 size={18} className="text-slate-500 flex-shrink-0" /> : <VolumeX size={18} className="text-slate-500 flex-shrink-0" />}
                    <div className="flex flex-col">
                      <span className="label text-sm font-medium">Sound Notifications</span>
                      <span className="description text-xs text-slate-500">Play sound for new notifications</span>
                    </div>
                  </div>
                  <label className="rs-toggle relative inline-block w-12 h-6">
                    <input
                      type="checkbox"
                      checked={notifications.soundEnabled}
                      onChange={(e) => setNotifications(prev => ({ ...prev, soundEnabled: e.target.checked }))}
                      className="sr-only"
                    />
                    <span className="rs-toggle-slider absolute inset-0 rounded-full cursor-pointer transition-all duration-200"></span>
                  </label>
                </div>

                <div className="rs-toggle-item flex items-center justify-between p-4 rounded-xl">
                  <div className="rs-toggle-info flex items-center gap-3">
                    <Monitor size={18} className="text-slate-500 flex-shrink-0" />
                    <div className="flex flex-col">
                      <span className="label text-sm font-medium">Desktop Notifications</span>
                      <span className="description text-xs text-slate-500">Show browser push notifications</span>
                    </div>
                  </div>
                  <label className="rs-toggle relative inline-block w-12 h-6">
                    <input
                      type="checkbox"
                      checked={notifications.desktopNotifications}
                      onChange={(e) => setNotifications(prev => ({ ...prev, desktopNotifications: e.target.checked }))}
                      className="sr-only"
                    />
                    <span className="rs-toggle-slider absolute inset-0 rounded-full cursor-pointer transition-all duration-200"></span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Display Section */}
        {activeSection === 'display' && (
          <div className="rs-section">
            <div className="rs-section-header mb-6">
              <h3 className="text-lg font-semibold mb-1">Display Settings</h3>
              <p className="text-sm text-slate-500">Customize how the application looks and behaves</p>
            </div>

            <div className="rs-display-group mb-6">
              <h4 className="text-sm font-semibold mb-4">Theme</h4>
              <div className="rs-theme-options flex gap-4">
                <button
                  className={`rs-theme-option flex flex-col items-center gap-3 p-5 rounded-xl transition-all duration-200 flex-1 ${display.theme === 'light' ? 'active' : ''}`}
                  onClick={() => handleThemeChange('light')}
                >
                  <Sun size={24} />
                  <span className="text-sm font-medium">Light</span>
                </button>
                <button
                  className={`rs-theme-option flex flex-col items-center gap-3 p-5 rounded-xl transition-all duration-200 flex-1 ${display.theme === 'dark' ? 'active' : ''}`}
                  onClick={() => handleThemeChange('dark')}
                >
                  <Moon size={24} />
                  <span className="text-sm font-medium">Dark</span>
                </button>
              </div>
            </div>

            <div className="rs-display-group mb-6">
              <h4 className="text-sm font-semibold mb-4">Regional Settings</h4>
              <div className="rs-form-row grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="rs-form-group flex flex-col gap-2">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <Globe size={16} className="text-slate-500" />
                    Language
                  </label>
                  <select
                    value={display.language}
                    onChange={(e) => setDisplay(prev => ({ ...prev, language: e.target.value }))}
                    className="h-11 px-4 rounded-xl text-sm"
                  >
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                    <option value="de">German</option>
                    <option value="np">Nepali</option>
                  </select>
                </div>
                <div className="rs-form-group flex flex-col gap-2">
                  <label className="text-sm font-medium">Date Format</label>
                  <select
                    value={display.dateFormat}
                    onChange={(e) => setDisplay(prev => ({ ...prev, dateFormat: e.target.value }))}
                    className="h-11 px-4 rounded-xl text-sm"
                  >
                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                  </select>
                </div>
              </div>
              <div className="rs-form-group flex flex-col gap-2">
                <label className="text-sm font-medium">Time Format</label>
                <div className="rs-radio-group flex gap-6">
                  <label className="rs-radio flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="timeFormat"
                      value="12h"
                      checked={display.timeFormat === '12h'}
                      onChange={(e) => setDisplay(prev => ({ ...prev, timeFormat: e.target.value }))}
                      className="w-4 h-4"
                    />
                    <span className="rs-radio-mark"></span>
                    <span className="text-sm">12-hour (AM/PM)</span>
                  </label>
                  <label className="rs-radio flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="timeFormat"
                      value="24h"
                      checked={display.timeFormat === '24h'}
                      onChange={(e) => setDisplay(prev => ({ ...prev, timeFormat: e.target.value }))}
                      className="w-4 h-4"
                    />
                    <span className="rs-radio-mark"></span>
                    <span className="text-sm">24-hour</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="rs-display-group mb-6">
              <h4 className="text-sm font-semibold mb-4">Dashboard Settings</h4>
              <div className="rs-toggle-list flex flex-col gap-3">
                <div className="rs-toggle-item flex items-center justify-between p-4 rounded-xl">
                  <div className="rs-toggle-info flex items-center gap-3">
                    <RefreshCw size={18} className="text-slate-500 flex-shrink-0" />
                    <div>
                      <span className="label text-sm font-medium block">Auto-refresh Dashboard</span>
                      <span className="description text-xs text-slate-500">Automatically refresh data at regular intervals</span>
                    </div>
                  </div>
                  <label className="rs-toggle relative inline-block w-12 h-6">
                    <input
                      type="checkbox"
                      checked={display.autoRefresh}
                      onChange={(e) => setDisplay(prev => ({ ...prev, autoRefresh: e.target.checked }))}
                      className="sr-only"
                    />
                    <span className="rs-toggle-slider absolute inset-0 rounded-full cursor-pointer transition-all duration-200"></span>
                  </label>
                </div>

                {display.autoRefresh && (
                  <div className="rs-form-group indent flex flex-col gap-2 ml-8">
                    <label className="text-sm font-medium">Refresh Interval (seconds)</label>
                    <select
                      value={display.refreshInterval}
                      onChange={(e) => setDisplay(prev => ({ ...prev, refreshInterval: parseInt(e.target.value) }))}
                      className="h-11 px-4 rounded-xl text-sm"
                    >
                      <option value="15">15 seconds</option>
                      <option value="30">30 seconds</option>
                      <option value="60">1 minute</option>
                      <option value="120">2 minutes</option>
                    </select>
                  </div>
                )}

                <div className="rs-toggle-item flex items-center justify-between p-4 rounded-xl">
                  <div className="rs-toggle-info flex items-center gap-3">
                    <div>
                      <span className="label text-sm font-medium block">Compact View</span>
                      <span className="description text-xs text-slate-500">Show more items with less spacing</span>
                    </div>
                  </div>
                  <label className="rs-toggle relative inline-block w-12 h-6">
                    <input
                      type="checkbox"
                      checked={display.compactView}
                      onChange={(e) => setDisplay(prev => ({ ...prev, compactView: e.target.checked }))}
                      className="sr-only"
                    />
                    <span className="rs-toggle-slider absolute inset-0 rounded-full cursor-pointer transition-all duration-200"></span>
                  </label>
                </div>

                <div className="rs-toggle-item flex items-center justify-between p-4 rounded-xl">
                  <div className="rs-toggle-info flex items-center gap-3">
                    <div>
                      <span className="label text-sm font-medium block">Show Tips & Hints</span>
                      <span className="description text-xs text-slate-500">Display helpful tips throughout the dashboard</span>
                    </div>
                  </div>
                  <label className="rs-toggle relative inline-block w-12 h-6">
                    <input
                      type="checkbox"
                      checked={display.showTips}
                      onChange={(e) => setDisplay(prev => ({ ...prev, showTips: e.target.checked }))}
                      className="sr-only"
                    />
                    <span className="rs-toggle-slider absolute inset-0 rounded-full cursor-pointer transition-all duration-200"></span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Security Section */}
        {activeSection === 'security' && (
          <div className="rs-section">
            <div className="rs-section-header mb-6">
              <h3 className="text-lg font-semibold mb-1">Security Settings</h3>
              <p className="text-sm text-slate-500">Manage your password and account security</p>
            </div>

            <div className="rs-security-card p-5 rounded-xl mb-6">
              <div className="rs-security-header flex items-center gap-4 mb-5">
                <Lock size={24} className="text-blue-500" />
                <div>
                  <h4 className="text-base font-semibold">Change Password</h4>
                  <p className="text-sm text-slate-500">Update your account password</p>
                </div>
              </div>

              <div className="rs-form flex flex-col gap-4">
                <div className="rs-form-group flex flex-col gap-2">
                  <label className="text-sm font-medium">Current Password</label>
                  <div className="rs-password-input relative">
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                      placeholder="Enter current password"
                      className="h-11 w-full px-4 pr-12 rounded-xl text-sm"
                    />
                    <button
                      type="button"
                      className="rs-password-toggle absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-700 transition-colors"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    >
                      {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="rs-form-group flex flex-col gap-2">
                  <label className="text-sm font-medium">New Password</label>
                  <div className="rs-password-input relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                      placeholder="Enter new password"
                      className="h-11 w-full px-4 pr-12 rounded-xl text-sm"
                    />
                    <button
                      type="button"
                      className="rs-password-toggle absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-700 transition-colors"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    >
                      {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="rs-form-group flex flex-col gap-2">
                  <label className="text-sm font-medium">Confirm New Password</label>
                  <input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    placeholder="Confirm new password"
                    className="h-11 w-full px-4 rounded-xl text-sm"
                  />
                </div>

                {passwordError && (
                  <div className="rs-error flex items-center gap-2 p-3 rounded-lg text-red-600 bg-red-50">
                    <AlertCircle size={16} />
                    <span className="text-sm">{passwordError}</span>
                  </div>
                )}

                <button className="rs-change-password-btn flex items-center justify-center gap-2 h-11 px-5 rounded-xl text-sm font-medium transition-all duration-200" onClick={handlePasswordChange} disabled={isSaving}>
                  {isSaving ? <Loader2 className="rs-spinner animate-spin" size={18} /> : <Lock size={18} />}
                  Change Password
                </button>
              </div>
            </div>

            <div className="rs-security-info p-5 rounded-xl mb-6">
              <h4 className="text-sm font-semibold mb-3">Security Tips</h4>
              <ul className="flex flex-col gap-2 text-sm text-slate-600">
                <li className="flex items-center gap-2">Use a strong password with at least 8 characters</li>
                <li className="flex items-center gap-2">Include uppercase, lowercase, numbers, and symbols</li>
                <li className="flex items-center gap-2">Don't share your password with anyone</li>
                <li className="flex items-center gap-2">Change your password regularly</li>
              </ul>
            </div>

            <div className="rs-session-card p-5 rounded-xl flex items-center justify-between">
              <div className="rs-session-header flex items-center gap-3">
                <LogOut size={20} className="text-slate-500" />
                <div>
                  <h4 className="text-sm font-semibold">Active Sessions</h4>
                  <p className="text-xs text-slate-500">You're logged in on this device</p>
                </div>
              </div>
              <button className="rs-logout-all-btn px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200">
                Sign Out All Other Sessions
              </button>
            </div>
          </div>
        )}

        {/* Save Button */}
        <div className="rs-actions sticky bottom-0 p-5 border-t mt-auto">
          <button className="rs-save-btn flex items-center justify-center gap-2 h-11 px-6 rounded-xl text-sm font-medium transition-all duration-200" onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="rs-spinner animate-spin" size={18} />
                Saving...
              </>
            ) : saveSuccess ? (
              <>
                <Check size={18} className="text-emerald-200" />
                Saved!
              </>
            ) : (
              <>
                <Save size={18} />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReceptionSettings;
