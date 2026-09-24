import React from 'react';
import { useLocation } from 'react-router-dom';
import {
  BarChart3,
  BedDouble,
  Bell,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  CreditCard,
  LayoutGrid,
  LogOut,
  Package,
  QrCode,
  ShoppingBag,
  Star,
  Users,
  UtensilsCrossed,
  X,
} from 'lucide-react';
import ThemeToggle from '../../../../shared/ui/ThemeToggle';
import styles from './Sidebar.module.css';

/**
 * HotelAdmin Sidebar
 *
 * Navigation driven by section id (activeSection prop). Positioned by the
 * shell wrapper (fixed rail on desktop, off-canvas drawer on mobile).
 *
 * Props:
 *   activeSection      current active section id
 *   onNavigate         (sectionId) => void
 *   onLogout           () => void
 *   staffUser          { fullname, activeProperty: { name } }
 *   roomCount / activeOrders / unreadCount — live badge counts
 *   collapsed          icon-rail mode (tablet)
 *   onToggleCollapse   toggle icon-rail
 *   onMobileClose      close off-canvas drawer (mobile)
 */
const Sidebar = ({
  activeSection,
  onNavigate,
  onLogout,
  staffUser,
  roomCount = 0,
  activeOrders = 0,
  unreadCount = 0,
  collapsed = false,
  onToggleCollapse,
  onMobileClose,
}) => {
  useLocation();

  const hotelName =
    staffUser?.activeProperty?.name || staffUser?.fullname || 'Hotel Admin';
  const adminName = staffUser?.fullname || 'Admin';
  const avatarInitial = adminName.charAt(0).toUpperCase();

  const isActive = (id) => activeSection === id;

  const handleNav = (id) => {
    onNavigate(id);
    onMobileClose?.();
  };

  const NavItem = ({ id, label, Icon, iconClass, badge, badgeClass }) => (
    <button
      type="button"
      className={`${styles.navItem}${isActive(id) ? ` ${styles.active}` : ''}`}
      onClick={() => handleNav(id)}
      aria-current={isActive(id) ? 'page' : undefined}
      title={collapsed ? label : undefined}
    >
      <span className={`${styles.iconWrap} ${styles[iconClass]}`}>
        <Icon size={16} strokeWidth={2} aria-hidden="true" />
      </span>
      <span className={styles.navLabel}>{label}</span>
      {badge !== undefined && badge !== null && badge > 0 && (
        <span className={`${styles.badge} ${styles[badgeClass]}`}>{badge}</span>
      )}
    </button>
  );

  return (
    <aside
      className={`${styles.sidebar}${collapsed ? ` ${styles.collapsed}` : ''}`}
      aria-label="Hotel admin navigation"
    >
      {/* ── Logo Section ── */}
      <div className={styles.logoSection}>
        <div className={styles.logoIcon} aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 21h18v-2H3v2zm0-4h18v-2H3v2zm2-4h14v-2H5v2zm2-4h10V7H7v2zm2-6v2h6V3H9z" />
          </svg>
        </div>
        <div className={styles.logoText}>
          <span className={styles.hotelName}>{hotelName}</span>
          <span className={styles.propertyLabel}>Property Management</span>
        </div>
        <span className={styles.liveBadge} aria-label="System live">LIVE</span>
        <button
          type="button"
          className={styles.mobileClose}
          onClick={onMobileClose}
          aria-label="Close navigation menu"
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>

      {/* ── Scrollable Nav Body ── */}
      <nav className={styles.navBody} aria-label="Main navigation">
        {/* Collapse toggle (tablet icon-rail) */}
        <button
          type="button"
          className={styles.collapseBtn}
          onClick={onToggleCollapse}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronsRight size={16} aria-hidden="true" /> : <ChevronsLeft size={16} aria-hidden="true" />}
        </button>

        <span className={`${styles.sectionLabel} ${styles.sectionLabelFirst}`}>Main</span>
        <NavItem id="dashboard" label="Dashboard" Icon={LayoutGrid} iconClass="iconDashboard" />
        <NavItem id="rooms" label="Rooms" Icon={BedDouble} iconClass="iconRooms" badge={roomCount} badgeClass="badgeGreen" />

        <span className={styles.sectionLabel}>Operations</span>
        <NavItem id="restaurant" label="Restaurant" Icon={UtensilsCrossed} iconClass="iconRestaurant" />
        <NavItem id="tables" label="Table QR Codes" Icon={QrCode} iconClass="iconTableQR" />
        <NavItem id="roomqr" label="Room QR Codes" Icon={QrCode} iconClass="iconRoomQR" />
        <NavItem id="orders" label="Orders" Icon={ShoppingBag} iconClass="iconOrders" badge={activeOrders} badgeClass="badgeAmber" />
        <NavItem id="stock" label="Stock / Inventory" Icon={Package} iconClass="iconStock" />

        <span className={styles.sectionLabel}>People</span>
        <NavItem id="staff" label="Staff Management" Icon={Users} iconClass="iconStaff" />

        <span className={styles.sectionLabel}>Finance</span>
        <NavItem id="billing" label="Billing & Payments" Icon={CreditCard} iconClass="iconBilling" />
        <NavItem id="loyalty" label="Loyalty Points" Icon={Star} iconClass="iconLoyalty" />

        <span className={styles.sectionLabel}>Insights</span>
        <NavItem id="reports" label="Reports & Analytics" Icon={BarChart3} iconClass="iconReports" />

        <hr className={styles.divider} />

        <NavItem id="notifications" label="Notifications" Icon={Bell} iconClass="iconNotifications" badge={unreadCount} badgeClass="badgeRed" />
      </nav>

      {/* ── Footer — Profile + Theme toggle + Logout ── */}
      <div className={styles.footer}>
        <div className={styles.profileCard} role="button" tabIndex={0}>
          <div className={styles.avatar} aria-hidden="true">{avatarInitial}</div>
          <div className={styles.profileInfo}>
            <span className={styles.profileName}>{adminName}</span>
            <span className={styles.profileRole}>Hotel Administrator</span>
          </div>
          <ChevronRight size={14} className={styles.chevron} aria-hidden="true" />
        </div>

        {!collapsed && (
          <div className={styles.themeRow}>
            <span className={styles.themeRowLabel}>Theme</span>
            <ThemeToggle />
          </div>
        )}

        <button type="button" className={styles.navItem} onClick={onLogout} style={{ marginTop: '6px' }} title={collapsed ? 'Logout' : undefined}>
          <span className={`${styles.iconWrap} ${styles.iconLogout}`}>
            <LogOut size={16} strokeWidth={2} aria-hidden="true" />
          </span>
          <span className={styles.navLabel}>Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
