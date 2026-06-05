import React, { useState, useEffect, useCallback } from 'react';
import SuperAdminLayout from './SuperAdminLayout';
import { toast } from 'react-toastify';
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
import './Finance.css';

const formatNRS = (amount) => `NRS ${Number(amount || 0).toLocaleString('en-NP')}`;

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
      toast.error('Failed to load finance data');
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  const loadPayoutsData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getPayouts({ page: 1, limit: 20 });
      setPayouts(result.data || []);
    } catch {
      toast.error('Failed to load payouts');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadRefundsData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getRefunds({ page: 1, limit: 20 });
      setRefunds(result.data || []);
    } catch {
      toast.error('Failed to load refunds');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCommissionsData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getCommissionRules();
      setCommissionRules(result.data || []);
    } catch {
      toast.error('Failed to load commission rules');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadReportData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getFinancialReport(dateParams);
      setReportData(result.data || []);
    } catch {
      toast.error('Failed to load report');
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
    } catch {
      toast.error('Failed to seed data. Run superadmin-data seed first.');
    } finally {
      setSeeding(false);
    }
  };

  const handleUpdatePayoutStatus = async (id, status) => {
    try {
      await updatePayoutStatus(id, { status });
      toast.success('Payout status updated');
      loadPayoutsData();
    } catch {
      toast.error('Failed to update payout status');
    }
  };

  const handleUpdateRefundStatus = async (id, status) => {
    try {
      await updateRefundStatus(id, { status });
      toast.success('Refund status updated');
      loadRefundsData();
    } catch {
      toast.error('Failed to update refund status');
    }
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
    } catch {
      toast.error('Failed to export report');
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
    } catch {
      toast.error('Failed to delete commission rule');
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
                              <td className="fin-hotel-name">{hotel.hotelName}</td>
                              <td>{hotel.bookingCount}</td>
                              <td>{formatNRS(hotel.grossRevenue)}</td>
                              <td className="fin-commission">{formatNRS(hotel.commission)}</td>
                              <td className="fin-payout">{formatNRS(hotel.netPayout)}</td>
                              <td>{formatNRS(hotel.avgBookingValue)}</td>
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
                              <td className="fin-hotel-name">{payout.hotel?.name || 'N/A'}</td>
                              <td>
                                {new Date(payout.period.from).toLocaleDateString()} – {new Date(payout.period.to).toLocaleDateString()}
                              </td>
                              <td>{formatNRS(payout.grossRevenue)}</td>
                              <td>{formatNRS(payout.platformCommission)}</td>
                              <td className="fin-payout">{formatNRS(payout.netPayout)}</td>
                              <td><span className={`status-badge status-${payout.status}`}>{payout.status}</span></td>
                              <td>{payout.scheduledFor ? new Date(payout.scheduledFor).toLocaleDateString() : '—'}</td>
                              <td className="fin-actions">
                                {payout.status === 'pending' && (
                                  <button className="btn-small btn-primary" onClick={() => handleUpdatePayoutStatus(payout._id, 'processing')}>Process</button>
                                )}
                                {payout.status === 'processing' && (
                                  <button className="btn-small btn-success" onClick={() => handleUpdatePayoutStatus(payout._id, 'completed')}>Complete</button>
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
                              <td>{refund.booking?.bookingId || 'N/A'}</td>
                              <td>{refund.hotel?.name || 'N/A'}</td>
                              <td>{refund.guest?.fullname || 'N/A'}</td>
                              <td className="fin-refund-amt">{formatNRS(refund.amount)}</td>
                              <td>{refund.reason?.replace('_', ' ')}</td>
                              <td><span className={`status-badge status-${refund.status}`}>{refund.status}</span></td>
                              <td>{new Date(refund.requestedAt).toLocaleDateString()}</td>
                              <td className="fin-actions">
                                {refund.status === 'requested' && (
                                  <>
                                    <button className="btn-small btn-success" onClick={() => handleUpdateRefundStatus(refund._id, 'approved')}>Approve</button>
                                    <button className="btn-small btn-danger" onClick={() => handleUpdateRefundStatus(refund._id, 'rejected')}>Reject</button>
                                  </>
                                )}
                                {refund.status === 'approved' && (
                                  <button className="btn-small btn-primary" onClick={() => handleUpdateRefundStatus(refund._id, 'processed')}>Process</button>
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
                              <td><span className="fin-scope-badge">{rule.scope}</span></td>
                              <td>{rule.hotel?.name || 'Global'}</td>
                              <td>{rule.roomType || 'All'}</td>
                              <td className="fin-commission">{rule.rate}%</td>
                              <td>{formatNRS(rule.flatFee)}</td>
                              <td>{rule.validFrom ? new Date(rule.validFrom).toLocaleDateString() : '—'}</td>
                              <td>{rule.priority}</td>
                              <td><span className={`status-badge status-${rule.isActive ? 'active' : 'inactive'}`}>{rule.isActive ? 'Active' : 'Inactive'}</span></td>
                              <td>
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
                              <td>{new Date(row.date).toLocaleDateString()}</td>
                              <td>{row.bookings}</td>
                              <td>{formatNRS(row.revenue)}</td>
                              <td>{formatNRS(row.commission)}</td>
                              <td className="fin-payout">{formatNRS(row.payouts)}</td>
                              <td className="fin-refund-amt">{formatNRS(row.refunds)}</td>
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
      </div>
    </SuperAdminLayout>
  );
};

export default Finance;
