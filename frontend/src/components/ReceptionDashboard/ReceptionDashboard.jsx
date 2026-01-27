import React, { useState, useEffect } from 'react';
import './ReceptionDashboard.css';
import Sidebar from './Sidebar';
import DashboardContent from './DashboardContent';
import MobileBottomNav from './MobileBottomNav';
import BookingsView from './BookingsView';
import CheckInOutView from './CheckInOutView';
import HousekeepingView from './HousekeepingView';
import GuestsView from './GuestsView';
import ReportsView from './ReportsView';
import ReceptionSettings from './ReceptionSettings';
import { useTheme } from '../../hooks/useTheme';
import { useStaffAuth } from '../../context/StaffAuthContext';

const ReceptionDashboard = () => {
  const [activeView, setActiveView] = useState('dashboard');
  const { isDark } = useTheme();
  const { staffUser } = useStaffAuth();
  const [notificationCount, setNotificationCount] = useState(12);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
    };
  }, []);

  const handleViewChange = (view) => {
    setActiveView(view);
  };

  const renderContent = () => {
    switch (activeView) {
      case 'dashboard':
        return <DashboardContent />;
      case 'bookings':
        return <BookingsView />;
      case 'checkinout':
        return <CheckInOutView />;
      case 'housekeeping':
        return <HousekeepingView />;
      case 'guests':
        return <GuestsView />;
      case 'reports':
        return <ReportsView />;
      case 'settings':
        return <ReceptionSettings onClose={() => setActiveView('dashboard')} />;
      default:
        return <DashboardContent />;
    }
  };

  return (
    <div className={`reception-dashboard ${isDark ? 'dark' : ''}`}>
      {!isMobile && (
        <Sidebar 
          activeView={activeView}
          onViewChange={handleViewChange}
          notificationCount={notificationCount}
        />
      )}
      
      <main className="reception-main-content">
        {renderContent()}
      </main>

      {isMobile && (
        <MobileBottomNav
          activeView={activeView}
          onViewChange={handleViewChange}
          notificationCount={notificationCount}
        />
      )}
    </div>
  );
};

export default ReceptionDashboard;
