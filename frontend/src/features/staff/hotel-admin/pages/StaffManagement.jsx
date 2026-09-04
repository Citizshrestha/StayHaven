import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { useStaffAuth } from '../../../../core/context/StaffAuthContext';
import { getStaffList, inviteStaff, updateStaffStatus } from '../services/staffApi';
import './StaffManagement.css';

/* ─── Constants ─── */
const ROLES = [
  { value:'waiter',       label:'Waiter',       icon:'🍽️', color:'#6366f1' },
  { value:'chief',        label:'Chef',          icon:'👨‍🍳', color:'#f59e0b' },
  { value:'receptionist', label:'Receptionist',  icon:'🏨', color:'#10b981' },
  { value:'housekeeper',  label:'Housekeeper',   icon:'🧹', color:'#3b82f6' },
  { value:'manager',      label:'Manager',       icon:'👔', color:'#8b5cf6' },
  { value:'security',     label:'Security',      icon:'🔐', color:'#ef4444' },
];

const DEPTS = ['all','Front Office','Housekeeping','Food & Beverage','Guest Services','Maintenance','Security'];

const roleMeta = (role) => ROLES.find(r => r.value === role?.toLowerCase()) || { label: role || 'Staff', icon: '👤', color: '#64748b' };

const initials = (name) => (name||'').split(' ').map(p=>p[0]).join('').slice(0,2).toUpperCase() || '?';

