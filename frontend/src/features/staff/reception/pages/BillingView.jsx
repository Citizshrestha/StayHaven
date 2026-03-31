import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
    Filter,
    X,
    Building2
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
    const [revenueTrend, setRevenueTrend] = useState(null);
    const [loadError, setLoadError] = useState('');

    // Get hotel info for invoice branding
    const hotelInfo = useMemo(() => {
        try {
            const stored = localStorage.getItem('activeProperty');
            if (stored) {
                const parsed = JSON.parse(stored);
                if (typeof parsed === 'object' && parsed?.name) return parsed;
            }
        } catch { /* ignore */ }
        return null;
    }, []);

    const loadInvoices = async () => {
        setIsLoading(true);
        setLoadError('');
        try {
            const res = await receptionApi.getInvoices({ limit: 200 });
            if (res?.success && res.data) {
                const mapped = res.data.map(inv => ({
                    _id: inv._id,
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
                        taxRate: inv.charges?.taxRate || 13,
                        tax: inv.charges?.tax || 0,
                        total: inv.charges?.total || inv.totalAmount || 0
                    },
                    paid: inv.paid ?? 0,
                    balance: inv.balance ?? 0,
                    status: inv.status || 'pending',
                    paymentMethod: inv.paymentMethod || 'N/A',
                    invoiceDate: inv.invoiceDate || inv.issuedAt ? new Date(inv.invoiceDate || inv.issuedAt) : new Date(),
                    dueDate: inv.dueDate ? new Date(inv.dueDate) : new Date(),
                }));
                setInvoices(mapped);
            } else {
                setLoadError('Unable to load billing data. Please try again.');
            }
            // Revenue trend from backend summary
            if (res?.summary) {
                const { thisMonthRevenue = 0, prevMonthRevenue = 0 } = res.summary;
                if (prevMonthRevenue > 0) {
                    setRevenueTrend(((thisMonthRevenue - prevMonthRevenue) / prevMonthRevenue * 100).toFixed(1));
                } else if (thisMonthRevenue > 0) {
                    setRevenueTrend(100);
                }
            }
        } catch {
            setLoadError('Unable to load billing data. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadInvoices();
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

    const formatCurrency = (amount) => `₹${amount.toLocaleString()}`;
    const formatDate = (date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    // ── Invoice Action Handlers ──
    const handleViewInvoice = useCallback((inv) => {
        setSelectedInvoice(inv);
    }, []);

    const handlePrintInvoice = useCallback((inv) => {
        const printWindow = window.open('', '_blank', 'width=800,height=900');
        if (!printWindow) return;
        const html = buildInvoiceHTML(inv, formatCurrency, formatDate, hotelInfo);
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.onload = () => { printWindow.print(); };
    }, [hotelInfo]);

    const handleDownloadInvoice = useCallback((inv) => {
        const printWindow = window.open('', '_blank', 'width=800,height=900');
        if (!printWindow) return;
        const html = buildInvoiceHTML(inv, formatCurrency, formatDate, hotelInfo);
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.onload = () => { printWindow.print(); };
    }, [hotelInfo]);

    return (
        <div className={`billing-view ${isDark ? 'dark' : ''}`}>
            {!!loadError && (
                <div style={{ marginBottom: 14, padding: '12px 14px', borderRadius: 10, border: '1px solid #fecaca', background: '#fef2f2', color: '#b91c1c', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{loadError}</span>
                    <button
                        onClick={loadInvoices}
                        style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #fca5a5', background: '#fff', color: '#991b1b', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                    >
                        Retry
                    </button>
                </div>
            )}

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
                    {revenueTrend !== null && (
                    <div className={`bl-stat-trend ${Number(revenueTrend) >= 0 ? 'up' : 'down'}`}>
                        {Number(revenueTrend) >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                        <span>{Number(revenueTrend) >= 0 ? '+' : ''}{revenueTrend}%</span>
                    </div>
                    )}
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
                                        <span>Tax ({inv.charges.taxRate}%)</span>
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
                                        <button className="bl-action-btn" title="View" onClick={() => handleViewInvoice(inv)}>
                                            <Eye size={15} />
                                        </button>
                                        <button className="bl-action-btn" title="Print" onClick={() => handlePrintInvoice(inv)}>
                                            <Printer size={15} />
                                        </button>
                                        <button className="bl-action-btn" title="Download PDF" onClick={() => handleDownloadInvoice(inv)}>
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

            {/* ── Invoice Detail Modal ── */}
            {selectedInvoice && (
                <div className="bl-modal-overlay" onClick={() => setSelectedInvoice(null)}>
                    <div className="bl-modal-content" onClick={e => e.stopPropagation()}>
                        <div className="bl-modal-header">
                            <div>
                                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Invoice {selectedInvoice.id}</h3>
                                <span style={{ fontSize: 12, opacity: 0.6 }}>
                                    Issued {formatDate(selectedInvoice.invoiceDate)} &middot; Due {formatDate(selectedInvoice.dueDate)}
                                </span>
                            </div>
                            <button className="bl-modal-close" onClick={() => setSelectedInvoice(null)}>
                                <X size={18} />
                            </button>
                        </div>
                        <div className="bl-modal-body">
                            {/* Status badge */}
                            <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'flex-end' }}>
                                <span className={`bl-invoice-status ${getStatusConfig(selectedInvoice.status).class}`}
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, padding: '4px 12px', borderRadius: 20, fontWeight: 600 }}>
                                    {React.createElement(getStatusConfig(selectedInvoice.status).icon, { size: 13 })}
                                    {getStatusConfig(selectedInvoice.status).label}
                                </span>
                            </div>

                            {/* Hotel branding */}
                            {hotelInfo?.name && (
                                <div style={{
                                    textAlign: 'center', marginBottom: 24, paddingBottom: 20,
                                    borderBottom: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e2e8f0'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 4 }}>
                                        <Building2 size={18} style={{ opacity: 0.5 }} />
                                        <span style={{ fontSize: 16, fontWeight: 700 }}>{hotelInfo.name}</span>
                                    </div>
                                    {hotelInfo.location && (
                                        <div style={{ fontSize: 12, opacity: 0.5 }}>
                                            {hotelInfo.location.address}{hotelInfo.location.city ? `, ${hotelInfo.location.city}` : ''}
                                        </div>
                                    )}
                                    {hotelInfo.contact && (
                                        <div style={{ fontSize: 11, opacity: 0.4, marginTop: 2 }}>
                                            {hotelInfo.contact.phone && `Tel: ${hotelInfo.contact.phone}`}
                                            {hotelInfo.contact.email && ` | ${hotelInfo.contact.email}`}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Guest & Booking details in two columns */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                                <div className="bl-modal-section">
                                    <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, opacity: 0.5, marginBottom: 10 }}>Guest Details</div>
                                    <div className="bl-modal-row"><span className="bl-modal-label">Name</span><span style={{ fontWeight: 600 }}>{selectedInvoice.guest.name}</span></div>
                                    <div className="bl-modal-row"><span className="bl-modal-label">Booking</span><span>{selectedInvoice.bookingId}</span></div>
                                </div>
                                <div className="bl-modal-section">
                                    <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, opacity: 0.5, marginBottom: 10 }}>Room Details</div>
                                    <div className="bl-modal-row"><span className="bl-modal-label">Room</span><span>{selectedInvoice.room.type} - {selectedInvoice.room.number}</span></div>
                                    <div className="bl-modal-row"><span className="bl-modal-label">Stay</span><span>{formatDate(selectedInvoice.checkIn)} → {formatDate(selectedInvoice.checkOut)}</span></div>
                                    <div className="bl-modal-row"><span className="bl-modal-label">Duration</span><span>{selectedInvoice.nights} night{selectedInvoice.nights !== 1 ? 's' : ''}</span></div>
                                </div>
                            </div>

                            {/* Charges table */}
                            <div style={{
                                borderRadius: 10, overflow: 'hidden', marginBottom: 20,
                                border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e2e8f0'
                            }}>
                                <div style={{
                                    padding: '10px 16px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5,
                                    background: isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc',
                                    borderBottom: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid #e2e8f0'
                                }}>
                                    Charges Breakdown
                                </div>
                                <div style={{ padding: '12px 16px' }}>
                                    <div className="bl-modal-row"><span>Room Charges</span><span style={{ fontWeight: 500 }}>{formatCurrency(selectedInvoice.charges.room)}</span></div>
                                    <div className="bl-modal-row"><span>Extras / Services</span><span style={{ fontWeight: 500 }}>{formatCurrency(selectedInvoice.charges.extras)}</span></div>
                                    <div className="bl-modal-row" style={{ opacity: 0.7 }}>
                                        <span>Tax ({selectedInvoice.charges.taxRate}%)</span>
                                        <span>{formatCurrency(selectedInvoice.charges.tax)}</span>
                                    </div>
                                    <div className="bl-modal-row" style={{
                                        fontWeight: 700, fontSize: 15, marginTop: 10, paddingTop: 10,
                                        borderTop: isDark ? '2px solid rgba(255,255,255,0.1)' : '2px solid #e2e8f0'
                                    }}>
                                        <span>Total</span><span>{formatCurrency(selectedInvoice.charges.total)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Payment summary */}
                            <div style={{
                                borderRadius: 10, padding: 16, marginBottom: 16,
                                background: isDark ? 'rgba(16,185,129,0.06)' : 'rgba(16,185,129,0.04)',
                                border: isDark ? '1px solid rgba(16,185,129,0.15)' : '1px solid rgba(16,185,129,0.12)'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                    <span style={{ fontSize: 13 }}>Payment Method</span>
                                    <span style={{ fontWeight: 600, fontSize: 13 }}>{selectedInvoice.paymentMethod}</span>
                                </div>
                                {selectedInvoice.paid > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10b981' }}>
                                        <span style={{ fontSize: 13 }}>Amount Paid</span>
                                        <span style={{ fontWeight: 700, fontSize: 14 }}>{formatCurrency(selectedInvoice.paid)}</span>
                                    </div>
                                )}
                                {selectedInvoice.balance > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ef4444', marginTop: 6 }}>
                                        <span style={{ fontSize: 13, fontWeight: 600 }}>Balance Due</span>
                                        <span style={{ fontWeight: 700, fontSize: 14 }}>{formatCurrency(selectedInvoice.balance)}</span>
                                    </div>
                                )}
                            </div>

                            <div className="bl-modal-actions">
                                <button className="bl-modal-btn bl-modal-btn-secondary" onClick={() => handlePrintInvoice(selectedInvoice)}>
                                    <Printer size={15} /> Print Invoice
                                </button>
                                <button className="bl-modal-btn bl-modal-btn-primary" onClick={() => handleDownloadInvoice(selectedInvoice)}>
                                    <Download size={15} /> Download PDF
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

/* ── Helper: build professional printable invoice HTML ── */
function buildInvoiceHTML(inv, formatCurrency, formatDate, hotelInfo) {
    const hotelName = hotelInfo?.name || 'StayHaven Hotel & Resort';
    const hotelAddress = hotelInfo?.location
        ? `${hotelInfo.location.address || ''}${hotelInfo.location.city ? ', ' + hotelInfo.location.city : ''}`
        : '';
    const hotelPhone = hotelInfo?.contact?.phone || '';
    const hotelEmail = hotelInfo?.contact?.email || '';
    const hotelWeb = hotelInfo?.contact?.website || '';

    const isPaid = inv.status === 'paid';
    const statusColor = isPaid ? '#059669' : inv.status === 'overdue' ? '#dc2626' : '#d97706';
    const statusLabel = inv.status.toUpperCase();

    return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8">
<title>Invoice ${inv.id} - ${hotelName}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Segoe UI',system-ui,-apple-system,sans-serif;color:#1e293b;font-size:13px;line-height:1.6;background:#fff}
  .invoice-page{max-width:760px;margin:0 auto;padding:48px 52px}

  /* Header */
  .inv-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:36px;padding-bottom:28px;border-bottom:3px solid #0f172a}
  .inv-brand h1{font-size:22px;font-weight:800;color:#0f172a;letter-spacing:-0.5px;margin-bottom:2px}
  .inv-brand .tagline{font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:1.5px;font-weight:500}
  .inv-brand .hotel-contact{margin-top:8px;font-size:11px;color:#64748b;line-height:1.8}

  .inv-title-block{text-align:right}
  .inv-title-block h2{font-size:32px;font-weight:200;color:#0f172a;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px}
  .inv-title-block .inv-number{font-size:14px;font-weight:600;color:#334155;margin-bottom:12px}
  .inv-meta{font-size:12px;color:#64748b;line-height:2}
  .inv-meta strong{color:#334155;font-weight:600;display:inline-block;width:50px}

  /* Status Badge */
  .inv-status{display:inline-block;padding:4px 16px;border-radius:20px;font-size:11px;font-weight:700;letter-spacing:1px;color:#fff;margin-top:8px}

  /* Sections */
  .inv-grid{display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-bottom:32px}
  .inv-section-title{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#94a3b8;margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid #e2e8f0}
  .inv-detail{margin-bottom:6px}
  .inv-detail .label{color:#64748b;font-size:12px}
  .inv-detail .value{color:#0f172a;font-weight:600;font-size:13px}

  /* Charges Table */
  .charges-table{width:100%;border-collapse:collapse;margin-bottom:24px}
  .charges-table thead th{text-align:left;padding:10px 16px;background:#f8fafc;border-bottom:2px solid #e2e8f0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#64748b}
  .charges-table thead th:last-child{text-align:right}
  .charges-table tbody td{padding:12px 16px;border-bottom:1px solid #f1f5f9;font-size:13px}
  .charges-table tbody td:last-child{text-align:right;font-weight:500;font-variant-numeric:tabular-nums}
  .charges-table tbody tr.subtotal td{border-top:2px solid #e2e8f0;color:#64748b;font-size:12px;padding-top:10px}
  .charges-table tfoot td{padding:14px 16px;font-size:15px;font-weight:700;border-top:3px solid #0f172a}
  .charges-table tfoot td:last-child{text-align:right}

  /* Payment box */
  .payment-box{display:grid;grid-template-columns:1fr 1fr;gap:0;border-radius:10px;overflow:hidden;margin-bottom:32px;border:1px solid #e2e8f0}
  .payment-left,.payment-right{padding:16px 20px}
  .payment-left{background:#f8fafc;border-right:1px solid #e2e8f0}
  .payment-right{background:#fff}
  .payment-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;margin-bottom:6px}
  .payment-value{font-size:15px;font-weight:700;color:#0f172a}
  .payment-value.paid{color:#059669}
  .payment-value.due{color:#dc2626}

  /* Footer */
  .inv-footer{margin-top:40px;padding-top:20px;border-top:1px solid #e2e8f0}
  .inv-footer .terms{font-size:11px;color:#94a3b8;line-height:1.8;margin-bottom:16px}
  .inv-footer .terms strong{color:#64748b}
  .inv-footer .thank-you{text-align:center;font-size:13px;color:#64748b;font-weight:500;padding:16px 0;border-top:1px solid #f1f5f9}

  /* Watermark for paid */
  .watermark{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-35deg);font-size:100px;font-weight:900;color:rgba(5,150,105,0.04);pointer-events:none;text-transform:uppercase;letter-spacing:16px;z-index:0}

  @media print{
    body{print-color-adjust:exact;-webkit-print-color-adjust:exact}
    .invoice-page{padding:24px 32px}
    .no-print{display:none!important}
  }
</style>
</head><body>
${isPaid ? '<div class="watermark">PAID</div>' : ''}
<div class="invoice-page">
  <div class="inv-header">
    <div class="inv-brand">
      <h1>${hotelName}</h1>
      ${hotelAddress ? `<div class="tagline">${hotelAddress}</div>` : ''}
      <div class="hotel-contact">
        ${hotelPhone ? `${hotelPhone}<br>` : ''}
        ${hotelEmail ? `${hotelEmail}<br>` : ''}
        ${hotelWeb ? `${hotelWeb}` : ''}
      </div>
    </div>
    <div class="inv-title-block">
      <h2>Invoice</h2>
      <div class="inv-number">${inv.id}</div>
      <div class="inv-meta">
        <strong>Date</strong> ${formatDate(inv.invoiceDate)}<br>
        <strong>Due</strong> ${formatDate(inv.dueDate)}
      </div>
      <div class="inv-status" style="background:${statusColor}">${statusLabel}</div>
    </div>
  </div>

  <div class="inv-grid">
    <div>
      <div class="inv-section-title">Guest Information</div>
      <div class="inv-detail"><span class="label">Name</span><br><span class="value">${inv.guest.name}</span></div>
      <div class="inv-detail"><span class="label">Booking Reference</span><br><span class="value">${inv.bookingId || 'N/A'}</span></div>
    </div>
    <div>
      <div class="inv-section-title">Accommodation</div>
      <div class="inv-detail"><span class="label">Room</span><br><span class="value">${inv.room.type} - ${inv.room.number}</span></div>
      <div class="inv-detail"><span class="label">Period</span><br><span class="value">${formatDate(inv.checkIn)} → ${formatDate(inv.checkOut)} (${inv.nights} night${inv.nights !== 1 ? 's' : ''})</span></div>
      <div class="inv-detail"><span class="label">Payment Method</span><br><span class="value">${inv.paymentMethod}</span></div>
    </div>
  </div>

  <table class="charges-table">
    <thead>
      <tr><th>Description</th><th>Amount</th></tr>
    </thead>
    <tbody>
      <tr><td>Room Charges (${inv.nights} night${inv.nights !== 1 ? 's' : ''})</td><td>${formatCurrency(inv.charges.room)}</td></tr>
      ${inv.charges.extras > 0 ? `<tr><td>Extras / Additional Services</td><td>${formatCurrency(inv.charges.extras)}</td></tr>` : ''}
      <tr class="subtotal"><td>Subtotal</td><td>${formatCurrency(inv.charges.room + inv.charges.extras)}</td></tr>
      <tr><td>Tax (${inv.charges.taxRate}%)</td><td>${formatCurrency(inv.charges.tax)}</td></tr>
    </tbody>
    <tfoot>
      <tr><td>Total Amount</td><td>${formatCurrency(inv.charges.total)}</td></tr>
    </tfoot>
  </table>

  <div class="payment-box">
    <div class="payment-left">
      <div class="payment-label">Amount Paid</div>
      <div class="payment-value paid">${formatCurrency(inv.paid)}</div>
    </div>
    <div class="payment-right">
      <div class="payment-label">${inv.balance > 0 ? 'Balance Due' : 'Balance'}</div>
      <div class="payment-value ${inv.balance > 0 ? 'due' : ''}">${formatCurrency(inv.balance)}</div>
    </div>
  </div>

  <div class="inv-footer">
    <div class="terms">
      <strong>Terms & Conditions</strong><br>
      Payment is due by the date shown above. Late payments may incur additional charges.<br>
      For billing inquiries, please contact our front desk${hotelPhone ? ` at ${hotelPhone}` : ''}${hotelEmail ? ` or email ${hotelEmail}` : ''}.
    </div>
    <div class="thank-you">Thank you for choosing ${hotelName}. We hope you enjoyed your stay!</div>
  </div>
</div>
</body></html>`;
}

export default BillingView;
