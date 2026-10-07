import React from 'react';
import PropTypes from 'prop-types';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, UtensilsCrossed, CalendarDays, MessagesSquare, User } from 'lucide-react';
import { cn } from '../../../../core/utils/cn';

// Accents match the desktop sidebar (guest-tokens.css).
const TABS = [
  { to: '/guest-dashboard', end: true, icon: LayoutDashboard, label: 'Home', fg: 'text-(--g-indigo-fg)', bar: 'bg-(--g-indigo-fill)' },
  { to: '/guest-dashboard/chat', icon: MessagesSquare, label: 'Chat', fg: 'text-(--g-violet-fg)', bar: 'bg-(--g-violet-fill)' },
  { to: '/guest-dashboard/room-service', icon: UtensilsCrossed, label: 'Dining', fg: 'text-(--g-orange-fg)', bar: 'bg-(--g-orange-fill)' },
  { to: '/guest-dashboard/bookings', icon: CalendarDays, label: 'Bookings', fg: 'text-(--g-sky-fg)', bar: 'bg-(--g-sky-fill)' },
  { to: '/guest-dashboard/profile', icon: User, label: 'Profile', fg: 'text-(--g-rose-fg)', bar: 'bg-(--g-rose-fill)' },
];

const GuestBottomNav = ({ chatUnread = 0 }) => (
  <nav
    aria-label="Guest portal"
    className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-(--g-surface) border-t border-(--g-border) shadow-(--g-shadow-lg) pb-[env(safe-area-inset-bottom)]"
  >
    <ul className="grid grid-cols-5 h-[60px]">
      {TABS.map(({ to, end, icon: Icon, label, fg, bar }) => (
        <li key={to} className="min-w-0">
          <NavLink
            to={to}
            end={end}
            className={({ isActive }) => cn(
              'relative h-full flex flex-col items-center justify-center gap-0.5 g-small font-semibold transition-colors duration-150 ease-out',
              isActive ? fg : 'text-(--g-text-muted) hover:text-(--g-text)'
            )}
          >
            {({ isActive }) => (
              <>
                {isActive && <span aria-hidden="true" className={cn('absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-10 rounded-full', bar)} />}
                <span className="relative">
                  <Icon className="w-[22px] h-[22px]" aria-hidden="true" />
                  {to === '/guest-dashboard/chat' && chatUnread > 0 && (
                    <span className="absolute -top-1.5 -right-2.5 min-w-[18px] h-[18px] px-1 rounded-(--g-radius-pill) bg-(--g-danger-fill) text-white text-[10px] leading-none font-bold guestNum flex items-center justify-center ring-2 ring-(--g-surface)">
                      <span className="sr-only">Unread messages: </span>
                      {chatUnread > 9 ? '9+' : chatUnread}
                    </span>
                  )}
                </span>
                <span className="max-w-full truncate px-1">{label}</span>
              </>
            )}
          </NavLink>
        </li>
      ))}
    </ul>
  </nav>
);

GuestBottomNav.propTypes = { chatUnread: PropTypes.number };

export default GuestBottomNav;
