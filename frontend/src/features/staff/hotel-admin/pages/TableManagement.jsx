import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'react-toastify';
import {
  UtensilsCrossed,
  QrCode,
  Users,
  CheckCircle2,
  RefreshCw,
  Plus,
  Rows3,
  Pencil,
  Trash2,
  Download,
  Printer,
  RotateCcw,
  Smartphone,
  Power,
  Copy,
  Building2,
} from 'lucide-react';
import {
  getTables, createTable, updateTable, deleteTable,
  generateTableQR, updateTableStatus, batchCreateTables,
} from '../services/tableApi';
import useHotelId from '../hooks/useHotelId';
import useStaffRole, { TABLE_DELETE_ROLES } from '../hooks/useStaffRole';
import ConfirmDialog from '../components/ui/ConfirmModal';
import {
  PageHeader,
  Button,
  IconButton,
  Input,
  Select,
  Textarea,
  Badge,
  StatCard,
  StatCardSkeleton,
  SearchInput,
  FilterTabs,
  EmptyState,
  ErrorState,
  Table,
  THead,
  TableSkeleton,
  Modal,
} from '../components/ui';
import useDebouncedValue from '../hooks/useDebouncedValue';
import { downloadQrImage, printQrSheet } from '../utils/qr';
import '../styles/hotel-admin-tokens.css';

const LOC_OPTS = [
  { value: 'indoor', label: 'Indoor' },
  { value: 'outdoor', label: 'Outdoor' },
  { value: 'terrace', label: 'Terrace' },
  { value: 'rooftop', label: 'Rooftop' },
  { value: 'private', label: 'Private' },
  { value: 'bar', label: 'Bar' },
];

const STATUS_META = {
  available: { label: 'Available', tone: 'success' },
  occupied: { label: 'Occupied', tone: 'warning' },
  reserved: { label: 'Reserved', tone: 'info' },
  maintenance: { label: 'Maintenance', tone: 'danger' },
};

