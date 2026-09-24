import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'react-toastify';
import {
  Package,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Wallet,
  Plus,
  Download,
  Pencil,
  Trash2,
  Plus as PlusSmall,
  Minus,
  Equal,
  Info,
} from 'lucide-react';
import {
  getStockItems,
  createStockItem,
  updateStockItem,
  deleteStockItem,
  adjustStockQuantity,
} from '../services/stockApi';
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
  ErrorState,
  Table,
  THead,
  SortableTh,
  TableSkeleton,
  Pagination,
  Modal,
} from '../components/ui';
import useDebouncedValue from '../hooks/useDebouncedValue';
import useTableControls from '../hooks/useTableControls';
import { exportToCsv } from '../utils/csv';
import '../styles/hotel-admin-tokens.css';

const CATEGORIES = ['Beverages', 'Dairy', 'Meat & Poultry', 'Vegetables & Fruits', 'Grains & Cereals', 'Spices & Condiments', 'Cleaning Supplies', 'Linen & Towels', 'Electronics & Equipment', 'Miscellaneous'];
const UNITS = ['kg', 'g', 'L', 'mL', 'pcs', 'boxes', 'bottles', 'cans', 'bags', 'rolls'];

const STATUS_META = {
  ok: { label: 'In Stock', tone: 'success' },
  low: { label: 'Low Stock', tone: 'warning' },
  critical: { label: 'Critical', tone: 'danger' },
  out: { label: 'Out of Stock', tone: 'neutral' },
};
const STATUS_BAR = { ok: 'var(--ha-success)', low: 'var(--ha-warning)', critical: 'var(--ha-danger)', out: 'var(--ha-neutral)' };

const getStockStatus = (item) => {
  if (item.quantity <= 0) return 'out';
  if (item.quantity <= item.criticalLevel) return 'critical';
  if (item.quantity <= item.lowStockLevel) return 'low';
  return 'ok';
};

const rs = (n) => `Rs. ${Number(n || 0).toLocaleString('en-IN')}`;
const EMPTY_FORM = { name: '', category: 'Beverages', quantity: 0, unit: 'kg', lowStockLevel: 10, criticalLevel: 5, unitCost: 0, supplier: '', notes: '' };

