import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Send, ConciergeBell, UtensilsCrossed, CalendarClock, RefreshCw, AlertCircle,
  Check, CheckCheck, ArrowDown, Loader2, RotateCw, Wifi, WifiOff,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import EmptyState from '../components/ui/EmptyState';
import Button from '../components/ui/Button';
import Avatar from '../components/ui/Avatar';
import { Skeleton } from '../components/ui/Skeleton';
import { useSocket } from '../../../../core/context/SocketContext';
import {
  getChatContext,
  getChatMessages,
  sendChatMessage,
  markChatRead,
  getChatUnreadCount,
} from '../guestDashboardApi';
import { cn } from '../../../../core/utils/cn';
import { formatClock, formatDayLabel, formatShortStamp } from '../utils/format';

/* ─────────────────────────── config ─────────────────────────── */

// Each channel carries its own accent (tokens in guest-tokens.css). Classes are
// spelled out in full so Tailwind can see them at build time.
const CHANNELS = {
  reception: {
    label: 'Front Desk',
    team: 'Reception team',
    Icon: ConciergeBell,
    tone: 'g-tone-indigo',
    fill: 'g-fill-indigo',
    fg: 'text-(--g-indigo-fg)',
    focus: 'focus-within:border-(--g-indigo-fill) focus-within:ring-(--g-indigo-fill)/20',
    blurb: 'Check-in & check-out, room issues, housekeeping and general questions.',
    suggestions: ['Could I get extra towels?', 'Is late checkout possible?', 'The Wi-Fi isn’t working', 'Can you call me a taxi?'],
  },
  'room-service': {
    label: 'Room Service',
    team: 'Dining team',
    Icon: UtensilsCrossed,
    tone: 'g-tone-orange',
    fill: 'g-fill-orange',
    fg: 'text-(--g-orange-fg)',
    focus: 'focus-within:border-(--g-orange-fill) focus-within:ring-(--g-orange-fill)/20',
    blurb: 'Food orders, menu and allergy questions, and delivery updates.',
    suggestions: ['What’s on the menu tonight?', 'How long until my order arrives?', 'Do you have vegetarian options?', 'Please add extra cutlery'],
  },
};
const CHANNEL_ORDER = ['reception', 'room-service'];

const PAGE_SIZE = 50;
const MAX_LEN = 2000;
const GROUP_WINDOW_MS = 5 * 60 * 1000; // consecutive messages within 5 min are grouped
const NEAR_BOTTOM_PX = 120;

/* ─────────────────────────── helpers ─────────────────────────── */

const idOf = (v) => (v && typeof v === 'object' ? v._id : v);
const sameId = (a, b) => a != null && b != null && String(a) === String(b);

// Date/time formatting comes from the portal's single helper (utils/format).
const formatTime = formatClock;
const formatPreviewTime = formatShortStamp;

/* ─────────────────────────── sub-components ─────────────────────────── */

const UnreadBadge = ({ count, className }) =>
  count > 0 ? (
    <span className={cn('min-w-[20px] h-5 px-1.5 rounded-(--g-radius-pill) bg-(--g-danger-fill) text-white text-[11px] leading-none font-bold guestNum inline-flex items-center justify-center', className)}>
      <span className="sr-only">Unread: </span>{count > 99 ? '99+' : count}
    </span>
  ) : null;

const ChannelTile = ({ channel, active, size = 'md' }) => {
  const c = CHANNELS[channel];
  const Icon = c.Icon;
  return (
    <span
      aria-hidden="true"
      className={cn(
        'shrink-0 rounded-(--g-radius-sm) flex items-center justify-center transition-colors duration-150',
        size === 'sm' ? 'w-10 h-10' : 'w-11 h-11',
        active ? c.fill : c.tone
      )}
    >
      <Icon className={size === 'sm' ? 'w-5 h-5' : 'w-5 h-5'} />
    </span>
  );
};

