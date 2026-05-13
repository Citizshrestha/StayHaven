import { useState, useRef, useEffect } from "react";
import {
  Bell, Settings as SettingsIcon, Zap, X,
  ChevronRight, Lock, Eye, EyeOff, Camera
} from "lucide-react";
import { useStaffAuth } from "../../context/StaffAuthContext";
import { toast } from "react-toastify";
import { changePassword } from "../../api/auth";
import { useTheme } from "../../hooks/useTheme";
import axiosClient from "../../axiosClient";
import "../WaiterDashboard/settings/WaiterSettings.css";

/**
 * Unified Settings component for both Waiter and Kitchen dashboards
 * @param {Object} props
 * @param {Function} props.onClose - Function to close the settings modal
 * @param {('waiter'|'kitchen')} props.variant - Which dashboard variant (controls Quick Actions visibility)
 */
const StaffSettings = ({ onClose, variant = "waiter" }) => {
  const { staffUser, updateUser } = useStaffAuth();
  const { theme, setTheme } = useTheme();
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [isUploadingPic, setIsUploadingPic] = useState(false);
  const fileInputRef = useRef(null);
  const [passwordState, setPasswordState] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Determine storage key based on variant
  const storageKey = variant === "kitchen" ? "kitchenSettings" : "waiterSettings";
  const defaultName = variant === "kitchen" ? "Kitchen Staff" : "Staff Member";

  // Settings state (with localStorage persistence)
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem(storageKey);
    const defaultSettings = {
      // Notifications
      sound: true,
      alertTypes: ["newOrders"],
      // Display
      theme: theme || "light",
      autoRefresh: "1m",
      // Quick Actions (only for waiter)
      quickActions: ["Print Bill", "Split Table"],
    };
    
    if (saved) {
      try {
        return { ...defaultSettings, ...JSON.parse(saved) };
      } catch {
        return defaultSettings;
      }
    }
    return defaultSettings;
  });

  // Sync settings theme with actual theme on mount only
  useEffect(() => {
    if (theme && settings.theme !== theme) {
      setSettings(prev => ({ ...prev, theme }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);

  // Profile picture upload handlers
  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Only JPEG, PNG, and WEBP images are allowed");
      return;
    }

    setIsUploadingPic(true);
    try {
      const formData = new FormData();
      formData.append("profilePicture", file);

      const response = await axiosClient.patch("/api/staff/profile-picture", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (response.data.success && updateUser) {
        updateUser({ profilePicture: response.data.profilePicture });
      }

      toast.success("Profile picture updated!");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to upload image");
    } finally {
      setIsUploadingPic(false);
      if (e.target) e.target.value = "";
    }
  };

  // Save settings to localStorage
  const updateSetting = (key, value) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
  };

  // Toggle alert type
  const toggleAlertType = (type) => {
    const current = settings.alertTypes || [];
    const updated = current.includes(type)
      ? current.filter(t => t !== type)
      : [...current, type];
    updateSetting("alertTypes", updated);
  };

  // Handle password change
  const handleChangePassword = async () => {
    if (!passwordState.currentPassword || !passwordState.newPassword || !passwordState.confirmPassword) {
      toast.error("Please fill all fields!");
      return;
    }

    if (passwordState.newPassword !== passwordState.confirmPassword) {
      toast.error("New Passwords do not match");
      return;
    }

    if (passwordState.newPassword.length < 6) {
      toast.error("New password must be at least 6 characters long");
      return;
    }

    if (passwordState.currentPassword === passwordState.newPassword) {
      toast.error("New password must be different from current password");
      return;
    }

    setIsChangingPassword(true);

    try {
      await changePassword(passwordState.currentPassword, passwordState.newPassword);
      toast.success("Password Changed Successfully!");
      setShowChangePassword(false);
      setPasswordState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to change password");
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Handle save
  const handleSave = () => {
    localStorage.setItem(storageKey, JSON.stringify(settings));

    // Apply theme on save
    if (settings.theme !== theme) {
      setTheme(settings.theme);
    }

    toast.success("Settings saved!");
    onClose();
  };

  // Handle cancel - reset settings to saved state
  const handleCancel = () => {
    setShowChangePassword(false);
    onClose();
  };

  return (
    <div className="ws-container">
      {/* Header */}
      <div className="ws-header">
        <h1 className="ws-title">Settings</h1>
        <button onClick={handleCancel} className="ws-close-btn">
          <X size={20} />
        </button>
      </div>

      {/* Content */}
      <div className="ws-content">
        {/* Profile Section */}
        <div className="ws-profile-section">
          {/* Hidden file input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/jpeg,image/png,image/jpg,image/webp"
            style={{ display: "none" }}
          />

          {/* Clickable Avatar */}
          <div
            className="ws-avatar-wrapper"
            onClick={handleAvatarClick}
            style={{ cursor: isUploadingPic ? "wait" : "pointer" }}
            title="Click to change profile picture"
          >
            <img
              src={staffUser?.profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(staffUser?.fullname || defaultName)}&background=10B981&color=fff`}
              alt="Profile"
              className="ws-profile-avatar"
              style={{ opacity: isUploadingPic ? 0.5 : 1 }}
            />
            <div className="ws-avatar-overlay">
              {isUploadingPic ? (
                <span className="ws-avatar-spinner"></span>
              ) : (
                <Camera size={20} color="white" />
              )}
            </div>
          </div>
          <div className="ws-profile-info">
            <h3 className="ws-profile-name">{staffUser?.fullname || defaultName}</h3>
            <button className="ws-edit-profile-btn" onClick={() => setShowChangePassword(true)}>
              <Lock size={12} />
              Change Password <ChevronRight size={14} />
            </button>

            {/* Change Password Modal */}
            {showChangePassword && (
              <div className="ws-modal-overlay" onClick={() => setShowChangePassword(false)}>
                <div className="ws-modal" onClick={(e) => e.stopPropagation()}>
                  <div className="ws-modal-header">
                    <h2>Change Password</h2>
                    <button onClick={() => setShowChangePassword(false)}>
                      <X size={20} />
                    </button>
                  </div>
                  <div className="ws-modal-content">
                    <div className="ws-input-group">
                      <label>Current Password</label>
                      <div className="ws-password-input">
                        <input
                          type={showCurrentPassword ? "text" : "password"}
                          value={passwordState.currentPassword}
                          onChange={(e) => setPasswordState({ ...passwordState, currentPassword: e.target.value })}
                          placeholder="Enter your current password"
                        />
                        <button
                          type="button"
                          className="ws-eye-btn"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        >
                          {showCurrentPassword ? <Eye size={20} /> : <EyeOff size={20} />}
                        </button>
                      </div>
                    </div>
                    <div className="ws-input-group">
                      <label>New Password</label>
                      <div className="ws-password-input">
                        <input
                          type={showNewPassword ? "text" : "password"}
                          value={passwordState.newPassword}
                          onChange={(e) => setPasswordState({ ...passwordState, newPassword: e.target.value })}
                          placeholder="Enter your new password"
                        />
                        <button
                          type="button"
                          className="ws-eye-btn"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                        >
                          {showNewPassword ? <Eye size={20} /> : <EyeOff size={20} />}
                        </button>
                      </div>
                    </div>
                    <div className="ws-input-group">
                      <label>Confirm Password</label>
                      <div className="ws-password-input">
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          value={passwordState.confirmPassword}
                          onChange={(e) => setPasswordState({ ...passwordState, confirmPassword: e.target.value })}
                          placeholder="Confirm your new password"
                        />
                        <button
                          type="button"
                          className="ws-eye-btn"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          {showConfirmPassword ? <Eye size={20} /> : <EyeOff size={20} />}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="ws-modal-footer">
                    <button
                      className="ws-save-btn"
                      onClick={handleChangePassword}
                      disabled={isChangingPassword}
                    >
                      {isChangingPassword ? "Changing..." : "Change Password"}
                    </button>
                    <button
                      className="ws-cancel-btn"
                      onClick={() => setShowChangePassword(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Notifications Section */}
        <div className="ws-section">
          <div className="ws-section-header">
            <Bell size={18} className="ws-section-icon" />
            <span>Notifications</span>
          </div>

          <div className="ws-setting-row">
            <span>Sound</span>
            <label className="ws-toggle">
              <input
                type="checkbox"
                checked={settings.sound}
                onChange={(e) => updateSetting("sound", e.target.checked)}
              />
              <span className="ws-toggle-slider"></span>
            </label>
          </div>

          <div className="ws-alert-types">
            <span className="ws-alert-label">ALERT TYPES</span>
            <div className="ws-chips">
              <button
                className={`ws-chip ${settings.alertTypes?.includes("newOrders") ? "active" : ""}`}
                onClick={() => toggleAlertType("newOrders")}
              >
                New Orders
              </button>
              <button
                className={`ws-chip ${settings.alertTypes?.includes("ready") ? "active" : ""}`}
                onClick={() => toggleAlertType("ready")}
              >
                Ready
              </button>
              <button
                className={`ws-chip ${settings.alertTypes?.includes("delays") ? "active" : ""}`}
                onClick={() => toggleAlertType("delays")}
              >
                Delays
              </button>
            </div>
          </div>
        </div>

        {/* Display Section */}
        <div className="ws-section">
          <div className="ws-section-header">
            <SettingsIcon size={18} className="ws-section-icon" />
            <span>Display</span>
          </div>

          <div className="ws-theme-toggle">
            <button
              className={`ws-theme-btn ${settings.theme === "light" ? "active" : ""}`}
              onClick={() => updateSetting("theme", "light")}
            >
              Light
            </button>
            <button
              className={`ws-theme-btn ${settings.theme === "dark" ? "active" : ""}`}
              onClick={() => updateSetting("theme", "dark")}
            >
              Dark
            </button>
            <button
              className={`ws-theme-btn ${settings.theme === "auto" ? "active" : ""}`}
              onClick={() => updateSetting("theme", "auto")}
              disabled
              style={{ opacity: 0.5, cursor: "not-allowed" }}
            >
              Auto
            </button>
          </div>

          <div className="ws-setting-row">
            <span>Auto-refresh</span>
            <select
              value={settings.autoRefresh}
              onChange={(e) => updateSetting("autoRefresh", e.target.value)}
              className="ws-select"
            >
              <option value="off">Off</option>
              <option value="30s">30s</option>
              <option value="1m">1m</option>
              <option value="2m">2m</option>
              <option value="5m">5m</option>
            </select>
          </div>
        </div>

        {/* Quick Actions Section - Only for Waiter variant */}
        {variant === "waiter" && (
          <div className="ws-section">
            <div className="ws-section-header">
              <Zap size={18} className="ws-section-icon" />
              <span>Quick Actions</span>
              <button className="ws-manage-btn">MANAGE</button>
            </div>

            <div className="ws-chips">
              <button className="ws-chip action-chip">
                🖨️ Print Bill
              </button>
              <button className="ws-chip action-chip">
                🍴 Split Table
              </button>
              <button className="ws-chip add-chip">
                + Add New
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer Buttons */}
      <div className="ws-footer">
        <button className="ws-save-btn" onClick={handleSave}>
          Save Changes
        </button>
        <button className="ws-cancel-btn" onClick={handleCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
};

export default StaffSettings;