// Numbers stay strings in the form until submit (no "05"/0 coercion).
const EMPTY_FORM = { tableNumber: '', tableName: '', capacity: '4', location: 'indoor', description: '', minSpend: '0', status: 'available' };
const EMPTY_BATCH = { count: '5', startNumber: '1', capacity: '4', location: 'indoor' };
const TABLE_NUMBER_RE = /^[A-Za-z0-9-]+$/;
const naturalCompare = (a, b) => String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
const fmtRs = (n) => `Rs. ${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const qrSrc = (t) => t?.qrCodeImage || '';
const tableLabel = (t) => t.tableName || `Table ${t.tableNumber}`;

const isInt = (s) => /^\d+$/.test(String(s).trim());

function validateTableForm(form, tables, selfId) {
  const errs = {};
  const num = form.tableNumber.trim().toUpperCase();
  if (!num) errs.tableNumber = 'Table number is required';
  else if (num.length > 20) errs.tableNumber = 'Use 20 characters or fewer';
  else if (!TABLE_NUMBER_RE.test(num)) errs.tableNumber = 'Use letters, numbers and dashes only';
  else if (tables.some((t) => t._id !== selfId && String(t.tableNumber).toUpperCase() === num)) errs.tableNumber = `Table ${num} already exists`;
  if (form.tableName.trim().length > 60) errs.tableName = 'Use 60 characters or fewer';
  if (!isInt(form.capacity) || Number(form.capacity) < 1 || Number(form.capacity) > 50) errs.capacity = 'Capacity must be a whole number from 1 to 50';
  const ms = String(form.minSpend).trim();
  if (ms !== '' && (!/^\d+(\.\d{1,2})?$/.test(ms) || Number(ms) > 1000000)) errs.minSpend = 'Enter an amount from 0 to 1,000,000 (max 2 decimals)';
  if (form.description.length > 300) errs.description = 'Use 300 characters or fewer';
  return errs;
}

function validateBatch(batch) {
  const errs = {};
  if (!isInt(batch.count) || Number(batch.count) < 1 || Number(batch.count) > 50) errs.count = 'Enter 1 to 50 tables';
  if (!isInt(batch.startNumber) || Number(batch.startNumber) < 1) errs.startNumber = 'Start at 1 or higher';
  if (!isInt(batch.capacity) || Number(batch.capacity) < 1 || Number(batch.capacity) > 50) errs.capacity = 'Capacity must be 1 to 50';
  return errs;
}

/**
 * Table QR Codes page. `embedded` renders it inside the Restaurant page
 * (no page title, same behaviour).
 */
const TableManagement = ({ embedded = false }) => {
  const hotelId = useHotelId();
  const role = useStaffRole();
  const canDelete = TABLE_DELETE_ROLES.includes(role);

  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [actionLoading, setActionLoading] = useState({});
  const [hotelName, setHotelName] = useState('');

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 250);
  const [locFilter, setLocFilter] = useState('');
  const [stFilter, setStFilter] = useState('');
  const [qrFilter, setQrFilter] = useState('all');

  const [showModal, setShowModal] = useState(false);
  const [showBatch, setShowBatch] = useState(false);
  const [selTable, setSelTable] = useState(null);
  const [qrTable, setQrTable] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [regenTarget, setRegenTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [formAlert, setFormAlert] = useState('');
  const [batch, setBatch] = useState(EMPTY_BATCH);
  const [batchErrors, setBatchErrors] = useState({});

  const setAct = (k, v) => setActionLoading((p) => ({ ...p, [k]: v }));

  const fetchTables = useCallback(async ({ silent = false } = {}) => {
    if (!hotelId) { setLoading(false); return; }
    if (!silent) setLoading(true);
    setLoadError(null);
    try {
      const res = await getTables({ hotelId });
      const data = res.data.data || [];
      setTables(data);
      if (data[0]?.hotel?.name) setHotelName(data[0].hotel.name);
    } catch (e) {
      if (!silent) setLoadError(e.response?.data?.message || 'Failed to load tables');
      else toast.error(e.response?.data?.message || 'Failed to refresh tables');
    } finally {
      setLoading(false);
    }
  }, [hotelId]);

  useEffect(() => {
    fetchTables();
  }, [fetchTables]);

  const stats = useMemo(
    () => ({
      total: tables.length,
      withQR: tables.filter((t) => qrSrc(t)).length,
      noQR: tables.filter((t) => !qrSrc(t)).length,
      capacity: tables.reduce((s, t) => s + (t.capacity || 0), 0),
      available: tables.filter((t) => t.status === 'available').length,
    }),
    [tables]
  );

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    return tables
      .filter((t) => {
        const matchS = !q || String(t.tableNumber).toLowerCase().includes(q) || (t.tableName || '').toLowerCase().includes(q) || (t.location || '').toLowerCase().includes(q);
        const matchL = !locFilter || t.location === locFilter;
        const matchSt = !stFilter || t.status === stFilter;
        const matchQR = qrFilter === 'all' || (qrFilter === 'with-qr' ? !!qrSrc(t) : !qrSrc(t));
        return matchS && matchL && matchSt && matchQR;
      })
      .sort((a, b) => naturalCompare(a.tableNumber, b.tableNumber));
  }, [tables, debouncedSearch, locFilter, stFilter, qrFilter]);

  const hasFilters = !!(debouncedSearch || locFilter || stFilter || qrFilter !== 'all');
  const clearFilters = () => { setSearch(''); setLocFilter(''); setStFilter(''); setQrFilter('all'); };

  const openCreate = () => {
    setSelTable(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setFormAlert('');
    setShowModal(true);
  };
  const openEdit = (t) => {
    setSelTable(t);
    setForm({
      tableNumber: t.tableNumber || '',
      tableName: t.tableName || '',
      capacity: String(t.capacity ?? 4),
      location: t.location || 'indoor',
      description: t.description || '',
      minSpend: String(t.minSpend ?? 0),
      status: t.status || 'available',
    });
    setFormErrors({});
    setFormAlert('');
    setShowModal(true);
  };

  const setField = (name, value) => {
    setForm((p) => ({ ...p, [name]: value }));
    setFormErrors((p) => ({ ...p, [name]: undefined }));
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (actionLoading.submit) return;
    const errs = validateTableForm(form, tables, selTable?._id);
    if (Object.keys(errs).length) { setFormErrors(errs); return; }
    const payload = {
      tableNumber: form.tableNumber.trim().toUpperCase(),
      tableName: form.tableName.trim(),
      capacity: Number(form.capacity),
      minSpend: form.minSpend === '' ? 0 : Number(form.minSpend),
      location: form.location,
      status: form.status,
      description: form.description.trim(),
    };
    setAct('submit', true);
    setFormAlert('');
    try {
      if (selTable) {
        await updateTable(selTable._id, payload);
        toast.success(`Table ${payload.tableNumber} updated`);
      } else {
        await createTable({ ...payload, hotelId });
        toast.success(`Table ${payload.tableNumber} created`);
      }
      setShowModal(false);
      fetchTables({ silent: true });
    } catch (err) {
      const data = err.response?.data;
      if (data?.errors) setFormErrors(data.errors);
      setFormAlert(data?.message || 'Could not save the table. Please try again.');
    } finally {
      setAct('submit', false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteTable(deleteTarget._id);
      toast.success(`Table ${deleteTarget.tableNumber} deleted`);
      setDeleteTarget(null);
      fetchTables({ silent: true });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
      if (err.response?.status === 404) { setDeleteTarget(null); fetchTables({ silent: true }); }
    } finally {
      setDeleting(false);
    }
  };

  // Optimistic status change: no list skeleton, reverts on error.
  const handleStatusChange = async (table, newStatus) => {
    const previous = table.status;
    setTables((list) => list.map((t) => (t._id === table._id ? { ...t, status: newStatus } : t)));
    setAct(`s_${table._id}`, true);
    try {
      await updateTableStatus(table._id, newStatus);
      toast.success(`Table ${table.tableNumber} is now ${STATUS_META[newStatus]?.label.toLowerCase() || newStatus}`);
    } catch (err) {
      setTables((list) => list.map((t) => (t._id === table._id ? { ...t, status: previous } : t)));
      toast.error(err.response?.data?.message || 'Status update failed');
    } finally {
      setAct(`s_${table._id}`, false);
    }
  };

  const handleGenQR = async (table, regenerate = false) => {
    setAct(`qr_${table._id}`, true);
    try {
      const res = await generateTableQR(table._id, regenerate);
      const updated = res.data.table || {};
      setTables((list) => list.map((t) => (t._id === table._id ? { ...t, ...updated, isQrActive: true } : t)));
      setQrTable((cur) => (cur?._id === table._id ? { ...cur, ...updated, isQrActive: true } : cur));
      toast.success(regenerate ? `New QR issued for table ${table.tableNumber}. The old code no longer works.` : 'QR code generated');
      setRegenTarget(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'QR generation failed');
    } finally {
      setAct(`qr_${table._id}`, false);
    }
  };

  const handleToggleQr = async (table) => {
    const next = table.isQrActive === false;
    setAct(`qa_${table._id}`, true);
    try {
      await updateTable(table._id, { isQrActive: next });
      setTables((list) => list.map((t) => (t._id === table._id ? { ...t, isQrActive: next } : t)));
      setQrTable((cur) => (cur?._id === table._id ? { ...cur, isQrActive: next } : cur));
      toast.success(next ? `QR for table ${table.tableNumber} activated` : `QR for table ${table.tableNumber} deactivated. Guests can't order with it.`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not change the QR status');
    } finally {
      setAct(`qa_${table._id}`, false);
    }
  };

  const copyLink = async (table) => {
    try {
      await navigator.clipboard.writeText(table.qrCodeData || '');
      toast.success('Ordering link copied');
    } catch {
      toast.error('Could not copy the link');
    }
  };

  const handleBatch = async (e) => {
    e?.preventDefault();
    if (actionLoading.batch) return;
    const errs = validateBatch(batch);
    if (Object.keys(errs).length) { setBatchErrors(errs); return; }
    setAct('batch', true);
    try {
      const res = await batchCreateTables({
        hotelId,
        count: Number(batch.count),
        startNumber: Number(batch.startNumber),
        capacity: Number(batch.capacity),
        location: batch.location,
      });
      const { createdCount = 0, skippedCount = 0 } = res.data;
      if (createdCount === 0) toast.info(`No tables created: ${skippedCount} already exist.`);
      else toast.success(res.data.message || `${createdCount} tables created`);
      fetchTables({ silent: true });
      setShowBatch(false);
    } catch (err) {
      const data = err.response?.data;
      if (data?.errors) setBatchErrors(data.errors);
      toast.error(data?.message || 'Batch failed');
    } finally {
      setAct('batch', false);
    }
  };

  const qrFilterOptions = [
    { value: 'all', label: 'All', count: stats.total },
    { value: 'with-qr', label: 'Has QR', count: stats.withQR },
    { value: 'no-qr', label: 'No QR', count: stats.noQR },
  ];

  const batchEnd = isInt(batch.startNumber) && isInt(batch.count) ? Number(batch.startNumber) + Number(batch.count) - 1 : null;

  if (!hotelId) {
    return (
      <div className={embedded ? '' : 'ha-page'}>
        <EmptyState icon={<Building2 size={26} />} title="No property selected" description="Your account isn't linked to a property yet. Ask the owner to assign you one." />
      </div>
    );
  }

  return (
    <div className={embedded ? '' : 'ha-page'}>
      <PageHeader
        title={embedded ? undefined : 'Table QR Codes'}
        subtitle={embedded ? undefined : 'Manage restaurant tables and generate ordering QR codes.'}
        actions={
          <>
            <Button variant="secondary" onClick={() => fetchTables()} disabled={loading}>
              <RefreshCw size={16} aria-hidden="true" /> Refresh
            </Button>
            <Button variant="secondary" onClick={() => { setBatch(EMPTY_BATCH); setBatchErrors({}); setShowBatch(true); }}>
              <Rows3 size={16} aria-hidden="true" /> Batch Create
            </Button>
            <Button variant="primary" onClick={openCreate}>
              <Plus size={16} aria-hidden="true" /> Add Table
            </Button>
          </>
        }
        toolbar={
          <>
            <div className="ha-toolbar__group">
              <SearchInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tables…" ariaLabel="Search tables" />
              <Select value={locFilter} onChange={(e) => setLocFilter(e.target.value)} aria-label="Filter by location">
                <option value="">All Locations</option>
                {LOC_OPTS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
              </Select>
              <Select value={stFilter} onChange={(e) => setStFilter(e.target.value)} aria-label="Filter by status">
                <option value="">All Status</option>
                {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </Select>
            </div>
            <FilterTabs options={qrFilterOptions} value={qrFilter} onChange={setQrFilter} ariaLabel="Filter by QR presence" />
          </>
        }
      />

      <div className="ha-kpi-grid" style={{ marginBottom: 24 }}>
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard icon={<UtensilsCrossed size={22} />} iconBg="linear-gradient(135deg,#6366f1,#4f46e5)" label="Total Tables" value={stats.total} />
            <StatCard icon={<QrCode size={22} />} iconBg="var(--ha-success)" label="With QR" value={stats.withQR} />
            <StatCard icon={<CheckCircle2 size={22} />} iconBg="var(--ha-info)" label="Available" value={stats.available} />
            <StatCard icon={<Users size={22} />} iconBg="var(--ha-warning)" label="Total Capacity" value={stats.capacity} />
          </>
        )}
      </div>

      {loadError ? (
        <ErrorState description={loadError} onRetry={() => fetchTables()} />
      ) : loading ? (
        <Table minWidth={820} stack>
          <THead>
            <th scope="col">Table</th><th scope="col">Location</th><th scope="col">Capacity</th>
            <th scope="col">Status</th><th scope="col">QR</th><th scope="col">Actions</th>
          </THead>
          <TableSkeleton rows={5} cols={6} />
        </Table>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<UtensilsCrossed size={26} />}
          title={tables.length === 0 ? 'No tables yet' : 'No tables match your filters'}
          description={tables.length === 0 ? 'Start by adding tables or batch-creating them.' : 'Try a different search or clear the filters.'}
          action={tables.length === 0
            ? <Button variant="primary" size="sm" onClick={openCreate}><Plus size={15} aria-hidden="true" /> Add Table</Button>
            : hasFilters ? <Button variant="secondary" size="sm" onClick={clearFilters}>Clear filters</Button> : null}
        />
      ) : (
        <Table minWidth={820} stack>
          <THead>
            <th scope="col">Table</th>
            <th scope="col">Location</th>
            <th scope="col">Capacity</th>
            <th scope="col">Status</th>
            <th scope="col">QR</th>
            <th scope="col">Actions</th>
          </THead>
          <tbody>
            {filtered.map((table) => {
              const img = qrSrc(table);
              const qrOff = table.isQrActive === false;
              return (
                <tr key={table._id}>
                  <td data-primary>
                    <div className="ha-body-strong" style={{ color: 'var(--ha-text)' }}>{tableLabel(table)}</div>
                    <div className="ha-small haNum" style={{ color: 'var(--ha-text-subtle)' }}>#{table.tableNumber}{table.minSpend > 0 ? ` · Min ${fmtRs(table.minSpend)}` : ''}</div>
                  </td>
                  <td data-label="Location" style={{ textTransform: 'capitalize' }}>{table.location || '—'}</td>
                  <td data-label="Capacity" className="haNum">{table.capacity}</td>
                  <td data-label="Status">
                    <Select
                      value={table.status}
                      onChange={(e) => handleStatusChange(table, e.target.value)}
                      disabled={actionLoading[`s_${table._id}`]}
                      aria-label={`Status for table ${table.tableNumber}`}
                    >
                      {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </Select>
                  </td>
                  <td data-label="QR">
                    {img ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                        <button type="button" onClick={() => setQrTable(table)} aria-label={`View QR for table ${table.tableNumber}`} style={{ border: 'none', background: '#fff', cursor: 'pointer', padding: 2, borderRadius: 6, lineHeight: 0 }}>
                          <img src={img} alt="" width={40} height={40} loading="lazy" style={{ width: 40, height: 40, borderRadius: 4, opacity: qrOff ? 0.4 : 1 }} />
                        </button>
                        {qrOff && <Badge tone="danger">Inactive</Badge>}
                      </span>
                    ) : (
                      <Badge tone="warning">No QR</Badge>
                    )}
                  </td>
                  <td data-actions>
                    <div className="ha-table__row-actions">
                      {img ? (
                        <>
                          <IconButton aria-label={`Download QR for table ${table.tableNumber}`} title="Download PNG" onClick={() => downloadQrImage(img, `table-${table.tableNumber}-qr.png`)}>
                            <Download size={16} aria-hidden="true" />
                          </IconButton>
                          <IconButton aria-label={`Print QR for table ${table.tableNumber}`} title="Print" onClick={() => printQrSheet({ items: [{ label: `Table ${table.tableNumber}`, image: img }], hotelName, hint: 'Scan to view the menu and order', title: `Table ${table.tableNumber}` })}>
                            <Printer size={16} aria-hidden="true" />
                          </IconButton>
                          <IconButton aria-label={`Regenerate QR for table ${table.tableNumber}`} title="Regenerate (old QR stops working)" onClick={() => setRegenTarget(table)} disabled={actionLoading[`qr_${table._id}`]}>
                            <RotateCcw size={16} aria-hidden="true" />
                          </IconButton>
                          <IconButton aria-label={`${qrOff ? 'Activate' : 'Deactivate'} QR for table ${table.tableNumber}`} aria-pressed={!qrOff} title={qrOff ? 'Activate QR' : 'Deactivate QR'} onClick={() => handleToggleQr(table)} disabled={actionLoading[`qa_${table._id}`]} style={{ color: qrOff ? 'var(--ha-danger-text)' : undefined }}>
                            <Power size={16} aria-hidden="true" />
                          </IconButton>
                        </>
                      ) : (
                        <Button size="sm" variant="secondary" onClick={() => handleGenQR(table)} loading={actionLoading[`qr_${table._id}`]}>
                          <QrCode size={14} aria-hidden="true" /> Generate
                        </Button>
                      )}
                      <IconButton aria-label={`Edit table ${table.tableNumber}`} title="Edit" onClick={() => openEdit(table)}>
                        <Pencil size={16} aria-hidden="true" />
                      </IconButton>
                      {canDelete && (
                        <IconButton aria-label={`Delete table ${table.tableNumber}`} title="Delete" onClick={() => setDeleteTarget(table)} style={{ color: 'var(--ha-danger-text)' }}>
                          <Trash2 size={16} aria-hidden="true" />
                        </IconButton>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}

      {/* Create / edit modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={selTable ? `Edit table ${selTable.tableNumber}` : 'Add New Table'}
        busy={!!actionLoading.submit}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowModal(false)} disabled={actionLoading.submit}>Cancel</Button>
            <Button variant="primary" type="submit" form="ha-table-form" loading={actionLoading.submit}>{actionLoading.submit ? 'Saving…' : selTable ? 'Update Table' : 'Create Table'}</Button>
          </>
        }
      >
        <form id="ha-table-form" onSubmit={handleSubmit} noValidate className="ha-form-grid">
          <Input label="Table Number" required placeholder="e.g. 1, A1, VIP-1" maxLength={20} autoComplete="off" value={form.tableNumber} onChange={(e) => setField('tableNumber', e.target.value)} onBlur={() => setField('tableNumber', form.tableNumber.trim().toUpperCase())} error={formErrors.tableNumber} hint="Letters, numbers and dashes" />
          <Input label="Table Name" placeholder="e.g. Corner Table" maxLength={60} counter value={form.tableName} onChange={(e) => setField('tableName', e.target.value)} error={formErrors.tableName} />
          <Input label="Capacity" required inputMode="numeric" value={form.capacity} onChange={(e) => setField('capacity', e.target.value)} onBlur={() => isInt(form.capacity) && setField('capacity', String(Number(form.capacity)))} error={formErrors.capacity} hint="1–50 guests" />
          <Input label="Min Spend (NPR)" inputMode="decimal" value={form.minSpend} onChange={(e) => setField('minSpend', e.target.value)} error={formErrors.minSpend} hint="0 for none" />
          <Select label="Location" value={form.location} onChange={(e) => setField('location', e.target.value)}>
            {LOC_OPTS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
          </Select>
          <Select label="Status" value={form.status} onChange={(e) => setField('status', e.target.value)}>
            {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </Select>
          <div className="ha-form-grid__full">
            <Textarea label="Description" rows="2" maxLength={300} counter placeholder="Optional notes about this table" value={form.description} onChange={(e) => setField('description', e.target.value)} error={formErrors.description} />
          </div>
          {formAlert && <div className="ha-alert ha-alert--danger ha-form-grid__full" role="alert">{formAlert}</div>}
        </form>
      </Modal>

      {/* Batch modal */}
      <Modal
        isOpen={showBatch}
        onClose={() => setShowBatch(false)}
        title="Batch Create Tables"
        busy={!!actionLoading.batch}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowBatch(false)} disabled={actionLoading.batch}>Cancel</Button>
            <Button variant="primary" type="submit" form="ha-batch-form" loading={actionLoading.batch}>
              {actionLoading.batch ? 'Creating…' : `Create ${isInt(batch.count) ? Number(batch.count) : ''} Tables`}
            </Button>
          </>
        }
      >
        <form id="ha-batch-form" onSubmit={handleBatch} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="ha-form-grid">
            <Input label="Number of Tables" required inputMode="numeric" value={batch.count} onChange={(e) => { setBatch((p) => ({ ...p, count: e.target.value })); setBatchErrors((p) => ({ ...p, count: undefined })); }} error={batchErrors.count} hint="1–50" />
            <Input label="Starting Number" required inputMode="numeric" value={batch.startNumber} onChange={(e) => { setBatch((p) => ({ ...p, startNumber: e.target.value })); setBatchErrors((p) => ({ ...p, startNumber: undefined })); }} error={batchErrors.startNumber} />
            <Input label="Default Capacity" inputMode="numeric" value={batch.capacity} onChange={(e) => { setBatch((p) => ({ ...p, capacity: e.target.value })); setBatchErrors((p) => ({ ...p, capacity: undefined })); }} error={batchErrors.capacity} hint="1–50 guests" />
            <Select label="Location" value={batch.location} onChange={(e) => setBatch((p) => ({ ...p, location: e.target.value }))}>
              {LOC_OPTS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
            </Select>
          </div>
          {batchEnd !== null && (
            <div className="ha-alert ha-alert--info">
              Creates tables <strong className="haNum">{Number(batch.startNumber)}</strong> to <strong className="haNum">{batchEnd}</strong>, each with its own QR code. Numbers that already exist are skipped.
            </div>
          )}
        </form>
      </Modal>

      {/* QR view modal */}
      <Modal
        isOpen={!!qrTable}
        onClose={() => setQrTable(null)}
        title={qrTable ? `Table ${qrTable.tableNumber} QR code` : ''}
        size="sm"
        footer={
          qrSrc(qrTable) && (
            <>
              <Button variant="secondary" onClick={() => copyLink(qrTable)}>
                <Copy size={16} aria-hidden="true" /> Copy link
              </Button>
              <Button variant="secondary" onClick={() => downloadQrImage(qrSrc(qrTable), `table-${qrTable.tableNumber}-qr.png`)}>
                <Download size={16} aria-hidden="true" /> Download
              </Button>
              <Button variant="primary" onClick={() => printQrSheet({ items: [{ label: `Table ${qrTable.tableNumber}`, image: qrSrc(qrTable) }], hotelName, hint: 'Scan to view the menu and order', title: `Table ${qrTable.tableNumber}` })}>
                <Printer size={16} aria-hidden="true" /> Print
              </Button>
            </>
          )
        }
      >
        {qrSrc(qrTable) ? (
          <div style={{ textAlign: 'center' }}>
            {hotelName && <p className="ha-small" style={{ color: 'var(--ha-text-subtle)' }}>{hotelName}</p>}
            <h3 className="ha-h3" style={{ margin: '4px 0 12px' }}>
              {tableLabel(qrTable)}{' '}
              <Badge tone={qrTable.isQrActive === false ? 'danger' : 'success'}>{qrTable.isQrActive === false ? 'Inactive' : 'Active'}</Badge>
            </h3>
            <div style={{ display: 'inline-block', background: '#fff', padding: 12, borderRadius: 'var(--ha-radius-md)' }}>
              <img src={qrSrc(qrTable)} alt={`QR code for table ${qrTable.tableNumber}`} width={220} height={220} style={{ width: 220, height: 220, maxWidth: '100%', display: 'block' }} />
            </div>
            <p className="ha-small" style={{ color: 'var(--ha-text-subtle)', marginTop: 12 }}>Scan to view the menu and order</p>
          </div>
        ) : (
          <p className="ha-body" style={{ color: 'var(--ha-text-subtle)' }}><Smartphone size={16} aria-hidden="true" /> No QR code generated yet.</p>
        )}
      </Modal>

      {/* Regenerate confirm */}
      <ConfirmDialog
        isOpen={!!regenTarget}
        onClose={() => setRegenTarget(null)}
        onConfirm={() => regenTarget && handleGenQR(regenTarget, true)}
        variant="warning"
        title={regenTarget ? `Regenerate QR for table ${regenTarget.tableNumber}?` : ''}
        message="A new QR code is issued and the current one stops working immediately. Replace the printed code on the table afterwards."
        confirmText="Regenerate QR"
        loading={!!(regenTarget && actionLoading[`qr_${regenTarget._id}`])}
      />

      {/* Delete confirm */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        variant="danger"
        title={deleteTarget ? `Delete table ${deleteTarget.tableNumber}?` : ''}
        message={deleteTarget ? `Table ${deleteTarget.tableNumber} and its QR code are removed permanently. Guests can no longer order from it. This can't be undone.` : ''}
        confirmText="Delete Table"
        loading={deleting}
      />
    </div>
  );
};

export default TableManagement;
