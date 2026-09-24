import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'react-toastify';
import {
  UtensilsCrossed,
  QrCode,
  CheckCircle2,
  Users,
  RefreshCw,
  Plus,
  Rows3,
  Pencil,
  Trash2,
  Download,
  Printer,
  Moon,
  Sun,
  Clock,
  ChefHat,
  ArrowRight,
} from 'lucide-react';
import {
  getTables, createTable, updateTable, deleteTable, updateTableStatus, generateTableQR, batchCreateTables,
} from '../services/tableApi';
import useHotelId from '../hooks/useHotelId';
import {
  getMenuItems, getMenuCategories, createMenuItem, updateMenuItem, deleteMenuItem, bulkToggleAvailability,
} from '../services/menuApi';
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
  Segmented,
  EmptyState,
  Table,
  THead,
  Modal,
} from '../components/ui';
import useDebouncedValue from '../hooks/useDebouncedValue';
import '../styles/hotel-admin-tokens.css';

const downloadQR = (data, filename) => {
  const a = document.createElement('a');
  a.href = data;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

const printTableQR = (data, tableNumber, hotelName) => {
  const w = window.open('', '_blank');
  if (!w) { toast.error('Popup blocked. Allow popups to print.'); return; }
  w.document.write(`<!DOCTYPE html><html><head><title>Table ${tableNumber} QR</title>
  <style>body{display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;font-family:system-ui,sans-serif;background:#f8fafc}.box{padding:40px;background:#fff;border-radius:16px;box-shadow:0 4px 20px rgba(0,0,0,.1);text-align:center}h1{font-size:28px;font-weight:700;color:#1e293b;margin:0 0 20px}p{color:#64748b;margin:0 0 8px}img{width:200px;height:200px}@media print{body{background:#fff}.box{box-shadow:none}}</style></head>
  <body><div class="box"><p>${hotelName}</p><h1>Table ${tableNumber}</h1><img src="${data}" alt="QR"/><p style="margin-top:16px">Scan to view menu &amp; order</p></div>
  <script>window.onload=()=>{window.print();window.onafterprint=()=>window.close()}${'<'}/script></body></html>`);
  w.document.close();
};

const STATUS_META = {
  available: { label: 'Available', tone: 'success' },
  occupied: { label: 'Occupied', tone: 'warning' },
  reserved: { label: 'Reserved', tone: 'info' },
  maintenance: { label: 'Maintenance', tone: 'danger' },
};
const LOC_OPTS = ['indoor', 'outdoor', 'terrace', 'rooftop', 'private', 'bar'];
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

const TABS = [
  { value: 'tables', label: 'Tables', icon: <UtensilsCrossed size={15} aria-hidden="true" /> },
  { value: 'menu', label: 'Menu', icon: <ChefHat size={15} aria-hidden="true" /> },
  { value: 'kitchen', label: 'Kitchen', icon: <Clock size={15} aria-hidden="true" /> },
];

const RestaurantManagement = ({ onNavigate }) => {
  const hotelId = useHotelId();

  const [tab, setTab] = useState('tables');

  /* tables */
  const [tables, setTables] = useState([]);
  const [tLoading, setTLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState({});
  const [showTableModal, setShowTableModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [qrTable, setQrTable] = useState(null);
  const [selTable, setSelTable] = useState(null);
  const [hotelName, setHotelName] = useState('');
  const [tableSearch, setTableSearch] = useState('');
  const dTableSearch = useDebouncedValue(tableSearch, 250);
  const [tableLoc, setTableLoc] = useState('all');
  const [tableStatus, setTableStatus] = useState('all');
  const [tableForm, setTableForm] = useState({ tableNumber: '', tableName: '', capacity: 4, location: 'indoor', description: '', minSpend: 0, status: 'available' });
  const [tableFormErr, setTableFormErr] = useState({});
  const [batchForm, setBatchForm] = useState({ count: 5, startNumber: 1, capacity: 4, location: 'indoor', generateQR: true });
  const [deleteTable_, setDeleteTable_] = useState(null);

  /* menu */
  const [menuItems, setMenuItems] = useState([]);
  const [menuCats, setMenuCats] = useState([]);
  const [mLoading, setMLoading] = useState(false);
  const [menuSearch, setMenuSearch] = useState('');
  const dMenuSearch = useDebouncedValue(menuSearch, 250);
  const [menuCat, setMenuCat] = useState('all');
  const [menuAvail, setMenuAvail] = useState('all');
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [selMenu, setSelMenu] = useState(null);
  const [menuForm, setMenuForm] = useState({ name: '', category: '', price: '', description: '', isAvailable: true, preparationTime: '' });
  const [menuFormErr, setMenuFormErr] = useState({});
  const [menuImageFile, setMenuImageFile] = useState(null);
  const [menuImagePreview, setMenuImagePreview] = useState(null);
  const [deleteMenu_, setDeleteMenu_] = useState(null);
  const [bulkToggle_, setBulkToggle_] = useState(null); // { isAvailable }

  const setAct = (key, val) => setActionLoading((p) => ({ ...p, [key]: val }));

  /* ── Tables API ── */
  const fetchTables = useCallback(async () => {
    if (!hotelId) return;
    setTLoading(true);
    try {
      const res = await getTables({ hotelId });
      const data = res.data.data || [];
      setTables(data);
      if (data[0]?.hotel?.name) setHotelName(data[0].hotel.name);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to load tables');
    } finally {
      setTLoading(false);
    }
  }, [hotelId]);

  useEffect(() => {
    if (tab === 'tables') fetchTables();
  }, [tab, fetchTables]);

  const handleTableSubmit = async (e) => {
    e.preventDefault();
    if (!tableForm.tableNumber.trim()) {
      setTableFormErr({ tableNumber: 'Table number is required' });
      return;
    }
    setAct('submit', true);
    try {
      if (selTable) {
        await updateTable(selTable._id, tableForm);
        toast.success('Table updated');
      } else {
        await createTable({ ...tableForm, hotelId });
        toast.success('Table created');
      }
      setShowTableModal(false);
      setSelTable(null);
      fetchTables();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setAct('submit', false);
    }
  };

  const handleBatchCreate = async (e) => {
    e.preventDefault();
    setAct('batch', true);
    try {
      const res = await batchCreateTables({ ...batchForm, hotelId });
      toast.success(`${res.data.createdCount || batchForm.count} tables created`);
      setShowBatchModal(false);
      fetchTables();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Batch failed');
    } finally {
      setAct('batch', false);
    }
  };

  const confirmDelTable = async () => {
    if (!deleteTable_) return;
    setAct('delTable', true);
    try {
      await deleteTable(deleteTable_._id);
      toast.success('Table deleted');
      setDeleteTable_(null);
      fetchTables();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    } finally {
      setAct('delTable', false);
    }
  };

  const handleStatusChange = async (id, status) => {
    setAct(`s_${id}`, true);
    try {
      await updateTableStatus(id, status);
      toast.success(`Status → ${status}`);
      fetchTables();
    } catch {
      toast.error('Status update failed');
    } finally {
      setAct(`s_${id}`, false);
    }
  };

  const handleGenQR = async (id) => {
    setAct(`qr_${id}`, true);
    try {
      await generateTableQR(id);
      toast.success('QR generated');
      fetchTables();
    } catch {
      toast.error('QR generation failed');
    } finally {
      setAct(`qr_${id}`, false);
    }
  };

  const openTableEdit = (t) => {
    setSelTable(t);
    setTableForm({ tableNumber: t.tableNumber || '', tableName: t.tableName || '', capacity: t.capacity || 4, location: t.location || 'indoor', description: t.description || '', minSpend: t.minSpend || 0, status: t.status || 'available' });
    setTableFormErr({});
    setShowTableModal(true);
  };
  const openTableCreate = () => {
    setSelTable(null);
    setTableForm({ tableNumber: '', tableName: '', capacity: 4, location: 'indoor', description: '', minSpend: 0, status: 'available' });
    setTableFormErr({});
    setShowTableModal(true);
  };

  /* ── Menu API ── */
  const fetchMenu = useCallback(async () => {
    if (!hotelId) return;
    setMLoading(true);
    try {
      const [mRes, cRes] = await Promise.all([getMenuItems({ hotelId, available: 'all' }), getMenuCategories()]);
      setMenuItems(mRes.data.menuItems || []);
      setMenuCats(cRes.data.categories || []);
    } catch {
      toast.error('Failed to load menu');
    } finally {
      setMLoading(false);
    }
  }, [hotelId]);

  useEffect(() => {
    if (tab === 'menu') fetchMenu();
  }, [tab, fetchMenu]);

  const handleMenuSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!menuForm.name.trim()) errs.name = 'Item name is required';
    if (!menuForm.category) errs.category = 'Category is required';
    if (menuForm.price === '' || Number(menuForm.price) < 0) errs.price = 'Valid price required';
    if (Object.keys(errs).length) {
      setMenuFormErr(errs);
      return;
    }
    setAct('msubmit', true);
    try {
      const payload = { ...menuForm, hotelId, price: Number(menuForm.price), imageFile: menuImageFile };
      if (selMenu) {
        await updateMenuItem(selMenu._id, payload);
        toast.success('Menu item updated');
      } else {
        await createMenuItem(payload);
        toast.success('Menu item created');
      }
      setShowMenuModal(false);
      setSelMenu(null);
      setMenuImageFile(null);
      setMenuImagePreview(null);
      fetchMenu();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setAct('msubmit', false);
    }
  };

  const handleMenuImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB');
      return;
    }
    setMenuImageFile(file);
    setMenuImagePreview(URL.createObjectURL(file));
  };

  const confirmDelMenu = async () => {
    if (!deleteMenu_) return;
    setAct('delMenu', true);
    try {
      await deleteMenuItem(deleteMenu_._id);
      toast.success('Deleted');
      setDeleteMenu_(null);
      fetchMenu();
    } catch {
      toast.error('Delete failed');
    } finally {
      setAct('delMenu', false);
    }
  };

  const confirmBulkToggle = async () => {
    if (!bulkToggle_) return;
    setAct('bulkToggle', true);
    try {
      const res = await bulkToggleAvailability({ hotelId, isAvailable: bulkToggle_.isAvailable });
      toast.success(res.data.message || 'Availability updated');
      setBulkToggle_(null);
      fetchMenu();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update availability');
    } finally {
      setAct('bulkToggle', false);
    }
  };

  const openMenuEdit = (item) => {
    setSelMenu(item);
    setMenuForm({ name: item.name || '', category: item.category || '', price: item.price || '', description: item.description || '', isAvailable: item.isAvailable !== false, preparationTime: item.preparationTime || '' });
    setMenuFormErr({});
    setMenuImageFile(null);
    setMenuImagePreview(item.image || null);
    setShowMenuModal(true);
  };
  const openMenuCreate = () => {
    setSelMenu(null);
    setMenuForm({ name: '', category: '', price: '', description: '', isAvailable: true, preparationTime: '' });
    setMenuFormErr({});
    setMenuImageFile(null);
    setMenuImagePreview(null);
    setShowMenuModal(true);
  };

  /* ── Derived ── */
  const filteredTables = useMemo(() => {
    const q = dTableSearch.toLowerCase();
    return tables.filter((t) => {
      const matchSearch = !q || t.tableNumber.toLowerCase().includes(q) || (t.tableName || '').toLowerCase().includes(q);
      const matchLoc = tableLoc === 'all' || t.location === tableLoc;
      const matchSt = tableStatus === 'all' || t.status === tableStatus;
      return matchSearch && matchLoc && matchSt;
    });
  }, [tables, dTableSearch, tableLoc, tableStatus]);

  const filteredMenu = useMemo(() => {
    const q = dMenuSearch.toLowerCase();
    return menuItems.filter((m) => {
      const matchS = !q || m.name.toLowerCase().includes(q);
      const matchC = menuCat === 'all' || m.category === menuCat;
      const matchA = menuAvail === 'all' || (menuAvail === 'available' ? m.isAvailable : !m.isAvailable);
      return matchS && matchC && matchA;
    });
  }, [menuItems, dMenuSearch, menuCat, menuAvail]);

  const tableStats = useMemo(
    () => ({
      total: tables.length,
      available: tables.filter((t) => t.status === 'available').length,
      occupied: tables.filter((t) => t.status === 'occupied').length,
      withQR: tables.filter((t) => t.qrCodeData).length,
    }),
    [tables]
  );

  return (
    <div className="ha-page">
      <PageHeader
        title="Restaurant"
        subtitle="Tables, menu items, and kitchen overview."
        toolbar={<Segmented options={TABS} value={tab} onChange={setTab} ariaLabel="Restaurant view" />}
      />

      {/* ══ TABLES TAB ══ */}
      {tab === 'tables' && (
        <>
          <div className="ha-toolbar" style={{ marginBottom: 20 }}>
            <div className="ha-toolbar__group">
              <SearchInput value={tableSearch} onChange={(e) => setTableSearch(e.target.value)} placeholder="Search tables…" ariaLabel="Search tables" />
              <Select value={tableLoc} onChange={(e) => setTableLoc(e.target.value)} aria-label="Filter by location">
                <option value="all">All Locations</option>
                {LOC_OPTS.map((l) => <option key={l} value={l}>{cap(l)}</option>)}
              </Select>
              <Select value={tableStatus} onChange={(e) => setTableStatus(e.target.value)} aria-label="Filter by status">
                <option value="all">All Status</option>
                {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </Select>
            </div>
            <div className="ha-toolbar__group">
              <Button variant="secondary" onClick={fetchTables} disabled={tLoading}><RefreshCw size={16} aria-hidden="true" /> Refresh</Button>
              <Button variant="secondary" onClick={() => setShowBatchModal(true)}><Rows3 size={16} aria-hidden="true" /> Batch</Button>
              <Button variant="primary" onClick={openTableCreate}><Plus size={16} aria-hidden="true" /> Add Table</Button>
            </div>
          </div>

          <div className="ha-kpi-grid" style={{ marginBottom: 24 }}>
            {tLoading ? (
              Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
            ) : (
              <>
                <StatCard icon={<UtensilsCrossed size={22} />} iconBg="linear-gradient(135deg,#6366f1,#4f46e5)" label="Total Tables" value={tableStats.total} />
                <StatCard icon={<CheckCircle2 size={22} />} iconBg="var(--ha-success)" label="Available" value={tableStats.available} />
                <StatCard icon={<Users size={22} />} iconBg="var(--ha-warning)" label="Occupied" value={tableStats.occupied} />
                <StatCard icon={<QrCode size={22} />} iconBg="var(--ha-info)" label="With QR" value={tableStats.withQR} />
              </>
            )}
          </div>

          {tLoading ? null : filteredTables.length === 0 ? (
            <EmptyState icon={<UtensilsCrossed size={26} />} title="No tables found" description="Add your first table or adjust filters." action={<Button variant="primary" size="sm" onClick={openTableCreate}><Plus size={15} aria-hidden="true" /> Add Table</Button>} />
          ) : (
            <Table minWidth={780}>
              <THead>
                <th scope="col">Table</th>
                <th scope="col">Location</th>
                <th scope="col">Capacity</th>
                <th scope="col">Status</th>
                <th scope="col">QR</th>
                <th scope="col">Actions</th>
              </THead>
              <tbody>
                {filteredTables.map((t) => (
                  <tr key={t._id}>
                    <td>
                      <div className="ha-body-strong" style={{ color: 'var(--ha-text)' }}>{t.tableName || `Table ${t.tableNumber}`}</div>
                      <div className="ha-small haNum" style={{ color: 'var(--ha-text-subtle)' }}>#{t.tableNumber}</div>
                    </td>
                    <td style={{ textTransform: 'capitalize' }}>{t.location || '—'}</td>
                    <td className="haNum">{t.capacity}</td>
                    <td>
                      <Select value={t.status} onChange={(e) => handleStatusChange(t._id, e.target.value)} disabled={actionLoading[`s_${t._id}`]} aria-label={`Status for table ${t.tableNumber}`}>
                        {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                      </Select>
                    </td>
                    <td>
                      {t.qrCodeData ? (
                        <button type="button" onClick={() => setQrTable(t)} aria-label={`View QR for table ${t.tableNumber}`} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 0 }}>
                          <img src={t.qrCodeData} alt="" style={{ width: 44, height: 44, borderRadius: 6 }} />
                        </button>
                      ) : (
                        <Button size="sm" variant="secondary" onClick={() => handleGenQR(t._id)} disabled={actionLoading[`qr_${t._id}`]}>
                          <QrCode size={14} aria-hidden="true" /> {actionLoading[`qr_${t._id}`] ? '…' : 'Generate'}
                        </Button>
                      )}
                    </td>
                    <td>
                      <div className="ha-table__row-actions">
                        {t.qrCodeData && (
                          <>
                            <IconButton aria-label={`Download QR for table ${t.tableNumber}`} onClick={() => downloadQR(t.qrCodeData, `table-${t.tableNumber}-qr.png`)}><Download size={16} aria-hidden="true" /></IconButton>
                            <IconButton aria-label={`Print QR for table ${t.tableNumber}`} onClick={() => printTableQR(t.qrCodeData, t.tableNumber, hotelName)}><Printer size={16} aria-hidden="true" /></IconButton>
                          </>
                        )}
                        <IconButton aria-label={`Edit table ${t.tableNumber}`} onClick={() => openTableEdit(t)}><Pencil size={16} aria-hidden="true" /></IconButton>
                        <IconButton aria-label={`Delete table ${t.tableNumber}`} onClick={() => setDeleteTable_(t)} style={{ color: 'var(--ha-danger)' }}><Trash2 size={16} aria-hidden="true" /></IconButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </>
      )}

      {/* ══ MENU TAB ══ */}
      {tab === 'menu' && (
        <>
          <div className="ha-toolbar" style={{ marginBottom: 20 }}>
            <div className="ha-toolbar__group">
              <SearchInput value={menuSearch} onChange={(e) => setMenuSearch(e.target.value)} placeholder="Search menu…" ariaLabel="Search menu" />
              <Select value={menuCat} onChange={(e) => setMenuCat(e.target.value)} aria-label="Filter by category">
                <option value="all">All Categories</option>
                {menuCats.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
              <Select value={menuAvail} onChange={(e) => setMenuAvail(e.target.value)} aria-label="Filter by availability">
                <option value="all">All</option>
                <option value="available">Available</option>
                <option value="unavailable">Unavailable</option>
              </Select>
            </div>
            <div className="ha-toolbar__group">
              <Button variant="secondary" onClick={() => setBulkToggle_({ isAvailable: false })} disabled={actionLoading.bulkToggle}><Moon size={16} aria-hidden="true" /> Close Kitchen</Button>
              <Button variant="secondary" onClick={() => setBulkToggle_({ isAvailable: true })} disabled={actionLoading.bulkToggle}><Sun size={16} aria-hidden="true" /> Mark All Available</Button>
              <Button variant="primary" onClick={openMenuCreate}><Plus size={16} aria-hidden="true" /> Add Item</Button>
            </div>
          </div>

          {mLoading ? null : filteredMenu.length === 0 ? (
            <EmptyState icon={<ChefHat size={26} />} title="No menu items" description="Add your first menu item." action={<Button variant="primary" size="sm" onClick={openMenuCreate}><Plus size={15} aria-hidden="true" /> Add Item</Button>} />
          ) : (
            <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))' }}>
              {filteredMenu.map((item) => (
                <div key={item._id} className="ha-card ha-card--pad" style={{ opacity: item.isAvailable ? 1 : 0.7, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <div>
                      <div className="ha-body-strong" style={{ color: 'var(--ha-text)' }}>{item.name}</div>
                      <div className="ha-small" style={{ color: 'var(--ha-text-subtle)' }}>{item.category}</div>
                    </div>
                    <Badge tone={item.isAvailable ? 'success' : 'danger'}>{item.isAvailable ? 'Available' : 'Unavailable'}</Badge>
                  </div>
                  {item.description && <p className="ha-small" style={{ color: 'var(--ha-text-muted)' }}>{item.description}</p>}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', gap: 8 }}>
                    <span className="ha-money haNum" style={{ color: 'var(--ha-text)' }}>Rs. {Number(item.price).toLocaleString('en-IN')}</span>
                    {item.preparationTime && <span className="ha-small haNum" style={{ color: 'var(--ha-text-subtle)' }}><Clock size={12} aria-hidden="true" /> {item.preparationTime}m</span>}
                    <div className="ha-table__row-actions">
                      <IconButton aria-label={`Edit ${item.name}`} onClick={() => openMenuEdit(item)}><Pencil size={16} aria-hidden="true" /></IconButton>
                      <IconButton aria-label={`Delete ${item.name}`} onClick={() => setDeleteMenu_(item)} style={{ color: 'var(--ha-danger)' }}><Trash2 size={16} aria-hidden="true" /></IconButton>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ══ KITCHEN TAB ══ */}
      {tab === 'kitchen' && (
        <EmptyState
          icon={<ChefHat size={26} />}
          title="Kitchen Display"
          description="Live kitchen orders are managed in the Orders section. Switch to Orders for full kitchen controls."
          action={<Button variant="primary" size="sm" onClick={() => onNavigate?.('orders')}>Go to Orders <ArrowRight size={15} aria-hidden="true" /></Button>}
        />
      )}

      {/* Table modal */}
      <Modal
        isOpen={showTableModal}
        onClose={() => setShowTableModal(false)}
        title={selTable ? 'Edit Table' : 'Add New Table'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowTableModal(false)} disabled={actionLoading.submit}>Cancel</Button>
            <Button variant="primary" onClick={handleTableSubmit} disabled={actionLoading.submit}>{actionLoading.submit ? 'Saving…' : selTable ? 'Update Table' : 'Create Table'}</Button>
          </>
        }
      >
        <form onSubmit={handleTableSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 16 }}>
          <Input label="Table Number" required value={tableForm.tableNumber} onChange={(e) => { setTableForm((p) => ({ ...p, tableNumber: e.target.value })); setTableFormErr({}); }} placeholder="e.g. 1, A1, VIP-1" error={tableFormErr.tableNumber} />
          <Input label="Table Name" value={tableForm.tableName} onChange={(e) => setTableForm((p) => ({ ...p, tableName: e.target.value }))} placeholder="e.g. Corner Table" />
          <Input label="Capacity" required type="number" min="1" max="50" value={tableForm.capacity} onChange={(e) => setTableForm((p) => ({ ...p, capacity: +e.target.value }))} />
          <Input label="Min Spend (NPR)" type="number" min="0" value={tableForm.minSpend} onChange={(e) => setTableForm((p) => ({ ...p, minSpend: +e.target.value }))} />
          <Select label="Location" value={tableForm.location} onChange={(e) => setTableForm((p) => ({ ...p, location: e.target.value }))}>
            {LOC_OPTS.map((l) => <option key={l} value={l}>{cap(l)}</option>)}
          </Select>
          <Select label="Status" value={tableForm.status} onChange={(e) => setTableForm((p) => ({ ...p, status: e.target.value }))}>
            {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </Select>
          <div style={{ gridColumn: '1 / -1' }}>
            <Textarea label="Description" rows="2" value={tableForm.description} onChange={(e) => setTableForm((p) => ({ ...p, description: e.target.value }))} placeholder="Optional notes" />
          </div>
        </form>
      </Modal>

      {/* Batch modal */}
      <Modal
        isOpen={showBatchModal}
        onClose={() => setShowBatchModal(false)}
        title="Batch Create Tables"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowBatchModal(false)} disabled={actionLoading.batch}>Cancel</Button>
            <Button variant="primary" onClick={handleBatchCreate} disabled={actionLoading.batch}>{actionLoading.batch ? 'Creating…' : `Create ${batchForm.count} Tables`}</Button>
          </>
        }
      >
        <form onSubmit={handleBatchCreate} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Input label="Number of Tables" type="number" min="1" max="50" value={batchForm.count} onChange={(e) => setBatchForm((p) => ({ ...p, count: +e.target.value }))} />
            <Input label="Starting Number" type="number" min="1" value={batchForm.startNumber} onChange={(e) => setBatchForm((p) => ({ ...p, startNumber: +e.target.value }))} />
            <Input label="Default Capacity" type="number" min="1" max="20" value={batchForm.capacity} onChange={(e) => setBatchForm((p) => ({ ...p, capacity: +e.target.value }))} />
            <Select label="Location" value={batchForm.location} onChange={(e) => setBatchForm((p) => ({ ...p, location: e.target.value }))}>
              {LOC_OPTS.map((l) => <option key={l} value={l}>{cap(l)}</option>)}
            </Select>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--ha-text-muted)' }}>
            <input type="checkbox" checked={batchForm.generateQR} onChange={(e) => setBatchForm((p) => ({ ...p, generateQR: e.target.checked }))} />
            Generate QR codes automatically
          </label>
          <div className="ha-card" style={{ padding: '10px 12px', color: 'var(--ha-text-subtle)', fontSize: 13 }}>
            Will create tables <strong className="haNum">{batchForm.startNumber}</strong> → <strong className="haNum">{batchForm.startNumber + batchForm.count - 1}</strong>
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
              <Button variant="secondary" onClick={() => downloadQR(qrTable.qrCodeData, `table-${qrTable.tableNumber}-qr.png`)}><Download size={16} aria-hidden="true" /> Download</Button>
              <Button variant="primary" onClick={() => printTableQR(qrTable.qrCodeData, qrTable.tableNumber, hotelName)}><Printer size={16} aria-hidden="true" /> Print</Button>
            </>
          )
        }
      >
        {qrTable?.qrCodeData ? (
          <div style={{ textAlign: 'center' }}>
            {hotelName && <p className="ha-small" style={{ color: 'var(--ha-text-subtle)' }}>{hotelName}</p>}
            <h3 className="ha-h3" style={{ margin: '4px 0 16px' }}>Table {qrTable.tableNumber}</h3>
            <img src={qrTable.qrCodeData} alt="QR Code" style={{ width: 220, height: 220, borderRadius: 'var(--ha-radius-md)' }} />
            {qrTable.uniqueToken && <p className="ha-small" style={{ color: 'var(--ha-text-subtle)', marginTop: 12 }}>Token: <code>{qrTable.uniqueToken}</code></p>}
          </div>
        ) : (
          <p className="ha-body">No QR code generated yet.</p>
        )}
      </Modal>

      {/* Menu modal */}
      <Modal
        isOpen={showMenuModal}
        onClose={() => setShowMenuModal(false)}
        title={selMenu ? 'Edit Menu Item' : 'Add Menu Item'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowMenuModal(false)} disabled={actionLoading.msubmit}>Cancel</Button>
            <Button variant="primary" onClick={handleMenuSubmit} disabled={actionLoading.msubmit}>{actionLoading.msubmit ? 'Saving…' : selMenu ? 'Update Item' : 'Add Item'}</Button>
          </>
        }
      >
        <form onSubmit={handleMenuSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 16 }}>
          <Input label="Item Name" required value={menuForm.name} onChange={(e) => { setMenuForm((p) => ({ ...p, name: e.target.value })); setMenuFormErr((p) => ({ ...p, name: undefined })); }} placeholder="e.g. Chicken Burger" error={menuFormErr.name} />
          <Select label="Category" required value={menuForm.category} onChange={(e) => { setMenuForm((p) => ({ ...p, category: e.target.value })); setMenuFormErr((p) => ({ ...p, category: undefined })); }} error={menuFormErr.category}>
            <option value="" disabled>Select category…</option>
            {menuCats.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
          <Input label="Price (NPR)" required type="number" min="0" value={menuForm.price} onChange={(e) => { setMenuForm((p) => ({ ...p, price: e.target.value })); setMenuFormErr((p) => ({ ...p, price: undefined })); }} error={menuFormErr.price} />
          <Input label="Prep Time (min)" type="number" min="0" value={menuForm.preparationTime} onChange={(e) => setMenuForm((p) => ({ ...p, preparationTime: e.target.value }))} />
          <div style={{ gridColumn: '1 / -1' }}>
            <Textarea label="Description" rows="2" value={menuForm.description} onChange={(e) => setMenuForm((p) => ({ ...p, description: e.target.value }))} placeholder="Describe the item" />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <span className="ha-field__label" style={{ display: 'block', marginBottom: 6 }}>Item Photo</span>
            <input type="file" accept="image/jpeg,image/png,image/jpg,image/webp" onChange={handleMenuImageChange} />
            {menuImagePreview && (
              <img src={menuImagePreview} alt="Menu item preview" style={{ marginTop: 8, width: 120, height: 90, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--ha-border)' }} />
            )}
          </div>
          <label style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--ha-text-muted)' }}>
            <input type="checkbox" checked={menuForm.isAvailable} onChange={(e) => setMenuForm((p) => ({ ...p, isAvailable: e.target.checked }))} />
            Mark as Available
          </label>
        </form>
      </Modal>

      {/* Confirmations */}
      <ConfirmDialog isOpen={!!deleteTable_} onClose={() => setDeleteTable_(null)} onConfirm={confirmDelTable} variant="danger" title="Delete table?" message={deleteTable_ ? `Table ${deleteTable_.tableNumber} will be permanently removed.` : ''} confirmText="Delete Table" loading={actionLoading.delTable} />
      <ConfirmDialog isOpen={!!deleteMenu_} onClose={() => setDeleteMenu_(null)} onConfirm={confirmDelMenu} variant="danger" title="Delete menu item?" message={deleteMenu_ ? `"${deleteMenu_.name}" will be permanently removed from the menu.` : ''} confirmText="Delete Item" loading={actionLoading.delMenu} />
      <ConfirmDialog
        isOpen={!!bulkToggle_}
        onClose={() => setBulkToggle_(null)}
        onConfirm={confirmBulkToggle}
        variant={bulkToggle_?.isAvailable ? 'info' : 'warning'}
        title={bulkToggle_?.isAvailable ? 'Mark all items available?' : 'Close the kitchen?'}
        message={bulkToggle_?.isAvailable ? 'Every menu item will be marked available.' : 'Every menu item will be marked unavailable until you reopen the kitchen.'}
        confirmText={bulkToggle_?.isAvailable ? 'Mark All Available' : 'Close Kitchen'}
        loading={actionLoading.bulkToggle}
      />
    </div>
  );
};

export default RestaurantManagement;
