import React, { useState, useMemo } from 'react';
import { Bell, Check, CheckCheck, Trash2, ShoppingBag, BellRing, MessageSquare, Activity } from 'lucide-react';
import { useNotifications, NOTIFICATION_TYPES } from '../../../../core/context/useNotifications';
import ConfirmDialog from '../../../../components/ConfirmDialog';
import {
  PageHeader,
  Button,
  Badge,
  FilterTabs,
  EmptyState,
  Skeleton,
} from '../components/ui';
import '../styles/hotel-admin-tokens.css';

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: NOTIFICATION_TYPES.NEW_ORDER, label: 'Orders' },
  { key: NOTIFICATION_TYPES.WAITER_CALL, label: 'Waiter Calls' },
  { key: NOTIFICATION_TYPES.MESSAGE, label: 'Messages' },
  { key: NOTIFICATION_TYPES.ORDER_STATUS, label: 'Status Updates' },
];

const TYPE_ICON = {
  [NOTIFICATION_TYPES.NEW_ORDER]: ShoppingBag,
  [NOTIFICATION_TYPES.WAITER_CALL]: BellRing,
  [NOTIFICATION_TYPES.MESSAGE]: MessageSquare,
  [NOTIFICATION_TYPES.ORDER_STATUS]: Activity,
};

const PRIORITY_TONE = { high: 'danger', medium: 'warning', low: 'success' };

const timeAgo = (date) => {
  const mins = Math.floor((Date.now() - new Date(date)) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
  return `${Math.floor(mins / 1440)}d ago`;
};

const NotificationsManagement = () => {
  const { notifications, unreadCount, isLoadingInitial, markRead, markAllRead, clearAll } = useNotifications();
  const [tab, setTab] = useState('all');
  const [confirmClear, setConfirmClear] = useState(false);

  const filtered = useMemo(() => {
    if (tab === 'all') return notifications;
    if (tab === 'unread') return notifications.filter((n) => !n.isRead);
    return notifications.filter((n) => n.type === tab);
  }, [notifications, tab]);

  const tabOptions = TABS.map((t) => ({
    value: t.key,
    label: t.label,
    count: t.key === 'unread' ? unreadCount || undefined : undefined,
  }));

  return (
    <div className="ha-page" style={{ maxWidth: 860, margin: '0 auto' }}>
      <PageHeader
        title="Notifications"
        subtitle={`${notifications.length} total · ${unreadCount} unread`}
        actions={
          <>
            <Button variant="secondary" onClick={markAllRead} disabled={!unreadCount}>
              <CheckCheck size={16} aria-hidden="true" /> Mark all read
            </Button>
            <Button variant="danger" onClick={() => setConfirmClear(true)} disabled={!notifications.length}>
              <Trash2 size={16} aria-hidden="true" /> Clear
            </Button>
          </>
        }
        toolbar={<FilterTabs options={tabOptions} value={tab} onChange={setTab} ariaLabel="Filter notifications" />}
      />

      {isLoadingInitial ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="ha-card ha-card--pad" style={{ display: 'flex', gap: 12 }}>
              <Skeleton width={36} height={36} radius="var(--ha-radius-md)" />
              <div style={{ flex: 1 }}>
                <Skeleton width="60%" height={14} style={{ marginBottom: 8 }} />
                <Skeleton width="30%" height={12} />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Bell size={26} />}
          title={tab === 'all' ? 'No notifications yet' : `No ${TABS.find((t) => t.key === tab)?.label?.toLowerCase() || ''} notifications`}
          description="New activity across your property will appear here."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map((n) => {
            const TIcon = TYPE_ICON[n.type] || Bell;
            return (
              <div
                key={n.id}
                className="ha-card"
                role={!n.isRead ? 'button' : undefined}
                tabIndex={!n.isRead ? 0 : undefined}
                onClick={() => !n.isRead && markRead(n.id)}
                onKeyDown={(e) => {
                  if (!n.isRead && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    markRead(n.id);
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                  padding: '14px 16px',
                  cursor: n.isRead ? 'default' : 'pointer',
                  background: n.isRead ? 'var(--ha-surface)' : 'var(--ha-primary-soft)',
                  borderColor: n.isRead ? 'var(--ha-border)' : 'transparent',
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 'var(--ha-radius-md)',
                    background: 'var(--ha-surface-sunken)',
                    color: 'var(--ha-text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <TIcon size={18} />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p className="ha-body-strong" style={{ margin: 0, color: 'var(--ha-text)' }}>{n.title || n.message}</p>
                  {n.title && n.message && n.title !== n.message && (
                    <p className="ha-small" style={{ margin: '2px 0 0', color: 'var(--ha-text-subtle)' }}>{n.message}</p>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                    <span className="ha-small" style={{ color: 'var(--ha-text-subtle)' }}>{timeAgo(n.createdAt)}</span>
                    {n.priority && <Badge tone={PRIORITY_TONE[n.priority] || 'warning'}>{n.priority}</Badge>}
                    {n.isRead && <Check size={13} aria-label="Read" style={{ color: 'var(--ha-text-subtle)' }} />}
                  </div>
                </div>
                {!n.isRead && <span aria-label="Unread" style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--ha-primary)', marginTop: 6, flexShrink: 0 }} />}
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmClear}
        onClose={() => setConfirmClear(false)}
        onConfirm={() => {
          clearAll();
          setConfirmClear(false);
        }}
        variant="danger"
        title="Clear all notifications?"
        message="All notifications will be permanently removed from this list."
        confirmText="Clear All"
      />
    </div>
  );
};

export default NotificationsManagement;
