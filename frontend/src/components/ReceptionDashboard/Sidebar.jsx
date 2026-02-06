import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStaffAuth } from '../../context/StaffAuthContext';
import { 
  LayoutDashboard, 
  Calendar, 
  LogIn, 
  Bed, 
  Users, 
  BarChart3, 
  Settings,
  LogOut
} from 'lucide-react';
import './Sidebar.css';

const Sidebar = ({ activeView, onViewChange, notificationCount }) => {
  const navigate = useNavigate();
  const { staffUser, logout } = useStaffAuth();

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'bookings', label: 'Bookings', icon: Calendar },
    { id: 'checkinout', label: 'Check-In/Out', icon: LogIn },
    { id: 'housekeeping', label: 'Housekeeping', icon: Bed },
    { id: 'guests', label: 'Guests', icon: Users },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/staff/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <aside className="reception-sidebar">
      {/* Logo & Hotel Name */}
      <div className="reception-sidebar-header">
        <div className="reception-logo">
          <div className="reception-logo-icon">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path d="M16 2L4 8v8c0 7.5 5.2 14.5 12 16 6.8-1.5 12-8.5 12-16V8l-12-6z" fill="currentColor"/>
            </svg>
          </div>
        </div>
        <div className="reception-hotel-name">
          <h2>Grand Royale</h2>
          <p>Hotel & Resort</p>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="reception-nav">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              className={`reception-nav-item ${activeView === item.id ? 'active' : ''}`}
              onClick={() => onViewChange(item.id)}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* User Profile at Bottom */}
      <div className="reception-sidebar-footer">
        <div className="reception-user-profile">
          <div className="reception-user-avatar">
            {staffUser?.profilePicture ? (
              <img src={staffUser.profilePicture} alt={staffUser.fullname} />
            ) : (
              <div className="reception-avatar-placeholder">
                {staffUser?.fullname?.charAt(0)?.toUpperCase() || 'S'}
              </div>
            )}
          </div>
          <div className="reception-user-info">
            <h4>{staffUser?.fullname || 'Sarah Jenkins'}</h4>
            <p>Head Receptionist</p>
          </div>
          <button 
            className="reception-logout-btn"
            onClick={handleLogout}
            title="Logout"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
