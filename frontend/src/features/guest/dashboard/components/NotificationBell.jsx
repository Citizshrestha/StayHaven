import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, ChefHat, Receipt, Wallet, MessageSquare, Info, RefreshCw } from 'lucide-react';
import { cn } from '../../../../core/utils/cn';
import { formatRelative } from '../utils/format';
import Sheet from './ui/Sheet';
import Button from './ui/Button';
import EmptyState from './ui/EmptyState';

const TYPE_ICON = {
  order_status: ChefHat,
  order_delivered: ChefHat,
  new_order: ChefHat,
  bill_received: Receipt,
  payment_received: Wallet,
  payment_failed: Wallet,
  guest_request: MessageSquare,
};

// Only ever navigate inside the portal — actionUrl is server data.
const safePortalPath = (url) => (typeof url === 'string' && /^\/guest-dashboard(\/[\w-]*)*$/.test(url) ? url : null);

/** Bell button + notifications sheet. State comes from useGuestNotifications (owned by the layout). */
const NotificationBell = ({ state, className }) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { items, unread, loading, error, refresh, markRead, markAllRead } = state;

  const openItem = (n) => {
    if (!n.isRead) markRead(n._id);
    const path = safePortalPath(n.actionUrl);
    if (path) {
      setOpen(false);
      navigate(path);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
        aria-haspopup="dialog"
        className={cn('relative w-11 h-11 flex items-center justify-center rounded-full text-(--g-text-muted) hover:bg-(--g-surface-sunken) hover:text-(--g-text)', className)}
      >
        <Bell className="w-5 h-5" aria-hidden="true" />
        {unread > 0 && (
          <span aria-hidden="true" className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-(--g-radius-pill) bg-(--g-danger-fill) text-white text-[11px] font-bold guestNum flex items-center justify-center">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Notifications"
        description={unread ? `${unread} unread` : 'You’re all caught up'}
        footer={items.length > 0 && unread > 0 && (
          <Button variant="secondary" icon={CheckCheck} className="w-full" onClick={markAllRead}>Mark all as read</Button>
        )}
      >
        {loading ? (
          <p role="status" className="g-small text-(--g-text-muted)">Loading…</p>
        ) : error ? (
          <div role="alert">
            <EmptyState icon={Info} title="Couldn’t load notifications" description={error}
              action={<Button variant="secondary" icon={RefreshCw} onClick={refresh}>Try again</Button>} />
          </div>
        ) : items.length === 0 ? (
          <EmptyState icon={Bell} title="No notifications yet" description="Order updates, bills and request replies will show up here." />
        ) : (
          <ul className="space-y-2" aria-live="polite">
            {items.map((n) => {
              const Icon = TYPE_ICON[n.type] || Info;
              const clickable = Boolean(safePortalPath(n.actionUrl)) || !n.isRead;
              return (
                <li key={n._id}>
                  <button
                    type="button"
                    onClick={() => openItem(n)}
                    disabled={!clickable}
                    className={cn(
                      'w-full text-left flex items-start gap-3 p-3 rounded-(--g-radius-md) border transition-colors duration-150',
                      n.isRead ? 'border-(--g-border) bg-(--g-surface)' : 'border-(--g-primary) bg-(--g-primary-tint)',
                      clickable ? 'hover:bg-(--g-surface-sunken)' : 'cursor-default'
                    )}
                  >
                    <span className="w-9 h-9 shrink-0 rounded-(--g-radius-sm) bg-(--g-surface-sunken) text-(--g-primary-text) flex items-center justify-center">
                      <Icon className="w-4 h-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-2">
                        <span className="g-small font-semibold text-(--g-text)">{n.title}</span>
                        {!n.isRead && <span className="sr-only">Unread</span>}
                      </span>
                      <span className="block g-small text-(--g-text-muted) mt-0.5">{n.message}</span>
                      <span className="block g-small text-(--g-text-subtle) mt-1">{formatRelative(n.createdAt)}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Sheet>
    </>
  );
};

NotificationBell.propTypes = {
  state: PropTypes.shape({
    items: PropTypes.array.isRequired,
    unread: PropTypes.number.isRequired,
    loading: PropTypes.bool.isRequired,
    error: PropTypes.string,
    refresh: PropTypes.func.isRequired,
    markRead: PropTypes.func.isRequired,
    markAllRead: PropTypes.func.isRequired,
  }).isRequired,
  className: PropTypes.string,
};

export default NotificationBell;
