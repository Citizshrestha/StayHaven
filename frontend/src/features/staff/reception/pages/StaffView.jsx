import React, { useState, useEffect, useMemo } from 'react';
import { useTheme } from '../../../../hooks/useTheme';
import {
    Search,
    ChevronDown,
    UserCog,
    Users,
    Phone,
    Mail,
    Clock,
    CheckCircle,
    XCircle,
    Star,
    Calendar,
    Badge,
    Briefcase,
    MapPin,
    Award,
    Loader2,
    Eye,
    MoreVertical,
    Shield,
    AlertTriangle
} from 'lucide-react';
import './StaffView.css';
import * as receptionApi from '../../../../core/api/services/reception.service';

const getDeptFromRole = (role) => {
    const r = (role || '').toLowerCase();
    if (r.includes('receptionist') || r.includes('auditor') || r.includes('front')) return 'Front Office';
    if (r.includes('housekeep') || r.includes('clean')) return 'Housekeeping';
    if (r.includes('concierge') || r.includes('bell') || r.includes('valet') || r.includes('guest')) return 'Guest Services';
    if (r.includes('chef') || r.includes('restaurant') || r.includes('food') || r.includes('waiter')) return 'Food & Beverage';
    if (r.includes('security') || r.includes('guard')) return 'Security';
    if (r.includes('maintenance') || r.includes('engineer')) return 'Maintenance';
    if (r.includes('spa') || r.includes('wellness')) return 'Spa & Wellness';
    return 'General';
};

