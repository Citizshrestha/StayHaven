import React, { useEffect, useRef, useState } from "react";
import { Menu, X, Flame, RefreshCw, Sun, Moon } from "lucide-react";
import Sidebar from "./Sidebar";

const KitchenMobileHeader = ({
  isDarkMode = false,
  onToggleDarkMode,
  counts = { active: 0, fresh: 0, cooking: 0, ready: 0 },
  onRefresh,
  isRefreshing = false,
  activeView,
  onViewChange,
  notificationCount = 0,
  onMessagingToggle,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuButtonRef = useRef(null);
  const drawerRef = useRef(null);

  const closeMenu = () => {
    setIsMenuOpen(false);
    menuButtonRef.current?.focus();
  };

  // Drawer: Esc closes, focus moves in on open and returns to the button.
  useEffect(() => {
    if (!isMenuOpen) return undefined;
    drawerRef.current?.querySelector("button")?.focus();
    const onKey = (e) => { if (e.key === "Escape") closeMenu(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isMenuOpen]);

  return (
    <>
      <div className="kd-mheader">
        <div className="kd-mheader__row">
          <button
            ref={menuButtonRef}
            type="button"
            className="kd-iconbtn"
            onClick={() => setIsMenuOpen((open) => !open)}
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={isMenuOpen}
          >
            {isMenuOpen ? <X size={24} aria-hidden="true" /> : <Menu size={24} aria-hidden="true" />}
          </button>

          <div className="kd-mheader__title">
            <Flame size={22} color="#f97316" aria-hidden="true" />
            <h1>Kitchen</h1>
          </div>

          <button
            type="button"
            className="kd-iconbtn"
            onClick={onToggleDarkMode}
            aria-pressed={isDarkMode}
            aria-label="Dark mode"
          >
            {isDarkMode ? <Sun size={22} aria-hidden="true" /> : <Moon size={22} aria-hidden="true" />}
          </button>

          <button
            type="button"
            className="kd-iconbtn"
            onClick={() => onRefresh?.()}
            disabled={isRefreshing}
            aria-label="Refresh orders"
            aria-busy={isRefreshing}
          >
            <RefreshCw size={22} className={isRefreshing ? "kd-spin" : ""} aria-hidden="true" />
          </button>
        </div>

        <ul className="kd-mheader__counts" aria-label="Tickets by status">
          <li className="kd-count kd-count--pending"><strong>{counts.fresh}</strong> New</li>
          <li className="kd-count kd-count--preparing"><strong>{counts.cooking}</strong> Cooking</li>
          <li className="kd-count kd-count--ready"><strong>{counts.ready}</strong> Ready</li>
        </ul>
      </div>

      {isMenuOpen && (
        <div className="kd-drawer lg:hidden">
          <div className="kd-drawer__backdrop" onClick={closeMenu} aria-hidden="true" />
          <div className="kd-drawer__panel" ref={drawerRef} role="dialog" aria-modal="true" aria-label="Kitchen menu">
            <Sidebar
              activeView={activeView}
              isDarkMode={isDarkMode}
              notificationCount={notificationCount}
              onMessagingToggle={() => { setIsMenuOpen(false); onMessagingToggle?.(); }}
              onViewChange={(view) => { onViewChange?.(view); setIsMenuOpen(false); }}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default KitchenMobileHeader;
