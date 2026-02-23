import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useStaffAuth } from '../../../../context/StaffAuthContext';
import {
  LayoutDashboard, CalendarRange, LogIn, DoorOpen, Sparkles,
  Users, Receipt, BarChart3, UserCog, Settings,
  LogOut, PanelLeftClose, PanelLeft
} from 'lucide-react';

const Sidebar = ({ activeView, onViewChange, collapsed, onToggleCollapse }) => {
  const navigate = useNavigate();
  let staffUser = null;
  let logout = async () => { };
  try {
    const auth = useStaffAuth();
    staffUser = auth?.staffUser;
    logout = auth?.logout || logout;
  } catch (e) { /* dev mode */ }

  const sections = [
    {
      label: 'Main',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'bookings', label: 'Reservations', icon: CalendarRange },
        { id: 'checkinout', label: 'Check-In / Out', icon: LogIn },
        { id: 'rooms', label: 'Rooms', icon: DoorOpen },
      ]
    },
    {
      label: 'Operations',
      items: [
        { id: 'housekeeping', label: 'Housekeeping', icon: Sparkles },
        { id: 'guests', label: 'Guests', icon: Users },
        { id: 'billing', label: 'Billing', icon: Receipt },
      ]
    },
    {
      label: 'Insights',
      items: [
        { id: 'reports', label: 'Reports', icon: BarChart3 },
        { id: 'staff', label: 'Staff', icon: UserCog },
        { id: 'settings', label: 'Settings', icon: Settings },
      ]
    }
  ];

  const handleLogout = async () => {
    try { await logout(); navigate('/staff/login'); } catch (e) { console.error(e); }
  };

  const userName = staffUser?.fullname || 'Sarah Jenkins';
  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <aside className={`sh-sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sh-sidebar-header">
        <div className="sh-logo-icon">S</div>
        <div className="sh-hotel-info">
          <h2>StayHaven</h2>
          <p>Hotel & Resort</p>
        </div>
      </div>

      <nav className="sh-nav">
        {sections.map((section) => (
          <React.Fragment key={section.label}>
            <div className="sh-nav-section-label">{section.label}</div>
            {section.items.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  className={`sh-nav-item ${activeView === item.id ? 'active' : ''}`}
                  onClick={() => onViewChange(item.id)}
                  title={collapsed ? item.label : ''}
                >
                  <Icon size={20} strokeWidth={1.8} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </React.Fragment>
        ))}
      </nav>

      <div className="sh-sidebar-footer">
        <button className="sh-collapse-btn" onClick={onToggleCollapse} title={collapsed ? 'Expand' : 'Collapse'}>
          {collapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
        </button>
        <div className="sh-user-section">
          <div className="sh-user-avatar">{userInitial}</div>
          <div className="sh-user-details">
            <h4>{userName}</h4>
            <p>Head Receptionist</p>
          </div>
          <button className="sh-user-logout" onClick={handleLogout} title="Logout">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
