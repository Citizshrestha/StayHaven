import { useState, useMemo } from 'react';
import { Bell, Check, CheckCheck, Trash2, Filter } from 'lucide-react';
import { useNotifications, NOTIFICATION_TYPES } from '../../../../core/context/useNotifications';

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: NOTIFICATION_TYPES.NEW_ORDER, label: 'Orders' },
  { key: NOTIFICATION_TYPES.WAITER_CALL, label: 'Waiter Calls' },
  { key: NOTIFICATION_TYPES.MESSAGE, label: 'Messages' },
  { key: NOTIFICATION_TYPES.ORDER_STATUS, label: 'Status Updates' },
];

const PRIORITY_COLORS = {
  high: { bg: '#fef2f2', color: '#dc2626', label: 'High' },
  medium: { bg: '#fffbeb', color: '#d97706', label: 'Medium' },
  low: { bg: '#f0fdf4', color: '#16a34a', label: 'Low' },
};

const timeAgo = (date) => {
  const mins = Math.floor((Date.now() - new Date(date)) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
  return `${Math.floor(mins / 1440)}d ago`;
};

const s = {
  container: { padding: '24px', maxWidth: 800, margin: '0 auto' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 },
  title: { margin: 0, fontSize: 22, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 },
  stats: { display: 'flex', gap: 16, fontSize: 13, color: '#6b7280', marginTop: 6 },
  statBadge: (color) => ({ background: color, color: '#fff', borderRadius: 10, padding: '2px 8px', fontWeight: 600, fontSize: 12 }),
  actions: { display: 'flex', gap: 8 },
  btn: { display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 12px', border: '1px solid #d1d5db', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 13, color: '#374151' },
  tabs: { display: 'flex', gap: 4, marginBottom: 16, overflowX: 'auto', paddingBottom: 4 },
  tab: (active) => ({ padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: active ? 600 : 400, background: active ? '#2563eb' : '#f3f4f6', color: active ? '#fff' : '#4b5563' }),
  list: { display: 'flex', flexDirection: 'column', gap: 6 },
  item: (isRead) => ({ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 16px', borderRadius: 8, border: '1px solid #e5e7eb', background: isRead ? '#fff' : '#eff6ff', cursor: 'pointer', transition: 'background .15s' }),
  dot: (isRead) => ({ width: 8, height: 8, borderRadius: '50%', background: isRead ? '#d1d5db' : '#2563eb', marginTop: 6, flexShrink: 0 }),
  body: { flex: 1, minWidth: 0 },
  itemTitle: { margin: 0, fontSize: 14, fontWeight: 500, lineHeight: 1.4 },
  meta: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, fontSize: 12, color: '#9ca3af' },
  priority: (p) => { const c = PRIORITY_COLORS[p] || PRIORITY_COLORS.medium; return { background: c.bg, color: c.color, borderRadius: 4, padding: '1px 6px', fontSize: 11, fontWeight: 600 }; },
  empty: { textAlign: 'center', padding: '60px 24px', color: '#9ca3af' },
};

const NotificationsManagement = () => {
  const { notifications, unreadCount, isLoadingInitial, markRead, markAllRead, clearAll } = useNotifications();
  const [tab, setTab] = useState('all');

  const filtered = useMemo(() => {
    if (tab === 'all') return notifications;
    if (tab === 'unread') return notifications.filter(n => !n.isRead);
    return notifications.filter(n => n.type === tab);
  }, [notifications, tab]);

  const readCount = notifications.length - unreadCount;

  if (isLoadingInitial) {
    return (
      <div style={s.empty}>
        <Bell size={40} strokeWidth={1.5} style={{ marginBottom: 12, opacity: 0.4 }} />
        <p style={{ margin: 0 }}>Loading notifications...</p>
      </div>
    );
  }

  return (
    <div style={s.container}>
      {/* Header */}
      <div style={s.header}>
        <div>
          <h2 style={s.title}><Bell size={22} /> Notifications</h2>
          <div style={s.stats}>
            <span>{notifications.length} total</span>
            <span><span style={s.statBadge('#2563eb')}>{unreadCount}</span> unread</span>
            <span><span style={s.statBadge('#6b7280')}>{readCount}</span> read</span>
          </div>
        </div>
        <div style={s.actions}>
          <button style={s.btn} onClick={markAllRead} disabled={!unreadCount} title="Mark all read">
            <CheckCheck size={14} /> Mark all read
          </button>
          <button style={{ ...s.btn, borderColor: '#fca5a5', color: '#dc2626' }} onClick={clearAll} disabled={!notifications.length} title="Clear all">
            <Trash2 size={14} /> Clear
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div style={s.tabs}>
        {TABS.map(t => (
          <button key={t.key} style={s.tab(tab === t.key)} onClick={() => setTab(t.key)}>
            {t.label}
            {t.key === 'unread' && unreadCount > 0 && <span style={{ marginLeft: 4 }}>({unreadCount})</span>}
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div style={s.empty}>
          <Filter size={32} strokeWidth={1.5} style={{ marginBottom: 8, opacity: 0.3 }} />
          <p style={{ margin: 0 }}>{tab === 'all' ? 'No notifications yet' : `No ${TABS.find(t => t.key === tab)?.label?.toLowerCase() || ''} notifications`}</p>
        </div>
      ) : (
        <div style={s.list}>
          {filtered.map(n => (
            <div key={n.id} style={s.item(n.isRead)} onClick={() => !n.isRead && markRead(n.id)}>
              <div style={s.dot(n.isRead)} />
              <div style={s.body}>
                <p style={s.itemTitle}>{n.title || n.message}</p>
                {n.title && n.message && n.title !== n.message && (
                  <p style={{ margin: '2px 0 0', fontSize: 13, color: '#6b7280' }}>{n.message}</p>
                )}
                <div style={s.meta}>
                  <span>{timeAgo(n.createdAt)}</span>
                  {n.priority && <span style={s.priority(n.priority)}>{PRIORITY_COLORS[n.priority]?.label || n.priority}</span>}
                  {n.isRead && <Check size={12} style={{ color: '#9ca3af' }} />}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NotificationsManagement;
