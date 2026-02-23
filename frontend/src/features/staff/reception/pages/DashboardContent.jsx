import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTheme } from '../../../../hooks/useTheme';
import { useStaffAuth } from '../../../../context/StaffAuthContext';
import {
  Search, Bell, Sun, Moon, ArrowUpRight, ArrowDownRight,
  CalendarCheck, LogOut as LogOutIcon, Bed, Plus, UserPlus,
  ArrowRightLeft, Wand2, Clock, DollarSign, CreditCard,
  Users, Eye, TrendingUp, CheckCircle, AlertTriangle,
  Sparkles, Coffee, Wrench, ChevronRight, Command,
  FileText, Zap, Building2, UtensilsCrossed, ConciergeBell,
  X, Send, MessageCircle, Phone, PhoneOff
} from 'lucide-react';
import {
  NewBookingModal, WalkInGuestModal,
  ExpressCheckOutModal, RoomChangeModal
} from './ActionModals';
import * as msgService from '../../../../core/api/services/messaging.service';
import { io as socketIO } from 'socket.io-client';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
const DEV_HOTEL_ID = '692aa947419c33f4e8c9aa73';

/* ── Sparkline Component ── */
const Sparkline = ({ data, color, height = 32 }) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 100;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(' ');
  return (
    <div className="sh-kpi-sparkline">
      <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id={`sg-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.2" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={`0,${height} ${points} ${w},${height}`} fill={`url(#sg-${color.replace('#', '')})`} />
        <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
};

/* ── Occupancy Ring ── */
const OccupancyRing = ({ pct }) => {
  const r = 14; const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <div className="sh-occ-ring">
      <svg width="38" height="38" viewBox="0 0 38 38">
        <circle cx="19" cy="19" r={r} fill="none" stroke="var(--border-primary)" strokeWidth="3" />
        <circle cx="19" cy="19" r={r} fill="none" stroke="#6366f1" strokeWidth="3"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s ease' }} />
      </svg>
      <span className="sh-occ-ring-label">{pct}%</span>
    </div>
  );
};

/* ── Donut Chart ── */
const DonutChart = ({ segments }) => {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  let acc = 0;
  const r = 42; const circ = 2 * Math.PI * r;
  return (
    <div className="sh-donut-wrap">
      <svg className="sh-donut-svg" viewBox="0 0 120 120">
        {segments.map((seg, i) => {
          const pct = seg.value / total;
          const dashLen = pct * circ;
          const dashOffset = -acc * circ;
          acc += pct;
          return (
            <circle key={i} cx="60" cy="60" r={r} fill="none"
              stroke={seg.color} strokeWidth="16" strokeDasharray={`${dashLen} ${circ - dashLen}`}
              strokeDashoffset={dashOffset} style={{ transform: 'rotate(-90deg)', transformOrigin: '60px 60px' }} />
          );
        })}
      </svg>
      <div className="sh-donut-legend">
        {segments.map((seg, i) => (
          <div key={i} className="sh-donut-legend-item">
            <div className="sh-donut-legend-dot" style={{ background: seg.color }} />
            <span>{seg.label}</span>
            <span className="sh-donut-legend-value">₹{(seg.value / 1000).toFixed(0)}k</span>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ── Animated Number ── */
const AnimatedNumber = ({ value, suffix = '' }) => {
  const [display, setDisplay] = useState(0);
  const num = parseInt(String(value).replace(/[^0-9]/g, '')) || 0;
  useEffect(() => {
    let start = 0;
    const duration = 800;
    const step = (ts) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.floor(eased * num));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [num]);
  return <>{display}{suffix}</>;
};

/* ── Real-time Clock ── */
const LiveClock = () => {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  const date = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  return (
    <div className="sh-clock">
      <div className="sh-clock-time">{time}</div>
      <div className="sh-clock-date">{date}</div>
    </div>
  );
};

/* ══════════════════════════════════════════
   MAIN DASHBOARD CONTENT
   ══════════════════════════════════════════ */
const DashboardContent = () => {
  const { isDark, toggleTheme } = useTheme();
  let staffUser = null;
  try { const auth = useStaffAuth(); staffUser = auth?.staffUser; } catch (e) { }

  const [showNotifications, setShowNotifications] = useState(false);
  const [notifTab, setNotifTab] = useState('all');
  const [showCmdPalette, setShowCmdPalette] = useState(false);
  const [showMessaging, setShowMessaging] = useState(false);
  const [msgRecipient, setMsgRecipient] = useState('guest');
  const [msgText, setMsgText] = useState('');
  const [messages, setMessages] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [activeRoomFilter, setActiveRoomFilter] = useState('all');
  const [callingChannel, setCallingChannel] = useState(null);
  const [contacts, setContacts] = useState({ waiters: [], chefs: [], receptionists: [], managers: [] });
  const socketRef = useRef(null);
  const msgBodyRef = useRef(null);
  const hotelId = localStorage.getItem('activeProperty')?.replace(/"/g, '') || staffUser?.activeProperty?._id || DEV_HOTEL_ID;
  const isLoggedIn = !!staffUser;

  // Modal states
  const [showNewBookingModal, setShowNewBookingModal] = useState(false);
  const [showWalkInModal, setShowWalkInModal] = useState(false);
  const [showCheckOutModal, setShowCheckOutModal] = useState(false);
  const [showRoomChangeModal, setShowRoomChangeModal] = useState(false);
  const [activeBookingId] = useState(null);

  // Close notifications on outside click
  const notifRef = useRef(null);
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifications(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Socket.io Connection ──
  useEffect(() => {
    if (!isLoggedIn) return;
    const socket = socketIO(API_BASE, { withCredentials: true });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join-hotel', hotelId);
      socket.emit('join-role', {
        hotelId,
        role: staffUser?.role || 'receptionist',
        userId: staffUser?._id,
      });
    });

    // Listen for new messages
    socket.on('new-message', (msg) => {
      setMessages(prev => [...prev, msg]);
    });

    // Listen for notifications
    socket.on('notification', (notif) => {
      setNotifications(prev => [notif, ...prev]);
      setUnreadNotifCount(c => c + 1);
    });

    // Listen for incoming calls
    socket.on('incoming-call', (callData) => {
      // Show browser notification for calls
      if (Notification?.permission === 'granted') {
        new Notification(`📞 Incoming call from ${callData.sender?.fullname}`, {
          body: `Channel: ${callData.channel}`,
          icon: '/favicon.ico',
        });
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [isLoggedIn, hotelId, staffUser]);

  // ── Fetch Notifications from API ──
  useEffect(() => {
    if (!isLoggedIn) return;
    const fetchNotifs = async () => {
      try {
        const res = await msgService.getNotifications({ limit: 20 });
        if (res.success) {
          setNotifications(res.data);
          setUnreadNotifCount(res.unreadCount);
        }
      } catch (err) {
        console.warn('Failed to fetch notifications:', err.message);
      }
    };
    fetchNotifs();
  }, [isLoggedIn]);

  // ── Fetch Messages when channel changes ──
  useEffect(() => {
    if (!isLoggedIn || !showMessaging) return;
    const fetchMessages = async () => {
      try {
        const res = await msgService.getMessages({ channel: msgRecipient, hotelId, limit: 50 });
        if (res.success) setMessages(res.data);
      } catch (err) {
        console.warn('Failed to fetch messages:', err.message);
      }
    };
    fetchMessages();
  }, [isLoggedIn, showMessaging, msgRecipient, hotelId]);

  // ── Fetch Contacts ──
  useEffect(() => {
    if (!isLoggedIn || !showMessaging) return;
    const fetchContacts = async () => {
      try {
        const res = await msgService.getContacts(hotelId);
        if (res.success) setContacts(res.contacts);
      } catch (err) {
        console.warn('Failed to fetch contacts:', err.message);
      }
    };
    fetchContacts();
  }, [isLoggedIn, showMessaging, hotelId]);

  // Auto-scroll message body
  useEffect(() => {
    if (msgBodyRef.current) {
      msgBodyRef.current.scrollTop = msgBodyRef.current.scrollHeight;
    }
  }, [messages, msgRecipient]);

  // Cmd+K shortcut
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setShowCmdPalette(v => !v); }
      if (e.key === 'Escape') { setShowCmdPalette(false); setShowNotifications(false); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // ── Send Message (real API) ──
  const handleSendMessage = async () => {
    if (!msgText.trim()) return;
    const text = msgText.trim();
    setMsgText('');

    if (!isLoggedIn) {
      // Fallback for dev/demo mode
      setMessages(prev => [...prev, {
        _id: Date.now(),
        sender: { _id: 'me', fullname: 'You', role: 'receptionist' },
        channel: msgRecipient,
        content: text,
        createdAt: new Date().toISOString(),
      }]);
      return;
    }

    try {
      await msgService.sendMessage({
        channel: msgRecipient,
        content: text,
        hotelId,
      });
    } catch (err) {
      console.error('Failed to send message:', err);
      setMsgText(text); // Restore text on failure
    }
  };

  // ── Initiate Call ──
  const handleCall = async (channel) => {
    if (!isLoggedIn) {
      alert('Please log in to use calling features');
      return;
    }
    setCallingChannel(channel);
    try {
      await msgService.initiateCall({ channel, hotelId });
      // Auto-end after 30 seconds (demo)
      setTimeout(() => setCallingChannel(null), 30000);
    } catch (err) {
      console.error('Failed to initiate call:', err);
      setCallingChannel(null);
    }
  };

  // ── Mark Notifications Read ──
  const handleMarkAllRead = async () => {
    if (!isLoggedIn) {
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadNotifCount(0);
      return;
    }
    try {
      await msgService.markNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadNotifCount(0);
    } catch (err) {
      console.error('Failed to mark notifications read:', err);
    }
  };

  // Filter notifications by tab
  const notifTypeMap = { payment: ['payment_received', 'payment_failed'], request: ['waiter_call', 'order_status'], system: ['system', 'hotel_approved', 'booking_confirmed'] };
  const filteredNotifs = notifTab === 'all'
    ? notifications
    : notifications.filter(n => (notifTypeMap[notifTab] || []).includes(n.type));

  // ── Mock notification data for when not logged in ──
  const mockNotifications = [
    { _id: '1', type: 'payment_received', title: 'Payment', message: '₹12,500 received from Room 302', createdAt: new Date(Date.now() - 120000), isRead: false, priority: 'high' },
    { _id: '2', type: 'waiter_call', title: 'Request', message: 'Room 202 requested extra pillows', createdAt: new Date(Date.now() - 300000), isRead: false, priority: 'medium' },
    { _id: '3', type: 'system', title: 'Housekeeping', message: 'Room 118 cleaning complete', createdAt: new Date(Date.now() - 720000), isRead: true, priority: 'low' },
    { _id: '4', type: 'waiter_call', title: 'Checkout', message: 'Room 505 late checkout request', createdAt: new Date(Date.now() - 1080000), isRead: false, priority: 'medium' },
    { _id: '5', type: 'payment_received', title: 'Payment', message: '₹8,200 pending — Room 210', createdAt: new Date(Date.now() - 1500000), isRead: false, priority: 'high' },
  ];

  // Use real data if available, otherwise mock
  const displayNotifs = notifications.length > 0 ? filteredNotifs : (notifTab === 'all' ? mockNotifications : mockNotifications.filter(n => (notifTypeMap[notifTab] || []).includes(n.type)));
  const displayUnreadCount = notifications.length > 0 ? unreadNotifCount : mockNotifications.filter(n => !n.isRead).length;

  // Helper: format notification time
  const formatTime = (date) => {
    const d = new Date(date);
    const diff = (Date.now() - d.getTime()) / 1000;
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
    return d.toLocaleDateString();
  };

  // Notification icon map
  const notifIconMap = {
    payment_received: { icon: DollarSign, color: '#10b981' },
    payment_failed: { icon: AlertTriangle, color: '#ef4444' },
    waiter_call: { icon: ConciergeBell, color: '#6366f1' },
    order_status: { icon: Clock, color: '#f59e0b' },
    system: { icon: CheckCircle, color: '#10b981' },
    booking_confirmed: { icon: CalendarCheck, color: '#6366f1' },
    hotel_approved: { icon: Building2, color: '#10b981' },
    default: { icon: Bell, color: '#64748b' },
  };

  // ── Data ──
  const kpiData = [
    { title: "Check-ins", value: '24', sub: '/45', trend: '+8%', up: true, icon: CalendarCheck, color: '#6366f1', sparkline: [12, 18, 15, 22, 20, 24, 24] },
    { title: "Check-outs", value: '12', sub: '/30', trend: '+3%', up: true, icon: LogOutIcon, color: '#f97316', sparkline: [8, 10, 7, 9, 11, 10, 12] },
    { title: "Occupancy", value: '85', sub: '%', trend: '+2%', up: true, icon: Building2, color: '#10b981', sparkline: [78, 80, 82, 79, 83, 84, 85] },
    { title: "Revenue", value: '₹1.8L', sub: '', trend: '+12%', up: true, icon: DollarSign, color: '#8b5cf6', sparkline: [90, 110, 105, 130, 125, 150, 180] },
    { title: "Pending Pay", value: '7', sub: '', trend: '-2', up: false, icon: CreditCard, color: '#f59e0b', sparkline: [12, 10, 9, 11, 8, 9, 7] },
    { title: "Available", value: '15', sub: '', trend: '-3', up: false, icon: Bed, color: '#06b6d4', sparkline: [20, 19, 18, 17, 16, 16, 15] },
  ];

  const roomStatus = [
    { label: 'Available', count: 101, color: '#10b981', pct: 27 },
    { label: 'Occupied', count: 202, color: '#6366f1', pct: 54 },
    { label: 'Cleaning', count: 45, color: '#f59e0b', pct: 12 },
    { label: 'Maintenance', count: 20, color: '#ef4444', pct: 5 },
  ];

  const activityFeed = [
    { text: '<strong>John Doe</strong> checked in to Room 405', time: '2 min ago', icon: CalendarCheck, color: '#10b981', live: true },
    { text: 'Payment of <strong>₹12,500</strong> received — Room 302', time: '8 min ago', icon: DollarSign, color: '#6366f1', live: false },
    { text: 'Room 201 moved to <strong>cleaning</strong>', time: '15 min ago', icon: Sparkles, color: '#f59e0b', live: false },
    { text: '<strong>Maria</strong> assigned to Room 302 housekeeping', time: '22 min ago', icon: Users, color: '#06b6d4', live: false },
    { text: '<strong>Alice Cooper</strong> checked out from Room 501', time: '35 min ago', icon: LogOutIcon, color: '#f97316', live: false },
  ];

  const guestRequests = [
    { id: 1, room: 'Room 202', req: 'Requesting 2 extra pillows and a duvet.', time: '1:07 AM', priority: 'urgent', category: 'Room Service', catIcon: ConciergeBell, sla: '5 min left', overdue: false, actions: ['Assign', 'Ignore'] },
    { id: 2, room: 'Room 505', req: 'Late checkout request (2:00 PM).', time: '1:05 AM', priority: 'medium', category: 'Checkout', catIcon: Clock, sla: 'Overdue', overdue: true, actions: ['Approve', 'Deny'] },
    { id: 3, room: 'Room 301', req: 'AC not cooling properly. Needs maintenance.', time: '12:45 AM', priority: 'urgent', category: 'Maintenance', catIcon: Wrench, sla: '12 min left', overdue: false, actions: ['Assign', 'Reject'] },
  ];

  const arrivals = [
    { id: 1, guest: 'John Doe', room: 'Deluxe Sea View', num: '405', time: '12:30 PM', source: 'Website', payment: 'paid', vip: false },
    { id: 2, guest: 'Alice Cooper', room: 'Presidential Suite', num: '501', time: '02:00 PM', source: 'Agoda', payment: 'pending', vip: true },
    { id: 3, guest: 'Raj Patel', room: 'Standard Twin', num: '210', time: '03:30 PM', source: 'Walk-in', payment: 'unpaid', vip: false },
  ];

  const departures = [
    { id: 1, guest: 'Emma Wilson', room: 'Deluxe King', num: '302', time: '11:00 AM', source: 'Booking.com', payment: 'paid', vip: true },
    { id: 2, guest: 'Kenji Tanaka', room: 'Superior Room', num: '118', time: '12:00 PM', source: 'Website', payment: 'paid', vip: false },
  ];

  const housekeeping = [
    { room: 'Room 302', staff: 'Maria Santos', status: 'assigned' },
    { room: 'Room 405', staff: 'Pending', status: 'pending' },
    { room: 'Room 118', staff: 'Ram Thapa', status: 'done' },
    { room: 'Room 210', staff: 'Pending', status: 'pending' },
  ];

  const revenueSegments = [
    { label: 'Rooms', value: 125000, color: '#6366f1' },
    { label: 'Food & Bev', value: 35000, color: '#f59e0b' },
    { label: 'Services', value: 18000, color: '#10b981' },
  ];

  const quickActions = [
    { label: 'New Booking', icon: Plus, shortcut: 'N', primary: true, onClick: () => setShowNewBookingModal(true) },
    { label: 'Walk-in Guest', icon: UserPlus, shortcut: 'W', onClick: () => setShowWalkInModal(true) },
    { label: 'Express Checkout', icon: Zap, shortcut: 'E', onClick: () => setShowCheckOutModal(true) },
    { label: 'Assign Room', icon: Bed, shortcut: 'A', onClick: () => { } },
    { label: 'Room Change', icon: ArrowRightLeft, shortcut: 'R', onClick: () => setShowRoomChangeModal(true) },
    { label: 'Generate Invoice', icon: FileText, shortcut: 'I', onClick: () => { } },
  ];

  const GuestRow = ({ g }) => (
    <tr>
      <td>
        <div className="sh-guest-cell">
          <div className="sh-table-avatar">{g.guest.split(' ').map(n => n[0]).join('')}</div>
          <span className="sh-guest-name">{g.guest}{g.vip && <span className="sh-vip-badge">VIP</span>}</span>
        </div>
      </td>
      <td>{g.room}</td>
      <td style={{ fontWeight: 600 }}>{g.num}</td>
      <td><span className="sh-source-badge">{g.source}</span></td>
      <td><span className={`sh-payment-badge ${g.payment}`}>{g.payment.charAt(0).toUpperCase() + g.payment.slice(1)}</span></td>
    </tr>
  );

  return (
    <div className="rd-content">
      {/* ── Topbar ── */}
      <header className="sh-topbar">
        <div className="sh-topbar-left">
          <div className="sh-breadcrumb">
            <span className="sh-breadcrumb-item">Home</span>
            <span className="sh-breadcrumb-sep">/</span>
            <span className="sh-breadcrumb-item active">Dashboard</span>
          </div>
        </div>

        <div className="sh-topbar-center">
          <div className="sh-search-box">
            <Search size={16} />
            <input type="text" placeholder='Search guest, booking ID, room…' onClick={() => setShowCmdPalette(true)} readOnly />
            <span className="sh-search-kbd">⌘K</span>
          </div>
        </div>

        <div className="sh-topbar-right">
          <LiveClock />
          <OccupancyRing pct={85} />
          <div ref={notifRef} style={{ position: 'relative' }}>
            <button className="sh-topbar-btn" onClick={() => setShowNotifications(!showNotifications)}>
              <Bell size={18} />
              {displayUnreadCount > 0 && <span className="sh-notif-badge">{displayUnreadCount}</span>}
            </button>
            {showNotifications && (
              <div className="sh-notif-panel">
                <div className="sh-notif-header">
                  <h3>Notifications</h3>
                  <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{displayUnreadCount} unread</span>
                </div>
                <div className="sh-notif-tabs">
                  {[{ id: 'all', label: 'All' }, { id: 'payment', label: 'Payments' }, { id: 'request', label: 'Requests' }, { id: 'system', label: 'System' }].map(tab => (
                    <button key={tab.id} className={`sh-notif-tab ${notifTab === tab.id ? 'active' : ''}`} onClick={() => setNotifTab(tab.id)}>{tab.label}</button>
                  ))}
                </div>
                <div className="sh-notif-list">
                  {displayNotifs.length === 0 ? (
                    <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>No notifications</div>
                  ) : displayNotifs.map(n => {
                    const iconInfo = notifIconMap[n.type] || notifIconMap.default;
                    const NIcon = iconInfo.icon;
                    return (
                      <div key={n._id} className={`sh-notif-item ${!n.isRead ? 'unread' : ''}`}>
                        <div className="sh-notif-icon" style={{ background: `${iconInfo.color}14` }}>
                          <NIcon size={16} style={{ color: iconInfo.color }} />
                        </div>
                        <div className="sh-notif-content">
                          <div className="sh-notif-text">
                            <strong>{n.title}</strong> — {n.message}
                          </div>
                          <div className="sh-notif-time">{formatTime(n.createdAt)}</div>
                        </div>
                        {!n.isRead && <div className="sh-notif-dot" />}
                      </div>
                    );
                  })}
                </div>
                <div className="sh-notif-footer">
                  <button onClick={handleMarkAllRead}>Mark all as read</button>
                </div>
              </div>
            )}
          </div>
          <button className="sh-topbar-btn" onClick={toggleTheme}>{isDark ? <Sun size={18} /> : <Moon size={18} />}</button>
          <button className="sh-avatar-btn">{staffUser?.fullname?.charAt(0)?.toUpperCase() || 'S'}</button>
        </div>
      </header>

      {/* ── Dashboard Body ── */}
      <div className="sh-dashboard">
        {/* ── KPI Strip ── */}
        <div className="sh-kpi-grid">
          {kpiData.map((kpi, i) => {
            const Icon = kpi.icon;
            return (
              <div className="sh-kpi-card" key={i}>
                <div className="sh-kpi-header">
                  <div className="sh-kpi-icon-wrap" style={{ background: `${kpi.color}14` }}>
                    <Icon size={20} style={{ color: kpi.color }} strokeWidth={2} />
                  </div>
                  <span className="sh-kpi-title">{kpi.title}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  <h2 className="sh-kpi-value">
                    {kpi.value.startsWith('₹') ? kpi.value : <AnimatedNumber value={kpi.value} />}
                  </h2>
                  {kpi.sub && <span className="sh-kpi-sub">{kpi.sub}</span>}
                </div>
                <Sparkline data={kpi.sparkline} color={kpi.color} />
                <div className={`sh-kpi-trend ${kpi.up ? 'up' : 'down'}`}>
                  {kpi.up ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                  <span>{kpi.trend} vs yesterday</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Quick Actions ── */}
        <div className="sh-quick-actions">
          {quickActions.map((qa, i) => {
            const Icon = qa.icon;
            return (
              <button key={i} className={`sh-qa-btn ${qa.primary ? 'primary' : ''}`} onClick={qa.onClick}>
                <Icon size={16} strokeWidth={2} />
                <span>{qa.label}</span>
                <span className="sh-qa-shortcut">{qa.shortcut}</span>
              </button>
            );
          })}
        </div>

        {/* ── Main Grid ── */}
        <div className="sh-grid-main">
          {/* ── Left Column ── */}
          <div className="sh-col">
            {/* Room Status */}
            <div className="sh-card" style={{ animationDelay: '0.2s' }}>
              <div className="sh-card-header">
                <h3 className="sh-card-title">Live Room Status</h3>
                <span style={{ fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 500 }}>368 Total</span>
              </div>
              <div className="sh-card-body">
                <div className="sh-room-filters">
                  {[{ id: 'all', label: 'All', count: 368 }, ...roomStatus.map(s => ({ id: s.label.toLowerCase(), label: s.label, count: s.count }))].map(f => (
                    <button key={f.id}
                      className={`sh-room-filter-btn ${activeRoomFilter === f.id ? 'active' : ''}`}
                      style={activeRoomFilter === f.id ? { background: f.id === 'all' ? '#6366f1' : roomStatus.find(s => s.label.toLowerCase() === f.id)?.color || '#6366f1' } : {}}
                      onClick={() => setActiveRoomFilter(f.id)}
                    >
                      <span>{f.label}</span>
                      <span className="sh-filter-count">{f.count}</span>
                    </button>
                  ))}
                </div>
                <div className="sh-room-bar-wrap">
                  {roomStatus.map((s, i) => (
                    <div className="sh-room-bar-item" key={i}>
                      <div className="sh-room-bar-meta">
                        <div className="sh-room-bar-label">
                          <div className="sh-room-bar-dot" style={{ background: s.color }} />
                          <span>{s.label}</span>
                        </div>
                        <div><span className="sh-room-bar-count">{s.count}</span><span className="sh-room-bar-pct">{s.pct}%</span></div>
                      </div>
                      <div className="sh-room-bar-track">
                        <div className="sh-room-bar-fill" style={{ width: `${s.pct}%`, background: `linear-gradient(90deg, ${s.color}, ${s.color}bb)` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Arrivals & Departures */}
            <div className="sh-dual-tables">
              <div className="sh-card" style={{ animationDelay: '0.3s' }}>
                <div className="sh-card-header">
                  <h3 className="sh-card-title">Today's Arrivals</h3>
                  <button className="sh-view-all-btn">View All <ChevronRight size={14} style={{ verticalAlign: 'middle' }} /></button>
                </div>
                <div className="sh-card-body" style={{ padding: 0 }}>
                  <div className="sh-table-wrap">
                    <table className="sh-table">
                      <thead><tr><th>Guest</th><th>Room Type</th><th>#</th><th>Source</th><th>Payment</th></tr></thead>
                      <tbody>{arrivals.map(a => <GuestRow key={a.id} g={a} />)}</tbody>
                    </table>
                  </div>
                </div>
              </div>
              <div className="sh-card" style={{ animationDelay: '0.35s' }}>
                <div className="sh-card-header">
                  <h3 className="sh-card-title">Today's Departures</h3>
                  <button className="sh-view-all-btn">View All <ChevronRight size={14} style={{ verticalAlign: 'middle' }} /></button>
                </div>
                <div className="sh-card-body" style={{ padding: 0 }}>
                  <div className="sh-table-wrap">
                    <table className="sh-table">
                      <thead><tr><th>Guest</th><th>Room Type</th><th>#</th><th>Source</th><th>Payment</th></tr></thead>
                      <tbody>{departures.map(d => <GuestRow key={d.id} g={d} />)}</tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Row: Occupancy Chart + Revenue Donut + Housekeeping  */}
            <div className="sh-bottom-widgets">
              {/* Occupancy Analytics */}
              <div className="sh-card" style={{ animationDelay: '0.4s' }}>
                <div className="sh-card-header">
                  <h3 className="sh-card-title">📊 Weekly Occupancy</h3>
                </div>
                <div className="sh-card-body">
                  <div className="sh-occ-chart">
                    <svg viewBox="0 0 280 140" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="occFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.15" />
                          <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      {[0, 1, 2, 3, 4].map(i => <line key={i} x1="0" y1={i * 35} x2="280" y2={i * 35} stroke="var(--border-secondary)" strokeWidth="1" />)}
                      <polygon points="0,140 0,84 46,70 93,77 140,56 186,49 233,42 280,35 280,140" fill="url(#occFill)" />
                      <polyline points="0,84 46,70 93,77 140,56 186,49 233,42 280,35" fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      {[{ x: 0, y: 84 }, { x: 46, y: 70 }, { x: 93, y: 77 }, { x: 140, y: 56 }, { x: 186, y: 49 }, { x: 233, y: 42 }, { x: 280, y: 35 }].map((p, i) =>
                        <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="#6366f1" stroke="var(--bg-surface)" strokeWidth="2" />
                      )}
                    </svg>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-tertiary)', marginTop: 8 }}>
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => <span key={d}>{d}</span>)}
                  </div>
                </div>
              </div>

              {/* Revenue Breakdown */}
              <div className="sh-card" style={{ animationDelay: '0.45s' }}>
                <div className="sh-card-header">
                  <h3 className="sh-card-title">💰 Revenue Split</h3>
                </div>
                <div className="sh-card-body">
                  <DonutChart segments={revenueSegments} />
                </div>
              </div>

              {/* Housekeeping */}
              <div className="sh-card" style={{ animationDelay: '0.5s' }}>
                <div className="sh-card-header">
                  <h3 className="sh-card-title">🧹 Housekeeping</h3>
                </div>
                <div className="sh-card-body">
                  <div className="sh-hk-list">
                    {housekeeping.map((h, i) => (
                      <div className="sh-hk-item" key={i}>
                        <div>
                          <div className="sh-hk-room">{h.room}</div>
                          <div className="sh-hk-staff">{h.staff}</div>
                        </div>
                        <span className={`sh-hk-status ${h.status}`}>
                          {h.status === 'assigned' ? 'Assigned' : h.status === 'done' ? 'Done' : 'Pending'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Right Column ── */}
          <div className="sh-col">
            {/* Guest Requests */}
            <div className="sh-card" style={{ animationDelay: '0.25s' }}>
              <div className="sh-card-header">
                <h3 className="sh-card-title">Guest Requests</h3>
                <span className="sh-card-badge" style={{ background: 'var(--accent-red-light)', color: 'var(--accent-red)' }}>3 New</span>
              </div>
              <div className="sh-card-body">
                <div className="sh-request-list">
                  {guestRequests.map(r => (
                    <div key={r.id} className={`sh-request-card ${r.priority} ${r.overdue ? 'overdue' : ''}`}>
                      <div className="sh-request-top">
                        <div className="sh-request-room-row">
                          <div className="sh-request-room-icon"><r.catIcon size={14} /></div>
                          <span className="sh-request-room">{r.room}</span>
                        </div>
                        <span className="sh-request-priority" style={{
                          background: r.priority === 'urgent' ? 'var(--accent-red-light)' : 'var(--accent-amber-light)',
                          color: r.priority === 'urgent' ? 'var(--accent-red)' : 'var(--accent-amber)'
                        }}>{r.priority}</span>
                      </div>
                      <p className="sh-request-body">{r.req}</p>
                      <div className={`sh-request-sla ${r.overdue ? 'overdue' : ''}`}>
                        <Clock size={12} /><span>{r.sla}</span>
                      </div>
                      <div className="sh-request-actions">
                        <button className="sh-req-btn approve">{r.actions[0]}</button>
                        <button className="sh-req-btn deny">{r.actions[1]}</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Activity Feed */}
            <div className="sh-card" style={{ animationDelay: '0.3s' }}>
              <div className="sh-card-header">
                <h3 className="sh-card-title">Live Activity</h3>
                <span className="sh-card-badge" style={{ background: 'var(--accent-emerald-light)', color: 'var(--accent-emerald)' }}>● Live</span>
              </div>
              <div className="sh-card-body">
                <div className="sh-activity-list">
                  {activityFeed.map((a, i) => {
                    const Icon = a.icon;
                    return (
                      <div className="sh-activity-item" key={i}>
                        <div className="sh-activity-icon" style={{ background: `${a.color}14` }}>
                          <Icon size={16} style={{ color: a.color }} />
                        </div>
                        <div className="sh-activity-content">
                          <div className="sh-activity-text">{a.live && <span className="sh-activity-live-dot" />}<span dangerouslySetInnerHTML={{ __html: a.text }} /></div>
                          <div className="sh-activity-time">{a.time}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Command Palette ── */}
      {showCmdPalette && (
        <div className="sh-cmd-overlay" onClick={() => setShowCmdPalette(false)}>
          <div className="sh-cmd-box" onClick={e => e.stopPropagation()}>
            <input className="sh-cmd-input" placeholder="Search guests, rooms, bookings…" autoFocus />
            <div className="sh-cmd-results">
              {[
                { icon: Plus, label: 'New Booking', hint: 'Create a reservation' },
                { icon: UserPlus, label: 'Walk-in Guest', hint: 'Quick check-in' },
                { icon: Search, label: 'Search Guest', hint: 'Find by name or ID' },
                { icon: Bed, label: 'Room Status', hint: 'View room availability' },
                { icon: FileText, label: 'Generate Invoice', hint: 'Create billing' },
              ].map((item, i) => (
                <div className="sh-cmd-item" key={i}>
                  <item.icon size={18} />
                  <div><div style={{ fontWeight: 600 }}>{item.label}</div><div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{item.hint}</div></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Messaging FAB ── */}
      <button className="sh-fab-msg" onClick={() => setShowMessaging(true)} title="Send Message">
        <MessageCircle size={22} />
      </button>

      {/* ── Messaging Panel ── */}
      {showMessaging && (
        <div className="sh-msg-overlay" onClick={() => setShowMessaging(false)}>
          <div className="sh-msg-panel" onClick={e => e.stopPropagation()}>
            <div className="sh-msg-header">
              <h3><MessageCircle size={20} /> Messages</h3>
              <button className="sh-msg-close" onClick={() => setShowMessaging(false)}><X size={18} /></button>
            </div>
            <div className="sh-msg-recipient-section">
              <div className="sh-msg-recipient-label">Send to</div>
              <div className="sh-msg-recipients">
                {[
                  { id: 'guest', label: 'Guest', icon: Users },
                  { id: 'waiter', label: 'Waiter', icon: Coffee },
                  { id: 'chef', label: 'Chef (Kitchen)', icon: UtensilsCrossed },
                ].map(r => (
                  <button key={r.id} className={`sh-msg-recipient-btn ${msgRecipient === r.id ? 'active' : ''}`} onClick={() => setMsgRecipient(r.id)}>
                    <r.icon size={16} />
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="sh-msg-body" ref={msgBodyRef}>
              {(() => {
                const channelMsgs = messages.filter(m => m.channel === msgRecipient);
                if (channelMsgs.length === 0) {
                  return (
                    <div className="sh-msg-empty">
                      <MessageCircle />
                      <p>No messages with {msgRecipient === 'guest' ? 'Guest' : msgRecipient === 'waiter' ? 'Waiter' : 'Chef'} yet</p>
                      <p style={{ fontSize: 11 }}>Start a conversation below</p>
                    </div>
                  );
                }
                return channelMsgs.map(m => {
                  const isMine = m.sender?._id === staffUser?._id || m.sender?._id === 'me';
                  return (
                    <div key={m._id} className={`sh-msg-bubble ${isMine ? 'sent' : 'received'}`}>
                      {!isMine && <div style={{ fontSize: 10, fontWeight: 600, opacity: 0.7, marginBottom: 2 }}>{m.sender?.fullname || 'Unknown'}</div>}
                      {m.content}
                      <div className="sh-msg-bubble-meta">
                        {new Date(m.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
            <div className="sh-msg-input-area">
              <button
                className="sh-topbar-btn"
                style={{ width: 40, height: 40, minWidth: 40, borderRadius: '50%', background: callingChannel === msgRecipient ? 'var(--accent-red)' : 'transparent', color: callingChannel === msgRecipient ? 'white' : 'var(--text-secondary)' }}
                onClick={() => callingChannel === msgRecipient ? setCallingChannel(null) : handleCall(msgRecipient)}
                title={callingChannel === msgRecipient ? 'End Call' : `Call ${msgRecipient}`}
              >
                {callingChannel === msgRecipient ? <PhoneOff size={16} /> : <Phone size={16} />}
              </button>
              <input
                className="sh-msg-input"
                placeholder={`Message ${msgRecipient === 'guest' ? 'Guest' : msgRecipient === 'waiter' ? 'Waiter' : 'Chef'}...`}
                value={msgText}
                onChange={e => setMsgText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendMessage())}
              />
              <button className="sh-msg-send-btn" onClick={handleSendMessage} disabled={!msgText.trim()}>
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modals ── */}
      <NewBookingModal isOpen={showNewBookingModal} onClose={() => setShowNewBookingModal(false)} isDark={isDark} hotelId={hotelId} />
      <WalkInGuestModal isOpen={showWalkInModal} onClose={() => setShowWalkInModal(false)} isDark={isDark} hotelId={hotelId} />
      <ExpressCheckOutModal isOpen={showCheckOutModal} onClose={() => setShowCheckOutModal(false)} isDark={isDark} activeBookingId={activeBookingId} />
      <RoomChangeModal isOpen={showRoomChangeModal} onClose={() => setShowRoomChangeModal(false)} isDark={isDark} activeBookingId={activeBookingId} />
    </div>
  );
};

export default DashboardContent;
