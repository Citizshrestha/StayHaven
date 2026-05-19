/**
 * GuestMobileNav.jsx
 *
 * Bottom tab bar for mobile - Fixed at bottom, z-index 100
 * 5 tabs: Dashboard | Room Service | Bookings | Billing | Profile
 * Active: teal icon + teal label + teal top-border indicator
 * Inactive: grey #94a3b8
 */

import React from "react";
import { LayoutDashboard, UtensilsCrossed, CalendarDays, CreditCard, User } from "lucide-react";

const navItems = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "room-service", label: "Room Service", icon: UtensilsCrossed },
  { key: "bookings", label: "Bookings", icon: CalendarDays },
  { key: "billing", label: "Billing", icon: CreditCard },
  { key: "profile", label: "Profile", icon: User },
];

const GuestMobileNav = ({ activeView, onViewChange }) => {
  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '64px',
        background: '#ffffff',
        borderTop: '1px solid rgba(0, 0, 0, 0.07)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        padding: '0 8px',
      }}
      className="lg:hidden"
    >
      {navItems.map(({ key, label, icon: Icon }) => {
        const isActive = activeView === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onViewChange(key)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              padding: '8px 4px',
              background: 'transparent',
              border: 'none',
              borderTop: isActive ? '3px solid #0ea5a0' : '3px solid transparent',
              color: isActive ? '#0ea5a0' : '#94a3b8',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              position: 'relative',
              marginTop: isActive ? '-3px' : '0',
            }}
          >
            <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
            <span
              style={{
                fontSize: '11px',
                fontWeight: isActive ? '600' : '500',
                lineHeight: 1,
              }}
            >
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};

export default GuestMobileNav;
