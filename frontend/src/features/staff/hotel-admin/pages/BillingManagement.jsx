import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Clock,
  CheckCircle2,
  Printer,
  Download,
  Eye,
  FileText,
} from 'lucide-react';
import { toast } from 'react-toastify';
import {
  PageHeader,
  Button,
  IconButton,
  Badge,
  Table,
  THead,
  SortableTh,
  EmptyState,
  Pagination,
  SearchInput,
  Segmented,
  Modal,
} from '../components/ui';
import useDebouncedValue from '../hooks/useDebouncedValue';
import useTableControls from '../hooks/useTableControls';
import { exportToCsv } from '../utils/csv';

/* ============================================================================
 * ⚠️  MOCK DATA — [NEEDS BACKEND]
 * ----------------------------------------------------------------------------
 * The hotel-admin billing view has no read endpoint yet. Invoices,
 * transactions, and payment-method breakdowns below are placeholder data.
 * The guest-facing payment/wallet layer elsewhere in this codebase is real;
 * this specifically is the hotel-admin's own billing read model, which needs
 * a `GET /reception/billing/invoices` + `/transactions` + `/payment-methods`
 * endpoint (getInvoices/getBillingSummary already exist in reception.service
 * and can back the summary + invoice list once the shapes are finalised).
 *
 * Nothing here fabricates a persistence success path — export/print operate
 * only on the data actually shown, and there is no create/edit that pretends
 * to save.
 * ========================================================================== */
const MOCK_BILLING_STATS = {
  totalRevenue: 15050000,
  pendingPayments: 520000,
  successfulRate: 95,
};

const MOCK_INVOICES = [
  { id: 'INV-001', guest: 'Ethan Harper', amount: 45000, status: 'Paid', date: '2024-07-25', method: 'Card' },
  { id: 'INV-002', guest: 'Olivia Bennett', amount: 210000, status: 'Pending', date: '2024-07-24', method: 'Bank Transfer' },
  { id: 'INV-003', guest: 'Noah Carter', amount: 15000, status: 'Paid', date: '2024-07-23', method: 'Cash' },
  { id: 'INV-004', guest: 'Ava Foster', amount: 90000, status: 'Paid', date: '2024-07-22', method: 'Card' },
  { id: 'INV-005', guest: 'Liam Walker', amount: 7500, status: 'Overdue', date: '2024-07-21', method: 'Cash' },
  { id: 'INV-006', guest: 'Mason Scott', amount: 150000, status: 'Paid', date: '2024-07-20', method: 'Card' },
];

const MOCK_TRANSACTIONS = [
  { id: 'TRX-9876', type: 'Credit', amount: 45000, status: 'Success', date: '2024-07-25', ref: 'INV-001' },
  { id: 'TRX-5432', type: 'Debit', amount: 5000, status: 'Success', date: '2024-07-24', ref: 'RES-345' },
  { id: 'TRX-1098', type: 'Credit', amount: 15000, status: 'Success', date: '2024-07-23', ref: 'INV-003' },
  { id: 'TRX-7654', type: 'Credit', amount: 90000, status: 'Success', date: '2024-07-22', ref: 'INV-004' },
  { id: 'TRX-3210', type: 'Credit', amount: 100000, status: 'Failed', date: '2024-07-21', ref: 'BOOK-567' },
];

const MOCK_METHODS = [
  { method: 'Credit Card (Visa)', count: 120, revenue: 6500000 },
  { method: 'Cash', count: 50, revenue: 1500000 },
  { method: 'Bank Transfer', count: 20, revenue: 3000000 },
  { method: 'Online Payment', count: 35, revenue: 2050000 },
];

const rs = (n) => `Rs. ${Number(n || 0).toLocaleString('en-IN')}`;

const TABS = [
  { value: 'invoices', label: 'Invoices' },
  { value: 'transactions', label: 'Transactions' },
  { value: 'methods', label: 'Payment Methods' },
];

