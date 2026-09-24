import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'react-toastify';
import {
  Users,
  UtensilsCrossed,
  ChefHat,
  Building2,
  Sparkles,
  Briefcase,
  Lock,
  User,
  RefreshCw,
  Plus,
  Download,
  LayoutGrid,
  List,
  Mail,
  Info,
} from 'lucide-react';
import { getStaffList, inviteStaff, updateStaffStatus } from '../services/staffApi';
import useHotelId from '../hooks/useHotelId';
import ConfirmDialog from '../../../../components/ConfirmDialog';
import {
  PageHeader,
  Button,
  Input,
  Select,
  Badge,
  StatCard,
  StatCardSkeleton,
  SearchInput,
  FilterTabs,
  Segmented,
  EmptyState,
  Modal,
} from '../components/ui';
import useDebouncedValue from '../hooks/useDebouncedValue';
import { exportToCsv } from '../utils/csv';
import '../styles/hotel-admin-tokens.css';

/* Roles use lucide icons instead of emoji (§1.6 / §2.3) */
const ROLES = [
  { value: 'waiter', label: 'Waiter', Icon: UtensilsCrossed },
  { value: 'chief', label: 'Chef', Icon: ChefHat },
  { value: 'receptionist', label: 'Receptionist', Icon: Building2 },
  { value: 'housekeeper', label: 'Housekeeper', Icon: Sparkles },
  { value: 'manager', label: 'Manager', Icon: Briefcase },
  { value: 'security', label: 'Security', Icon: Lock },
];

const DEPTS = ['all', 'Front Office', 'Housekeeping', 'Food & Beverage', 'Guest Services', 'Maintenance', 'Security'];

const roleMeta = (role) => ROLES.find((r) => r.value === role?.toLowerCase()) || { label: role || 'Staff', Icon: User };
const initials = (name) => (name || '').split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase() || '?';
const avatarColor = (name) => {
  const colors = ['#6366f1', '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ef4444', '#ec4899', '#14b8a6'];
  return colors[(name || 'A').charCodeAt(0) % colors.length];
};
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const RoleBadge = ({ role }) => {
  const rm = roleMeta(role);
  const RIcon = rm.Icon;
  return (
    <span className="ha-badge ha-badge--info" style={{ textTransform: 'none' }}>
      <RIcon size={12} aria-hidden="true" /> {rm.label}
    </span>
  );
};

