import React, { useEffect, useRef, useState } from 'react';
import {
  LayoutDashboard, CalendarRange, LogIn, Sparkles, Users, Settings, UtensilsCrossed, Wallet,
  DoorOpen, Receipt, BarChart3, UserCog, MessageCircle, MoreHorizontal, X,
} from 'lucide-react';

// Four primary destinations + "More" (thumb-reachable, ≤ 5 tabs on phones).
const PRIMARY = [
  { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
  { id: 'bookings', label: 'Bookings', icon: CalendarRange },
  { id: 'checkinout', label: 'Check-In', icon: LogIn },
  { id: 'rooms', label: 'Rooms', icon: DoorOpen },
];
const MORE = [
  { id: 'housekeeping', label: 'Housekeeping', icon: Sparkles },
  { id: 'guests', label: 'Guests', icon: Users },
  { id: 'orders', label: 'Orders', icon: UtensilsCrossed },
  { id: 'restaurantBills', label: 'Restaurant Bills', icon: Wallet },
  { id: 'billing', label: 'Billing', icon: Receipt },
  { id: 'messages', label: 'Messages', icon: MessageCircle },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
  { id: 'staff', label: 'Staff', icon: UserCog },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const MobileBottomNav = ({ activeView, onViewChange }) => {
  const [open, setOpen] = useState(false);
  const moreBtn = useRef(null);
  const sheet = useRef(null);
  const moreActive = MORE.some((t) => t.id === activeView);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    sheet.current?.querySelector('button')?.focus();
    const trigger = moreBtn.current;
    return () => { document.removeEventListener('keydown', onKey); trigger?.focus(); };
  }, [open]);

  const go = (id) => { setOpen(false); onViewChange(id); };

  return (
    <>
      {open && (
        <div className="sh-more-backdrop" onClick={() => setOpen(false)}>
          <div
            ref={sheet}
            className="sh-more-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="More sections"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sh-more-sheet-head">
              <span>More</span>
              <button type="button" className="sh-more-close" aria-label="Close" onClick={() => setOpen(false)}><X size={20} /></button>
            </div>
            <div className="sh-more-grid">
              {MORE.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  data-view={id}
                  className={`sh-more-item ${activeView === id ? 'active' : ''}`}
                  aria-current={activeView === id ? 'page' : undefined}
                  onClick={() => go(id)}
                >
                  <Icon size={22} />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      <nav className="sh-mobile-nav" aria-label="Reception">
        {PRIMARY.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            data-view={id}
            className={`sh-mobile-nav-item ${activeView === id ? 'active' : ''}`}
            aria-current={activeView === id ? 'page' : undefined}
            onClick={() => go(id)}
          >
            <Icon />
            <span>{label}</span>
          </button>
        ))}
        <button
          ref={moreBtn}
          type="button"
          data-view="more"
          className={`sh-mobile-nav-item ${moreActive || open ? 'active' : ''}`}
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <MoreHorizontal />
          <span>More</span>
        </button>
      </nav>
    </>
  );
};

export default MobileBottomNav;
