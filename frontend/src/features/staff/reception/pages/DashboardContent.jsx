import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../../../../hooks/useTheme';
import { useStaffAuth } from '../../../../context/StaffAuthContext';
import { useSocket } from '../../../../core/context/SocketContext';
import { toast } from 'react-toastify';
import {
  Search, Bell, Sun, Moon, ArrowUpRight, ArrowDownRight,
  CalendarCheck, LogOut as LogOutIcon, Bed, Plus, UserPlus,
  ArrowRightLeft, Clock, DollarSign, CreditCard,
  Users, TrendingUp, CheckCircle, AlertTriangle,
  Sparkles, Coffee, Wrench, ChevronRight,
  FileText, Zap, Building2, UtensilsCrossed, ConciergeBell,
  X, Send, MessageCircle, Phone, PhoneOff
} from 'lucide-react';
import {
  NewBookingModal, WalkInGuestModal,
  ExpressCheckOutModal, RoomChangeModal
} from './ActionModals';
import * as msgService from '../../../../core/api/services/messaging.service';
import * as receptionApi from '../../../../core/api/services/reception.service';

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

/* ── Enhanced Weekly Occupancy Chart v2 ── */
const WeeklyOccupancyChart = ({ occupancyData: propData }) => {
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const defaultData = [
    { day: 'Mon', value: 0, name: 'Monday' },
    { day: 'Tue', value: 0, name: 'Tuesday' },
    { day: 'Wed', value: 0, name: 'Wednesday' },
    { day: 'Thu', value: 0, name: 'Thursday' },
    { day: 'Fri', value: 0, name: 'Friday' },
    { day: 'Sat', value: 0, name: 'Saturday' },
    { day: 'Sun', value: 0, name: 'Sunday' }
  ];
  const occupancyData = (propData && propData.length > 0) ? propData : defaultData;

  const avg = Math.round(occupancyData.reduce((a, d) => a + d.value, 0) / occupancyData.length);
  const targetPct = 85;
  const svgW = 340;
  const svgH = 200;
  const pad = { top: 24, bottom: 36, left: 36, right: 16 };
  const iW = svgW - pad.left - pad.right;
  const iH = svgH - pad.top - pad.bottom;

  const pts = occupancyData.map((d, i) => ({
    x: pad.left + (i / (occupancyData.length - 1)) * iW,
    y: pad.top + iH - (d.value / 100) * iH,
    ...d
  }));

  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = `M ${pts[0].x} ${pad.top + iH} ` +
    pts.map(p => `L ${p.x} ${p.y}`).join(' ') +
    ` L ${pts[pts.length - 1].x} ${pad.top + iH} Z`;

  const targetY = pad.top + iH - (targetPct / 100) * iH;

  return (
    <div className="sh-v2-chart-card">
      <div className="sh-v2-chart-header">
        <div>
          <h3 className="sh-v2-chart-title">Weekly Occupancy</h3>
          <span className="sh-v2-chart-avg">Avg: {avg}%</span>
        </div>
        <span className={`sh-v2-badge ${avg >= 70 ? 'up' : avg >= 40 ? '' : 'down'}`}>
          <TrendingUp size={12} /> {avg}% avg
        </span>
      </div>
      <div className="sh-v2-chart-body">
        <svg viewBox={`0 0 ${svgW} ${svgH}`} className="sh-v2-occ-svg" preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="v2OccGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3730A3" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#3730A3" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* Horizontal grid */}
          {[0, 25, 50, 75, 100].map(v => {
            const y = pad.top + iH - (v / 100) * iH;
            return (
              <g key={v}>
                <line x1={pad.left} y1={y} x2={svgW - pad.right} y2={y}
                  stroke="var(--border-secondary)" strokeWidth="0.6" strokeDasharray="3,3" opacity="0.5" />
                <text x={pad.left - 6} y={y + 3.5} textAnchor="end" fontSize="11" fontWeight="500"
                  fill="var(--text-tertiary)" fontFamily="'Plus Jakarta Sans', sans-serif">{v}%</text>
              </g>
            );
          })}

          {/* Target line */}
          <line x1={pad.left} y1={targetY} x2={svgW - pad.right} y2={targetY}
            stroke="#F59E0B" strokeWidth="1" strokeDasharray="6,4" opacity="0.8" />
          <text x={svgW - pad.right + 4} y={targetY + 3} fontSize="10" fontWeight="600"
            fill="#F59E0B" fontFamily="'Plus Jakarta Sans', sans-serif">Target</text>

          {/* Gradient area */}
          <path d={areaPath} fill="url(#v2OccGrad)" className="sh-v2-area" />

          {/* Line */}
          <path d={linePath} fill="none" stroke="#3730A3" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round" className="sh-v2-line" />

          {/* Hover column zones (invisible rects for better hit area) */}
          {pts.map((p, i) => {
            const colW = iW / occupancyData.length;
            return (
              <rect key={`zone-${i}`}
                x={p.x - colW / 2} y={pad.top} width={colW} height={iH + pad.bottom}
                fill="transparent"
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
                style={{ cursor: 'pointer' }}
              />
            );
          })}

          {/* Data points */}
          {pts.map((p, i) => (
            <circle key={p.day} cx={p.x} cy={p.y} r={hoveredIdx === i ? 6 : 4}
              fill={hoveredIdx === i ? '#3730A3' : '#fff'}
              stroke="#3730A3" strokeWidth="2.5"
              className={`sh-v2-dot${hoveredIdx === i ? ' active' : ''}`} />
          ))}

          {/* Tooltip */}
          {hoveredIdx !== null && (() => {
            const p = pts[hoveredIdx];
            const delta = hoveredIdx > 0 ? p.value - pts[hoveredIdx - 1].value : 0;
            const deltaStr = hoveredIdx > 0 ? (delta >= 0 ? `+${delta}%` : `${delta}%`) : '—';
            const tipW = 90;
            const tipH = 48;
            let tx = p.x - tipW / 2;
            if (tx < pad.left) tx = pad.left;
            if (tx + tipW > svgW - pad.right) tx = svgW - pad.right - tipW;
            const ty = p.y - tipH - 14;
            return (
              <g className="sh-v2-tooltip">
                <rect x={tx} y={ty} width={tipW} height={tipH} rx="8"
                  fill="var(--bg-surface)" stroke="var(--border-primary)" strokeWidth="1"
                  filter="url(#v2Shadow)" />
                <text x={tx + tipW / 2} y={ty + 16} textAnchor="middle" fontSize="11" fontWeight="700"
                  fill="var(--text-primary)" fontFamily="'Plus Jakarta Sans', sans-serif">{p.name}</text>
                <text x={tx + tipW / 2} y={ty + 30} textAnchor="middle" fontSize="14" fontWeight="800"
                  fill="#3730A3" fontFamily="'Plus Jakarta Sans', sans-serif">{p.value}%</text>
                <text x={tx + tipW / 2} y={ty + 42} textAnchor="middle" fontSize="10" fontWeight="500"
                  fill={delta >= 0 ? '#10B981' : '#EF4444'}
                  fontFamily="'Plus Jakarta Sans', sans-serif">vs prev: {deltaStr}</text>
                {/* Arrow */}
                <polygon points={`${p.x - 5},${ty + tipH} ${p.x + 5},${ty + tipH} ${p.x},${ty + tipH + 6}`}
                  fill="var(--bg-surface)" stroke="var(--border-primary)" strokeWidth="1" />
                <line x1={p.x - 5} y1={ty + tipH} x2={p.x + 5} y2={ty + tipH}
                  stroke="var(--bg-surface)" strokeWidth="2" />
              </g>
            );
          })()}

          {/* Day labels */}
          {pts.map(p => (
            <text key={`lbl-${p.day}`} x={p.x} y={svgH - 8} textAnchor="middle"
              fontSize="12" fontWeight="600" fill="var(--text-tertiary)"
              fontFamily="'Plus Jakarta Sans', sans-serif">{p.day}</text>
          ))}
        </svg>
      </div>
    </div>
  );
};