export default function BillingManagement() {
  const [tab, setTab] = useState('invoices');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 250);
  const [activeInvoice, setActiveInvoice] = useState(null);

  const filteredInvoices = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return MOCK_INVOICES;
    return MOCK_INVOICES.filter(
      (i) =>
        i.id.toLowerCase().includes(q) ||
        i.guest.toLowerCase().includes(q) ||
        i.method.toLowerCase().includes(q)
    );
  }, [debouncedSearch]);

  const {
    paged: pagedInvoices,
    page,
    setPage,
    pageSize,
    totalItems,
    sortKey,
    sortDir,
    toggleSort,
  } = useTableControls(filteredInvoices, {
    pageSize: 8,
    initialSortKey: 'date',
    initialSortDir: 'desc',
    accessors: { amount: (r) => r.amount, date: (r) => r.date },
  });

  const handleExportInvoices = () => {
    if (filteredInvoices.length === 0) {
      toast.info('No invoices to export.');
      return;
    }
    exportToCsv(
      'invoices.csv',
      ['Invoice ID', 'Guest', 'Amount (Rs.)', 'Status', 'Date', 'Method'],
      filteredInvoices.map((i) => [i.id, i.guest, i.amount, i.status, i.date, i.method])
    );
    toast.success(`Exported ${filteredInvoices.length} invoices to CSV.`);
  };

  const handlePrintInvoice = (invoice) => {
    const w = window.open('', '_blank');
    if (!w) {
      toast.error('Popup blocked. Allow popups to print the invoice.');
      return;
    }
    w.document.write(`
      <html><head><title>Invoice ${invoice.id}</title>
      <style>body{font-family:Inter,Arial,sans-serif;padding:32px;color:#111827}
      h1{font-size:20px}table{width:100%;border-collapse:collapse;margin-top:16px}
      td,th{padding:8px 12px;border:1px solid #e5e7eb;text-align:left}
      th{background:#f3f4f6}</style></head>
      <body><h1>Invoice ${invoice.id}</h1>
      <table><tbody>
      <tr><th>Guest</th><td>${invoice.guest}</td></tr>
      <tr><th>Amount</th><td>${rs(invoice.amount)}</td></tr>
      <tr><th>Status</th><td>${invoice.status}</td></tr>
      <tr><th>Date</th><td>${invoice.date}</td></tr>
      <tr><th>Method</th><td>${invoice.method}</td></tr>
      </tbody></table></body></html>`);
    w.document.close();
    setTimeout(() => {
      try { w.focus(); w.print(); } catch { /* ignore */ }
    }, 300);
  };

  return (
    <div className="ha-page">
      <PageHeader
        title="Billing & Payments"
        subtitle="Manage financial transactions and payment records."
        actions={
          tab === 'invoices' ? (
            <Button variant="secondary" onClick={handleExportInvoices}>
              <Download size={16} aria-hidden="true" /> Export CSV
            </Button>
          ) : null
        }
        toolbar={
          <>
            <Segmented options={TABS} value={tab} onChange={setTab} ariaLabel="Billing view" />
            {tab === 'invoices' && (
              <SearchInput
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search invoices…"
                ariaLabel="Search invoices"
              />
            )}
          </>
        }
      />

      {/* [NEEDS BACKEND] banner */}
      <div
        className="ha-card"
        style={{
          padding: '12px 16px',
          marginBottom: 20,
          display: 'flex',
          gap: 8,
          alignItems: 'center',
          color: 'var(--ha-text-subtle)',
          fontSize: 13,
        }}
        role="note"
      >
        <FileText size={16} aria-hidden="true" />
        Preview data — hotel-admin billing needs a dedicated read endpoint before these figures are live.
      </div>

      {/* KPI row */}
      <div className="ha-kpi-grid" style={{ marginBottom: 24, gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))' }}>
        <div className="ha-statcard">
          <div className="ha-statcard__top">
            <span className="ha-statcard__icon" style={{ background: 'var(--ha-success)' }}>
              <TrendingUp size={22} />
            </span>
          </div>
          <div className="ha-money-large" style={{ color: 'var(--ha-text)' }}>{rs(MOCK_BILLING_STATS.totalRevenue)}</div>
          <span className="ha-statcard__label">Total Revenue (YTD)</span>
        </div>
        <div className="ha-statcard">
          <div className="ha-statcard__top">
            <span className="ha-statcard__icon" style={{ background: 'var(--ha-warning)' }}>
              <Clock size={22} />
            </span>
          </div>
          <div className="ha-money-large" style={{ color: 'var(--ha-text)' }}>{rs(MOCK_BILLING_STATS.pendingPayments)}</div>
          <span className="ha-statcard__label">Pending Payments</span>
        </div>
        <div className="ha-statcard">
          <div className="ha-statcard__top">
            <span className="ha-statcard__icon" style={{ background: 'var(--ha-info)' }}>
              <CheckCircle2 size={22} />
            </span>
          </div>
          <div className="ha-statcard__value">{MOCK_BILLING_STATS.successfulRate}%</div>
          <span className="ha-statcard__label">Successful Payment Rate</span>
        </div>
      </div>

      {/* Invoices */}
      {tab === 'invoices' && (
        <>
          <Table minWidth={680}>
            <THead>
              <SortableTh sortKey="id" activeKey={sortKey} dir={sortDir} onSort={toggleSort}>Invoice ID</SortableTh>
              <SortableTh sortKey="guest" activeKey={sortKey} dir={sortDir} onSort={toggleSort}>Guest</SortableTh>
              <SortableTh sortKey="amount" activeKey={sortKey} dir={sortDir} onSort={toggleSort}>Amount</SortableTh>
              <th scope="col">Status</th>
              <SortableTh sortKey="date" activeKey={sortKey} dir={sortDir} onSort={toggleSort}>Date</SortableTh>
              <th scope="col">Method</th>
              <th scope="col">Actions</th>
            </THead>
            <tbody>
              {pagedInvoices.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <EmptyState
                      title={debouncedSearch ? 'No matching invoices' : 'No invoices yet'}
                      description={debouncedSearch ? 'Try a different search term.' : 'Invoices will appear here once billing is wired to a backend.'}
                    />
                  </td>
                </tr>
              ) : (
                pagedInvoices.map((inv) => (
                  <tr key={inv.id}>
                    <td><span className="ha-body-strong" style={{ color: 'var(--ha-primary)' }}>{inv.id}</span></td>
                    <td>{inv.guest}</td>
                    <td className="ha-money haNum">{rs(inv.amount)}</td>
                    <td><Badge status={inv.status} /></td>
                    <td className="haNum">{inv.date}</td>
                    <td>{inv.method}</td>
                    <td>
                      <div className="ha-table__row-actions">
                        <IconButton aria-label={`View invoice ${inv.id}`} onClick={() => setActiveInvoice(inv)}>
                          <Eye size={16} aria-hidden="true" />
                        </IconButton>
                        <IconButton aria-label={`Print invoice ${inv.id}`} onClick={() => handlePrintInvoice(inv)}>
                          <Printer size={16} aria-hidden="true" />
                        </IconButton>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
          <Pagination
            page={page}
            pageSize={pageSize}
            totalItems={totalItems}
            onPageChange={setPage}
            itemLabel="invoices"
          />
        </>
      )}

      {/* Transactions */}
      {tab === 'transactions' && (
        <Table minWidth={640}>
          <THead>
            <th scope="col">Transaction ID</th>
            <th scope="col">Type</th>
            <th scope="col">Amount</th>
            <th scope="col">Status</th>
            <th scope="col">Date</th>
            <th scope="col">Reference</th>
          </THead>
          <tbody>
            {MOCK_TRANSACTIONS.map((t) => (
              <tr key={t.id}>
                <td><span className="ha-body-strong">{t.id}</span></td>
                <td>{t.type}</td>
                <td className="ha-money haNum">{rs(t.amount)}</td>
                <td><Badge status={t.status === 'Success' ? 'Paid' : t.status} tone={t.status === 'Success' ? 'success' : 'danger'}>{t.status}</Badge></td>
                <td className="haNum">{t.date}</td>
                <td>{t.ref}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {/* Payment methods */}
      {tab === 'methods' && (
        <Table minWidth={520}>
          <THead>
            <th scope="col">Method</th>
            <th scope="col">Transactions</th>
            <th scope="col">Total Revenue</th>
          </THead>
          <tbody>
            {MOCK_METHODS.map((m) => (
              <tr key={m.method}>
                <td><span className="ha-body-strong">{m.method}</span></td>
                <td className="haNum">{m.count}</td>
                <td className="ha-money haNum">{rs(m.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {/* Invoice detail modal */}
      <Modal
        isOpen={!!activeInvoice}
        onClose={() => setActiveInvoice(null)}
        title={activeInvoice ? `Invoice ${activeInvoice.id}` : ''}
        footer={
          activeInvoice && (
            <>
              <Button variant="secondary" onClick={() => handlePrintInvoice(activeInvoice)}>
                <Printer size={16} aria-hidden="true" /> Print
              </Button>
              <Button variant="primary" onClick={() => setActiveInvoice(null)}>Close</Button>
            </>
          )
        }
      >
        {activeInvoice && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <p className="ha-field__label">Guest</p>
              <p className="ha-body-strong">{activeInvoice.guest}</p>
            </div>
            <div>
              <p className="ha-field__label">Amount</p>
              <p className="ha-money-large haNum">{rs(activeInvoice.amount)}</p>
            </div>
            <div>
              <p className="ha-field__label">Status</p>
              <Badge status={activeInvoice.status} />
            </div>
            <div>
              <p className="ha-field__label">Date</p>
              <p className="ha-body-strong haNum">{activeInvoice.date}</p>
            </div>
            <div>
              <p className="ha-field__label">Method</p>
              <p className="ha-body-strong">{activeInvoice.method}</p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
