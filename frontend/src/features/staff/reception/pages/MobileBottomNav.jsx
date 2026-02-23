import React from 'react';
import { LayoutDashboard, CalendarRange, LogIn, Sparkles, Users, Settings } from 'lucide-react';

const MobileBottomNav = ({ activeView, onViewChange }) => {
  const tabs = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
    { id: 'bookings', label: 'Bookings', icon: CalendarRange },
    { id: 'checkinout', label: 'Check-In', icon: LogIn },
    { id: 'housekeeping', label: 'Rooms', icon: Sparkles },
    { id: 'guests', label: 'Guests', icon: Users },
    { id: 'settings', label: 'More', icon: Settings },
  ];

  return (
    <div className="sh-mobile-nav">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            className={`sh-mobile-nav-item ${activeView === tab.id ? 'active' : ''}`}
            onClick={() => onViewChange(tab.id)}
          >
            <Icon />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default MobileBottomNav;
