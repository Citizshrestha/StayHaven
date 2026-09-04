import React from 'react';
import { useLocation } from 'react-router-dom';
import {
  BarChart3,
  BedDouble,
  Bell,
  ChevronRight,
  CreditCard,
  LayoutGrid,
  LogOut,
  Package,
  QrCode,
  ShoppingBag,
  Star,
  Users,
  UtensilsCrossed,
} from 'lucide-react';
import styles from './Sidebar.module.css';

/**
 * HotelAdmin Sidebar
 *
 * Navigation driven by hash-based routing (activeSection prop).
 * All route paths / onClick handlers are preserved from the original
 * embedded sidebar in HoteladminDashboard.jsx.
 *
 * Props:
 *   activeSection  {string}   — current active section id
 *   onNavigate     {function} — handleNavigation(sectionId)
 *   onLogout       {function} — handleLogout()
 *   staffUser      {object}   — { fullname, activeProperty: { name } }
 *   roomCount      {number}   — total rooms for green badge
 *   activeOrders   {number}   — active orders for amber badge
 *   unreadCount    {number}   — unread notifications for red badge
 */
const Sidebar = ({
  activeSection,
  onNavigate,
  onLogout,
  staffUser,
  roomCount = 0,
  activeOrders = 0,
  unreadCount = 0,
}) => {
  // useLocation kept here to support future path-based routing migration
  // Currently the sidebar uses hash/section-id routing via activeSection
  useLocation();

  const hotelName =
    staffUser?.activeProperty?.name || staffUser?.fullname || 'Hotel Admin';
  const adminName = staffUser?.fullname || 'Admin';
  const avatarInitial = adminName.charAt(0).toUpperCase();

  /** Derive active state from the section id */
  const isActive = (id) => activeSection === id;

  /** Single nav item renderer */
  const NavItem = ({
    id,
    label,
    Icon,
    iconClass,
    badge,
    badgeClass,
  }) => (
    <button
      type="button"
      className={`${styles.navItem}${isActive(id) ? ` ${styles.active}` : ''}`}
      onClick={() => onNavigate(id)}
      aria-current={isActive(id) ? 'page' : undefined}
    >
      <span className={`${styles.iconWrap} ${styles[iconClass]}`}>
        <Icon size={16} strokeWidth={2} aria-hidden="true" />
      </span>
      <span className={styles.navLabel}>{label}</span>
      {badge !== undefined && badge !== null && badge > 0 && (
        <span className={`${styles.badge} ${styles[badgeClass]}`}>
          {badge}
        </span>
      )}
    </button>
  );

  return (
    <aside className={styles.sidebar} aria-label="Hotel admin navigation">
      {/* ── Logo Section ── */}
      <div className={styles.logoSection}>
        <div className={styles.logoIcon} aria-hidden="true">
          {/* Building / property icon */}
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="white"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M3 21h18v-2H3v2zm0-4h18v-2H3v2zm2-4h14v-2H5v2zm2-4h10V7H7v2zm2-6v2h6V3H9z" />
          </svg>
        </div>
        <div className={styles.logoText}>
          <span className={styles.hotelName}>{hotelName}</span>
          <span className={styles.propertyLabel}>Property Management</span>
        </div>
        <span className={styles.liveBadge} aria-label="System live">LIVE</span>
      </div>

      {/* ── Scrollable Nav Body ── */}
      <nav className={styles.navBody} aria-label="Main navigation">

        {/* ── MAIN ── */}
        <span className={`${styles.sectionLabel} ${styles.sectionLabelFirst}`}>
          Main
        </span>
        <NavItem
          id="dashboard"
          label="Dashboard"
          Icon={LayoutGrid}
          iconClass="iconDashboard"
        />
        <NavItem
          id="rooms"
          label="Rooms"
          Icon={BedDouble}
          iconClass="iconRooms"
          badge={roomCount}
          badgeClass="badgeGreen"
        />

        {/* ── OPERATIONS ── */}
        <span className={styles.sectionLabel}>Operations</span>
        <NavItem
          id="restaurant"
          label="Restaurant"
          Icon={UtensilsCrossed}
          iconClass="iconRestaurant"
        />
        <NavItem
          id="tables"
          label="Table QR Codes"
          Icon={QrCode}
          iconClass="iconTableQR"
        />
        <NavItem
          id="roomqr"
          label="Room QR Codes"
          Icon={QrCode}
          iconClass="iconRoomQR"
        />
        <NavItem
          id="orders"
          label="Orders"
          Icon={ShoppingBag}
          iconClass="iconOrders"
          badge={activeOrders}
          badgeClass="badgeAmber"
        />
        <NavItem
          id="stock"
          label="Stock / Inventory"
          Icon={Package}
          iconClass="iconStock"
        />

        {/* ── PEOPLE ── */}
        <span className={styles.sectionLabel}>People</span>
        <NavItem
          id="staff"
          label="Staff Management"
          Icon={Users}
          iconClass="iconStaff"
        />

        {/* ── FINANCE ── */}
        <span className={styles.sectionLabel}>Finance</span>
        <NavItem
          id="billing"
          label="Billing &amp; Payments"
          Icon={CreditCard}
          iconClass="iconBilling"
        />
        <NavItem
          id="loyalty"
          label="Loyalty Points"
          Icon={Star}
          iconClass="iconLoyalty"
        />

        {/* ── INSIGHTS ── */}
        <span className={styles.sectionLabel}>Insights</span>
        <NavItem
          id="reports"
          label="Reports &amp; Analytics"
          Icon={BarChart3}
          iconClass="iconReports"
        />

        {/* ── Divider before Notifications ── */}
        <hr className={styles.divider} />

        <NavItem
          id="notifications"
          label="Notifications"
          Icon={Bell}
          iconClass="iconNotifications"
          badge={unreadCount}
          badgeClass="badgeRed"
        />
      </nav>

      {/* ── Footer — Admin Profile Card + Logout ── */}
      <div className={styles.footer}>
        {/* Profile card */}
        <div className={styles.profileCard} role="button" tabIndex={0}>
          <div className={styles.avatar} aria-hidden="true">
            {avatarInitial}
          </div>
          <div className={styles.profileInfo}>
            <span className={styles.profileName}>{adminName}</span>
            <span className={styles.profileRole}>Hotel Administrator</span>
          </div>
          <ChevronRight
            size={14}
            className={styles.chevron}
            aria-hidden="true"
          />
        </div>

        {/* Logout button — reuses navItem style */}
        <button
          type="button"
          className={styles.navItem}
          onClick={onLogout}
          style={{ marginTop: '6px' }}
        >
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
