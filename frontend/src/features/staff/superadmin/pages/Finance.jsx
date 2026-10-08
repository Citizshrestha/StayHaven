import React, { useState, useEffect, useCallback } from 'react';
import SuperAdminLayout from './SuperAdminLayout';
import { toast } from 'react-toastify';
import { apiError } from '../utils/apiError';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import {
  getFinanceOverview,
  getRevenueSummary,
  getRevenueByHotel,
  getRevenueBreakdown,
  getPaymentMethodMix,
  getPayouts,
  updatePayoutStatus,
  getRefunds,
  updateRefundStatus,
  getCommissionRules,
  deleteCommissionRule,
  getFinancialReport,
  seedFinanceData,
} from '../../../../core/api/services/finance.service';
import { formatRs, formatDayKey } from '../utils/format';
import './Finance.css';

const formatNRS = formatRs;

// Irreversible money steps get a confirmation with the consequence spelled out.
const CONFIRM_COPY = {
  'payout:completed': { title: 'Mark payout as paid?', confirmText: 'Mark as paid', icon: 'task_alt', warning: 'Only do this after the bank transfer has gone out. A completed payout cannot be reopened.' },
  'refund:rejected': { title: 'Reject this refund?', confirmText: 'Reject refund', icon: 'block', warning: 'The guest will not be refunded. A rejected refund cannot be reopened; a new request would be needed.' },
  'refund:processed': { title: 'Mark refund as processed?', confirmText: 'Mark processed', icon: 'task_alt', warning: 'Only do this after the money has been returned to the guest through the gateway.' },
};

const METHOD_LABELS = {
  khalti: 'Khalti',
  esewa: 'eSewa',
  card: 'Card',
  'bank-transfer': 'Bank Transfer',
  cash: 'Cash',
  online: 'Online',
};