const MessageStatus = ({ m }) => {
  if (m._status === 'sending') return <span className="inline-flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />Sending</span>;
  if (m._status === 'failed') return null; // rendered separately with a retry action
  if (m.isRead) return <span className="inline-flex items-center gap-1 text-(--g-sky-fg)"><CheckCheck className="w-3.5 h-3.5" aria-hidden="true" />Seen</span>;
  return <span className="inline-flex items-center gap-1"><Check className="w-3.5 h-3.5" aria-hidden="true" />Sent</span>;
};

/* ─────────────────────────── page ─────────────────────────── */

const ChatView = () => {
  const navigate = useNavigate();
  const { subscribe, isConnected } = useSocket();
  const myId = localStorage.getItem('userId');

  const [context, setContext] = useState(null);
  const [loadingContext, setLoadingContext] = useState(true);
  const [contextError, setContextError] = useState(null);

  const [channel, setChannel] = useState('reception');
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messagesError, setMessagesError] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);

  const [previews, setPreviews] = useState({}); // { [channel]: lastMessage }
  const [unread, setUnread] = useState({});     // { [channel]: count }

  const [input, setInput] = useState('');
  const [showJump, setShowJump] = useState(false);

  const scrollRef = useRef(null);
  const textareaRef = useRef(null);
  const channelRef = useRef(channel);
  const stickToBottomRef = useRef(true);
  const prependAnchorRef = useRef(null); // preserves scroll position when loading older messages

  useEffect(() => { channelRef.current = channel; }, [channel]);

  /* ── availability ── */
  const loadContext = useCallback(async () => {
    setLoadingContext(true);
    setContextError(null);
    try {
      const res = await getChatContext();
      setContext(res.data);
    } catch (err) {
      setContextError(err.response?.data?.message || 'Unable to load chat right now.');
    } finally {
      setLoadingContext(false);
    }
  }, []);
  useEffect(() => { loadContext(); }, [loadContext]);

  /* ── sidebar data: last message + unread per channel ── */
  const loadOverview = useCallback(async () => {
    try {
      const [unreadRes, ...lastRes] = await Promise.all([
        getChatUnreadCount(),
        ...CHANNEL_ORDER.map((ch) => getChatMessages(ch, { limit: 1 })),
      ]);
      setUnread(unreadRes?.data?.byChannel || {});
      const next = {};
      CHANNEL_ORDER.forEach((ch, i) => { next[ch] = lastRes[i]?.data?.[0] || null; });
      setPreviews(next);
    } catch {
      /* previews are a nicety — never block the chat on them */
    }
  }, []);
  useEffect(() => { if (context?.available) loadOverview(); }, [context?.available, loadOverview]);

  /* ── messages for the open channel ── */
  const loadMessages = useCallback(async (ch) => {
    setLoadingMessages(true);
    setMessagesError(null);
    stickToBottomRef.current = true;
    try {
      const res = await getChatMessages(ch, { limit: PAGE_SIZE });
      if (channelRef.current !== ch) return; // user switched while loading
      const list = res.data || [];
      setMessages(list);
      setHasMore(list.length === PAGE_SIZE);
      setUnread((u) => ({ ...u, [ch]: 0 }));
      markChatRead(ch).catch(() => {});
    } catch (err) {
      if (channelRef.current === ch) setMessagesError(err.response?.data?.message || 'Could not load messages.');
    } finally {
      if (channelRef.current === ch) setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    if (!context?.available) return;
    setMessages([]);
    setShowJump(false);
    loadMessages(channel);
  }, [context?.available, channel, loadMessages]);

  const loadOlder = async () => {
    const oldest = messages.find((m) => !m._status);
    if (!oldest || loadingOlder) return;
    setLoadingOlder(true);
    const el = scrollRef.current;
    prependAnchorRef.current = el ? el.scrollHeight - el.scrollTop : null;
    try {
      const res = await getChatMessages(channel, { limit: PAGE_SIZE, before: oldest.createdAt });
      const older = res.data || [];
      setHasMore(older.length === PAGE_SIZE);
      setMessages((prev) => {
        const seen = new Set(prev.map((m) => m._id));
        return [...older.filter((m) => !seen.has(m._id)), ...prev];
      });
    } catch {
      prependAnchorRef.current = null;
    } finally {
      setLoadingOlder(false);
    }
  };

  /* ── scrolling ── */
  const scrollToBottom = useCallback((behavior = 'auto') => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (prependAnchorRef.current != null) {
      // Older page was prepended — keep the viewport anchored where it was.
      el.scrollTop = el.scrollHeight - prependAnchorRef.current;
      prependAnchorRef.current = null;
      return;
    }
    if (stickToBottomRef.current) scrollToBottom('auto');
  }, [messages, scrollToBottom]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
    stickToBottomRef.current = nearBottom;
    if (nearBottom) setShowJump(false);
  };

  /* ── real-time ── */
  useEffect(() => {
    if (!subscribe) return undefined;

    const unsubNew = subscribe('new-message', (msg) => {
      if (!msg?.channel || !CHANNELS[msg.channel]) return;
      const gid = idOf(msg.guestUser);
      if (gid && myId && !sameId(gid, myId)) return; // another guest's thread
      const fromMe = sameId(idOf(msg.sender), myId);

      setPreviews((p) => ({ ...p, [msg.channel]: msg }));

      if (msg.channel !== channelRef.current) {
        if (!fromMe) setUnread((u) => ({ ...u, [msg.channel]: (u[msg.channel] || 0) + 1 }));
        return;
      }

      setMessages((prev) => (prev.some((m) => m._id === msg._id) ? prev : [...prev, msg]));
      if (!fromMe) {
        markChatRead(msg.channel).catch(() => {});
        if (!stickToBottomRef.current) setShowJump(true);
      } else {
        stickToBottomRef.current = true;
      }
    });

    // Staff opened the thread → flip my messages to "Seen".
    const unsubRead = subscribe('messages-read', ({ messageIds } = {}) => {
      if (!Array.isArray(messageIds) || messageIds.length === 0) return;
      const ids = new Set(messageIds.map(String));
      setMessages((prev) => prev.map((m) => (ids.has(String(m._id)) ? { ...m, isRead: true } : m)));
    });

    return () => { unsubNew?.(); unsubRead?.(); };
  }, [subscribe, myId]);

  /* ── sending ── */
  const deliver = useCallback(async (tempId, ch, content) => {
    try {
      const res = await sendChatMessage(ch, content);
      const real = res.data;
      setMessages((prev) => {
        if (prev.some((m) => m._id === real._id)) return prev.filter((m) => m._id !== tempId); // socket echo won the race
        return prev.map((m) => (m._id === tempId ? { ...real, sender: m.sender } : m));
      });
      setPreviews((p) => ({ ...p, [ch]: real }));
    } catch (err) {
      if (err.response?.data?.code === 'NO_ACTIVE_BOOKING') {
        setContext((c) => ({ ...(c || {}), available: false }));
        return;
      }
      setMessages((prev) => prev.map((m) => (m._id === tempId ? { ...m, _status: 'failed', _error: err.response?.data?.message } : m)));
    }
  }, []);

  const send = (text) => {
    const content = (text ?? input).trim();
    if (!content) return;
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    stickToBottomRef.current = true;
    setMessages((prev) => [...prev, {
      _id: tempId, channel, content, guestUser: myId,
      sender: { _id: myId, fullname: 'You' },
      createdAt: new Date().toISOString(), _status: 'sending',
    }]);
    if (text === undefined) {
      setInput('');
      if (textareaRef.current) textareaRef.current.style.height = '';
    }
    deliver(tempId, channel, content);
  };

  const retry = (m) => {
    setMessages((prev) => prev.map((x) => (x._id === m._id ? { ...x, _status: 'sending', _error: undefined } : x)));
    deliver(m._id, m.channel, m.content);
  };

  const discard = (m) => setMessages((prev) => prev.filter((x) => x._id !== m._id));

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send();
    }
  };

  const onInput = (e) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 132)}px`;
  };

  const applySuggestion = (text) => {
    setInput(text);
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(text.length, text.length);
    });
  };

  /* ── render model: day sections → sender runs ── */
  const sections = useMemo(() => {
    const out = [];
    messages.forEach((m, i) => {
      const prev = messages[i - 1];
      const next = messages[i + 1];
      const day = new Date(m.createdAt).toDateString();
      if (!prev || new Date(prev.createdAt).toDateString() !== day) {
        out.push({ key: day, label: formatDayLabel(m.createdAt), items: [] });
      }
      const senderId = idOf(m.sender);
      const joins = (a) => a
        && sameId(idOf(a.sender), senderId)
        && new Date(a.createdAt).toDateString() === day
        && Math.abs(new Date(a.createdAt) - new Date(m.createdAt)) < GROUP_WINDOW_MS;
      out[out.length - 1].items.push({
        m,
        mine: sameId(senderId, myId),
        first: !joins(prev),
        last: !joins(next),
      });
    });
    return out;
  }, [messages, myId]);

  const meta = CHANNELS[channel];
  const shellHeight = 'g-chat-shell'; // full-bleed height, see guest-tokens.css
  const gatedWrap = 'px-4 sm:px-6 lg:px-8 pt-5 lg:pt-8 pb-6 max-w-2xl mx-auto';

  /* ─────────── gated states ─────────── */

  if (loadingContext) {
    return (
      <div className={cn('bg-(--g-surface) overflow-hidden flex', shellHeight)} role="status" aria-live="polite">
        <span className="sr-only">Loading chat…</span>
        <div className="hidden lg:block w-[320px] xl:w-[360px] border-r border-(--g-border) p-4 space-y-3">
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
        <div className="flex-1 p-5 space-y-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-12 w-3/5" />
          <Skeleton className="h-12 w-2/5 ml-auto" />
          <Skeleton className="h-12 w-1/2" />
        </div>
      </div>
    );
  }

  if (contextError) {
    return (
      <div className={gatedWrap}>
        <h1 className="g-h1 text-(--g-text) mb-5">Chat</h1>
        <EmptyState
          icon={AlertCircle}
          title="Couldn't load chat"
          description={contextError}
          action={<Button icon={RefreshCw} onClick={loadContext}>Try again</Button>}
        />
      </div>
    );
  }

  if (!context?.available) {
    return (
      <div className={gatedWrap}>
        <h1 className="g-h1 text-(--g-text) mb-5">Chat</h1>
        <EmptyState
          icon={CalendarClock}
          title="Chat opens with your stay"
          description="Once you have a confirmed or active booking, you can message the front desk and room service here."
          action={<Button onClick={() => navigate('/guest-dashboard/bookings')}>View my bookings</Button>}
        />
      </div>
    );
  }

  /* ─────────── main ─────────── */

  const connectionPill = (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 g-small font-semibold px-2.5 h-7 rounded-(--g-radius-pill)',
        isConnected ? 'bg-(--g-success-bg) text-(--g-success-text)' : 'bg-(--g-warning-bg) text-(--g-warning-text)'
      )}
    >
      {isConnected ? <Wifi className="w-3.5 h-3.5" aria-hidden="true" /> : <WifiOff className="w-3.5 h-3.5" aria-hidden="true" />}
      {isConnected ? 'Live' : 'Reconnecting'}
    </span>
  );

  return (
    <div className={cn('bg-(--g-surface) overflow-hidden flex', shellHeight)}>
      {/* ── Conversation list (desktop) ── */}
      <aside className="hidden lg:flex w-[320px] xl:w-[360px] shrink-0 flex-col border-r border-(--g-border)" aria-label="Conversations">
        <div className="px-5 pt-5 pb-4 border-b border-(--g-border)">
          <div className="flex items-center justify-between gap-2">
            <h1 className="g-h1 text-(--g-text)">Messages</h1>
            {connectionPill}
          </div>
          <p className="g-small text-(--g-text-muted) mt-1">
            {context.roomNumber ? `Room ${context.roomNumber} · ` : ''}We usually reply within minutes
          </p>
        </div>

        <ul className="flex-1 overflow-y-auto p-2 space-y-1">
          {CHANNEL_ORDER.map((ch) => {
            const c = CHANNELS[ch];
            const active = ch === channel;
            const last = previews[ch];
            const lastFromMe = last && sameId(idOf(last.sender), myId);
            return (
              <li key={ch}>
                <button
                  type="button"
                  onClick={() => setChannel(ch)}
                  aria-current={active ? 'true' : undefined}
                  className={cn(
                    'w-full flex items-center gap-3 p-3 rounded-(--g-radius-md) text-left transition-colors duration-150 ease-out',
                    active ? 'bg-(--g-surface-sunken)' : 'hover:bg-(--g-surface-sunken)'
                  )}
                >
                  <ChannelTile channel={ch} active={active} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="g-body-strong truncate text-(--g-text)">{c.label}</span>
                      {last && <span className="g-small text-(--g-text-subtle) shrink-0 guestNum">{formatPreviewTime(last.createdAt)}</span>}
                    </span>
                    <span className="flex items-center justify-between gap-2 mt-0.5">
                      <span className={cn('g-small truncate', unread[ch] ? 'text-(--g-text) font-semibold' : 'text-(--g-text-muted)')}>
                        {last ? `${lastFromMe ? 'You: ' : ''}${last.content}` : c.team}
                      </span>
                      <UnreadBadge count={unread[ch] || 0} />
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <p className="px-5 py-4 border-t border-(--g-border) g-small text-(--g-text-subtle)">
          For emergencies, please call reception directly from your room phone.
        </p>
      </aside>

      {/* ── Conversation ── */}
      <section className="flex-1 min-w-0 flex flex-col" aria-label={`${meta.label} conversation`}>
        {/* Mobile header: title + channel switcher */}
        <div className="lg:hidden px-3 pt-3 pb-2 border-b border-(--g-border) space-y-2.5">
          <div className="flex items-center justify-between gap-2 px-1">
            <div className="min-w-0">
              <h1 className="g-h2 text-(--g-text) leading-tight">Messages</h1>
              {context.roomNumber && <p className="g-small text-(--g-text-muted)">Room {context.roomNumber}</p>}
            </div>
            {connectionPill}
          </div>
          <div role="tablist" aria-label="Choose who to message" className="grid grid-cols-2 gap-1 p-1 rounded-(--g-radius-sm) bg-(--g-surface-sunken)">
            {CHANNEL_ORDER.map((ch) => {
              const c = CHANNELS[ch];
              const active = ch === channel;
              const CIcon = c.Icon;
              return (
                <button
                  key={ch}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setChannel(ch)}
                  className={cn(
                    'relative min-h-[44px] rounded-[8px] flex items-center justify-center gap-2 g-small font-semibold transition-colors duration-150 ease-out',
                    active ? 'bg-(--g-surface) text-(--g-text) shadow-(--g-shadow-sm)' : 'text-(--g-text-muted)'
                  )}
                >
                  <CIcon className={cn('w-4 h-4', active && c.fg)} aria-hidden="true" />
                  {c.label}
                  <UnreadBadge count={unread[ch] || 0} className="absolute -top-1 -right-1" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Desktop header */}
        <header className="hidden lg:flex items-center gap-3 px-5 h-[72px] border-b border-(--g-border) shrink-0">
          <ChannelTile channel={channel} active size="sm" />
          <div className="min-w-0">
            <h2 className="g-body-strong text-(--g-text) truncate">{meta.label}</h2>
            <p className="g-small text-(--g-text-muted) truncate">{meta.team} · {meta.blurb}</p>
          </div>
        </header>

        {/* Messages */}
        <div className="relative flex-1 min-h-0">
          <div
            ref={scrollRef}
            onScroll={onScroll}
            className="absolute inset-0 overflow-y-auto px-3 sm:px-6 py-4 bg-(--g-bg)"
            style={{ overscrollBehavior: 'contain' }}
            aria-live="polite"
            aria-relevant="additions"
          >
            {/* Readable column: full-bleed surface, but lines never stretch across a 4K screen */}
            <div className="mx-auto w-full max-w-3xl min-h-full flex flex-col">
            {loadingMessages ? (
              <div className="space-y-3" role="status">
                <span className="sr-only">Loading messages…</span>
                <Skeleton className="h-11 w-3/5 sm:w-2/5" />
                <Skeleton className="h-11 w-1/2 sm:w-1/3 ml-auto" />
                <Skeleton className="h-11 w-2/3 sm:w-2/5" />
              </div>
            ) : messagesError ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
                <AlertCircle className="w-8 h-8 text-(--g-danger-text) mb-3" aria-hidden="true" />
                <p className="g-body-strong text-(--g-text)">Couldn&apos;t load messages</p>
                <p className="g-small text-(--g-text-muted) mt-1 mb-4">{messagesError}</p>
                <Button variant="secondary" icon={RefreshCw} onClick={() => loadMessages(channel)}>Retry</Button>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center px-4 py-6">
                <span className={cn('w-16 h-16 mb-4 rounded-(--g-radius-lg) flex items-center justify-center', meta.tone)}>
                  <meta.Icon className="w-8 h-8" aria-hidden="true" />
                </span>
                <p className="g-h2 text-(--g-text)">Start a conversation with {meta.label}</p>
                <p className="g-small text-(--g-text-muted) mt-1 max-w-sm">{meta.blurb}</p>
                <div className="mt-5 flex flex-wrap justify-center gap-2 max-w-md">
                  {meta.suggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => applySuggestion(s)}
                      className="min-h-[40px] px-3.5 rounded-(--g-radius-pill) border border-(--g-border) bg-(--g-surface) g-small font-medium text-(--g-text) hover:border-(--g-border-strong) hover:bg-(--g-surface-sunken) transition-colors duration-150"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {hasMore && (
                  <div className="flex justify-center mb-3">
                    <button
                      type="button"
                      onClick={loadOlder}
                      disabled={loadingOlder}
                      className={cn('inline-flex items-center gap-1.5 h-8 px-3 rounded-(--g-radius-pill) g-small font-semibold bg-(--g-surface) border border-(--g-border) hover:bg-(--g-surface-sunken) disabled:opacity-60', meta.fg)}
                    >
                      {loadingOlder && <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />}
                      Load earlier messages
                    </button>
                  </div>
                )}

                {sections.map((section) => (
                  <div key={section.key} className="mb-2">
                    <div className="sticky top-0 z-[1] flex justify-center py-2">
                      <span className="g-small font-medium text-(--g-text-muted) bg-(--g-surface) border border-(--g-border) px-3 h-6 inline-flex items-center rounded-(--g-radius-pill) shadow-(--g-shadow-sm)">
                        {section.label}
                      </span>
                    </div>

                    {section.items.map(({ m, mine, first, last }) => {
                      const staffName = !mine ? (idOf(m.sender) && m.sender?.fullname) || meta.team : null;
                      return (
                        <div key={m._id} className={cn('flex items-end gap-2', mine ? 'justify-end' : 'justify-start', first ? 'mt-3' : 'mt-0.5')}>
                          {!mine && (
                            <span className="w-8 shrink-0">
                              {last && <Avatar src={m.sender?.profilePicture} name={staffName} size="sm" className="!w-8 !h-8 text-xs" decorative />}
                            </span>
                          )}

                          <div className={cn('flex flex-col max-w-[82%] sm:max-w-[68%]', mine ? 'items-end' : 'items-start')}>
                            {!mine && first && (
                              <span className="g-small font-semibold text-(--g-text-muted) mb-1 ml-1">{staffName}</span>
                            )}
                            <div
                              className={cn(
                                'px-3.5 py-2 g-body whitespace-pre-wrap break-words [overflow-wrap:anywhere] rounded-[18px]',
                                mine
                                  ? meta.fill
                                  : 'bg-(--g-surface) text-(--g-text) border border-(--g-border) shadow-(--g-shadow-sm)',
                                mine && !last && 'rounded-br-[6px]',
                                mine && !first && 'rounded-tr-[6px]',
                                !mine && !last && 'rounded-bl-[6px]',
                                !mine && !first && 'rounded-tl-[6px]',
                                m._status === 'sending' && 'opacity-70',
                                m._status === 'failed' && 'opacity-80 ring-2 ring-(--g-danger-fill)/40'
                              )}
                            >
                              {m.content}
                            </div>

                            {m._status === 'failed' ? (
                              <span className="mt-1 mr-1 g-small text-(--g-danger-text) inline-flex items-center gap-2">
                                <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />
                                {m._error || 'Not sent'}
                                <button type="button" onClick={() => retry(m)} className="font-semibold underline inline-flex items-center gap-1">
                                  <RotateCw className="w-3 h-3" aria-hidden="true" />Retry
                                </button>
                                <button type="button" onClick={() => discard(m)} className="font-semibold underline">Delete</button>
                              </span>
                            ) : last && (
                              <span className={cn('mt-1 g-small text-(--g-text-subtle) inline-flex items-center gap-1.5 guestNum', mine ? 'mr-1' : 'ml-1')}>
                                {formatTime(m.createdAt)}
                                {mine && <><span aria-hidden="true">·</span><MessageStatus m={m} /></>}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </>
            )}
            </div>
          </div>

          {showJump && (
            <button
              type="button"
              onClick={() => { stickToBottomRef.current = true; setShowJump(false); scrollToBottom('smooth'); }}
              className={cn('absolute bottom-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 h-9 px-4 rounded-(--g-radius-pill) g-small font-semibold shadow-(--g-shadow-lg)', meta.fill)}
            >
              <ArrowDown className="w-4 h-4" aria-hidden="true" />New messages
            </button>
          )}
        </div>

        {/* Composer */}
        <div className="shrink-0 border-t border-(--g-border) bg-(--g-surface) px-3 sm:px-6 py-3">
          <div className="mx-auto w-full max-w-3xl">
          <form
            onSubmit={(e) => { e.preventDefault(); send(); }}
            className={cn('flex items-end gap-2 rounded-[24px] border border-(--g-border) bg-(--g-surface-sunken) pl-4 pr-1.5 py-1.5 focus-within:ring-2 transition-shadow duration-150', meta.focus)}
          >
            <label htmlFor="chat-input" className="sr-only">Message {meta.label}</label>
            <textarea
              id="chat-input"
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={onInput}
              onKeyDown={onKeyDown}
              maxLength={MAX_LEN}
              placeholder={`Message ${meta.label}…`}
              enterKeyHint="send"
              style={{ resize: 'none' }}
              className="flex-1 min-w-0 bg-transparent py-2 max-h-[132px] g-body text-(--g-text) placeholder:text-(--g-text-subtle) outline-none"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              aria-label="Send message"
              className={cn(
                'shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-[opacity,background-color] duration-150',
                input.trim() ? cn(meta.fill, 'hover:opacity-90') : 'bg-(--g-border-strong) text-(--g-surface) cursor-not-allowed'
              )}
            >
              <Send className="w-[18px] h-[18px] -translate-x-px translate-y-px" aria-hidden="true" />
            </button>
          </form>
          <div className="mt-1.5 flex justify-between gap-2 px-2 g-small text-(--g-text-subtle)">
            <span className="hidden sm:inline">Enter to send · Shift + Enter for a new line</span>
            {input.length > MAX_LEN - 200 && (
              <span className={cn('guestNum ml-auto', input.length >= MAX_LEN && 'text-(--g-danger-text)')}>{input.length}/{MAX_LEN}</span>
            )}
          </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ChatView;
