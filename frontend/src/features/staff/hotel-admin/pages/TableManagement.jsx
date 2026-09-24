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
} from 'lucide-react';
import {
  getTables, createTable, updateTable, deleteTable,
  generateTableQR, updateTableStatus, batchCreateTables,
} from '../services/tableApi';
import useHotelId from '../hooks/useHotelId';
import ConfirmDialog from '../../../../components/ConfirmDialog';
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
  Table,
  THead,
  Modal,
} from '../components/ui';
import useDebouncedValue from '../hooks/useDebouncedValue';
import '../styles/hotel-admin-tokens.css';

const downloadQRCode = (base64Data, filename) => {
  const link = document.createElement('a');
  link.href = base64Data;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const printQRCode = (base64Data, tableNumber, hotelName) => {
  const w = window.open('', '_blank');
  if (!w) { toast.error('Popup blocked. Allow popups to print.'); return; }
  w.document.write(`<!DOCTYPE html><html><head><title>Table ${tableNumber}</title>
  <style>*{margin:0;padding:0;box-sizing:border-box}body{display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f8fafc;font-family:system-ui,sans-serif}.box{background:#fff;border-radius:20px;box-shadow:0 8px 40px rgba(0,0,0,.12);padding:40px 48px;text-align:center}.hotel{font-size:14px;color:#64748b;margin-bottom:6px;font-weight:500}.num{font-size:32px;font-weight:800;color:#1e293b;margin-bottom:24px}.qr{width:220px;height:220px;border-radius:12px}.hint{margin-top:20px;font-size:13px;color:#94a3b8}@media print{body{background:#fff}.box{box-shadow:none}}</style>
  </head><body><div class="box"><p class="hotel">${hotelName}</p><h1 class="num">Table ${tableNumber}</h1><img src="${base64Data}" class="qr" alt="QR"/><p class="hint">Scan to view menu &amp; place your order</p></div>
  <script>window.onload=()=>{window.print();window.onafterprint=()=>window.close()}${'<'}/script></body></html>`);
  w.document.close();
};

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

const EMPTY_FORM = { tableNumber: '', tableName: '', capacity: 4, location: 'indoor', description: '', minSpend: 0, status: 'available' };

const TableManagement = () => {
  const hotelId = useHotelId();

  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
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
  const [deleting, setDeleting] = useState(false);

  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [batch, setBatch] = useState({ count: 5, startNumber: 1, capacity: 4, location: 'indoor', generateQR: true });

  const setAct = (k, v) => setActionLoading((p) => ({ ...p, [k]: v }));

  const fetchTables = useCallback(async () => {
    if (!hotelId) { setLoading(false); return; }
    setLoading(true);
    try {
      const res = await getTables({ hotelId });
      if (res.data.success) {
        const data = res.data.data || [];
        setTables(data);
        if (data[0]?.hotel?.name) setHotelName(data[0].hotel.name);
      }
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to load tables');
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
      withQR: tables.filter((t) => t.qrCodeData).length,
      noQR: tables.filter((t) => !t.qrCodeData).length,
      capacity: tables.reduce((s, t) => s + (t.capacity || 0), 0),
      available: tables.filter((t) => t.status === 'available').length,
    }),
    [tables]
  );

  const filtered = useMemo(() => {
    const q = debouncedSearch.toLowerCase();
    return tables.filter((t) => {
      const matchS = !q || t.tableNumber.toLowerCase().includes(q) || (t.tableName || '').toLowerCase().includes(q) || (t.location || '').toLowerCase().includes(q);
      const matchL = !locFilter || t.location === locFilter;
      const matchSt = !stFilter || t.status === stFilter;
      const matchQR = qrFilter === 'all' || (qrFilter === 'with-qr' ? !!t.qrCodeData : !t.qrCodeData);
      return matchS && matchL && matchSt && matchQR;
    });
  }, [tables, debouncedSearch, locFilter, stFilter, qrFilter]);

  const openCreate = () => {
    setSelTable(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setShowModal(true);
  };
  const openEdit = (t) => {
    setSelTable(t);
    setForm({ tableNumber: t.tableNumber || '', tableName: t.tableName || '', capacity: t.capacity || 4, location: t.location || 'indoor', description: t.description || '', minSpend: t.minSpend || 0, status: t.status || 'available' });
    setFormErrors({});
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.tableNumber.trim()) {
      setFormErrors({ tableNumber: 'Table number is required' });
      return;
    }
    setAct('submit', true);
    try {
      if (selTable) {
        const res = await updateTable(selTable._id, form);
        if (res.data.success) { toast.success('Table updated'); fetchTables(); setShowModal(false); }
      } else {
        const res = await createTable({ ...form, hotelId });
        if (res.data.success) { toast.success('Table created'); fetchTables(); setShowModal(false); }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed');
    } finally {
      setAct('submit', false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await deleteTable(deleteTarget._id);
      if (res.data.success) { toast.success('Table deleted'); setDeleteTarget(null); fetchTables(); }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    } finally {
      setDeleting(false);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    setAct(`s_${id}`, true);
    try {
      const res = await updateTableStatus(id, newStatus);
      if (res.data.success) { toast.success(`Status → ${newStatus}`); fetchTables(); }
    } catch {
      toast.error('Status update failed');
    } finally {
      setAct(`s_${id}`, false);
    }
  };

  const handleGenQR = async (id) => {
    setAct(`qr_${id}`, true);
    try {
      const res = await generateTableQR(id);
      if (res.data.success) { toast.success('QR code generated'); fetchTables(); }
    } catch {
      toast.error('QR generation failed');
    } finally {
      setAct(`qr_${id}`, false);
    }
  };

  const handleBatch = async (e) => {
    e.preventDefault();
    setAct('batch', true);
    try {
      const res = await batchCreateTables({ ...batch, hotelId });
      if (res.data.success) {
        toast.success(`${res.data.createdCount || batch.count} tables created`);
        fetchTables();
        setShowBatch(false);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Batch failed');
    } finally {
      setAct('batch', false);
    }
  };

  const qrFilterOptions = [
    { value: 'all', label: 'All', count: stats.total },
    { value: 'with-qr', label: 'Has QR', count: stats.withQR },
    { value: 'no-qr', label: 'No QR', count: stats.noQR },
  ];

  return (
    <div className="ha-page">
      <PageHeader
        title="Table QR Codes"
        subtitle="Manage restaurant tables and generate ordering QR codes."
        actions={
          <>
            <Button variant="secondary" onClick={fetchTables} disabled={loading}>
              <RefreshCw size={16} aria-hidden="true" /> Refresh
            </Button>
            <Button variant="secondary" onClick={() => setShowBatch(true)}>
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

      <div className="ha-kpi-grid" style={{ marginBottom: 24, gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))' }}>
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

      {loading ? null : filtered.length === 0 ? (
        <EmptyState
          icon={<UtensilsCrossed size={26} />}
          title={tables.length === 0 ? 'No tables yet' : 'No matching tables'}
          description={tables.length === 0 ? 'Start by adding tables or batch-creating them.' : 'Try adjusting your search or filters.'}
          action={tables.length === 0 ? <Button variant="primary" size="sm" onClick={openCreate}><Plus size={15} aria-hidden="true" /> Add Table</Button> : null}
        />
      ) : (
        <Table minWidth={820}>
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
              return (
                <tr key={table._id}>
                  <td>
                    <div className="ha-body-strong" style={{ color: 'var(--ha-text)' }}>{table.tableName || `Table ${table.tableNumber}`}</div>
                    <div className="ha-small haNum" style={{ color: 'var(--ha-text-subtle)' }}>#{table.tableNumber}{table.minSpend > 0 ? ` · Min Rs. ${table.minSpend}` : ''}</div>
                  </td>
                  <td style={{ textTransform: 'capitalize' }}>{table.location || '—'}</td>
                  <td className="haNum">{table.capacity}</td>
                  <td>
                    <Select
                      value={table.status}
                      onChange={(e) => handleStatusChange(table._id, e.target.value)}
                      disabled={actionLoading[`s_${table._id}`]}
                      aria-label={`Status for table ${table.tableNumber}`}
                      className="ha-select"
                    >
                      {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </Select>
                  </td>
                  <td>
                    {table.qrCodeData ? (
                      <button type="button" onClick={() => setQrTable(table)} aria-label={`View QR for table ${table.tableNumber}`} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 0 }}>
                        <img src={table.qrCodeData} alt="" style={{ width: 44, height: 44, borderRadius: 6 }} />
                      </button>
                    ) : (
                      <Badge tone="warning">No QR</Badge>
                    )}
                  </td>
                  <td>
                    <div className="ha-table__row-actions">
                      {table.qrCodeData ? (
                        <>
                          <IconButton aria-label={`Download QR for table ${table.tableNumber}`} onClick={() => downloadQRCode(table.qrCodeData, `table-${table.tableNumber}-qr.png`)}>
                            <Download size={16} aria-hidden="true" />
                          </IconButton>
                          <IconButton aria-label={`Print QR for table ${table.tableNumber}`} onClick={() => printQRCode(table.qrCodeData, table.tableNumber, hotelName)}>
                            <Printer size={16} aria-hidden="true" />
                          </IconButton>
                          <IconButton aria-label={`Regenerate QR for table ${table.tableNumber}`} onClick={() => handleGenQR(table._id)} disabled={actionLoading[`qr_${table._id}`]}>
                            <RotateCcw size={16} aria-hidden="true" />
                          </IconButton>
                        </>
                      ) : (
                        <Button size="sm" variant="secondary" onClick={() => handleGenQR(table._id)} disabled={actionLoading[`qr_${table._id}`]}>
                          <QrCode size={14} aria-hidden="true" /> {actionLoading[`qr_${table._id}`] ? '…' : 'Generate'}
                        </Button>
                      )}
                      <IconButton aria-label={`Edit table ${table.tableNumber}`} onClick={() => openEdit(table)}>
                        <Pencil size={16} aria-hidden="true" />
                      </IconButton>
                      <IconButton aria-label={`Delete table ${table.tableNumber}`} onClick={() => setDeleteTarget(table)} style={{ color: 'var(--ha-danger)' }}>
                        <Trash2 size={16} aria-hidden="true" />
                      </IconButton>
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
        title={selTable ? 'Edit Table' : 'Add New Table'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowModal(false)} disabled={actionLoading.submit}>Cancel</Button>
            <Button variant="primary" onClick={handleSubmit} disabled={actionLoading.submit}>{actionLoading.submit ? 'Saving…' : selTable ? 'Update Table' : 'Create Table'}</Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 16 }}>
          <Input label="Table Number" required placeholder="e.g. 1, A1, VIP-1" value={form.tableNumber} onChange={(e) => { setForm((p) => ({ ...p, tableNumber: e.target.value })); setFormErrors({}); }} error={formErrors.tableNumber} />
          <Input label="Table Name" placeholder="e.g. Corner Table" value={form.tableName} onChange={(e) => setForm((p) => ({ ...p, tableName: e.target.value }))} />
          <Input label="Capacity" required type="number" min="1" max="50" value={form.capacity} onChange={(e) => setForm((p) => ({ ...p, capacity: +e.target.value }))} />
          <Input label="Min Spend (NPR)" type="number" min="0" value={form.minSpend} onChange={(e) => setForm((p) => ({ ...p, minSpend: +e.target.value }))} />
          <Select label="Location" value={form.location} onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}>
            {LOC_OPTS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
          </Select>
          <Select label="Status" value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}>
            {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </Select>
          <div style={{ gridColumn: '1 / -1' }}>
            <Textarea label="Description" rows="2" placeholder="Optional notes about this table" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
          </div>
        </form>
      </Modal>

      {/* Batch modal */}
      <Modal
        isOpen={showBatch}
        onClose={() => setShowBatch(false)}
        title="Batch Create Tables"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowBatch(false)} disabled={actionLoading.batch}>Cancel</Button>
            <Button variant="primary" onClick={handleBatch} disabled={actionLoading.batch}>{actionLoading.batch ? 'Creating…' : `Create ${batch.count} Tables`}</Button>
          </>
        }
      >
        <form onSubmit={handleBatch} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Input label="Number of Tables" type="number" min="1" max="50" value={batch.count} onChange={(e) => setBatch((p) => ({ ...p, count: +e.target.value }))} />
            <Input label="Starting Number" type="number" min="1" value={batch.startNumber} onChange={(e) => setBatch((p) => ({ ...p, startNumber: +e.target.value }))} />
            <Input label="Default Capacity" type="number" min="1" max="20" value={batch.capacity} onChange={(e) => setBatch((p) => ({ ...p, capacity: +e.target.value }))} />
            <Select label="Location" value={batch.location} onChange={(e) => setBatch((p) => ({ ...p, location: e.target.value }))}>
              {LOC_OPTS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
            </Select>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--ha-text-muted)' }}>
            <input type="checkbox" checked={batch.generateQR} onChange={(e) => setBatch((p) => ({ ...p, generateQR: e.target.checked }))} />
            Generate QR codes automatically for all tables
          </label>
          <div className="ha-card" style={{ padding: '10px 12px', color: 'var(--ha-text-subtle)', fontSize: 13 }}>
            Will create tables <strong className="haNum">{batch.startNumber}</strong> through <strong className="haNum">{batch.startNumber + batch.count - 1}</strong>
            {batch.generateQR && ' with QR codes'}.
          </div>
        </form>
      </Modal>

      {/* QR view modal */}
      <Modal
        isOpen={!!qrTable}
        onClose={() => setQrTable(null)}
        title={qrTable ? `Table ${qrTable.tableNumber} — QR Code` : ''}
        size="sm"
        footer={
          qrTable?.qrCodeData && (
            <>
              <Button variant="secondary" onClick={() => downloadQRCode(qrTable.qrCodeData, `table-${qrTable.tableNumber}-qr.png`)}>
                <Download size={16} aria-hidden="true" /> Download
              </Button>
              <Button variant="primary" onClick={() => printQRCode(qrTable.qrCodeData, qrTable.tableNumber, hotelName)}>
                <Printer size={16} aria-hidden="true" /> Print
              </Button>
            </>
          )
        }
      >
        {qrTable?.qrCodeData ? (
          <div style={{ textAlign: 'center' }}>
            {hotelName && <p className="ha-small" style={{ color: 'var(--ha-text-subtle)' }}>{hotelName}</p>}
            <h3 className="ha-h3" style={{ margin: '4px 0 16px' }}>Table {qrTable.tableNumber}</h3>
            <img src={qrTable.qrCodeData} alt="QR Code" style={{ width: 220, height: 220, borderRadius: 'var(--ha-radius-md)' }} />
            <p className="ha-small" style={{ color: 'var(--ha-text-subtle)', marginTop: 12 }}>Scan to view menu & order</p>
          </div>
        ) : (
          <p className="ha-body" style={{ color: 'var(--ha-text-subtle)' }}><Smartphone size={16} aria-hidden="true" /> No QR code generated yet.</p>
        )}
      </Modal>

      {/* Delete confirm */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        variant="danger"
        title="Delete table?"
        message={deleteTarget ? `Table ${deleteTarget.tableNumber} will be permanently removed. This cannot be undone.` : ''}
        confirmText="Delete Table"
        loading={deleting}
      />
    </div>
  );
};

export default TableManagement;