/* ══════════════════════════════════════════════════════════════ */
const StaffManagement = ({ embedded = false }) => {
  const { activeProperty } = useStaffAuth();
  const hotelId = activeProperty?._id || activeProperty;

  const [staff, setStaff]           = useState([]);
  const [loading, setLoading]       = useState(false);
  const [actionLoading, setAL]      = useState({});

  const [search, setSearch]         = useState('');
  const [deptFilter, setDeptF]      = useState('all');
  const [roleFilter, setRoleF]      = useState('all');
  const [statusFilter, setStatusF]  = useState('all');
  const [viewMode, setViewMode]     = useState('cards'); // cards | table

  const [showInvite, setShowInvite] = useState(false);
  const [inviteForm, setIForm]      = useState({ fullname:'', email:'', role:'waiter', propertyId:'' });

  const setAct = (k, v) => setAL(p => ({ ...p, [k]: v }));

  /* ─── Fetch ─── */
  const fetchStaff = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (deptFilter !== 'all') params.department = deptFilter;
      const res = await getStaffList(params);
      setStaff(res.data.data || []);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to load staff');
    } finally { setLoading(false); }
  }, [search, deptFilter]);

  useEffect(() => { fetchStaff(); }, [fetchStaff]);

  /* ─── Actions ─── */
  const handleInvite = async (e) => {
    e.preventDefault();
    setAct('invite', true);
    try {
      await inviteStaff({ ...inviteForm, propertyId: hotelId });
      toast.success(`Invitation sent to ${inviteForm.email}`);
      setShowInvite(false);
      setIForm({ fullname:'', email:'', role:'waiter', propertyId:'' });
      fetchStaff();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to send invitation');
    } finally { setAct('invite', false); }
  };

  const handleToggle = async (staffId, isActive, name) => {
    setAct(staffId, true);
    try {
      await updateStaffStatus(staffId, !isActive);
      toast.success(`${name} ${isActive ? 'deactivated' : 'activated'}`);
      fetchStaff();
    } catch (e) {
      toast.error('Status update failed');
    } finally { setAct(staffId, false); }
  };

  /* ─── Derived ─── */
  const filtered = staff.filter(m => {
    const matchS = !search || (m.name||m.fullname||'').toLowerCase().includes(search.toLowerCase()) || (m.email||'').toLowerCase().includes(search.toLowerCase());
    const matchD = deptFilter === 'all' || m.department === deptFilter;
    const matchR = roleFilter === 'all' || m.role?.toLowerCase() === roleFilter;
    const matchSt = statusFilter === 'all' || (statusFilter === 'active' ? m.isActive !== false : m.isActive === false);
    return matchS && matchD && matchR && matchSt;
  });

  const stats = {
    total:    staff.length,
    active:   staff.filter(m=>m.isActive!==false).length,
    inactive: staff.filter(m=>m.isActive===false).length,
    pending:  staff.filter(m=>m.status?.toLowerCase()==='pending').length,
  };

  /* ─── Avatar color ─── */
  const avatarColor = (name) => {
    const colors = ['#6366f1','#10b981','#f59e0b','#3b82f6','#8b5cf6','#ef4444','#ec4899','#14b8a6'];
    const n = (name||'A').charCodeAt(0);
    return colors[n % colors.length];
  };

  /* ──────────────── RENDER ──────────────── */
  const pageContent = (
    <div className="sm2-root">
      {/* ── Header ── */}
      <div className="sm2-header">
        <div className="sm2-header-left">
          <div className="sm2-header-icon">
            <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
          </div>
          <div>
            <h1>Staff Management</h1>
            <p>Manage hotel staff members, roles, and invitations</p>
          </div>
        </div>
        <div className="sm2-header-actions">
          <div className="sm2-view-toggle">
            <button className={`sm2-vbtn${viewMode==='cards'?' sm2-vbtn--active':''}`} onClick={()=>setViewMode('cards')}>
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            </button>
            <button className={`sm2-vbtn${viewMode==='table'?' sm2-vbtn--active':''}`} onClick={()=>setViewMode('table')}>
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16"/></svg>
            </button>
          </div>
          <button className="sm2-btn sm2-btn--ghost" onClick={fetchStaff} disabled={loading}>↺ Refresh</button>
          <button className="sm2-btn sm2-btn--primary" onClick={()=>setShowInvite(true)}>+ Invite Staff</button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="sm2-stats">
        {[
          { label:'Total Staff', value:stats.total,    color:'#6366f1', icon:'👥' },
          { label:'Active',      value:stats.active,   color:'#10b981', icon:'✅' },
          { label:'Inactive',    value:stats.inactive, color:'#ef4444', icon:'🔴' },
          { label:'Pending',     value:stats.pending,  color:'#f59e0b', icon:'⏳' },
        ].map(s=>(
          <div key={s.label} className="sm2-stat" style={{'--c':s.color}}>
            <span className="sm2-stat-ico">{s.icon}</span>
            <div className="sm2-stat-val">{s.value}</div>
            <div className="sm2-stat-lbl">{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="sm2-filters">
        <div className="sm2-search-wrap">
          <svg className="sm2-search-ico" width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="11" cy="11" r="8"/><path strokeLinecap="round" d="M21 21l-4.35-4.35"/></svg>
          <input className="sm2-search" placeholder="Search by name or email…" value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
        <select className="sm2-sel" value={deptFilter} onChange={e=>setDeptF(e.target.value)}>
          {DEPTS.map(d=><option key={d} value={d}>{d === 'all' ? 'All Departments' : d}</option>)}
        </select>
        <select className="sm2-sel" value={roleFilter} onChange={e=>setRoleF(e.target.value)}>
          <option value="all">All Roles</option>
          {ROLES.map(r=><option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
        <select className="sm2-sel" value={statusFilter} onChange={e=>setStatusF(e.target.value)}>
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* ── Content ── */}
      {loading && !staff.length ? (
        <div className="sm2-loading"><div className="sm2-spinner"/><span>Loading staff…</span></div>
      ) : filtered.length === 0 ? (
        <div className="sm2-empty">
          <span className="sm2-empty-ico">👥</span>
          <h3>{staff.length === 0 ? 'No Staff Yet' : 'No Matching Staff'}</h3>
          <p>{staff.length === 0 ? 'Invite your first staff member to get started' : 'Try adjusting your search or filters'}</p>
          {staff.length === 0 && <button className="sm2-btn sm2-btn--primary" onClick={()=>setShowInvite(true)}>+ Invite First Staff</button>}
        </div>
      ) : viewMode === 'cards' ? (
        /* ── CARDS VIEW ── */
        <div className="sm2-grid">
          {filtered.map(member => {
            const rm = roleMeta(member.role);
            const name = member.name || member.fullname || 'Unknown';
            const isActive = member.isActive !== false;
            const ac = avatarColor(name);
            return (
              <div key={member._id} className={`sm2-card${!isActive?' sm2-card--inactive':''}`}>
                <div className="sm2-card-top">
                  <div className="sm2-avatar" style={{background:ac}}>
                    {initials(name)}
                  </div>
                  <div className="sm2-member-info">
                    <div className="sm2-member-name">{name}</div>
                    <div className="sm2-member-email">{member.email}</div>
                  </div>
                  <span className={`sm2-status-dot ${isActive?'sm2-status-dot--active':'sm2-status-dot--inactive'}`}/>
                </div>

                <div className="sm2-card-details">
                  <div className="sm2-detail">
                    <span className="sm2-detail-label">Role</span>
                    <span className="sm2-role-badge" style={{color:rm.color,background:rm.color+'15'}}>
                      {rm.icon} {rm.label}
                    </span>
                  </div>
                  {member.department && (
                    <div className="sm2-detail">
                      <span className="sm2-detail-label">Department</span>
                      <span className="sm2-detail-val">{member.department}</span>
                    </div>
                  )}
                  {member.phone && (
                    <div className="sm2-detail">
                      <span className="sm2-detail-label">Phone</span>
                      <span className="sm2-detail-val">{member.phone}</span>
                    </div>
                  )}
                  {member.joinDate && (
                    <div className="sm2-detail">
                      <span className="sm2-detail-label">Joined</span>
                      <span className="sm2-detail-val">{new Date(member.joinDate).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>

                <div className="sm2-card-footer">
                  <span className={`sm2-status-badge ${isActive?'sm2-status-badge--active':'sm2-status-badge--inactive'}`}>
                    {isActive ? '● Active' : '● Inactive'}
                  </span>
                  <button
                    className={`sm2-toggle-btn ${isActive?'sm2-toggle-btn--deactivate':'sm2-toggle-btn--activate'}`}
                    onClick={()=>handleToggle(member._id, isActive, name)}
                    disabled={actionLoading[member._id]}
                  >
                    {actionLoading[member._id] ? '…' : isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ── TABLE VIEW ── */
        <div className="sm2-table-wrap">
          <table className="sm2-table">
            <thead>
              <tr>
                <th>Staff Member</th>
                <th>Email</th>
                <th>Role</th>
                <th>Department</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(member => {
                const rm = roleMeta(member.role);
                const name = member.name || member.fullname || 'Unknown';
                const isActive = member.isActive !== false;
                const ac = avatarColor(name);
                return (
                  <tr key={member._id} className={!isActive?'sm2-tr-inactive':''}>
                    <td>
                      <div className="sm2-tbl-member">
                        <div className="sm2-avatar sm2-avatar--sm" style={{background:ac}}>{initials(name)}</div>
                        <span className="sm2-member-name">{name}</span>
                      </div>
                    </td>
                    <td className="sm2-muted">{member.email}</td>
                    <td>
                      <span className="sm2-role-badge" style={{color:rm.color,background:rm.color+'15'}}>
                        {rm.icon} {rm.label}
                      </span>
                    </td>
                    <td className="sm2-muted">{member.department || '—'}</td>
                    <td>
                      <span className={`sm2-status-badge ${isActive?'sm2-status-badge--active':'sm2-status-badge--inactive'}`}>
                        {isActive ? '● Active' : '● Inactive'}
                      </span>
                    </td>
                    <td className="sm2-muted">{member.joinDate ? new Date(member.joinDate).toLocaleDateString() : '—'}</td>
                    <td>
                      <button
                        className={`sm2-toggle-btn ${isActive?'sm2-toggle-btn--deactivate':'sm2-toggle-btn--activate'}`}
                        onClick={()=>handleToggle(member._id, isActive, name)}
                        disabled={actionLoading[member._id]}
                      >
                        {actionLoading[member._id] ? '…' : isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ══ INVITE MODAL ══ */}
      {showInvite && (
        <div className="sm2-overlay" onClick={()=>setShowInvite(false)}>
          <div className="sm2-modal" onClick={e=>e.stopPropagation()}>
            <div className="sm2-modal-hd">
              <div>
                <h2>Invite Staff Member</h2>
                <p>An email invite will be sent to complete registration</p>
              </div>
              <button className="sm2-close" onClick={()=>setShowInvite(false)}>✕</button>
            </div>
            <form onSubmit={handleInvite} className="sm2-form">
              <div className="sm2-fg">
                <label>Full Name *</label>
                <input required placeholder="Enter full name" value={inviteForm.fullname} onChange={e=>setIForm(p=>({...p,fullname:e.target.value}))}/>
              </div>
              <div className="sm2-fg">
                <label>Email Address *</label>
                <input required type="email" placeholder="staff@hotel.com" value={inviteForm.email} onChange={e=>setIForm(p=>({...p,email:e.target.value}))}/>
              </div>
              <div className="sm2-fg">
                <label>Role *</label>
                <div className="sm2-role-grid">
                  {ROLES.map(r=>(
                    <button type="button" key={r.value}
                      className={`sm2-role-card${inviteForm.role===r.value?' sm2-role-card--sel':''}`}
                      style={inviteForm.role===r.value?{borderColor:r.color,background:r.color+'12',color:r.color}:{}}
                      onClick={()=>setIForm(p=>({...p,role:r.value}))}
                    >
                      <span>{r.icon}</span>
                      <span>{r.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="sm2-invite-note">
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                <span>The staff member will receive an email with instructions to set up their account and start their role.</span>
              </div>

              <div className="sm2-modal-ft">
                <button type="button" className="sm2-btn sm2-btn--ghost" onClick={()=>setShowInvite(false)}>Cancel</button>
                <button type="submit" className="sm2-btn sm2-btn--primary" disabled={actionLoading.invite}>
                  {actionLoading.invite ? 'Sending…' : '📧 Send Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );

  if (embedded) return pageContent;
  return pageContent;
};

export default StaffManagement;