const StaffManagement = () => {
  const hotelId = useHotelId();

  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 250);
  const [deptFilter, setDeptFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState('cards');

  const [showInvite, setShowInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({ fullname: '', email: '', role: 'waiter' });
  const [inviteErrors, setInviteErrors] = useState({});

  const [toggleTarget, setToggleTarget] = useState(null);

  const setAct = (k, v) => setActionLoading((p) => ({ ...p, [k]: v }));

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (deptFilter !== 'all') params.department = deptFilter;
      const res = await getStaffList(params);
      setStaff(res.data.data || []);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to load staff');
    } finally {
      setLoading(false);
    }
  }, [deptFilter]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const stats = useMemo(
    () => ({
      total: staff.length,
      active: staff.filter((m) => m.isActive !== false).length,
      inactive: staff.filter((m) => m.isActive === false).length,
      pending: staff.filter((m) => m.status?.toLowerCase() === 'pending').length,
    }),
    [staff]
  );

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    return staff.filter((m) => {
      const name = (m.name || m.fullname || '').toLowerCase();
      const matchS = !q || name.includes(q) || (m.email || '').toLowerCase().includes(q);
      const matchD = deptFilter === 'all' || m.department === deptFilter;
      const matchR = roleFilter === 'all' || m.role?.toLowerCase() === roleFilter;
      const matchSt = statusFilter === 'all' || (statusFilter === 'active' ? m.isActive !== false : m.isActive === false);
      return matchS && matchD && matchR && matchSt;
    });
  }, [staff, debouncedSearch, deptFilter, roleFilter, statusFilter]);

  const validateInvite = () => {
    const errs = {};
    if (!inviteForm.fullname.trim()) errs.fullname = 'Full name is required';
    if (!inviteForm.email.trim()) errs.email = 'Email is required';
    else if (!EMAIL_RE.test(inviteForm.email.trim())) errs.email = 'Enter a valid email address';
    setInviteErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!validateInvite()) return;
    setAct('invite', true);
    try {
      await inviteStaff({ ...inviteForm, propertyId: hotelId });
      toast.success(`Invitation sent to ${inviteForm.email}`);
      setShowInvite(false);
      setInviteForm({ fullname: '', email: '', role: 'waiter' });
      setInviteErrors({});
      fetchStaff();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send invitation');
    } finally {
      setAct('invite', false);
    }
  };

  const confirmToggle = async () => {
    if (!toggleTarget) return;
    const { id, isActive, name } = toggleTarget;
    setAct(id, true);
    try {
      await updateStaffStatus(id, !isActive);
      toast.success(`${name} ${isActive ? 'deactivated' : 'activated'}`);
      setToggleTarget(null);
      fetchStaff();
    } catch {
      toast.error('Status update failed');
    } finally {
      setAct(id, false);
    }
  };

  const handleExport = () => {
    if (filtered.length === 0) {
      toast.info('No staff to export.');
      return;
    }
    exportToCsv(
      'staff.csv',
      ['Name', 'Email', 'Role', 'Department', 'Status', 'Joined'],
      filtered.map((m) => [
        m.name || m.fullname || '',
        m.email || '',
        roleMeta(m.role).label,
        m.department || '',
        m.isActive === false ? 'Inactive' : 'Active',
        m.joinDate ? new Date(m.joinDate).toLocaleDateString() : '',
      ])
    );
    toast.success(`Exported ${filtered.length} staff to CSV.`);
  };

  const statusFilters = [
    { value: 'all', label: 'All', count: stats.total },
    { value: 'active', label: 'Active', count: stats.active },
    { value: 'inactive', label: 'Inactive', count: stats.inactive },
  ];

  const renderToggleBtn = (member) => {
    const name = member.name || member.fullname || 'Unknown';
    const isActive = member.isActive !== false;
    return (
      <Button
        size="sm"
        variant={isActive ? 'danger' : 'primary'}
        onClick={() => setToggleTarget({ id: member._id, isActive, name })}
        disabled={actionLoading[member._id]}
      >
        {actionLoading[member._id] ? '…' : isActive ? 'Deactivate' : 'Activate'}
      </Button>
    );
  };

  return (
    <div className="ha-page">
      <PageHeader
        title="Staff Management"
        subtitle="Manage staff members, roles, and invitations."
        actions={
          <>
            <Button variant="secondary" onClick={fetchStaff}>
              <RefreshCw size={16} aria-hidden="true" /> Refresh
            </Button>
            <Button variant="secondary" onClick={handleExport}>
              <Download size={16} aria-hidden="true" /> Export
            </Button>
            <Button variant="primary" onClick={() => setShowInvite(true)}>
              <Plus size={16} aria-hidden="true" /> Invite Staff
            </Button>
          </>
        }
        toolbar={
          <>
            <div className="ha-toolbar__group">
              <SearchInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or email…" ariaLabel="Search staff" />
              <Select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} aria-label="Filter by department">
                {DEPTS.map((d) => <option key={d} value={d}>{d === 'all' ? 'All Departments' : d}</option>)}
              </Select>
              <Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} aria-label="Filter by role">
                <option value="all">All Roles</option>
                {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </Select>
              <Segmented
                options={[
                  { value: 'cards', label: 'Cards', icon: <LayoutGrid size={15} aria-hidden="true" /> },
                  { value: 'table', label: 'Table', icon: <List size={15} aria-hidden="true" /> },
                ]}
                value={viewMode}
                onChange={setViewMode}
                ariaLabel="Staff view"
              />
            </div>
            <FilterTabs options={statusFilters} value={statusFilter} onChange={setStatusFilter} ariaLabel="Filter staff by status" />
          </>
        }
      />

      <div className="ha-kpi-grid" style={{ marginBottom: 24 }}>
        {loading && staff.length === 0 ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard icon={<Users size={22} />} iconBg="linear-gradient(135deg,#6366f1,#4f46e5)" label="Total Staff" value={stats.total} />
            <StatCard icon={<User size={22} />} iconBg="var(--ha-success)" label="Active" value={stats.active} />
            <StatCard icon={<Lock size={22} />} iconBg="var(--ha-danger)" label="Inactive" value={stats.inactive} />
            <StatCard icon={<Info size={22} />} iconBg="var(--ha-warning)" label="Pending" value={stats.pending} />
          </>
        )}
      </div>

      {filtered.length === 0 && !loading ? (
        <EmptyState
          icon={<Users size={26} />}
          title={staff.length === 0 ? 'No staff yet' : 'No matching staff'}
          description={staff.length === 0 ? 'Invite your first staff member to get started.' : 'Try adjusting your search or filters.'}
          action={staff.length === 0 ? <Button variant="primary" size="sm" onClick={() => setShowInvite(true)}><Plus size={15} aria-hidden="true" /> Invite Staff</Button> : null}
        />
      ) : viewMode === 'cards' ? (
        <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))' }}>
          {filtered.map((member) => {
            const name = member.name || member.fullname || 'Unknown';
            const isActive = member.isActive !== false;
            return (
              <div key={member._id} className="ha-card ha-card--pad" style={{ opacity: isActive ? 1 : 0.75, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ width: 44, height: 44, borderRadius: 12, background: avatarColor(name), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }} aria-hidden="true">
                    {initials(name)}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div className="ha-body-strong" style={{ color: 'var(--ha-text)' }}>{name}</div>
                    <div className="ha-small" style={{ color: 'var(--ha-text-subtle)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{member.email}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <RoleBadge role={member.role} />
                  {member.department && <Badge tone="neutral">{member.department}</Badge>}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--ha-border)', paddingTop: 12 }}>
                  <Badge tone={isActive ? 'success' : 'danger'}>{isActive ? 'Active' : 'Inactive'}</Badge>
                  {renderToggleBtn(member)}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="ha-table-wrap">
          <div className="ha-table-scroll">
            <table className="ha-table" style={{ minWidth: 720 }}>
              <thead>
                <tr>
                  {['Staff Member', 'Email', 'Role', 'Department', 'Status', 'Joined', 'Actions'].map((h) => <th key={h} scope="col">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {filtered.map((member) => {
                  const name = member.name || member.fullname || 'Unknown';
                  const isActive = member.isActive !== false;
                  return (
                    <tr key={member._id} style={{ opacity: isActive ? 1 : 0.7 }}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ width: 32, height: 32, borderRadius: 8, background: avatarColor(name), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12 }} aria-hidden="true">
                            {initials(name)}
                          </span>
                          <span className="ha-body-strong" style={{ color: 'var(--ha-text)' }}>{name}</span>
                        </div>
                      </td>
                      <td style={{ color: 'var(--ha-text-subtle)' }}>{member.email}</td>
                      <td><RoleBadge role={member.role} /></td>
                      <td style={{ color: 'var(--ha-text-subtle)' }}>{member.department || '—'}</td>
                      <td><Badge tone={isActive ? 'success' : 'danger'}>{isActive ? 'Active' : 'Inactive'}</Badge></td>
                      <td className="haNum" style={{ color: 'var(--ha-text-subtle)' }}>{member.joinDate ? new Date(member.joinDate).toLocaleDateString() : '—'}</td>
                      <td>{renderToggleBtn(member)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Invite modal */}
      <Modal
        isOpen={showInvite}
        onClose={() => setShowInvite(false)}
        title="Invite Staff Member"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowInvite(false)} disabled={actionLoading.invite}>Cancel</Button>
            <Button variant="primary" onClick={handleInvite} disabled={actionLoading.invite}>
              <Mail size={16} aria-hidden="true" /> {actionLoading.invite ? 'Sending…' : 'Send Invitation'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleInvite} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input
            label="Full Name"
            required
            placeholder="Enter full name"
            value={inviteForm.fullname}
            onChange={(e) => { setInviteForm((p) => ({ ...p, fullname: e.target.value })); setInviteErrors((p) => ({ ...p, fullname: undefined })); }}
            error={inviteErrors.fullname}
          />
          <Input
            label="Email Address"
            required
            type="email"
            placeholder="staff@hotel.com"
            value={inviteForm.email}
            onChange={(e) => { setInviteForm((p) => ({ ...p, email: e.target.value })); setInviteErrors((p) => ({ ...p, email: undefined })); }}
            error={inviteErrors.email}
          />
          <div>
            <span className="ha-field__label" style={{ display: 'block', marginBottom: 8 }}>Role *</span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 8 }}>
              {ROLES.map((r) => {
                const RIcon = r.Icon;
                const active = inviteForm.role === r.value;
                return (
                  <button
                    key={r.value}
                    type="button"
                    className={`ha-filter-chip ${active ? 'ha-filter-chip--active' : ''}`}
                    style={{ height: 40, justifyContent: 'center' }}
                    onClick={() => setInviteForm((p) => ({ ...p, role: r.value }))}
                    aria-pressed={active}
                  >
                    <RIcon size={15} aria-hidden="true" /> {r.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="ha-card" style={{ padding: '10px 12px', display: 'flex', gap: 8, alignItems: 'flex-start', color: 'var(--ha-text-subtle)', fontSize: 13 }}>
            <Info size={16} aria-hidden="true" style={{ flexShrink: 0, marginTop: 1 }} />
            The staff member will receive an email with instructions to set up their account.
          </div>
        </form>
      </Modal>

      {/* Deactivate/activate confirmation */}
      <ConfirmDialog
        isOpen={!!toggleTarget}
        onClose={() => setToggleTarget(null)}
        onConfirm={confirmToggle}
        variant={toggleTarget?.isActive ? 'danger' : 'info'}
        title={toggleTarget?.isActive ? 'Deactivate staff member?' : 'Activate staff member?'}
        message={
          toggleTarget
            ? toggleTarget.isActive
              ? `${toggleTarget.name} will lose access to staff systems until reactivated.`
              : `${toggleTarget.name} will regain access to staff systems.`
            : ''
        }
        confirmText={toggleTarget?.isActive ? 'Deactivate' : 'Activate'}
        loading={toggleTarget ? actionLoading[toggleTarget.id] : false}
      />
    </div>
  );
};

export default StaffManagement;
