import React, { useReducer, useEffect, useCallback } from 'react';
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
import ReceptionOrdersView from './ReceptionOrdersView';
import ReportsView from './ReportsView';
import StaffView from './StaffView';
import ReceptionSettings from './ReceptionSettings';
import MessagingPanel from '../../../../shared/components/MessagingPanel';
import { ToastContainer } from '../../../../shared/components/Toast';
import { useTheme } from '../../../../hooks/useTheme';
import { useSocket } from '../../../../core/context/SocketContext';
import { useStaffAuth } from '../../../../context/StaffAuthContext';
import { toast } from 'react-toastify';

const formatOrderLocation = ({ orderType, roomNumber, tableNumber }) => {
  if (orderType === 'roomService') {
    return roomNumber ? `Room ${roomNumber}` : 'Room Service';
  }

  if (orderType === 'dineIn') {
    return tableNumber ? `Table ${tableNumber}` : 'Dine-in';
  }

  if (orderType === 'takeaway') {
    return 'Takeaway';
  }

  return tableNumber ? `Table ${tableNumber}` : roomNumber ? `Room ${roomNumber}` : 'Order';
};

const ReceptionDashboard = () => {
  const initialState = {
    activeView: 'dashboard',
    sidebarCollapsed: false,
    isMobile: false,
    isMessagingOpen: false,
    messageRecipient: null,
  };

  const reducer = (state, action) => {
    switch (action.type) {
      case 'SET_ACTIVE_VIEW':
        return { ...state, activeView: action.payload };
      case 'TOGGLE_SIDEBAR':
        return { ...state, sidebarCollapsed: !state.sidebarCollapsed };
      case 'SET_MOBILE':
        return { ...state, isMobile: action.payload };
      case 'OPEN_MESSAGING':
        return {
          ...state,
          isMessagingOpen: true,
          messageRecipient: action.payload ?? state.messageRecipient,
        };
      case 'TOGGLE_MESSAGING':
        return {
          ...state,
          isMessagingOpen: !state.isMessagingOpen,
          messageRecipient: state.isMessagingOpen ? null : state.messageRecipient,
        };
      default:
        return state;
    }
  };

  const [state, dispatch] = useReducer(reducer, initialState);
  const { isDark } = useTheme();
  const { subscribe, isConnected } = useSocket();
  const { staffUser } = useStaffAuth();

  // Get current user ID for filtering self-notifications
  const currentUserId = staffUser?._id;

  // Apply theme to document root for CSS variables
  useEffect(() => {
    if (isDark) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }, [isDark]);

  // Socket.io real-time notifications for orders
  useEffect(() => {
    if (!subscribe || !isConnected) return;

    console.log('📡 [ReceptionDashboard] Setting up order notifications');

    // Listen for new orders
    const unsubscribeNewOrder = subscribe('new-order', (data) => {
      console.log('📦 [ReceptionDashboard] New order notification:', data);
      
      // Skip notification if current user created this order (self-notification)
      if (data.creatorId && currentUserId && data.creatorId === currentUserId) {
        console.log('🔇 [ReceptionDashboard] Skipping self-notification for order:', data.order?.orderNumber);
        return;
      }
      
      const location = formatOrderLocation({
        orderType: data.order?.orderType,
        roomNumber: data.order?.roomNumber,
        tableNumber: data.order?.tableNumber,
      });

      // Show clickable toast notification
      toast.info(
        <div onClick={() => dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'orders' })} style={{ cursor: 'pointer' }}>
          <strong>🔔 New Order #{data.order?.orderNumber}</strong>
          <div style={{ fontSize: '13px', marginTop: '4px', opacity: 0.9 }}>
            {location} • Click to view
          </div>
        </div>,
        {
          position: 'top-right',
          autoClose: 8000,
          onClick: () => dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'orders' }),
          style: { 
            background: 'linear-gradient(135deg, #059669, #10b981)', 
            color: '#fff', 
            fontWeight: 600,
            cursor: 'pointer'
          },
        }
      );
    });

    // Listen for order status updates
    const unsubscribeStatusUpdate = subscribe('order-status-updated', (data) => {
      console.log('📊 [ReceptionDashboard] Order status updated:', data);
      
      // Skip notification if current user updated this order (self-notification)
      if (data.updaterId && currentUserId && data.updaterId === currentUserId) {
        console.log('🔇 [ReceptionDashboard] Skipping self-notification for status update:', data.orderNumber);
        return;
      }
      
      const location = formatOrderLocation({
        orderType: data.orderType,
        roomNumber: data.roomNumber,
        tableNumber: data.tableNumber,
      });

      // Show clickable toast notification
      toast.info(
        <div onClick={() => dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'orders' })} style={{ cursor: 'pointer' }}>
          <strong>📊 Order #{data.orderNumber} Updated</strong>
          <div style={{ fontSize: '13px', marginTop: '4px', opacity: 0.9 }}>
            {location} • Status: {data.status} • Click to view
          </div>
        </div>,
        {
          position: 'top-right',
          autoClose: 6000,
          onClick: () => dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'orders' }),
          style: { 
            background: 'linear-gradient(135deg, #3B82F6, #2563EB)', 
            color: '#fff', 
            fontWeight: 600,
            cursor: 'pointer'
          },
        }
      );
    });

    return () => {
      unsubscribeNewOrder();
      unsubscribeStatusUpdate();
    };
  }, [subscribe, isConnected, currentUserId]);

  useEffect(() => {
    const handleResize = () => dispatch({ type: 'SET_MOBILE', payload: window.innerWidth <= 768 });
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
      dispatch({ type: 'OPEN_MESSAGING', payload: null });
      return;
    }
    dispatch({ type: 'SET_ACTIVE_VIEW', payload: view });
  }, []);

  const handleOpenMessageFor = useCallback((recipient) => {
    dispatch({ type: 'OPEN_MESSAGING', payload: recipient });
  }, []);

  const handleToggleMessaging = useCallback(() => {
    dispatch({ type: 'TOGGLE_MESSAGING' });
  }, []);

  const renderContent = () => {
    switch (state.activeView) {
      case 'dashboard': return <DashboardContent onNavigate={(view) => dispatch({ type: 'SET_ACTIVE_VIEW', payload: view })} />;
      case 'bookings': return <BookingsView />;
      case 'checkinout': return <CheckInOutView />;
      case 'rooms': return <RoomsView />;
      case 'housekeeping': return <HousekeepingView />;
      case 'guests': return <GuestsView onMessageGuest={handleOpenMessageFor} />;
      case 'orders': return <ReceptionOrdersView />;
      case 'billing': return <BillingView />;
      case 'reports': return <ReportsView />;
      case 'staff': return <StaffView onMessageStaff={handleOpenMessageFor} />;
      case 'settings': return <ReceptionSettings onClose={() => dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'dashboard' })} />;
      default: return <DashboardContent onNavigate={(view) => dispatch({ type: 'SET_ACTIVE_VIEW', payload: view })} />;
    }
  };

  return (
    <div className={`reception-dashboard ${isDark ? 'dark' : ''}`}>
      {!state.isMobile && (
        <Sidebar
          activeView={state.activeView}
          onViewChange={handleViewChange}
          collapsed={state.sidebarCollapsed}
          onToggleCollapse={() => dispatch({ type: 'TOGGLE_SIDEBAR' })}
        />
      )}

      <main className="reception-main-content">
        {renderContent()}
      </main>

      {state.isMobile && (
        <MobileBottomNav activeView={state.activeView} onViewChange={handleViewChange} />
      )}

      {/* Floating Messenger Panel */}
      <MessagingPanel
        isOpen={state.isMessagingOpen}
        onToggle={handleToggleMessaging}
        defaultRecipient={state.messageRecipient}
        showFab={true}
      />
      {/* Toast Notifications */}
      <ToastContainer />
    </div>
  );
};

export default ReceptionDashboard;
