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
    Shield
} from 'lucide-react';
import './StaffView.css';

// Generate staff data
const generateStaffData = () => {
    const staffMembers = [
        { name: 'Sarah Jenkins', role: 'Head Receptionist', department: 'Front Office', email: 'sarah.j@stayhaven.com', phone: '+1 (555) 123-4567', shift: 'Morning', status: 'on-duty', rating: 4.9, yearsExp: 5 },
        { name: 'David Kim', role: 'Night Auditor', department: 'Front Office', email: 'david.k@stayhaven.com', phone: '+1 (555) 234-5678', shift: 'Night', status: 'off-duty', rating: 4.7, yearsExp: 3 },
        { name: 'Maria Santos', role: 'Receptionist', department: 'Front Office', email: 'maria.s@stayhaven.com', phone: '+1 (555) 345-6789', shift: 'Morning', status: 'on-duty', rating: 4.8, yearsExp: 2 },
        { name: 'James Wilson', role: 'Concierge', department: 'Guest Services', email: 'james.w@stayhaven.com', phone: '+1 (555) 456-7890', shift: 'Afternoon', status: 'on-duty', rating: 4.6, yearsExp: 4 },
        { name: 'Lisa Chen', role: 'Housekeeping Supervisor', department: 'Housekeeping', email: 'lisa.c@stayhaven.com', phone: '+1 (555) 567-8901', shift: 'Morning', status: 'on-duty', rating: 4.8, yearsExp: 6 },
        { name: 'Robert Taylor', role: 'Maintenance Engineer', department: 'Maintenance', email: 'robert.t@stayhaven.com', phone: '+1 (555) 678-9012', shift: 'Morning', status: 'on-leave', rating: 4.5, yearsExp: 8 },
        { name: 'Emily Brown', role: 'Housekeeper', department: 'Housekeeping', email: 'emily.b@stayhaven.com', phone: '+1 (555) 789-0123', shift: 'Morning', status: 'on-duty', rating: 4.3, yearsExp: 1 },
        { name: 'Michael Foster', role: 'Bellboy', department: 'Guest Services', email: 'michael.f@stayhaven.com', phone: '+1 (555) 890-1234', shift: 'Afternoon', status: 'on-duty', rating: 4.4, yearsExp: 2 },
        { name: 'Amanda Johnson', role: 'Spa Manager', department: 'Spa & Wellness', email: 'amanda.j@stayhaven.com', phone: '+1 (555) 901-2345', shift: 'Morning', status: 'off-duty', rating: 4.9, yearsExp: 7 },
        { name: 'Chris Martinez', role: 'Security Guard', department: 'Security', email: 'chris.m@stayhaven.com', phone: '+1 (555) 012-3456', shift: 'Night', status: 'on-duty', rating: 4.6, yearsExp: 4 },
        { name: 'Jennifer Lee', role: 'Restaurant Manager', department: 'Food & Beverage', email: 'jennifer.l@stayhaven.com', phone: '+1 (555) 111-2222', shift: 'Morning', status: 'on-duty', rating: 4.7, yearsExp: 5 },
        { name: 'Daniel Park', role: 'Chef', department: 'Food & Beverage', email: 'daniel.p@stayhaven.com', phone: '+1 (555) 333-4444', shift: 'Morning', status: 'on-duty', rating: 4.9, yearsExp: 10 },
        { name: 'Sophia Garcia', role: 'Receptionist', department: 'Front Office', email: 'sophia.g@stayhaven.com', phone: '+1 (555) 555-6666', shift: 'Afternoon', status: 'on-duty', rating: 4.5, yearsExp: 1 },
        { name: 'Kevin White', role: 'Valet', department: 'Guest Services', email: 'kevin.w@stayhaven.com', phone: '+1 (555) 777-8888', shift: 'Morning', status: 'off-duty', rating: 4.2, yearsExp: 2 },
        { name: 'Rachel Adams', role: 'Housekeeper', department: 'Housekeeping', email: 'rachel.a@stayhaven.com', phone: '+1 (555) 999-0000', shift: 'Afternoon', status: 'on-duty', rating: 4.4, yearsExp: 3 },
    ];

    return staffMembers.map((s, i) => ({
        ...s,
        id: `STF-${(1000 + i).toString()}`,
        initials: s.name.split(' ').map(n => n[0]).join(''),
        joinDate: new Date(Date.now() - s.yearsExp * 365 * 24 * 60 * 60 * 1000),
        tasksCompleted: Math.floor(Math.random() * 200) + 50,
        shiftsThisMonth: Math.floor(Math.random() * 20) + 5,
    }));
};

const StaffView = () => {
    const { isDark } = useTheme();
    const [staff, setStaff] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [departmentFilter, setDepartmentFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [showDeptDropdown, setShowDeptDropdown] = useState(false);
    const [showStatusDropdown, setShowStatusDropdown] = useState(false);

    useEffect(() => {
        const load = async () => {
            setIsLoading(true);
            await new Promise(r => setTimeout(r, 500));
            setStaff(generateStaffData());
            setIsLoading(false);
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
                                        <a href={`mailto:${member.email}`} className="sv-contact-btn" title={`Email ${member.email}`}>
                                            <Mail size={15} />
                                        </a>
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
        </div>
    );
};

export default StaffView;
