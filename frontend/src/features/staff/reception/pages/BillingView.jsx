import React, { useState, useEffect, useMemo } from 'react';
import { useTheme } from '../../../../hooks/useTheme';
import {
    Search,
    ChevronDown,
    Receipt,
    CreditCard,
    DollarSign,
    Clock,
    CheckCircle,
    XCircle,
    AlertCircle,
    FileText,
    Printer,
    Download,
    Eye,
    Loader2,
    TrendingUp,
    ArrowUpRight,
    ArrowDownRight,
    Calendar,
    User,
    Filter
} from 'lucide-react';
import './BillingView.css';
import * as receptionApi from '../../../../core/api/services/reception.service';

const BillingView = () => {
    const { isDark } = useTheme();
    const [invoices, setInvoices] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [showStatusDropdown, setShowStatusDropdown] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState(null);

    useEffect(() => {
        const load = async () => {
            setIsLoading(true);
            try {
                const res = await receptionApi.getInvoices({ limit: 200 });
                if (res?.success && res.data) {
                    const mapped = res.data.map(inv => ({
                        id: inv.invoiceId || inv.invoiceNumber || inv._id,
                        bookingId: inv.bookingRef || inv.booking?.bookingId || inv.bookingId || '',
                        guest: {
                            name: inv.guest?.fullName || inv.guestName || 'Unknown',
                            initials: (inv.guest?.fullName || inv.guestName || 'U').split(' ').map(n => n[0]).join('')
                        },
                        room: {
                            type: inv.room?.type || inv.roomType || 'Standard',
                            number: inv.room?.roomNumber || inv.roomNumber || ''
                        },
                        checkIn: inv.checkIn ? new Date(inv.checkIn) : new Date(),
                        checkOut: inv.checkOut ? new Date(inv.checkOut) : new Date(),
                        nights: inv.nights || 1,
                        charges: {
                            room: inv.charges?.room || 0,
                            extras: inv.charges?.extras || 0,
                            tax: inv.charges?.tax || 0,
                            total: inv.charges?.total || inv.totalAmount || 0
                        },
                        paid: inv.paidAmount ?? 0,
                        balance: inv.balance ?? 0,
                        status: inv.status || 'pending',
                        paymentMethod: inv.paymentMethod || 'N/A',
                        invoiceDate: inv.invoiceDate ? new Date(inv.invoiceDate) : new Date(),
                        dueDate: inv.dueDate ? new Date(inv.dueDate) : new Date(),
                    }));
                    setInvoices(mapped);
                }
            } catch (err) {
                console.error('Error loading invoices:', err);
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, []);

    useEffect(() => {
        const handler = (e) => {
            if (!e.target.closest('.bl-filter-dropdown')) setShowStatusDropdown(false);
        };
        document.addEventListener('click', handler);
        return () => document.removeEventListener('click', handler);
    }, []);

    const filteredInvoices = useMemo(() => {
        return invoices.filter(inv => {
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                if (!inv.id.toLowerCase().includes(q) && !inv.guest.name.toLowerCase().includes(q) && !inv.bookingId.toLowerCase().includes(q)) return false;
            }
            if (statusFilter !== 'all' && inv.status !== statusFilter) return false;
            return true;
        });
    }, [invoices, searchQuery, statusFilter]);

    const stats = useMemo(() => ({
        totalRevenue: invoices.reduce((s, i) => s + i.paid, 0),
        pending: invoices.filter(i => i.status === 'pending').reduce((s, i) => s + i.charges.total, 0),
        overdue: invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + i.charges.total, 0),
        invoiceCount: invoices.length,
        paidCount: invoices.filter(i => i.status === 'paid').length,
        pendingCount: invoices.filter(i => i.status === 'pending').length,
    }), [invoices]);

    const getStatusConfig = (status) => {
        const configs = {
            'paid': { class: 'bl-status-paid', label: 'Paid', icon: CheckCircle },
            'pending': { class: 'bl-status-pending', label: 'Pending', icon: Clock },
            'overdue': { class: 'bl-status-overdue', label: 'Overdue', icon: AlertCircle },
            'partial': { class: 'bl-status-partial', label: 'Partial', icon: DollarSign },
            'refunded': { class: 'bl-status-refunded', label: 'Refunded', icon: ArrowDownRight },
        };
        return configs[status] || { class: '', label: status, icon: Receipt };
    };

    const formatCurrency = (amount) => `Rs ${amount.toLocaleString()}`;
    const formatDate = (date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    return (
        <div className={`billing-view ${isDark ? 'dark' : ''}`}>
            {/* Revenue Stats */}
            <div className="bl-stats-grid">
                <div className="bl-stat-card bl-revenue">
                    <div className="bl-stat-icon-wrap revenue">
                        <DollarSign size={22} />
                    </div>
                    <div className="bl-stat-info">
                        <span className="bl-stat-number">{formatCurrency(stats.totalRevenue)}</span>
                        <span className="bl-stat-label">Total Revenue</span>
                    </div>
                    <div className="bl-stat-trend up">
                        <ArrowUpRight size={14} />
                        <span>+12.5%</span>
                    </div>
                </div>
                <div className="bl-stat-card bl-pending-rev">
                    <div className="bl-stat-icon-wrap pending">
                        <Clock size={22} />
                    </div>
                    <div className="bl-stat-info">
                        <span className="bl-stat-number">{formatCurrency(stats.pending)}</span>
                        <span className="bl-stat-label">Pending ({stats.pendingCount})</span>
                    </div>
                </div>
                <div className="bl-stat-card bl-overdue-rev">
                    <div className="bl-stat-icon-wrap overdue">
                        <AlertCircle size={22} />
                    </div>
                    <div className="bl-stat-info">
                        <span className="bl-stat-number">{formatCurrency(stats.overdue)}</span>
                        <span className="bl-stat-label">Overdue</span>
                    </div>
                </div>
                <div className="bl-stat-card bl-total-inv">
                    <div className="bl-stat-icon-wrap invoices">
                        <FileText size={22} />
                    </div>
                    <div className="bl-stat-info">
                        <span className="bl-stat-number">{stats.invoiceCount}</span>
                        <span className="bl-stat-label">Total Invoices</span>
                    </div>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bl-filter-bar">
                <div className="bl-search-wrapper">
                    <Search className="bl-search-icon" size={18} />
                    <input
                        type="text"
                        className="bl-search-input"
                        placeholder="Search invoice, guest, booking..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="bl-filter-dropdown relative">
                    <button
                        className="bl-filter-btn"
                        onClick={(e) => { e.stopPropagation(); setShowStatusDropdown(!showStatusDropdown); }}
                    >
                        <span>{statusFilter === 'all' ? 'All Status' : statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}</span>
                        <ChevronDown size={16} />
                    </button>
                    {showStatusDropdown && (
                        <div className="bl-dropdown-menu">
                            {['all', 'paid', 'pending', 'overdue', 'partial', 'refunded'].map(s => (
                                <button
                                    key={s}
                                    className={`bl-dropdown-item ${statusFilter === s ? 'active' : ''}`}
                                    onClick={() => { setStatusFilter(s); setShowStatusDropdown(false); }}
                                >
                                    {s === 'all' ? 'All Status' : s.charAt(0).toUpperCase() + s.slice(1)}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Loading */}
            {isLoading && (
                <div className="bl-loading">
                    <Loader2 className="bl-loading-spinner" size={32} />
                    <p>Loading billing data...</p>
                </div>
            )}

            {/* Empty */}
            {!isLoading && filteredInvoices.length === 0 && (
                <div className="bl-empty-state">
                    <Receipt size={48} className="bl-empty-icon" />
                    <h3>No invoices found</h3>
                    <p>Try adjusting your search or filters.</p>
                </div>
            )}

            {/* Invoice Cards Grid */}
            {!isLoading && filteredInvoices.length > 0 && (
                <div className="bl-invoices-grid">
                    {filteredInvoices.map(inv => {
                        const statusConfig = getStatusConfig(inv.status);
                        const StatusIcon = statusConfig.icon;
                        return (
                            <div key={inv.id} className={`bl-invoice-card ${inv.status}`}>
                                <div className="bl-invoice-header">
                                    <div className="bl-invoice-id-wrap">
                                        <Receipt size={16} />
                                        <span className="bl-invoice-id">{inv.id}</span>
                                    </div>
                                    <span className={`bl-invoice-status ${statusConfig.class}`}>
                                        <StatusIcon size={12} />
                                        {statusConfig.label}
                                    </span>
                                </div>

                                <div className="bl-invoice-guest">
                                    <div className="bl-invoice-avatar">
                                        {inv.guest.initials}
                                    </div>
                                    <div className="bl-invoice-guest-info">
                                        <span className="bl-guest-name">{inv.guest.name}</span>
                                        <span className="bl-booking-id">{inv.bookingId}</span>
                                    </div>
                                </div>

                                <div className="bl-invoice-details">
                                    <div className="bl-detail-row">
                                        <span className="bl-detail-label">Room</span>
                                        <span className="bl-detail-value">{inv.room.type} - {inv.room.number}</span>
                                    </div>
                                    <div className="bl-detail-row">
                                        <span className="bl-detail-label">Stay</span>
                                        <span className="bl-detail-value">{inv.nights} night{inv.nights > 1 ? 's' : ''}</span>
                                    </div>
                                    <div className="bl-detail-row">
                                        <span className="bl-detail-label">Payment</span>
                                        <span className="bl-detail-value">{inv.paymentMethod}</span>
                                    </div>
                                </div>

                                <div className="bl-invoice-amounts">
                                    <div className="bl-amount-row">
                                        <span>Room Charges</span>
                                        <span>{formatCurrency(inv.charges.room)}</span>
                                    </div>
                                    <div className="bl-amount-row">
                                        <span>Extras</span>
                                        <span>{formatCurrency(inv.charges.extras)}</span>
                                    </div>
                                    <div className="bl-amount-row">
                                        <span>Tax (13%)</span>
                                        <span>{formatCurrency(inv.charges.tax)}</span>
                                    </div>
                                    <div className="bl-amount-row bl-total-row">
                                        <span>Total</span>
                                        <span>{formatCurrency(inv.charges.total)}</span>
                                    </div>
                                    {inv.balance > 0 && (
                                        <div className="bl-amount-row bl-balance-row">
                                            <span>Balance Due</span>
                                            <span>{formatCurrency(inv.balance)}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="bl-invoice-footer">
                                    <span className="bl-invoice-date">
                                        <Calendar size={12} />
                                        {formatDate(inv.invoiceDate)}
                                    </span>
                                    <div className="bl-invoice-actions">
                                        <button className="bl-action-btn" title="View">
                                            <Eye size={15} />
                                        </button>
                                        <button className="bl-action-btn" title="Print">
                                            <Printer size={15} />
                                        </button>
                                        <button className="bl-action-btn" title="Download">
                                            <Download size={15} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {!isLoading && filteredInvoices.length > 0 && (
                <div className="bl-results-info">
                    Showing <strong>{filteredInvoices.length}</strong> of <strong>{invoices.length}</strong> invoices
                </div>
            )}
        </div>
    );
};

export default BillingView;
