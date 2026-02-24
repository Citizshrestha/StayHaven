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

// Generate billing data
const generateBillingData = () => {
    const guests = [
        'Sarah Jenkins', 'Michael Foster', 'Emma Wilson', 'James Anderson',
        'Olivia Martinez', 'Tom Cook', 'Lindsay Walton', 'Courtney Wilson',
        'Whitney Francis', 'Leonard Krasner', 'Floyd Miles', 'Emily Selman'
    ];

    const roomTypes = ['Deluxe King', 'Presidential Suite', 'Standard Twin', 'Standard Queen', 'Executive Suite', 'Ocean View', 'Garden View'];
    const paymentMethods = ['Credit Card', 'Debit Card', 'Cash', 'Bank Transfer', 'Online Payment'];
    const invoiceStatuses = ['paid', 'pending', 'overdue', 'partial', 'refunded'];
    const statusWeights = [40, 25, 10, 15, 10];

    const getWeightedStatus = () => {
        const r = Math.random() * 100;
        let c = 0;
        for (let i = 0; i < invoiceStatuses.length; i++) {
            c += statusWeights[i];
            if (r <= c) return invoiceStatuses[i];
        }
        return invoiceStatuses[0];
    };

    const invoices = [];
    for (let i = 0; i < 30; i++) {
        const guest = guests[Math.floor(Math.random() * guests.length)];
        const roomType = roomTypes[Math.floor(Math.random() * roomTypes.length)];
        const roomNum = (100 + Math.floor(Math.random() * 600)).toString();
        const nights = Math.floor(Math.random() * 7) + 1;
        const roomRate = [120, 150, 220, 280, 350, 600][Math.floor(Math.random() * 6)];
        const roomCharges = roomRate * nights;
        const extras = Math.floor(Math.random() * 200);
        const tax = Math.round(roomCharges * 0.13);
        const total = roomCharges + extras + tax;
        const status = getWeightedStatus();

        invoices.push({
            id: `INV-${(2024000 + i).toString()}`,
            bookingId: `#BK-${5000 + i}`,
            guest: {
                name: guest,
                initials: guest.split(' ').map(n => n[0]).join('')
            },
            room: { type: roomType, number: roomNum },
            checkIn: new Date(Date.now() - (Math.random() * 15 + 1) * 24 * 60 * 60 * 1000),
            checkOut: new Date(Date.now() + (Math.random() * 5) * 24 * 60 * 60 * 1000),
            nights,
            charges: {
                room: roomCharges,
                extras,
                tax,
                total
            },
            paid: status === 'paid' ? total : status === 'partial' ? Math.round(total * 0.6) : status === 'refunded' ? total : 0,
            balance: status === 'paid' ? 0 : status === 'partial' ? Math.round(total * 0.4) : status === 'refunded' ? 0 : total,
            status,
            paymentMethod: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
            invoiceDate: new Date(Date.now() - Math.random() * 10 * 24 * 60 * 60 * 1000),
            dueDate: new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000),
        });
    }

    return invoices;
};

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
            await new Promise(r => setTimeout(r, 500));
            setInvoices(generateBillingData());
            setIsLoading(false);
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