const StockManagement = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isMock, setIsMock] = useState(true);

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 250);
  const [catFilter, setCatFilter] = useState('all');
  const [stFilter, setStFilter] = useState('all');

  const [showModal, setShowModal] = useState(false);
  const [selItem, setSelItem] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const [adjItem, setAdjItem] = useState(null);
  const [adjQty, setAdjQty] = useState('');
  const [adjType, setAdjType] = useState('add');

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getStockItems();
      setItems(res.data.items || []);
      setIsMock(!!res.data.isMock);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load inventory');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const stats = useMemo(
    () => ({
      total: items.length,
      ok: items.filter((i) => getStockStatus(i) === 'ok').length,
      low: items.filter((i) => getStockStatus(i) === 'low').length,
      critical: items.filter((i) => getStockStatus(i) === 'critical').length,
      out: items.filter((i) => getStockStatus(i) === 'out').length,
      value: items.reduce((s, i) => s + (i.quantity || 0) * (i.unitCost || 0), 0),
    }),
    [items]
  );

  const alertItems = useMemo(() => items.filter((i) => ['critical', 'out'].includes(getStockStatus(i))), [items]);

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    return items.filter((item) => {
      const matchS = !q || item.name.toLowerCase().includes(q) || (item.supplier || '').toLowerCase().includes(q);
      const matchC = catFilter === 'all' || item.category === catFilter;
      const matchSt = stFilter === 'all' || getStockStatus(item) === stFilter;
      return matchS && matchC && matchSt;
    });
  }, [items, debouncedSearch, catFilter, stFilter]);

  const { paged, page, setPage, pageSize, totalItems, sortKey, sortDir, toggleSort } = useTableControls(filtered, {
    pageSize: 10,
    initialSortKey: 'name',
    accessors: {
      name: (i) => i.name,
      category: (i) => i.category,
      quantity: (i) => i.quantity,
      value: (i) => (i.quantity || 0) * (i.unitCost || 0),
    },
  });

  const openCreate = () => {
    setSelItem(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setShowModal(true);
  };
  const openEdit = (item) => {
    setSelItem(item);
    setForm({ ...item });
    setFormErrors({});
    setShowModal(true);
  };

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Item name is required';
    if (Number(form.quantity) < 0) errs.quantity = 'Quantity cannot be negative';
    if (Number(form.unitCost) < 0) errs.unitCost = 'Cost cannot be negative';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      if (selItem) {
        await updateStockItem(selItem._id, form);
        toast.success('Item updated');
      } else {
        await createStockItem(form);
        toast.success('Item added');
      }
      setShowModal(false);
      fetchItems();
    } catch {
      toast.error('Failed to save item');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteStockItem(deleteTarget._id);
      toast.success('Item deleted');
      setDeleteTarget(null);
      fetchItems();
    } catch {
      toast.error('Failed to delete item');
    } finally {
      setDeleting(false);
    }
  };

  const openAdj = (item) => {
    setAdjItem(item);
    setAdjQty('');
    setAdjType('add');
  };

  const handleAdj = async () => {
    if (!adjItem || adjQty === '' || Number(adjQty) < 0) return;
    try {
      await adjustStockQuantity(adjItem._id, adjType, Number(adjQty));
      toast.success(`Stock adjusted for ${adjItem.name}`);
      setAdjItem(null);
      fetchItems();
    } catch {
      toast.error('Failed to adjust stock');
    }
  };

  const handleExport = () => {
    if (filtered.length === 0) {
      toast.info('No items to export.');
      return;
    }
    exportToCsv(
      'inventory.csv',
      ['Item', 'Category', 'Quantity', 'Unit', 'Status', 'Unit Cost', 'Total Value', 'Supplier'],
      filtered.map((i) => [i.name, i.category, i.quantity, i.unit, STATUS_META[getStockStatus(i)].label, i.unitCost, (i.quantity || 0) * (i.unitCost || 0), i.supplier || ''])
    );
    toast.success(`Exported ${filtered.length} items to CSV.`);
  };

  const statusFilters = [
    { value: 'all', label: 'All', count: stats.total },
    { value: 'ok', label: 'In Stock', count: stats.ok },
    { value: 'low', label: 'Low', count: stats.low },
    { value: 'critical', label: 'Critical', count: stats.critical },
    { value: 'out', label: 'Out', count: stats.out },
  ];

  const adjPreview =
    adjItem && adjQty !== ''
      ? adjType === 'add'
        ? adjItem.quantity + Number(adjQty)
        : adjType === 'remove'
        ? Math.max(0, adjItem.quantity - Number(adjQty))
        : Number(adjQty)
      : null;

  return (
    <div className="ha-page">
      <PageHeader
        title="Stock / Inventory"
        subtitle="Track ingredients, supplies, and inventory levels."
        actions={
          <>
            <Button variant="secondary" onClick={handleExport}>
              <Download size={16} aria-hidden="true" /> Export
            </Button>
            <Button variant="primary" onClick={openCreate}>
              <Plus size={16} aria-hidden="true" /> Add Item
            </Button>
          </>
        }
        toolbar={
          <>
            <div className="ha-toolbar__group">
              <SearchInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search items or suppliers…" ariaLabel="Search inventory" />
              <Select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} aria-label="Filter by category">
                <option value="all">All Categories</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            </div>
            <FilterTabs options={statusFilters} value={stFilter} onChange={setStFilter} ariaLabel="Filter by stock status" />
          </>
        }
      />

      {/* [NEEDS BACKEND] notice */}
      {isMock && (
        <div className="ha-card" role="note" style={{ padding: '12px 16px', marginBottom: 20, display: 'flex', gap: 8, alignItems: 'center', color: 'var(--ha-text-subtle)', fontSize: 13 }}>
          <Info size={16} aria-hidden="true" />
          Preview data — inventory changes are not saved until a backend inventory endpoint exists.
        </div>
      )}

      {/* Alerts */}
      {alertItems.length > 0 && (
        <div className="ha-card" style={{ padding: '12px 16px', marginBottom: 20, display: 'flex', gap: 8, alignItems: 'center', color: 'var(--ha-danger)', background: 'var(--ha-danger-bg)', borderColor: 'transparent', fontSize: 13 }}>
          <AlertTriangle size={16} aria-hidden="true" />
          <span><strong>{alertItems.length} item{alertItems.length > 1 ? 's' : ''}</strong> need attention: {alertItems.map((i) => i.name).join(', ')}</span>
        </div>
      )}

      {/* KPIs */}
      <div className="ha-kpi-grid" style={{ marginBottom: 24, gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))' }}>
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard icon={<Package size={22} />} iconBg="linear-gradient(135deg,#6366f1,#4f46e5)" label="Total Items" value={stats.total} />
            <StatCard icon={<CheckCircle2 size={22} />} iconBg="var(--ha-success)" label="In Stock" value={stats.ok} />
            <StatCard icon={<AlertTriangle size={22} />} iconBg="var(--ha-warning)" label="Low / Critical" value={stats.low + stats.critical} />
            <StatCard icon={<XCircle size={22} />} iconBg="var(--ha-neutral)" label="Out of Stock" value={stats.out} />
            <StatCard icon={<Wallet size={22} />} iconBg="var(--ha-success)" label="Total Value" value={rs(stats.value)} />
          </>
        )}
      </div>

      {error ? (
        <ErrorState description={error} onRetry={fetchItems} />
      ) : (
        <>
          <Table minWidth={880}>
            <THead>
              <SortableTh sortKey="name" activeKey={sortKey} dir={sortDir} onSort={toggleSort}>Item</SortableTh>
              <SortableTh sortKey="category" activeKey={sortKey} dir={sortDir} onSort={toggleSort}>Category</SortableTh>
              <SortableTh sortKey="quantity" activeKey={sortKey} dir={sortDir} onSort={toggleSort}>Quantity</SortableTh>
              <th scope="col">Status</th>
              <th scope="col">Unit Cost</th>
              <SortableTh sortKey="value" activeKey={sortKey} dir={sortDir} onSort={toggleSort}>Total Value</SortableTh>
              <th scope="col">Supplier</th>
              <th scope="col">Actions</th>
            </THead>
            {loading ? (
              <TableSkeleton rows={6} cols={8} />
            ) : (
              <tbody>
                {paged.length === 0 ? (
                  <tr>
                    <td colSpan={8}>
                      <EmptyState
                        icon={<Package size={26} />}
                        title={items.length === 0 ? 'No items yet' : 'No matching items'}
                        description={items.length === 0 ? 'Add your first inventory item.' : 'Try adjusting your filters.'}
                        action={items.length === 0 ? <Button variant="primary" size="sm" onClick={openCreate}><Plus size={15} aria-hidden="true" /> Add Item</Button> : null}
                      />
                    </td>
                  </tr>
                ) : (
                  paged.map((item) => {
                    const status = getStockStatus(item);
                    const pct = Math.min(100, Math.max(0, (item.quantity / Math.max(item.lowStockLevel * 3, 1)) * 100));
                    return (
                      <tr key={item._id}>
                        <td>
                          <div className="ha-body-strong" style={{ color: 'var(--ha-text)' }}>{item.name}</div>
                          {item.notes && <div className="ha-small" style={{ color: 'var(--ha-text-subtle)' }}>{item.notes}</div>}
                        </td>
                        <td>{item.category}</td>
                        <td style={{ minWidth: 160 }}>
                          <div className="ha-body-strong haNum" style={{ color: 'var(--ha-text)' }}>{item.quantity} {item.unit}</div>
                          <div style={{ height: 6, borderRadius: 999, background: 'var(--ha-surface-sunken)', overflow: 'hidden', margin: '4px 0' }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: STATUS_BAR[status], borderRadius: 999 }} />
                          </div>
                          <div className="ha-small haNum" style={{ color: 'var(--ha-text-subtle)' }}>Low: {item.lowStockLevel} · Critical: {item.criticalLevel}</div>
                        </td>
                        <td><Badge tone={STATUS_META[status].tone}>{STATUS_META[status].label}</Badge></td>
                        <td className="haNum">{rs(item.unitCost)}/{item.unit}</td>
                        <td className="ha-money haNum">{rs((item.quantity || 0) * (item.unitCost || 0))}</td>
                        <td style={{ color: 'var(--ha-text-subtle)' }}>{item.supplier || '—'}</td>
                        <td>
                          <div className="ha-table__row-actions">
                            <IconButton aria-label={`Adjust quantity of ${item.name}`} onClick={() => openAdj(item)}>
                              <PlusSmall size={15} aria-hidden="true" /><Minus size={15} aria-hidden="true" style={{ marginLeft: -4 }} />
                            </IconButton>
                            <IconButton aria-label={`Edit ${item.name}`} onClick={() => openEdit(item)}>
                              <Pencil size={16} aria-hidden="true" />
                            </IconButton>
                            <IconButton aria-label={`Delete ${item.name}`} onClick={() => setDeleteTarget(item)} style={{ color: 'var(--ha-danger)' }}>
                              <Trash2 size={16} aria-hidden="true" />
                            </IconButton>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            )}
          </Table>
          {!loading && <Pagination page={page} pageSize={pageSize} totalItems={totalItems} onPageChange={setPage} itemLabel="items" />}
        </>
      )}

      {/* Add / edit modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={selItem ? 'Edit Item' : 'Add Inventory Item'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowModal(false)} disabled={saving}>Cancel</Button>
            <Button variant="primary" onClick={handleSubmit} disabled={saving}>{saving ? 'Saving…' : selItem ? 'Update Item' : 'Add Item'}</Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 16 }}>
          <Input label="Item Name" required placeholder="e.g. Chicken Breast" value={form.name} onChange={(e) => { setForm((p) => ({ ...p, name: e.target.value })); setFormErrors((p) => ({ ...p, name: undefined })); }} error={formErrors.name} />
          <Select label="Category" value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
          <Input label="Quantity" type="number" min="0" value={form.quantity} onChange={(e) => setForm((p) => ({ ...p, quantity: +e.target.value }))} error={formErrors.quantity} />
          <Select label="Unit" value={form.unit} onChange={(e) => setForm((p) => ({ ...p, unit: e.target.value }))}>
            {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
          </Select>
          <Input label="Low Stock Level" type="number" min="0" value={form.lowStockLevel} onChange={(e) => setForm((p) => ({ ...p, lowStockLevel: +e.target.value }))} />
          <Input label="Critical Level" type="number" min="0" value={form.criticalLevel} onChange={(e) => setForm((p) => ({ ...p, criticalLevel: +e.target.value }))} />
          <Input label="Unit Cost (NPR)" type="number" min="0" value={form.unitCost} onChange={(e) => { setForm((p) => ({ ...p, unitCost: +e.target.value })); setFormErrors((p) => ({ ...p, unitCost: undefined })); }} error={formErrors.unitCost} />
          <Input label="Supplier" placeholder="Supplier name" value={form.supplier} onChange={(e) => setForm((p) => ({ ...p, supplier: e.target.value }))} />
          <div style={{ gridColumn: '1 / -1' }}>
            <Textarea label="Notes" rows="2" placeholder="Optional notes" value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
          </div>
        </form>
      </Modal>

      {/* Adjust modal */}
      <Modal
        isOpen={!!adjItem}
        onClose={() => setAdjItem(null)}
        title={adjItem ? `Adjust Stock — ${adjItem.name}` : ''}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAdjItem(null)}>Cancel</Button>
            <Button variant="primary" onClick={handleAdj} disabled={adjQty === '' || Number(adjQty) < 0}>Apply</Button>
          </>
        }
      >
        {adjItem && (
          <>
            <p className="ha-body" style={{ marginBottom: 12 }}>
              Current: <strong className="haNum">{adjItem.quantity} {adjItem.unit}</strong>
            </p>
            <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
              {[['add', 'Add', PlusSmall], ['remove', 'Remove', Minus], ['set', 'Set', Equal]].map(([k, l, Ico]) => (
                <button key={k} type="button" className={`ha-filter-chip ${adjType === k ? 'ha-filter-chip--active' : ''}`} onClick={() => setAdjType(k)}>
                  <Ico size={14} aria-hidden="true" /> {l}
                </button>
              ))}
            </div>
            <Input
              label={`${adjType === 'set' ? 'New quantity' : 'Quantity'} (${adjItem.unit})`}
              type="number"
              min="0"
              value={adjQty}
              onChange={(e) => setAdjQty(e.target.value)}
              placeholder="Enter amount"
            />
            {adjPreview != null && (
              <p className="ha-body" style={{ marginTop: 12 }}>
                After adjustment: <strong className="haNum">{adjPreview} {adjItem.unit}</strong>
              </p>
            )}
          </>
        )}
      </Modal>

      {/* Delete confirmation */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        variant="danger"
        title="Delete item?"
        message={deleteTarget ? `"${deleteTarget.name}" will be removed from inventory.` : ''}
        confirmText="Delete Item"
        loading={deleting}
      />
    </div>
  );
};

export default StockManagement;
