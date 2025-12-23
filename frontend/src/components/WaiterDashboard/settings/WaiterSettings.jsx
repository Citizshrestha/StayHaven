import { useEffect, useState } from "react";
import {
    Bell, Settings as SettingsIcon, Zap, X,
    ChevronRight, Lock, Eye, EyeOff
} from "lucide-react";
import { useStaffAuth } from "../../../context/StaffAuthContext";
import { toast } from "react-toastify";
import "./WaiterSettings.css";
import { changePassword } from "../../../api/auth";
import { useTheme } from "../../../hooks/useTheme";

const WaiterSettings = ({ onClose }) => {
    const { staffUser } = useStaffAuth();
    const { theme, toggleTheme } = useTheme();
    const [showChangePassword, setShowChangePassword] = useState(false);
    const [passwordState, setPasswordState] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
    });
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isChangingPassword, setIsChangingPassword] = useState(false);

    // Settings state (with localStorage persistence)
    const [settings, setSettings] = useState(() => {
        const saved = localStorage.getItem("waiterSettings");
        return saved ? JSON.parse(saved) : {
            // Notifications
            sound: true,
            vibration: false,
            alertTypes: ["newOrders"], // newOrders, ready, delays

            // Display    
            theme: "light", // light, dark, auto
            autoRefresh: "1m",
            compactView: false,

            // Quick Actions
            quickActions: ["Print Bill", "Split Table"],
        };
    });

    // sync theme when modal opens
    useEffect(() => {
        if (settings.theme === 'dark' && theme === 'light') {
            toggleTheme();
        } else if (settings.theme === 'light' && theme === 'dark') {
            toggleTheme();
        }
    }, [settings.theme, theme]); 

    // Save settings to localStorage
    const updateSetting = (key, value) => {
        const newSettings = { ...settings, [key]: value };
        setSettings(newSettings);
        localStorage.setItem("waiterSettings", JSON.stringify(newSettings));
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
            toast.error(err.response.data.message || "Failed to change password");
            setIsChangingPassword(false);
        } finally {
            setIsChangingPassword(false);
        }
    }

    // Handle save
    const handleSave = () => {
        localStorage.setItem("waiterSettings", JSON.stringify(settings));

        // also save theme to theme context's localstorage key
        localStorage.setItem("theme", settings.theme);
        toast.success("Settings saved!");
        onClose();
    };

    return (
        <div className="ws-container">
            {/* Header */}
            <div className="ws-header">
                <h1 className="ws-title">Settings</h1>
                <button onClick={onClose} className="ws-close-btn">
                    <X size={20} />
                </button>
            </div>

            {/* Content */}
            <div className="ws-content">
                {/* Profile Section */}
                <div className="ws-profile-section">
                    <img
                        src={staffUser?.profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(staffUser?.fullname || 'Staff')}&background=10B981&color=fff`}
                        alt="Profile"
                        className="ws-profile-avatar"
                    />
                    <div className="ws-profile-info">
                        <h3 className="ws-profile-name">{staffUser?.fullname || "Staff Member"}</h3>
                        {/* Change Password Modal */}
                        <button className="ws-edit-profile-btn" onClick={() => setShowChangePassword(true)}>
                            <Lock size={12} />
                            Change Password <ChevronRight size={14} />
                        </button>


                        {/* Change Password Modal Removed */}
                        {
                            showChangePassword && (
                                <div className="ws-modal-overlay" onClick={() => setShowChangePassword(false)}>
                                    <div className="ws-modal" onClick={(e) => e.stopPropagation()}>
                                        <div className="ws-modal-header">
                                            <h2>Change Password Form</h2>
                                            <button onClick={() => setShowChangePassword(false)}>
                                                <X size={20} />
                                            </button>
                                        </div>
                                        <div className="ws-content">
                                            <div className="ws-input-group">
                                                <label htmlFor="currentPassword">Current Password</label>
                                                <div className="ws-password-input">
                                                    <input type={showCurrentPassword ? "text" : "password"} value={passwordState.currentPassword} onChange={(e) => setPasswordState({ ...passwordState, currentPassword: e.target.value })} placeholder="Enter your current password" />
                                                    <button type="button" className="ws-eye-btn" onClick={() => setShowCurrentPassword(!showCurrentPassword)} aria-label={showCurrentPassword ? 'Hide current password' : 'Show current password'}>
                                                        {showCurrentPassword ? <Eye size={20} /> : <EyeOff size={20} />}
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="ws-input-group">
                                                <label htmlFor="newPassword">New Password</label>
                                                <div className="ws-password-input">
                                                    <input type={showNewPassword ? "text" : "password"} value={passwordState.newPassword} onChange={(e) => setPasswordState({ ...passwordState, newPassword: e.target.value })} placeholder="Enter your new password" />
                                                    <button type="button" className="ws-eye-btn" onClick={() => setShowNewPassword(!showNewPassword)} aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}>
                                                        {showNewPassword ? <Eye size={20} /> : <EyeOff size={20} />}
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="ws-input-group">
                                                <label htmlFor="confirmPassword">Confirm Password</label>
                                                <div className="ws-password-input">
                                                    <input type={showConfirmPassword ? "text" : "password"} value={passwordState.confirmPassword} onChange={(e) => setPasswordState({ ...passwordState, confirmPassword: e.target.value })} placeholder="Confirm your new password" />
                                                    <button type="button" className="ws-eye-btn" onClick={() => setShowConfirmPassword(!showConfirmPassword)} aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}>
                                                        {showConfirmPassword ? <Eye size={20} /> : <EyeOff size={20} />}
                                                    </button>
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
                                </div>
                            )
                        }
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
                                onChange={(e) => updateSetting('sound', e.target.checked)}
                            />
                            <span className="ws-toggle-slider"></span>
                        </label>
                    </div>

                    <div className="ws-setting-row">
                        <span>Vibration</span>
                        <label className="ws-toggle">
                            <input
                                type="checkbox"
                                checked={settings.vibration}
                                onChange={(e) => updateSetting('vibration', e.target.checked)}
                            />
                            <span className="ws-toggle-slider"></span>
                        </label>
                    </div>

                    <div className="ws-alert-types">
                        <span className="ws-alert-label">ALERT TYPES</span>
                        <div className="ws-chips">
                            <button
                                className={`ws-chip ${settings.alertTypes?.includes('newOrders') ? 'active' : ''}`}
                                onClick={() => toggleAlertType('newOrders')}
                            >
                                New Orders
                            </button>
                            <button
                                className={`ws-chip ${settings.alertTypes?.includes('ready') ? 'active' : ''}`}
                                onClick={() => toggleAlertType('ready')}
                            >
                                Ready
                            </button>
                            <button
                                className={`ws-chip ${settings.alertTypes?.includes('delays') ? 'active' : ''}`}
                                onClick={() => toggleAlertType('delays')}
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
                            className={`ws-theme-btn ${theme === 'light' ? 'active' : ''}`}
                            onClick={() => {

                                if (theme !== "light") {
                                    toggleTheme();
                                }

                                updateSetting('theme', 'light')

                            }}
                        >
                            Light
                        </button>
                        <button
                            className={`ws-theme-btn ${theme === 'dark' ? 'active' : ''}`}
                            onClick={() => {
                                // update context
                                if (theme !== "dark") {
                                    toggleTheme();
                                }
                                updateSetting('theme', 'dark')
                            }}
                        >
                            Dark
                        </button>
                        <button
                            className={`ws-theme-btn ${settings.theme === 'auto' ? 'active' : ''}`}
                            onClick={() => updateSetting('theme', 'auto')}
                            disabled
                            style={{ opacity: 0.5, cursor: 'not-allowed' }}
                        >
                            Auto
                        </button>
                    </div>

                    <div className="ws-setting-row">
                        <span>Auto-refresh</span>
                        <select
                            value={settings.autoRefresh}
                            onChange={(e) => updateSetting('autoRefresh', e.target.value)}
                            className="ws-select"
                        >
                            <option value="30s">30s</option>
                            <option value="1m">1m</option>
                            <option value="2m">2m</option>
                            <option value="5m">5m</option>
                        </select>
                    </div>

                    <div className="ws-setting-row">
                        <span>Compact View</span>
                        <label className="ws-toggle">
                            <input
                                type="checkbox"
                                checked={settings.compactView}
                                onChange={(e) => updateSetting('compactView', e.target.checked)}
                            />
                            <span className="ws-toggle-slider"></span>
                        </label>
                    </div>
                </div>

                {/* Quick Actions Section */}
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
            </div>

            {/* Footer Buttons */}
            <div className="ws-footer">
                <button className="ws-save-btn" onClick={handleSave}>
                    Save Changes
                </button>
                <button className="ws-cancel-btn" onClick={onClose}>
                    Cancel
                </button>
            </div>



        </div>
    );
};

export default WaiterSettings;