/* ── Enhanced Revenue Donut Chart v2 ── */
const EnhancedDonutChart = ({ segments }) => {
  const [hoveredSeg, setHoveredSeg] = useState(null);
  const total = segments.reduce((s, seg) => s + (Number(seg.value) || 0), 0);
  const cx = 90;
  const cy = 90;
  const r = 68;
  const strokeW = 26;

  // Build arc paths for each segment
  const segArcs = [];
  let startAngle = -90; // start from top
  if (total === 0) {
    // Nothing to draw – push placeholder segments with zero arcs
    segments.forEach((seg, i) => {
      segArcs.push({ ...seg, path: '', pct: 0, lx: cx, ly: cy - r - 14, idx: i });
    });
  }
  (total > 0 ? segments : []).forEach((seg, i) => {
    const pct = seg.value / total;
    const angle = pct * 360;
    const endAngle = startAngle + angle;
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;
    const x1 = cx + r * Math.cos(startRad);
    const y1 = cy + r * Math.sin(startRad);
    const x2 = cx + r * Math.cos(endRad);
    const y2 = cy + r * Math.sin(endRad);
    const largeArc = angle > 180 ? 1 : 0;
    const path = `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;

    // Label position: midpoint on outside
    const midAngleRad = ((startAngle + angle / 2) * Math.PI) / 180;
    const labelR = r + strokeW / 2 + 14;
    const lx = cx + labelR * Math.cos(midAngleRad);
    const ly = cy + labelR * Math.sin(midAngleRad);

    segArcs.push({ ...seg, path, pct, lx, ly, idx: i });
    startAngle = endAngle;
  });

  return (
    <div className="sh-v2-chart-card">
      <div className="sh-v2-chart-header">
        <div>
          <h3 className="sh-v2-chart-title">Revenue Split</h3>
          <span className="sh-v2-chart-avg">This Month</span>
        </div>
        {total > 0 && (
        <span className="sh-v2-badge up">
          <TrendingUp size={12} /> ₹{total.toLocaleString()}
        </span>
        )}
      </div>
      <div className="sh-v2-donut-body">
        <div className="sh-v2-donut-wrap">
          <svg viewBox="0 0 180 180" className="sh-v2-donut-svg">
            {/* Background ring */}
            <circle cx={cx} cy={cy} r={r} fill="none"
              stroke="var(--bg-inset)" strokeWidth={strokeW} opacity="0.5" />

            {/* Segments */}
            {segArcs.filter(seg => seg.path).map((seg) => (
              <path key={seg.idx} d={seg.path} fill="none"
                stroke={seg.color} strokeWidth={hoveredSeg === seg.idx ? strokeW + 4 : strokeW}
                strokeLinecap="round"
                className="sh-v2-donut-seg"
                onMouseEnter={() => setHoveredSeg(seg.idx)}
                onMouseLeave={() => setHoveredSeg(null)}
                style={{
                  filter: hoveredSeg === seg.idx ? `drop-shadow(0 0 8px ${seg.color}88)` : 'none',
                  transition: 'all 0.3s ease'
                }}
              />
            ))}

            {/* Outside percentage labels */}
            {segArcs.filter(seg => seg.pct > 0).map((seg) => (
              <text key={`pct-${seg.idx}`} x={seg.lx} y={seg.ly + 3}
                textAnchor="middle" fontSize="10" fontWeight="700"
                fill={seg.color} fontFamily="'Plus Jakarta Sans', sans-serif">
                {(seg.pct * 100).toFixed(0)}%
              </text>
            ))}

            {/* Center text */}
            <text x={cx} y={cy - 8} textAnchor="middle" fontSize="10" fontWeight="500"
              fill="var(--text-tertiary)" fontFamily="'Plus Jakarta Sans', sans-serif"
              className="sh-v2-center-label">Total</text>
            <text x={cx} y={cy + 12} textAnchor="middle" fontSize="18" fontWeight="800"
              fill="var(--text-primary)" fontFamily="'Plus Jakarta Sans', sans-serif"
              className="sh-v2-center-value">₹{(total / 1000).toFixed(0)}k</text>
          </svg>
        </div>

        {/* Legend */}
        <div className="sh-v2-legend">
          {segments.map((seg, i) => {
            const pct = total > 0 ? ((seg.value / total) * 100).toFixed(1) : '0.0';
            return (
              <div key={i} className={`sh-v2-legend-row${hoveredSeg === i ? ' active' : ''}`}
                onMouseEnter={() => setHoveredSeg(i)}
                onMouseLeave={() => setHoveredSeg(null)}>
                <div className="sh-v2-legend-dot" style={{ background: seg.color }} />
                <span className="sh-v2-legend-label">{seg.label}</span>
                <div className="sh-v2-legend-right">
                  <span className="sh-v2-legend-val">₹{(seg.value / 1000).toFixed(0)}k</span>
                  <span className="sh-v2-legend-pct">{pct}%</span>
                </div>
              </div>
            );
          })}
        </div>
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
const DashboardContent = ({ onNavigate }) => {
  const { isDark, toggleTheme } = useTheme();
  let staffUser = null;
  try { const auth = useStaffAuth(); staffUser = auth?.staffUser; } catch { /* auth context unavailable */ }

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
  const [_contacts, setContacts] = useState({ waiters: [], chefs: [], receptionists: [], managers: [] });
  const socketRef = useRef(null);
  const msgBodyRef = useRef(null);
  const hotelId = (() => {
    // 1. Try auth context first
    const fromCtx = staffUser?.activeProperty?._id || staffUser?.activeProperty;
    if (fromCtx) return typeof fromCtx === 'object' ? fromCtx.toString() : fromCtx;

    // 2. Try sessionStorage (set during login by StaffAuthContext)
    try {
      const stored = sessionStorage.getItem('activeProperty');
      if (!stored) return null;
      const parsed = JSON.parse(stored);
      if (typeof parsed === 'object' && parsed?._id) return parsed._id;
      if (typeof parsed === 'string' && parsed.length > 0) return parsed;
    } catch {
      const raw = sessionStorage.getItem('activeProperty')?.replace(/"/g, '');
      if (raw && raw.length > 0) return raw;
    }
    return null;
  })();
  const isLoggedIn = !!staffUser;

  // Modal states
  const [showNewBookingModal, setShowNewBookingModal] = useState(false);
  const [showWalkInModal, setShowWalkInModal] = useState(false);
  const [showCheckOutModal, setShowCheckOutModal] = useState(false);
  const [showRoomChangeModal, setShowRoomChangeModal] = useState(false);
  const [activeBookingId] = useState(null);

  // ── Live Dashboard Data (fetched from API) ──
  const [_dashLoading, setDashLoading] = useState(true);
  const [kpiData, setKpiData] = useState([]);
  const [roomStatus, setRoomStatus] = useState([]);
  const [activityFeed, setActivityFeed] = useState([]);
  const [guestRequests, setGuestRequests] = useState([]);
  const [arrivals, setArrivals] = useState([]);
  const [departures, setDepartures] = useState([]);
  const [housekeepingData, setHousekeepingData] = useState([]);
  const [revenueSegments, setRevenueSegments] = useState([]);
  const [weeklyOccupancy, setWeeklyOccupancy] = useState([]);
  const [occupancyPct, setOccupancyPct] = useState(0);
  const [totalRooms, setTotalRooms] = useState(0);

  // Close notifications on outside click
  const notifRef = useRef(null);
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifications(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Socket.io Connection using SocketContext ──
  const { socket, isConnected, subscribe } = useSocket();

  useEffect(() => {
    if (!socket || !isConnected) return;
    
    socketRef.current = socket;

    // Subscribe to new messages
    const unsubscribeMessages = subscribe('new-message', (msg) => {
      setMessages(prev => [...prev, msg]);
    });

    // Subscribe to notifications
    const unsubscribeNotifications = subscribe('notification', (notif) => {
      setNotifications(prev => [notif, ...prev]);
      setUnreadNotifCount(c => c + 1);
    });

    // Subscribe to incoming calls
    const unsubscribeCalls = subscribe('incoming-call', (callData) => {
      // Show browser notification for calls
      if (Notification?.permission === 'granted') {
        new Notification(`📞 Incoming call from ${callData.sender?.fullname}`, {
          body: `Channel: ${callData.channel}`,
          icon: '/favicon.ico',
        });
      }
    });

    return () => {
      unsubscribeMessages();
      unsubscribeNotifications();
      unsubscribeCalls();
    };
  }, [socket, isConnected, subscribe]);

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
      } catch { /* silently ignore */ }
    };
    fetchNotifs();
  }, [isLoggedIn]);

  // ── Fetch Messages when channel changes ──
  useEffect(() => {
    if (!isLoggedIn || !hotelId || !showMessaging) return;
    const fetchMessages = async () => {
      try {
        const res = await msgService.getMessages({ channel: msgRecipient, hotelId, limit: 50 });
        if (res.success) setMessages(res.data);
      } catch { /* silently ignore */ }
    };
    fetchMessages();
  }, [isLoggedIn, showMessaging, msgRecipient, hotelId]);

  // ── Fetch Contacts ──
  useEffect(() => {
    if (!isLoggedIn || !hotelId || !showMessaging) return;
    const fetchContacts = async () => {
      try {
        const res = await msgService.getContacts(hotelId);
        if (res.success) setContacts(res.contacts);
      } catch { /* silently ignore */ }
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

  // ── Fetch Dashboard Data from API ──
  useEffect(() => {
    if (!hotelId) {
      setDashLoading(false);
      return;
    }
    const fetchDashboard = async () => {
      setDashLoading(true);
      try {
        const [summaryRes, roomStatusRes, arrivalsRes, deptRes, requestsRes, activityRes, weeklyRes, revenueRes] = await Promise.allSettled([
          receptionApi.getDashboardSummary(),
          receptionApi.getLiveRoomStatus(),
          receptionApi.getTodayArrivals(),
          receptionApi.getTodayDepartures(),
          receptionApi.getGuestRequests(),
          receptionApi.getActivityLog(6),
          receptionApi.getWeeklyOccupancy(),
          receptionApi.getRevenueSplit(),
        ]);

        // KPI data
        if (summaryRes.status === 'fulfilled' && summaryRes.value?.success) {
          const s = summaryRes.value.data;
          setKpiData([
            { title: "Check-ins", value: String(s.checkIns?.value ?? 0), sub: `/${s.checkIns?.total ?? 0}`, trend: s.checkIns?.trend ?? '+0%', up: !String(s.checkIns?.trend).startsWith('-'), icon: CalendarCheck, color: '#6366f1', sparkline: s.checkIns?.sparkline ?? [0,0,0,0,0,0,0] },
            { title: "Check-outs", value: String(s.checkOuts?.value ?? 0), sub: `/${s.checkOuts?.total ?? 0}`, trend: s.checkOuts?.trend ?? '+0%', up: !String(s.checkOuts?.trend).startsWith('-'), icon: LogOutIcon, color: '#f97316', sparkline: s.checkOuts?.sparkline ?? [0,0,0,0,0,0,0] },
            { title: "Occupancy", value: String(s.occupancy?.value ?? 0), sub: '%', trend: s.occupancy?.trend ?? '+0%', up: !String(s.occupancy?.trend).startsWith('-'), icon: Building2, color: '#10b981', sparkline: s.occupancy?.sparkline ?? [0,0,0,0,0,0,0] },
            { title: "Revenue", value: s.revenue?.value ?? '₹0', sub: '', trend: s.revenue?.trend ?? '+0%', up: !String(s.revenue?.trend).startsWith('-'), icon: DollarSign, color: '#8b5cf6', sparkline: s.revenue?.sparkline ?? [0,0,0,0,0,0,0] },
            { title: "Pending Pay", value: String(s.pendingPayments?.value ?? 0), sub: '', trend: s.pendingPayments?.trend ?? '0', up: !String(s.pendingPayments?.trend).startsWith('+'), icon: CreditCard, color: '#f59e0b', sparkline: s.pendingPayments?.sparkline ?? [0,0,0,0,0,0,0] },
            { title: "Available", value: String(s.availableRooms?.value ?? 0), sub: '', trend: s.availableRooms?.trend ?? '0', up: false, icon: Bed, color: '#06b6d4', sparkline: s.availableRooms?.sparkline ?? [0,0,0,0,0,0,0] },
          ]);
          setOccupancyPct(s.occupancy?.value ?? 0);
        }

        // Room status
        if (roomStatusRes.status === 'fulfilled' && roomStatusRes.value?.success) {
          const rs = roomStatusRes.value.data;
          const total = rs.total || ((rs.available || 0) + (rs.occupied || 0) + (rs.cleaning || 0) + (rs.maintenance || 0) + (rs.reserved || 0));
          setTotalRooms(total);
          const pct = (v) => total > 0 ? Math.round((v / total) * 100) : 0;
          setRoomStatus([
            { label: 'Available', count: rs.available || 0, color: '#10b981', pct: pct(rs.available || 0) },
            { label: 'Occupied', count: rs.occupied || 0, color: '#6366f1', pct: pct(rs.occupied || 0) },
            { label: 'Cleaning', count: rs.cleaning || 0, color: '#f59e0b', pct: pct(rs.cleaning || 0) },
            { label: 'Maintenance', count: rs.maintenance || 0, color: '#ef4444', pct: pct(rs.maintenance || 0) },
          ]);
        }

        // Arrivals
        if (arrivalsRes.status === 'fulfilled' && arrivalsRes.value?.success) {
          setArrivals((arrivalsRes.value.data || []).slice(0, 5).map((a, i) => ({
            id: i + 1, guest: a.guest?.name || 'Unknown', room: a.room?.type || '', num: a.room?.number || '',
            time: a.expectedTime || '', source: a.source || a.bookingSource || '', payment: a.paymentStatus || 'unpaid', vip: a.guest?.vip || a.isVip || false,
          })));
        }

        // Departures
        if (deptRes.status === 'fulfilled' && deptRes.value?.success) {
          setDepartures((deptRes.value.data || []).slice(0, 5).map((d, i) => ({
            id: i + 1, guest: d.guest?.name || 'Unknown', room: d.room?.type || '', num: d.room?.number || '',
            time: d.checkOutTime || '', source: d.source || d.bookingSource || '', payment: d.paymentStatus || 'paid', vip: d.guest?.vip || d.isVip || false,
          })));
        }

        // Guest Requests
        if (requestsRes.status === 'fulfilled' && requestsRes.value?.success) {
          const catIconMap = { 'Room Service': ConciergeBell, 'Checkout': Clock, 'Maintenance': Wrench, 'Amenities': Coffee, 'Other': AlertTriangle };
          setGuestRequests((requestsRes.value.data || []).map((r, i) => ({
            id: r._id || i, room: `Room ${r.roomNumber}`, req: r.description, time: new Date(r.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
            priority: r.urgency, category: r.category, catIcon: catIconMap[r.category] || AlertTriangle,
            sla: r.isOverdue ? 'Overdue' : r.timeRemainingMinutes > 0 ? `${r.timeRemainingMinutes} min left` : 'Overdue',
            overdue: r.isOverdue, actions: r.urgency === 'urgent' ? ['Assign', 'Ignore'] : ['Approve', 'Deny'], _id: r._id,
          })));
        }

        // Activity Feed
        if (activityRes.status === 'fulfilled' && activityRes.value?.success) {
          const iconMap = { CalendarCheck, DollarSign, Sparkles, Users, LogOut: LogOutIcon, Wrench };
          setActivityFeed((activityRes.value.data || []).slice(0, 6).map((a, i) => ({
            text: a.text || a.description, time: a.timeAgo || a.time || formatTime(a.createdAt),
            icon: iconMap[a.icon] || CheckCircle, color: a.color || '#6366f1', live: i === 0,
          })));
        }

        // Weekly Occupancy
        if (weeklyRes.status === 'fulfilled' && weeklyRes.value?.success) {
          const wData = weeklyRes.value.data;
          setWeeklyOccupancy(Array.isArray(wData) ? wData : wData?.days || []);
        }

        // Revenue Split
        if (revenueRes.status === 'fulfilled' && revenueRes.value?.success) {
          const rv = revenueRes.value.data;
          setRevenueSegments([
            { label: 'Rooms', value: rv.rooms || 0, color: '#6366f1' },
            { label: 'Food & Bev', value: rv.food || 0, color: '#f59e0b' },
            { label: 'Services', value: rv.services || 0, color: '#10b981' },
          ]);
        }

        // Housekeeping mini-list (top 4 items from the housekeeping endpoint)
        try {
          const hkRes = await receptionApi.getHousekeepingTasks({ status: 'in-progress,needs-cleaning', limit: 4 });
          if (hkRes?.success) {
            setHousekeepingData((hkRes.data || []).slice(0, 4).map(t => ({
              room: `Room ${t.roomNumber}`, staff: t.assignedToName || 'Pending',
              status: t.status === 'in-progress' ? 'assigned' : t.status === 'clean' || t.status === 'inspected' ? 'done' : 'pending',
            })));
          }
        } catch { /* ignore housekeeping errors */ }

      } catch { /* silently ignore */ } finally {
        setDashLoading(false);
      }
    };
    fetchDashboard();
  }, [hotelId]);

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
    } catch {
      setMsgText(text); // Restore text on failure
    }
  };

  // ── Initiate Call ──
  const handleCall = async (channel) => {
    if (!isLoggedIn) {
      toast.info('Please log in to use calling features', {
        position: 'top-center',
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        theme: isDark ? 'dark' : 'light',
      });
      return;
    }
    setCallingChannel(channel);
    try {
      await msgService.initiateCall({ channel, hotelId });
      // Auto-end after 30 seconds (demo)
      setTimeout(() => setCallingChannel(null), 30000);
    } catch {
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
    } catch { /* silently ignore */ }
  };

  // Filter notifications by tab
  const notifTypeMap = { payment: ['payment_received', 'payment_failed'], request: ['waiter_call', 'order_status'], system: ['system', 'hotel_approved', 'booking_confirmed'] };
  const filteredNotifs = notifTab === 'all'
    ? notifications
    : notifications.filter(n => (notifTypeMap[notifTab] || []).includes(n.type));

  // Use real notification data only — no mock fallback in production
  const displayNotifs = filteredNotifs;
  const displayUnreadCount = unreadNotifCount;

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

  // ── Data (fetched from API via state) ──

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
          <OccupancyRing pct={occupancyPct} />
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
          {staffUser?.profilePicture ? (
            <img
              src={staffUser.profilePicture}
              alt={staffUser.fullname}
              className="sh-avatar-btn"
              style={{ padding: 0, objectFit: 'cover' }}
            />
          ) : (
            <button className="sh-avatar-btn">
              {staffUser?.fullname
                ? (function (name) {
                  const parts = name.trim().split(/\s+/);
                  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
                  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
                })(staffUser.fullname)
                : 'S'}
            </button>
          )}
        </div>
      </header>

      {/* ── No Hotel Warning ── */}
      {!hotelId && (
        <div style={{ margin: '16px 24px', padding: '14px 20px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
          <AlertTriangle size={20} style={{ color: '#dc2626', flexShrink: 0 }} />
          <span style={{ fontSize: 13, fontWeight: 500, color: '#b91c1c' }}>
            No hotel property is linked to your account. Please contact your administrator to assign a property, then log out and log back in.
          </span>
        </div>
      )}

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
                    {String(kpi.value).startsWith('₹') ? kpi.value : <AnimatedNumber value={kpi.value} />}
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
                <span style={{ fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 500 }}>{totalRooms} Total</span>
              </div>
              <div className="sh-card-body">
                <div className="sh-room-filters">
                  {[{ id: 'all', label: 'All', count: totalRooms }, ...roomStatus.map(s => ({ id: s.label.toLowerCase(), label: s.label, count: s.count }))].map(f => (
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

            {/* Bottom Row: Enhanced Charts + Housekeeping  */}
            <div className="sh-bottom-widgets">
              {/* Enhanced Weekly Occupancy */}
              <div className="sh-v2-chart-wrapper" style={{ animationDelay: '0.4s' }}>
                <WeeklyOccupancyChart occupancyData={weeklyOccupancy} />
              </div>

              {/* Enhanced Revenue Split */}
              <div className="sh-v2-chart-wrapper" style={{ animationDelay: '0.45s' }}>
                <EnhancedDonutChart segments={revenueSegments} />
              </div>

              {/* Housekeeping */}
              <div className="sh-card" style={{ animationDelay: '0.5s' }}>
                <div className="sh-card-header">
                  <h3 className="sh-card-title">🧹 Housekeeping</h3>
                </div>
                <div className="sh-card-body">
                  <div className="sh-hk-list">
                    {housekeepingData.map((h, i) => (
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
                        <button className="sh-req-btn approve" onClick={async () => {
                          if (r._id) { try { await receptionApi.assignGuestRequest(r._id); setGuestRequests(prev => prev.filter(x => x._id !== r._id)); } catch { /* silent */ } }
                        }}>{r.actions[0]}</button>
                        <button className="sh-req-btn deny" onClick={async () => {
                          if (r._id) { try { await receptionApi.ignoreGuestRequest(r._id); setGuestRequests(prev => prev.filter(x => x._id !== r._id)); } catch { /* silent */ } }
                        }}>{r.actions[1]}</button>
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="sh-card-badge" style={{ background: 'var(--accent-emerald-light)', color: 'var(--accent-emerald)' }}>● Live</span>
                  <button
                    onClick={() => onNavigate && onNavigate('reports')}
                    style={{ fontSize: 11, color: 'var(--accent-purple)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  >View All</button>
                </div>
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
      <ExpressCheckOutModal isOpen={showCheckOutModal} onClose={() => setShowCheckOutModal(false)} isDark={isDark} activeBookingId={activeBookingId} hotelId={hotelId} />
      <RoomChangeModal isOpen={showRoomChangeModal} onClose={() => setShowRoomChangeModal(false)} isDark={isDark} activeBookingId={activeBookingId} hotelId={hotelId} />
    </div>
  );
};

export default DashboardContent;