const StaffView = ({ onMessageStaff }) => {
    const { isDark } = useTheme();
    const [staff, setStaff] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [departmentFilter, setDepartmentFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [showDeptDropdown, setShowDeptDropdown] = useState(false);
    const [showStatusDropdown, setShowStatusDropdown] = useState(false);
    const [reportModal, setReportModal] = useState({ open: false, staff: null });
    const [reportReason, setReportReason] = useState('');
    const [reportUrgency, setReportUrgency] = useState('normal');
    const [reportLoading, setReportLoading] = useState(false);

    useEffect(() => {
        const load = async () => {
            setIsLoading(true);
            try {
                const res = await receptionApi.getStaffList();
                if (res?.success && res.data) {
                    const mapped = res.data.map((s, i) => {
                        const name = s.name || s.fullName || `${s.firstName || ''} ${s.lastName || ''}`.trim() || 'Unknown';
                        const role = s.role?.name || s.roleName || s.position || 'Staff';
                        const dept = s.department || getDeptFromRole(role);
                        const yearsExp = s.yearsExperience || Math.max(1, Math.floor((Date.now() - new Date(s.createdAt || Date.now()).getTime()) / (365.25 * 24 * 60 * 60 * 1000)));
                        return {
                            _id: s._id,
                            id: s.id || s.staffId || `STF-${1000 + i}`,
                            name,
                            initials: name.split(' ').map(n => n[0]).join(''),
                            role,
                            department: dept,
                            email: s.email || '',
                            phone: s.phone || '',
                            shift: s.shift || 'Morning',
                            status: s.status || 'on-duty',
                            rating: s.rating || 4.5,
                            yearsExp,
                            joinDate: s.createdAt ? new Date(s.createdAt) : new Date(),
                            tasksCompleted: s.tasksCompleted || 0,
                            shiftsThisMonth: s.shiftsThisMonth || 0,
                        };
                    });
                    setStaff(mapped);
                }
            } catch (err) {
                console.error('Error loading staff:', err);
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, []);

    useEffect(() => {
        const handler = (e) => {
            if (!e.target.closest('.sv-filter-dropdown')) {
                setShowDeptDropdown(false);
                setShowStatusDropdown(false);
            }
        };
        document.addEventListener('click', handler);
        return () => document.removeEventListener('click', handler);
    }, []);

    const departments = useMemo(() => {
        return [...new Set(staff.map(s => s.department))].sort();
    }, [staff]);

    const filteredStaff = useMemo(() => {
        return staff.filter(s => {
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                if (!s.name.toLowerCase().includes(q) && !s.role.toLowerCase().includes(q) && !s.id.toLowerCase().includes(q)) return false;
            }
            if (departmentFilter !== 'all' && s.department !== departmentFilter) return false;
            if (statusFilter !== 'all' && s.status !== statusFilter) return false;
            return true;
        });
    }, [staff, searchQuery, departmentFilter, statusFilter]);

    const stats = useMemo(() => ({
        total: staff.length,
        onDuty: staff.filter(s => s.status === 'on-duty').length,
        offDuty: staff.filter(s => s.status === 'off-duty').length,
        onLeave: staff.filter(s => s.status === 'on-leave').length,
        departments: [...new Set(staff.map(s => s.department))].length,
    }), [staff]);

    const getStatusConfig = (status) => {
        const configs = {
            'on-duty': { class: 'sv-status-on-duty', label: 'On Duty', color: '#10b981' },
            'off-duty': { class: 'sv-status-off-duty', label: 'Off Duty', color: '#94a3b8' },
            'on-leave': { class: 'sv-status-on-leave', label: 'On Leave', color: '#f59e0b' },
        };
        return configs[status] || { class: '', label: status, color: '#94a3b8' };
    };

    const handleReportStaff = async () => {
        if (!reportModal.staff || !reportReason.trim()) return;
        setReportLoading(true);
        try {
            await receptionApi.notifyManagerAboutStaff(reportModal.staff._id, reportReason, reportUrgency);
            alert('Issue reported to management successfully.');
            setReportModal({ open: false, staff: null });
            setReportReason('');
            setReportUrgency('normal');
        } catch (err) {
            console.error('Failed to report staff issue:', err);
            alert('Failed to report: ' + (err.response?.data?.message || err.message));
        } finally {
            setReportLoading(false);
        }
    };

    const getShiftBadge = (shift) => {
        const colors = {
            'Morning': '#3b82f6',
            'Afternoon': '#f59e0b',
            'Night': '#6366f1',
        };
        return colors[shift] || '#94a3b8';
    };

    return (
        <div className={`staff-view ${isDark ? 'dark' : ''}`}>
            {/* Stats */}
            <div className="sv-stats-grid">
                <div className="sv-stat-card">
                    <div className="sv-stat-icon-wrap total">
                        <Users size={22} />
                    </div>
                    <div className="sv-stat-info">
                        <span className="sv-stat-number">{stats.total}</span>
                        <span className="sv-stat-label">Total Staff</span>
                    </div>
                </div>
                <div className="sv-stat-card">
                    <div className="sv-stat-icon-wrap on-duty">
                        <CheckCircle size={22} />
                    </div>
                    <div className="sv-stat-info">
                        <span className="sv-stat-number">{stats.onDuty}</span>
                        <span className="sv-stat-label">On Duty</span>
                    </div>
                </div>
                <div className="sv-stat-card">
                    <div className="sv-stat-icon-wrap off-duty">
                        <Clock size={22} />
                    </div>
                    <div className="sv-stat-info">
                        <span className="sv-stat-number">{stats.offDuty}</span>
                        <span className="sv-stat-label">Off Duty</span>
                    </div>
                </div>
                <div className="sv-stat-card">
                    <div className="sv-stat-icon-wrap departments">
                        <Briefcase size={22} />
                    </div>
                    <div className="sv-stat-info">
                        <span className="sv-stat-number">{stats.departments}</span>
                        <span className="sv-stat-label">Departments</span>
                    </div>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="sv-filter-bar">
                <div className="sv-search-wrapper">
                    <Search className="sv-search-icon" size={18} />
                    <input
                        type="text"
                        className="sv-search-input"
                        placeholder="Search staff by name, role, ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="sv-filter-dropdown relative">
                    <button
                        className="sv-filter-btn"
                        onClick={(e) => { e.stopPropagation(); setShowDeptDropdown(!showDeptDropdown); setShowStatusDropdown(false); }}
                    >
                        <span>{departmentFilter === 'all' ? 'All Departments' : departmentFilter}</span>
                        <ChevronDown size={16} />
                    </button>
                    {showDeptDropdown && (
                        <div className="sv-dropdown-menu sv-dropdown-scrollable">
                            <button className={`sv-dropdown-item ${departmentFilter === 'all' ? 'active' : ''}`} onClick={() => { setDepartmentFilter('all'); setShowDeptDropdown(false); }}>
                                All Departments
                            </button>
                            {departments.map(d => (
                                <button key={d} className={`sv-dropdown-item ${departmentFilter === d ? 'active' : ''}`} onClick={() => { setDepartmentFilter(d); setShowDeptDropdown(false); }}>
                                    {d}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="sv-filter-dropdown relative">
                    <button
                        className="sv-filter-btn"
                        onClick={(e) => { e.stopPropagation(); setShowStatusDropdown(!showStatusDropdown); setShowDeptDropdown(false); }}
                    >
                        <span>{statusFilter === 'all' ? 'All Status' : getStatusConfig(statusFilter).label}</span>
                        <ChevronDown size={16} />
                    </button>
                    {showStatusDropdown && (
                        <div className="sv-dropdown-menu">
                            {['all', 'on-duty', 'off-duty', 'on-leave'].map(s => (
                                <button key={s} className={`sv-dropdown-item ${statusFilter === s ? 'active' : ''}`} onClick={() => { setStatusFilter(s); setShowStatusDropdown(false); }}>
                                    {s === 'all' ? 'All Status' : getStatusConfig(s).label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Loading */}
            {isLoading && (
                <div className="sv-loading">
                    <Loader2 className="sv-loading-spinner" size={32} />
                    <p>Loading staff data...</p>
                </div>
            )}

            {/* Empty */}
            {!isLoading && filteredStaff.length === 0 && (
                <div className="sv-empty-state">
                    <Users size={48} className="sv-empty-icon" />
                    <h3>No staff found</h3>
                    <p>Try adjusting your filters.</p>
                </div>
            )}

            {/* Staff Grid */}
            {!isLoading && filteredStaff.length > 0 && (
                <div className="sv-staff-grid">
                    {filteredStaff.map(member => {
                        const statusConfig = getStatusConfig(member.status);
                        return (
                            <div key={member.id} className={`sv-staff-card ${member.status}`}>
                                <div className="sv-card-header">
                                    <div className="sv-staff-avatar" style={{ '--avatar-color': getShiftBadge(member.shift) }}>
                                        {member.initials}
                                        <span className="sv-status-dot" style={{ background: statusConfig.color }}></span>
                                    </div>
                                    <div className="sv-staff-main-info">
                                        <span className="sv-staff-name">{member.name}</span>
                                        <span className="sv-staff-role">{member.role}</span>
                                        <span className="sv-staff-id">{member.id}</span>
                                    </div>
                                    <span className={`sv-staff-status ${statusConfig.class}`} style={{ '--status-color': statusConfig.color }}>
                                        {statusConfig.label}
                                    </span>
                                </div>

                                <div className="sv-card-body">
                                    <div className="sv-info-row">
                                        <Briefcase size={14} />
                                        <span>{member.department}</span>
                                    </div>
                                    <div className="sv-info-row">
                                        <Clock size={14} />
                                        <span>{member.shift} Shift</span>
                                        <span className="sv-shift-dot" style={{ background: getShiftBadge(member.shift) }}></span>
                                    </div>
                                    <div className="sv-info-row">
                                        <Award size={14} />
                                        <span>{member.yearsExp} year{member.yearsExp !== 1 ? 's' : ''} experience</span>
                                    </div>
                                    <div className="sv-info-row">
                                        <Star size={14} className="sv-star-icon" />
                                        <span>{member.rating} rating</span>
                                    </div>
                                </div>

                                <div className="sv-card-stats">
                                    <div className="sv-mini-stat">
                                        <span className="sv-mini-stat-value">{member.tasksCompleted}</span>
                                        <span className="sv-mini-stat-label">Tasks Done</span>
                                    </div>
                                    <div className="sv-mini-stat">
                                        <span className="sv-mini-stat-value">{member.shiftsThisMonth}</span>
                                        <span className="sv-mini-stat-label">Shifts/Mo</span>
                                    </div>
                                </div>

                                <div className="sv-card-footer">
                                    <div className="sv-contact-actions">
                                        <a href={`tel:${member.phone.replace(/[^+\d]/g, '')}`} className="sv-contact-btn" title={`Call ${member.phone}`}>
                                            <Phone size={15} />
                                        </a>
                                        <button
                                            className="sv-contact-btn"
                                            title={`Message ${member.name}`}
                                            onClick={() => onMessageStaff && onMessageStaff({ _id: member._id, fullname: member.name, companyRole: member.role, email: member.email })}
                                        >
                                            <Mail size={15} />
                                        </button>
                                        <button
                                            className="sv-contact-btn sv-report-btn"
                                            title="Report Issue to Manager"
                                            onClick={() => setReportModal({ open: true, staff: member })}
                                        >
                                            <AlertTriangle size={15} />
                                        </button>
                                    </div>
                                    <span className="sv-join-date">
                                        <Calendar size={12} />
                                        Joined {new Date(member.joinDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {!isLoading && filteredStaff.length > 0 && (
                <div className="sv-results-info">
                    Showing <strong>{filteredStaff.length}</strong> of <strong>{staff.length}</strong> staff members
                </div>
            )}

            {/* Report Staff Issue Modal */}
            {reportModal.open && reportModal.staff && (
                <div className="gv-modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '16px' }} onClick={() => setReportModal({ open: false, staff: null })}>
                    <div style={{ width: '100%', maxWidth: '460px', borderRadius: '16px', padding: '24px', background: isDark ? '#1e293b' : '#fff', color: isDark ? '#e2e8f0' : '#1e293b', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }} onClick={e => e.stopPropagation()}>
                        <button style={{ position: 'absolute', top: '16px', right: '16px', width: '36px', height: '36px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: isDark ? 'rgba(255,255,255,0.1)' : '#f1f5f9', cursor: 'pointer', color: 'inherit' }} onClick={() => setReportModal({ open: false, staff: null })}>
                            ✕
                        </button>

                        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                            <div style={{ width: '56px', height: '56px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', background: isDark ? 'rgba(245,158,11,0.15)' : '#fffbeb' }}>
                                <AlertTriangle size={28} style={{ color: '#f59e0b' }} />
                            </div>
                            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '4px' }}>Report Staff Issue</h2>
                            <p style={{ fontSize: '14px', opacity: 0.7 }}>Notify management about <strong>{reportModal.staff.name}</strong> ({reportModal.staff.role})</p>
                        </div>

                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Urgency</label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                {['normal', 'high'].map(u => (
                                    <button
                                        key={u}
                                        onClick={() => setReportUrgency(u)}
                                        style={{ flex: 1, padding: '8px 16px', borderRadius: '8px', border: '2px solid', borderColor: reportUrgency === u ? (u === 'high' ? '#ef4444' : '#3b82f6') : (isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0'), background: reportUrgency === u ? (u === 'high' ? (isDark ? 'rgba(239,68,68,0.15)' : '#fef2f2') : (isDark ? 'rgba(59,130,246,0.15)' : '#eff6ff')) : 'transparent', color: 'inherit', cursor: 'pointer', fontSize: '13px', fontWeight: 600, textTransform: 'capitalize' }}
                                    >
                                        {u === 'high' ? '🔴 High' : '🔵 Normal'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Describe the issue (required)</label>
                            <textarea
                                value={reportReason}
                                onChange={(e) => setReportReason(e.target.value)}
                                placeholder="Describe the issue you need to report to management..."
                                rows={4}
                                style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid', borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0', background: isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc', fontSize: '14px', resize: 'vertical', color: 'inherit', fontFamily: 'inherit' }}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => setReportModal({ open: false, staff: null })}
                                style={{ padding: '10px 20px', borderRadius: '10px', fontSize: '14px', fontWeight: 500, border: '1px solid', borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0', background: 'transparent', color: 'inherit', cursor: 'pointer' }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleReportStaff}
                                disabled={!reportReason.trim() || reportLoading}
                                style={{ padding: '10px 20px', borderRadius: '10px', fontSize: '14px', fontWeight: 600, border: 'none', cursor: !reportReason.trim() || reportLoading ? 'not-allowed' : 'pointer', opacity: !reportReason.trim() || reportLoading ? 0.5 : 1, background: '#f59e0b', color: '#fff' }}
                            >
                                {reportLoading ? 'Sending...' : 'Notify Manager'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StaffView;
