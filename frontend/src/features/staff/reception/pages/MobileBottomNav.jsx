import React from 'react';
import { LayoutDashboard, Calendar, LogIn, Bed, Users } from 'lucide-react';
import './MobileBottomNav.css';

const MobileBottomNav = ({ activeView, onViewChange, notificationCount }) => {
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'bookings', label: 'Bookings', icon: Calendar },
    { id: 'checkinout', label: 'Check-In', icon: LogIn },
    { id: 'housekeeping', label: 'Rooms', icon: Bed },
    { id: 'guests', label: 'Guests', icon: Users },
  ];

  return (
    <div className="rd-mobile-nav">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            className={`rd-mobile-nav-item ${activeView === tab.id ? 'active' : ''}`}
            onClick={() => onViewChange(tab.id)}
          >
            <Icon size={22} />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default MobileBottomNav;