const Finance = () => {
  const [activeTab, setActiveTab] = useState('revenue');
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [dateRange, setDateRange] = useState('30d');

  const [overview, setOverview] = useState(null);
  const [revenueSummary, setRevenueSummary] = useState(null);
  const [revenueByHotel, setRevenueByHotel] = useState([]);
  const [channelBreakdown, setChannelBreakdown] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [refunds, setRefunds] = useState([]);
  const [commissionRules, setCommissionRules] = useState([]);
  const [reportData, setReportData] = useState([]);

  const [deleteCommissionTarget, setDeleteCommissionTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [busyId, setBusyId] = useState(null); // payout/refund id with a request in flight
  const [confirmAction, setConfirmAction] = useState(null); // { kind, id, status, name }

  const dateParams = { dateRange };

  const loadRevenueData = useCallback(async () => {
    setLoading(true);
    try {
      const [overviewRes, summaryRes, byHotelRes, breakdownRes, methodsRes] = await Promise.all([
        getFinanceOverview(dateParams),
        getRevenueSummary(dateParams),
        getRevenueByHotel({ ...dateParams, page: 1, limit: 10 }),
        getRevenueBreakdown({ ...dateParams, groupBy: 'channel' }),
        getPaymentMethodMix(dateParams),
      ]);
      setOverview(overviewRes.data);
      setRevenueSummary(summaryRes.data);
      setRevenueByHotel(byHotelRes.data || []);
      setChannelBreakdown(breakdownRes.data || []);
      setPaymentMethods(methodsRes.data || []);
    } catch (error) {
      toast.error(apiError(error, 'Failed to load finance data'));
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  const loadPayoutsData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getPayouts({ page: 1, limit: 20 });
      setPayouts(result.data || []);
    } catch (error) {
      toast.error(apiError(error, 'Failed to load payouts'));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadRefundsData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getRefunds({ page: 1, limit: 20 });
      setRefunds(result.data || []);
    } catch (error) {
      toast.error(apiError(error, 'Failed to load refunds'));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCommissionsData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getCommissionRules();
      setCommissionRules(result.data || []);
    } catch (error) {
      toast.error(apiError(error, 'Failed to load commission rules'));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadReportData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getFinancialReport(dateParams);
      setReportData(result.data || []);
    } catch (error) {
      toast.error(apiError(error, 'Failed to load report'));
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    if (activeTab === 'revenue') loadRevenueData();
    else if (activeTab === 'payouts') loadPayoutsData();
    else if (activeTab === 'refunds') loadRefundsData();
    else if (activeTab === 'commissions') loadCommissionsData();
    else if (activeTab === 'reports') loadReportData();
  }, [activeTab, dateRange, loadRevenueData, loadPayoutsData, loadRefundsData, loadCommissionsData, loadReportData]);

  const handleSeedData = async () => {
    setSeeding(true);
    try {
      await seedFinanceData();
      toast.success('Finance demo data seeded');
      if (activeTab === 'revenue') loadRevenueData();
      else if (activeTab === 'payouts') loadPayoutsData();
      else if (activeTab === 'refunds') loadRefundsData();
      else if (activeTab === 'commissions') loadCommissionsData();
      else loadReportData();
    } catch (error) {
      toast.error(apiError(error, 'Failed to seed data. Run superadmin-data seed first.'));
    } finally {
      setSeeding(false);
    }
  };

  // One request per row at a time: a double-click can't send two transitions.
  const handleUpdatePayoutStatus = async (id, status) => {
    if (busyId) return;
    setBusyId(id);
    try {
      await updatePayoutStatus(id, { status });
      toast.success('Payout status updated');
      loadPayoutsData();
    } catch (error) {
      toast.error(apiError(error, 'Failed to update payout status'));
      if (error?.response?.status === 409) loadPayoutsData();
    } finally {
      setBusyId(null);
    }
  };

  const handleUpdateRefundStatus = async (id, status) => {
    if (busyId) return;
    setBusyId(id);
    try {
      await updateRefundStatus(id, { status });
      toast.success('Refund status updated');
      loadRefundsData();
    } catch (error) {
      toast.error(apiError(error, 'Failed to update refund status'));
      if (error?.response?.status === 409) loadRefundsData();
    } finally {
      setBusyId(null);
    }
  };

  const runConfirmedAction = async () => {
    if (!confirmAction) return;
    const { kind, id, status } = confirmAction;
    if (kind === 'payout') await handleUpdatePayoutStatus(id, status);
    else await handleUpdateRefundStatus(id, status);
    setConfirmAction(null);
  };

  const exportReport = async () => {
    try {
      const result = await getFinancialReport({ ...dateParams, format: 'csv' });
      const blob = new Blob([result], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `financial-report-${Date.now()}.csv`;
      a.click();
      toast.success('Report exported');
    } catch (error) {
      toast.error(apiError(error, 'Failed to export report'));
    }
  };

  const handleDeleteCommission = async () => {
    if (!deleteCommissionTarget) return;
    setIsDeleting(true);
    try {
      await deleteCommissionRule(deleteCommissionTarget.id);
      toast.success('Commission rule deleted');
      setDeleteCommissionTarget(null);
      loadCommissionsData();
    } catch (error) {
      toast.error(apiError(error, 'Failed to delete commission rule'));
    } finally {
      setIsDeleting(false);
    }
  };

  const isEmpty =
    activeTab === 'revenue' &&
    !loading &&
    overview &&
    overview.kpis?.pendingPayouts?.count === 0 &&
    revenueByHotel.length === 0 &&
    paymentMethods.length === 0;

  const maxDailyRevenue = Math.max(...(revenueSummary?.byDay?.map((d) => d.revenue) || [1]), 1);
  const waterfall = overview?.waterfall;

  return (
    <SuperAdminLayout pageTitle="Finance Management">
      <div className="finance-page">
        <div className="finance-header">
          <div className="tab-navigation">
            {['revenue', 'payouts', 'refunds', 'commissions', 'reports'].map((tab) => (
              <button
                key={tab}
                className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          <div className="finance-header-actions">
            <div className="date-range-picker">
              <span className="material-symbols-outlined">calendar_month</span>
              <select value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
              </select>
            </div>
            <button className="btn-seed" onClick={handleSeedData} disabled={seeding}>
              <span className="material-symbols-outlined">database</span>
              {seeding ? 'Seeding...' : 'Seed Demo Data'}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="fin-loading">
            <div className="fin-spinner" />
            <p>Loading finance data...</p>
          </div>
        ) : (
          <>
            {activeTab === 'revenue' && overview && (
              <div className="revenue-tab">
                {isEmpty && (
                  <div className="fin-empty-banner">
                    <span className="material-symbols-outlined">info</span>
                    <p>No finance records yet. Click <strong>Seed Demo Data</strong> to populate settlements, refunds, and payment analytics.</p>
                  </div>
                )}

                {/* Operational KPIs — unique to Finance */}
                <div className="fin-kpi-grid">
                  <div className="fin-kpi-card accent-amber">
                    <div className="fin-kpi-icon"><span className="material-symbols-outlined">schedule</span></div>
                    <div>
                      <p className="fin-kpi-label">Pending Payouts</p>
                      <h3 className="fin-kpi-value">{formatNRS(overview.kpis.pendingPayouts.amount)}</h3>
                      <span className="fin-kpi-meta">{overview.kpis.pendingPayouts.count} awaiting settlement</span>
                    </div>
                  </div>
                  <div className="fin-kpi-card accent-rose">
                    <div className="fin-kpi-icon"><span className="material-symbols-outlined">undo</span></div>
                    <div>
                      <p className="fin-kpi-label">Outstanding Refunds</p>
                      <h3 className="fin-kpi-value">{formatNRS(overview.kpis.outstandingRefunds.amount)}</h3>
                      <span className="fin-kpi-meta">{overview.kpis.outstandingRefunds.count} in pipeline</span>
                    </div>
                  </div>
                  <div className="fin-kpi-card accent-red">
                    <div className="fin-kpi-icon"><span className="material-symbols-outlined">error</span></div>
                    <div>
                      <p className="fin-kpi-label">Failed Payments</p>
                      <h3 className="fin-kpi-value">{formatNRS(overview.kpis.failedPayments.amount)}</h3>
                      <span className="fin-kpi-meta">{overview.kpis.failedPayments.count} transactions</span>
                    </div>
                  </div>
                  <div className="fin-kpi-card accent-teal">
                    <div className="fin-kpi-icon"><span className="material-symbols-outlined">receipt_long</span></div>
                    <div>
                      <p className="fin-kpi-label">Taxes Collected</p>
                      <h3 className="fin-kpi-value">{formatNRS(overview.kpis.taxesCollected)}</h3>
                      <span className="fin-kpi-meta">Platform tax liability</span>
                    </div>
                  </div>
                </div>

                {/* Settlement waterfall */}
                {waterfall && (
                  <div className="fin-panel fin-waterfall-panel">
                    <div className="fin-panel-header">
                      <h3>Settlement Waterfall</h3>
                      <p>Gross booking revenue split for the selected period</p>
                    </div>
                    <div className="fin-waterfall">
                      {[
                        { label: 'Gross Revenue', value: waterfall.grossRevenue, color: '#3b82f6', pct: 100 },
                        { label: 'Platform Commission', value: waterfall.platformCommission, color: '#8b5cf6', pct: waterfall.grossRevenue ? (waterfall.platformCommission / waterfall.grossRevenue) * 100 : 0 },
                        { label: 'Taxes', value: waterfall.taxes, color: '#f59e0b', pct: waterfall.grossRevenue ? (waterfall.taxes / waterfall.grossRevenue) * 100 : 0 },
                        { label: 'Net Hotel Payout', value: waterfall.netHotelPayout, color: '#00bfa6', pct: waterfall.grossRevenue ? (waterfall.netHotelPayout / waterfall.grossRevenue) * 100 : 0 },
                      ].map((step) => (
                        <div key={step.label} className="fin-waterfall-step">
                          <div className="fin-waterfall-label">
                            <span>{step.label}</span>
                            <strong>{formatNRS(step.value)}</strong>
                          </div>
                          <div className="fin-waterfall-track">
                            <div className="fin-waterfall-bar" style={{ width: `${Math.max(step.pct, 4)}%`, background: step.color }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="fin-two-col">
                  {/* Daily revenue chart */}
                  {revenueSummary?.byDay?.length > 0 && (
                    <div className="fin-panel">
                      <div className="fin-panel-header">
                        <h3>Daily Settlement Volume</h3>
                        <p>Paid bookings per day</p>
                      </div>
                      <div className="fin-bar-chart">
                        {revenueSummary.byDay.slice(-14).map((day) => (
                          <div key={day.date} className="fin-bar-col" title={`${day.date}: ${formatNRS(day.revenue)}`}>
                            <div
                              className="fin-bar"
                              style={{ height: `${(day.revenue / maxDailyRevenue) * 100}%` }}
                            />
                            <span className="fin-bar-label">{new Date(day.date).getDate()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Channel breakdown */}
                  {channelBreakdown.length > 0 && (
                    <div className="fin-panel">
                      <div className="fin-panel-header">
                        <h3>Revenue by Channel</h3>
                        <p>Booking source distribution</p>
                      </div>
                      <div className="fin-breakdown-list">
                        {channelBreakdown.map((item) => (
                          <div key={item.label} className="fin-breakdown-item">
                            <div className="fin-breakdown-top">
                              <span className="fin-breakdown-label">{item.label || 'Direct'}</span>
                              <span className="fin-breakdown-val">{formatNRS(item.revenue)} · {item.percentage}%</span>
                            </div>
                            <div className="fin-breakdown-track">
                              <div className="fin-breakdown-bar" style={{ width: `${item.percentage}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Payment methods */}
                {paymentMethods.length > 0 && (
                  <div className="fin-panel">
                    <div className="fin-panel-header">
                      <h3>Payment Method Performance</h3>
                      <p>Gateway volume, success rate & failures</p>
                    </div>
                    <div className="fin-payment-grid">
                      {paymentMethods.map((method) => (
                        <div key={method.method} className="fin-payment-card">
                          <div className="fin-payment-icon">
                            <span className="material-symbols-outlined">account_balance_wallet</span>
                          </div>
                          <h4>{METHOD_LABELS[method.method] || method.method}</h4>
                          <p className="fin-payment-amount">{formatNRS(method.amount)}</p>
                          <p className="fin-payment-meta">{method.count} transactions</p>
                          <div className={`fin-success-rate ${method.successRate >= 90 ? 'good' : method.successRate >= 70 ? 'warn' : 'bad'}`}>
                            {method.successRate}% success
                          </div>
                          {method.failedAmount > 0 && (
                            <p className="fin-payment-failed">{formatNRS(method.failedAmount)} failed</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Hotel ledger */}
                <div className="fin-panel">
                  <div className="fin-panel-header">
                    <h3>Hotel Settlement Ledger</h3>
                    <p>Per-property gross, commission & net payout</p>
                  </div>
                  {revenueByHotel.length === 0 ? (
                    <p className="fin-table-empty">No hotel settlement data for this period.</p>
                  ) : (
                    <div className="fin-table-wrap">
                      <table className="fin-table">
                        <thead>
                          <tr>
                            <th>Hotel</th>
                            <th>Bookings</th>
                            <th>Gross Revenue</th>
                            <th>Commission</th>
                            <th>Net Payout</th>
                            <th>Avg Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          {revenueByHotel.map((hotel) => (
                            <tr key={hotel.hotelId}>
                              <td className="fin-hotel-name" data-label="Hotel">{hotel.hotelName}</td>
                              <td className="fin-num" data-label="Bookings">{hotel.bookingCount}</td>
                              <td className="fin-num" data-label="Gross revenue">{formatNRS(hotel.grossRevenue)}</td>
                              <td className="fin-num fin-commission" data-label="Commission">{formatNRS(hotel.commission)}</td>
                              <td className="fin-num fin-payout" data-label="Net payout">{formatNRS(hotel.netPayout)}</td>
                              <td className="fin-num" data-label="Avg value">{formatNRS(hotel.avgBookingValue)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'payouts' && (
              <div className="payouts-tab">
                <div className="fin-panel">
                  <div className="fin-panel-header">
                    <h3>Payout Pipeline</h3>
                    <p>Schedule, process and complete hotel settlements</p>
                  </div>
                  {payouts.length === 0 ? (
                    <p className="fin-table-empty">No payouts yet. Seed demo data to get started.</p>
                  ) : (
                    <div className="fin-table-wrap">
                      <table className="fin-table">
                        <thead>
                          <tr>
                            <th>Hotel</th>
                            <th>Period</th>
                            <th>Gross</th>
                            <th>Commission</th>
                            <th>Net Payout</th>
                            <th>Status</th>
                            <th>Scheduled</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {payouts.map((payout) => (
                            <tr key={payout._id}>
                              <td className="fin-hotel-name" data-label="Hotel">{payout.hotel?.name || 'N/A'}</td>
                              <td data-label="Period">
                                {new Date(payout.period.from).toLocaleDateString()} – {new Date(payout.period.to).toLocaleDateString()}
                              </td>
                              <td className="fin-num" data-label="Gross">{formatNRS(payout.grossRevenue)}</td>
                              <td className="fin-num" data-label="Commission">{formatNRS(payout.platformCommission)}</td>
                              <td className="fin-num fin-payout" data-label="Net payout">{formatNRS(payout.netPayout)}</td>
                              <td data-label="Status"><span className={`status-badge status-${payout.status}`}>{payout.status}</span></td>
                              <td data-label="Scheduled">{payout.scheduledFor ? new Date(payout.scheduledFor).toLocaleDateString() : '—'}</td>
                              <td className="fin-actions" data-label="Actions">
                                {payout.status === 'pending' && (
                                  <button type="button" className="btn-small btn-primary" disabled={busyId === payout._id} onClick={() => handleUpdatePayoutStatus(payout._id, 'processing')}>
                                    {busyId === payout._id ? 'Saving…' : 'Process'}
                                  </button>
                                )}
                                {payout.status === 'processing' && (
                                  <button type="button" className="btn-small btn-success" disabled={busyId === payout._id}
                                    onClick={() => setConfirmAction({ kind: 'payout', id: payout._id, status: 'completed', name: `${payout.hotel?.name || 'Hotel'} · ${formatNRS(payout.netPayout)}` })}>
                                    Complete
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'refunds' && (
              <div className="refunds-tab">
                <div className="fin-panel">
                  <div className="fin-panel-header">
                    <h3>Refund Operations</h3>
                    <p>Review, approve and process guest refunds</p>
                  </div>
                  {refunds.length === 0 ? (
                    <p className="fin-table-empty">No refunds yet. Seed demo data to get started.</p>
                  ) : (
                    <div className="fin-table-wrap">
                      <table className="fin-table">
                        <thead>
                          <tr>
                            <th>Booking</th>
                            <th>Hotel</th>
                            <th>Guest</th>
                            <th>Amount</th>
                            <th>Reason</th>
                            <th>Status</th>
                            <th>Requested</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {refunds.map((refund) => (
                            <tr key={refund._id}>
                              <td data-label="Booking">{refund.booking?.bookingId || 'N/A'}</td>
                              <td data-label="Hotel">{refund.hotel?.name || 'N/A'}</td>
                              <td data-label="Guest">{refund.guest?.fullname || 'N/A'}</td>
                              <td className="fin-num fin-refund-amt" data-label="Amount">{formatNRS(refund.amount)}</td>
                              <td data-label="Reason">{refund.reason?.replaceAll('_', ' ')}</td>
                              <td data-label="Status"><span className={`status-badge status-${refund.status}`}>{refund.status?.replaceAll('_', ' ')}</span></td>
                              <td data-label="Requested">{new Date(refund.requestedAt).toLocaleDateString()}</td>
                              <td className="fin-actions" data-label="Actions">
                                {['requested', 'under_review'].includes(refund.status) && (
                                  <>
                                    <button type="button" className="btn-small btn-success" disabled={busyId === refund._id} onClick={() => handleUpdateRefundStatus(refund._id, 'approved')}>
                                      {busyId === refund._id ? 'Saving…' : 'Approve'}
                                    </button>
                                    <button type="button" className="btn-small btn-danger" disabled={busyId === refund._id}
                                      onClick={() => setConfirmAction({ kind: 'refund', id: refund._id, status: 'rejected', name: `${refund.booking?.bookingId || 'Refund'} · ${formatNRS(refund.amount)}` })}>
                                      Reject
                                    </button>
                                  </>
                                )}
                                {refund.status === 'approved' && (
                                  <button type="button" className="btn-small btn-primary" disabled={busyId === refund._id}
                                    onClick={() => setConfirmAction({ kind: 'refund', id: refund._id, status: 'processed', name: `${refund.booking?.bookingId || 'Refund'} · ${formatNRS(refund.amount)}` })}>
                                    Process
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'commissions' && (
              <div className="commissions-tab">
                <div className="fin-panel">
                  <div className="fin-panel-header">
                    <h3>Commission Rules Engine</h3>
                    <p>Manage platform fee rules — not shown on Dashboard</p>
                  </div>
                  {commissionRules.length === 0 ? (
                    <p className="fin-table-empty">No commission rules. Seed demo data to get started.</p>
                  ) : (
                    <div className="fin-table-wrap">
                      <table className="fin-table">
                        <thead>
                          <tr>
                            <th>Scope</th>
                            <th>Hotel</th>
                            <th>Room Type</th>
                            <th>Rate</th>
                            <th>Flat Fee</th>
                            <th>Valid From</th>
                            <th>Priority</th>
                            <th>Status</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {commissionRules.map((rule) => (
                            <tr key={rule._id}>
                              <td data-label="Scope"><span className="fin-scope-badge">{rule.scope}</span></td>
                              <td data-label="Hotel">{rule.hotel?.name || 'Global'}</td>
                              <td data-label="Room type">{rule.roomType || 'All'}</td>
                              <td className="fin-num fin-commission" data-label="Rate">{rule.rate}%</td>
                              <td className="fin-num" data-label="Flat fee">{formatNRS(rule.flatFee)}</td>
                              <td data-label="Valid from">{rule.validFrom ? new Date(rule.validFrom).toLocaleDateString() : '—'}</td>
                              <td className="fin-num" data-label="Priority">{rule.priority}</td>
                              <td data-label="Status"><span className={`status-badge status-${rule.isActive ? 'active' : 'inactive'}`}>{rule.isActive ? 'Active' : 'Inactive'}</span></td>
                              <td className="fin-actions" data-label="Actions">
                                <button className="btn-small btn-danger" onClick={() => setDeleteCommissionTarget({ id: rule._id, name: `${rule.scope} - ${rule.rate}%` })}>Delete</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'reports' && (
              <div className="reports-tab">
                <div className="fin-panel">
                  <div className="fin-panel-header fin-panel-header-row">
                    <div>
                      <h3>Financial Settlement Report</h3>
                      <p>Daily ledger for audit & export</p>
                    </div>
                    <div className="reports-actions">
                      <button className="btn-primary" onClick={exportReport}>
                        <span className="material-symbols-outlined">download</span>
                        Export CSV
                      </button>
                    </div>
                  </div>
                  {reportData.length === 0 ? (
                    <p className="fin-table-empty">No report data for this period.</p>
                  ) : (
                    <div className="fin-table-wrap">
                      <table className="fin-table">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Bookings</th>
                            <th>Revenue</th>
                            <th>Commission</th>
                            <th>Payouts</th>
                            <th>Refunds</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reportData.map((row) => (
                            <tr key={row.date}>
                              <td data-label="Date">{formatDayKey(row.date)}</td>
                              <td className="fin-num" data-label="Bookings">{row.bookings}</td>
                              <td className="fin-num" data-label="Revenue">{formatNRS(row.revenue)}</td>
                              <td className="fin-num" data-label="Commission">{formatNRS(row.commission)}</td>
                              <td className="fin-num fin-payout" data-label="Payouts">{formatNRS(row.payouts)}</td>
                              <td className="fin-num fin-refund-amt" data-label="Refunds">{formatNRS(row.refunds)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        <DeleteConfirmModal
          isOpen={!!deleteCommissionTarget}
          onClose={() => setDeleteCommissionTarget(null)}
          onConfirm={handleDeleteCommission}
          title="Delete Commission Rule"
          message="This will permanently remove this commission rule."
          itemName={deleteCommissionTarget?.name}
          confirmText="Delete Rule"
          isDeleting={isDeleting}
        />

        <DeleteConfirmModal
          isOpen={!!confirmAction}
          onClose={() => { if (!busyId) setConfirmAction(null); }}
          onConfirm={runConfirmedAction}
          title={CONFIRM_COPY[`${confirmAction?.kind}:${confirmAction?.status}`]?.title}
          message="Please confirm this step."
          itemName={confirmAction?.name}
          confirmText={CONFIRM_COPY[`${confirmAction?.kind}:${confirmAction?.status}`]?.confirmText}
          confirmIcon={CONFIRM_COPY[`${confirmAction?.kind}:${confirmAction?.status}`]?.icon}
          warningText={CONFIRM_COPY[`${confirmAction?.kind}:${confirmAction?.status}`]?.warning}
          busyText="Saving..."
          isDeleting={!!busyId}
        />
      </div>
    </SuperAdminLayout>
  );
};

export default Finance;
