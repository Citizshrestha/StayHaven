import React, { useState, useEffect, useCallback } from 'react';
import './ReceptionDashboard.css';
import Sidebar from './Sidebar';
import DashboardContent from './DashboardContent';
import MobileBottomNav from './MobileBottomNav';
import BookingsView from './BookingsView';
import CheckInOutView from './CheckInOutView';
import RoomsView from './RoomsView';
import HousekeepingView from './HousekeepingView';
import GuestsView from './GuestsView';
import BillingView from './BillingView';
import ReportsView from './ReportsView';
import StaffView from './StaffView';
import ReceptionSettings from './ReceptionSettings';
import MessagingPanel from '../../../../shared/components/MessagingPanel';
import { useTheme } from '../../../../hooks/useTheme';
import { useStaffAuth } from '../../../../context/StaffAuthContext';

const ReceptionDashboard = () => {
  const [activeView, setActiveView] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { isDark } = useTheme();
  const { staffUser } = useStaffAuth();
  const [isMobile, setIsMobile] = useState(false);
  const [isMessagingOpen, setIsMessagingOpen] = useState(false);
  const [messageRecipient, setMessageRecipient] = useState(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const prev = document.body.style.overflow;
    const prevHtml = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
      document.documentElement.style.overflow = prevHtml;
    };
  }, []);

  const handleViewChange = useCallback((view) => {
    if (view === 'messages') {
      setIsMessagingOpen(true);
      return;
    }
    setActiveView(view);
  }, []);

  const handleOpenMessageFor = useCallback((recipient) => {
    setMessageRecipient(recipient);
    setIsMessagingOpen(true);
  }, []);

  const handleToggleMessaging = useCallback(() => {
    setIsMessagingOpen(prev => !prev);
    if (isMessagingOpen) {
      setMessageRecipient(null);
    }
  }, [isMessagingOpen]);

  const renderContent = () => {
    switch (activeView) {
      case 'dashboard': return <DashboardContent />;
      case 'bookings': return <BookingsView />;
      case 'checkinout': return <CheckInOutView />;
      case 'rooms': return <RoomsView />;
      case 'housekeeping': return <HousekeepingView />;
      case 'guests': return <GuestsView onMessageGuest={handleOpenMessageFor} />;
      case 'billing': return <BillingView />;
      case 'reports': return <ReportsView />;
      case 'staff': return <StaffView onMessageStaff={handleOpenMessageFor} />;
      case 'settings': return <ReceptionSettings onClose={() => setActiveView('dashboard')} />;
      default: return <DashboardContent />;
    }
  };

  return (
    <div className={`reception-dashboard ${isDark ? 'dark' : ''}`}>
      {!isMobile && (
        <Sidebar
          activeView={activeView}
          onViewChange={handleViewChange}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(c => !c)}
        />
      )}

      <main className="reception-main-content">
        {renderContent()}
      </main>

      {isMobile && (
        <MobileBottomNav activeView={activeView} onViewChange={handleViewChange} />
      )}

      {/* Floating Messenger Panel */}
      <MessagingPanel
        isOpen={isMessagingOpen}
        onToggle={handleToggleMessaging}
        defaultRecipient={messageRecipient}
        showFab={true}
      />
    </div>
  );
};

export default ReceptionDashboard;
