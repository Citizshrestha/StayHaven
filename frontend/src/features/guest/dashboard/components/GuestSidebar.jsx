/**
 * GuestSidebar.jsx
 *
 * Desktop sidebar - 240px width, white background
 * Logo: "Stay" dark + "Haven" teal, "Guest Portal" below
 * Nav items: 44px height, 14px 500 weight, icon left 20px
 * Active: teal left-border 3px + teal text + teal bg rgba(14,165,160,0.08)
 */

import React from "react";
import {
  LayoutDashboard,
  CalendarDays,
  UtensilsCrossed,
  CreditCard,
  User,
  MessageSquare,
  LogOut,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { logout } from "../../../../core/api/services/auth.service";
import { toast } from "react-toastify";

const navItems = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "room-service", label: "Room Service", icon: UtensilsCrossed },
  { key: "bookings", label: "Bookings", icon: CalendarDays },
  { key: "billing", label: "Billing", icon: CreditCard },
  { key: "requests", label: "Requests", icon: MessageSquare },
  { key: "profile", label: "Profile", icon: User },
];

const GuestSidebar = ({ activeView, onViewChange }) => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Logged out successfully");
    } catch {
      toast.error("Logout failed");
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('userId');
      localStorage.removeItem('email');
      localStorage.removeItem('username');
      localStorage.removeItem('role');
      localStorage.removeItem('guestToken');
      navigate('/guest/login');
    }
  };

  return (
    <div
      style={{
        width: '240px',
        height: '100vh',
        background: '#ffffff',
        borderRight: '1px solid rgba(0, 0, 0, 0.07)',
        display: 'flex',
        flexDirection: 'column',
        position: 'sticky',
        top: 0,
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: '24px 20px',
          borderBottom: '1px solid rgba(0, 0, 0, 0.07)',
        }}
      >
        <h1
          style={{
            fontSize: '20px',
            fontWeight: '700',
            margin: 0,
            lineHeight: 1.2,
          }}
        >
          <span style={{ color: '#1e293b' }}>Stay</span>
          <span style={{ color: '#0ea5a0' }}>Haven</span>
        </h1>
        <p
          style={{
            fontSize: '11px',
            color: '#94a3b8',
            margin: '4px 0 0 0',
            fontWeight: '500',
          }}
        >
          Guest Portal
        </p>
      </div>

      {/* Navigation */}
      <nav
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 12px',
        }}
      >
        {navItems.map(({ key, label, icon: Icon }) => {
          const isActive = activeView === key;
          return (
            <button
              key={key}
              onClick={() => onViewChange(key)}
              style={{
                width: '100%',
                height: '44px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '0 20px',
                background: isActive ? 'rgba(14, 165, 160, 0.08)' : 'transparent',
                border: 'none',
                borderLeft: isActive ? '3px solid #0ea5a0' : '3px solid transparent',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                color: isActive ? '#0ea5a0' : '#64748b',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                marginBottom: '4px',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'rgba(0, 0, 0, 0.03)';
                  e.currentTarget.style.color = '#1e293b';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#64748b';
                }
              }}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              <span>{label}</span>
            </button>
          );
        })}
      </nav>

      {/* Logout */}
      <div
        style={{
          padding: '12px',
          borderTop: '1px solid rgba(0, 0, 0, 0.07)',
        }}
      >
        <button
          onClick={handleLogout}
          style={{
            width: '100%',
            height: '44px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '0 20px',
            background: 'transparent',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            color: '#ef4444',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <LogOut size={20} />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
};

export default GuestSidebar;
