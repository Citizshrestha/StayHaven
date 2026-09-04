import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { useStaffAuth } from '../../../../core/context/StaffAuthContext';
import {
  getTables, createTable, updateTable, deleteTable, updateTableStatus, generateTableQR, batchCreateTables
} from '../services/tableApi';
import {
  getMenuItems, getMenuCategories, createMenuItem, updateMenuItem, deleteMenuItem, bulkToggleAvailability
} from '../services/menuApi';
import './RestaurantManagement.css';

/* ─── helpers ─── */
const downloadQR = (data, filename) => {
  const a = document.createElement('a');
  a.href = data; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
};

const printTableQR = (data, tableNumber, hotelName) => {
  const w = window.open('', '_blank');
  w.document.write(`<!DOCTYPE html><html><head><title>Table ${tableNumber} QR</title>
  <style>body{display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;font-family:system-ui,sans-serif;background:#f8fafc}
  .box{padding:40px;background:#fff;border-radius:16px;box-shadow:0 4px 20px rgba(0,0,0,.1);text-align:center}
  h1{font-size:28px;font-weight:700;color:#1e293b;margin:0 0 20px}p{color:#64748b;margin:0 0 8px}img{width:200px;height:200px}
  @media print{body{background:#fff}.box{box-shadow:none}}</style></head>
  <body><div class="box"><p>${hotelName}</p><h1>Table ${tableNumber}</h1>
  <img src="${data}" alt="QR"/><p style="margin-top:16px">Scan to view menu &amp; order</p></div>
  <script>window.onload=()=>{window.print();window.onafterprint=()=>window.close()}<\/script>
  </body></html>`);
  w.document.close();
};

const STATUS_META = {
  available:   { label: 'Available',   color: '#10b981', bg: 'rgba(16,185,129,.12)' },
  occupied:    { label: 'Occupied',    color: '#f59e0b', bg: 'rgba(245,158,11,.12)' },
  reserved:    { label: 'Reserved',    color: '#6366f1', bg: 'rgba(99,102,241,.12)' },
  maintenance: { label: 'Maintenance', color: '#ef4444', bg: 'rgba(239,68,68,.12)' },
};

const LOC_OPTS = ['indoor','outdoor','terrace','rooftop','private','bar'];

/* ══════════════════════════════════════════════════════════════════ */
const RestaurantManagement = ({ embedded = false }) => {
  const { activeProperty } = useStaffAuth();
  const hotelId = activeProperty?._id || activeProperty;

  const [tab, setTab] = useState('tables');

  /* ── tables state ── */
  const [tables, setTables]           = useState([]);
  const [tLoading, setTLoading]       = useState(false);
  const [actionLoading, setAL]        = useState({});
  const [showTableModal, setSTableM]  = useState(false);
  const [showBatchModal, setSBatchM]  = useState(false);
  const [showQRModal, setSQRM]        = useState(false);
  const [selTable, setSelTable]       = useState(null);
  const [hotelName, setHotelName]     = useState('');
  const [tableSearch, setTSearch]     = useState('');
  const [tableLoc, setTLoc]           = useState('all');
  const [tableStatus, setTStatus]     = useState('all');
  const [tableForm, setTForm]         = useState({ tableNumber:'', tableName:'', capacity:4, location:'indoor', description:'', minSpend:0, status:'available' });
  const [batchForm, setBForm]         = useState({ count:5, startNumber:1, capacity:4, location:'indoor', generateQR:true });

  /* ── menu state ── */
  const [menuItems, setMenuItems]     = useState([]);
  const [menuCats, setMenuCats]       = useState([]);
  const [mLoading, setMLoading]       = useState(false);
  const [menuSearch, setMSearch]      = useState('');
  const [menuCat, setMCat]            = useState('all');
  const [menuAvail, setMAvail]        = useState('all');
  const [showMenuModal, setSMenuM]    = useState(false);
  const [selMenu, setSelMenu]         = useState(null);
  const [menuForm, setMForm]          = useState({ name:'', category:'', price:'', description:'', isAvailable:true, preparationTime:'' });
  const [menuImageFile, setMImgFile]  = useState(null);
  const [menuImagePreview, setMImgPrev] = useState(null);

  /* ── kitchen state ── */
  const [kOrders, setKOrders]         = useState([]);

  /* ─────────────── TABLE API ─────────────── */
  const fetchTables = useCallback(async () => {
    if (!hotelId) return;
    setTLoading(true);
    try {
      const res = await getTables({ hotelId });
      const data = res.data.data || [];
      setTables(data);
      if (data[0]?.hotel?.name) setHotelName(data[0].hotel.name);
    } catch (e) { toast.error(e.response?.data?.message || 'Failed to load tables'); }
    finally { setTLoading(false); }
  }, [hotelId]);

  useEffect(() => { if (tab === 'tables') fetchTables(); }, [tab, fetchTables]);

  const setAct = (key, val) => setAL(p => ({ ...p, [key]: val }));

  const handleTableSubmit = async (e) => {
    e.preventDefault();
    setAct('submit', true);
    try {
      if (selTable) {
        await updateTable(selTable._id, tableForm);
        toast.success('Table updated');
      } else {
        await createTable({ ...tableForm, hotelId });
        toast.success('Table created');
      }
      setSTableM(false); setSelTable(null);
      fetchTables();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
    finally { setAct('submit', false); }
  };

  const handleBatchCreate = async (e) => {
    e.preventDefault();
    setAct('batch', true);
    try {
      const res = await batchCreateTables({ ...batchForm, hotelId });
      toast.success(`${res.data.createdCount || batchForm.count} tables created`);
      setSBatchM(false); fetchTables();
    } catch (e) { toast.error(e.response?.data?.message || 'Batch failed'); }
    finally { setAct('batch', false); }
  };

  const handleDelTable = async (id, num) => {
    if (!window.confirm(`Delete Table ${num}?`)) return;
    setAct(id, true);
    try {
      await deleteTable(id); toast.success('Table deleted'); fetchTables();
    } catch (e) { toast.error(e.response?.data?.message || 'Delete failed'); }
    finally { setAct(id, false); }
  };

  const handleStatusChange = async (id, status) => {
    setAct(`s_${id}`, true);
    try {
      await updateTableStatus(id, status); toast.success(`Status → ${status}`); fetchTables();
    } catch (e) { toast.error('Status update failed'); }
    finally { setAct(`s_${id}`, false); }
  };

  const handleGenQR = async (id) => {
    setAct(`qr_${id}`, true);
    try {
      await generateTableQR(id); toast.success('QR generated'); fetchTables();
    } catch (e) { toast.error('QR generation failed'); }
    finally { setAct(`qr_${id}`, false); }
  };

  const openEdit = (t) => {
    setSelTable(t);
    setTForm({ tableNumber:t.tableNumber||'', tableName:t.tableName||'', capacity:t.capacity||4,
      location:t.location||'indoor', description:t.description||'', minSpend:t.minSpend||0, status:t.status||'available' });
    setSTableM(true);
  };

  const openCreate = () => {
    setSelTable(null);
    setTForm({ tableNumber:'', tableName:'', capacity:4, location:'indoor', description:'', minSpend:0, status:'available' });
    setSTableM(true);
  };

  /* ─────────────── MENU API ─────────────── */
  const fetchMenu = useCallback(async () => {
    if (!hotelId) return;
    setMLoading(true);
    try {
      const [mRes, cRes] = await Promise.all([
        getMenuItems({ hotelId, available: 'all' }),
        getMenuCategories()
      ]);
      setMenuItems(mRes.data.menuItems || []);
      setMenuCats(cRes.data.categories || []);
    } catch (e) { toast.error('Failed to load menu'); }
    finally { setMLoading(false); }
  }, [hotelId]);

  useEffect(() => { if (tab === 'menu') fetchMenu(); }, [tab, fetchMenu]);

  const handleMenuSubmit = async (e) => {
    e.preventDefault();
    setAct('msubmit', true);
    try {
      const payload = { ...menuForm, hotelId, price: Number(menuForm.price), imageFile: menuImageFile };
      if (selMenu) {
        await updateMenuItem(selMenu._id, payload); toast.success('Menu item updated');
      } else {
        await createMenuItem(payload); toast.success('Menu item created');
      }
      setSMenuM(false); setSelMenu(null); setMImgFile(null); setMImgPrev(null); fetchMenu();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
    finally { setAct('msubmit', false); }
  };

  const handleMenuImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5MB'); return; }
    setMImgFile(file);
    setMImgPrev(URL.createObjectURL(file));
  };

  const handleDelMenu = async (id, name) => {
    if (!window.confirm(`Delete "${name}"?`)) return;
    setAct(`m_${id}`, true);
    try {
      await deleteMenuItem(id); toast.success('Deleted'); fetchMenu();
    } catch (e) { toast.error('Delete failed'); }
    finally { setAct(`m_${id}`, false); }
  };

  const handleBulkToggle = async (isAvailable) => {
    const label = isAvailable ? 'mark ALL menu items as available' : 'close the kitchen (mark ALL items unavailable)';
    if (!window.confirm(`Are you sure you want to ${label}?`)) return;
    setAct('bulkToggle', true);
    try {
      const res = await bulkToggleAvailability({ hotelId, isAvailable });
      toast.success(res.data.message || 'Availability updated');
      fetchMenu();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed to update availability'); }
    finally { setAct('bulkToggle', false); }
  };

  const openMenuEdit = (item) => {
    setSelMenu(item);
    setMForm({ name:item.name||'', category:item.category||'', price:item.price||'',
      description:item.description||'', isAvailable:item.isAvailable!==false,
      preparationTime:item.preparationTime||'' });
    setMImgFile(null); setMImgPrev(item.image || null);
    setSMenuM(true);
  };
  const openMenuCreate = () => {
    setSelMenu(null);
    setMForm({ name:'', category:'', price:'', description:'', isAvailable:true, preparationTime:'' });
    setMImgFile(null); setMImgPrev(null);
    setSMenuM(true);
  };

  /* ─────────────── DERIVED ─────────────── */
  const filteredTables = tables.filter(t => {
    const matchSearch = !tableSearch || t.tableNumber.toLowerCase().includes(tableSearch.toLowerCase()) || (t.tableName||'').toLowerCase().includes(tableSearch.toLowerCase());
    const matchLoc = tableLoc === 'all' || t.location === tableLoc;
    const matchSt = tableStatus === 'all' || t.status === tableStatus;
    return matchSearch && matchLoc && matchSt;
  });

  const filteredMenu = menuItems.filter(m => {
    const matchS = !menuSearch || m.name.toLowerCase().includes(menuSearch.toLowerCase());
    const matchC = menuCat === 'all' || m.category === menuCat;
    const matchA = menuAvail === 'all' || (menuAvail === 'available' ? m.isAvailable : !m.isAvailable);
    return matchS && matchC && matchA;
  });

  const tableStats = {
    total: tables.length,
    available: tables.filter(t=>t.status==='available').length,
    occupied: tables.filter(t=>t.status==='occupied').length,
    reserved: tables.filter(t=>t.status==='reserved').length,
    withQR: tables.filter(t=>t.qrCodeData).length,
  };

  /* ══════════════════════════ RENDER ══════════════════════════ */
  const content = (
    <div className="rm-root">
      {/* ── Page Header ── */}
      <div className="rm-page-header">
        <div className="rm-page-title">
          <div className="rm-title-icon"><svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg></div>
          <div>
            <h1>Restaurant Management</h1>
            <p>Tables, menu items, and kitchen overview</p>
          </div>
        </div>
      </div>

      {/* ── Tab Bar ── */}
      <div className="rm-tabbar">
        {[['tables','Tables & Layout'],['menu','Menu Items'],['kitchen','Kitchen View']].map(([k,l])=>(
          <button key={k} className={`rm-tab${tab===k?' rm-tab--active':''}`} onClick={()=>setTab(k)}>{l}</button>
        ))}
      </div>

      {/* ══ TABLES TAB ══ */}
      {tab === 'tables' && (
        <div className="rm-section">
          {/* Stats */}
          <div className="rm-stats-row">
            {[
              { label:'Total Tables', value:tableStats.total, icon:'🍽️', accent:'#6366f1' },
              { label:'Available',    value:tableStats.available, icon:'✅', accent:'#10b981' },
              { label:'Occupied',     value:tableStats.occupied, icon:'🔴', accent:'#f59e0b' },
              { label:'With QR',      value:tableStats.withQR, icon:'📱', accent:'#3b82f6' },
            ].map(s=>(
              <div key={s.label} className="rm-stat-card" style={{'--accent':s.accent}}>
                <span className="rm-stat-icon">{s.icon}</span>
                <div><div className="rm-stat-val">{s.value}</div><div className="rm-stat-lbl">{s.label}</div></div>
              </div>
            ))}
          </div>

          {/* Controls */}
          <div className="rm-controls">
            <div className="rm-search-wrap">
              <svg className="rm-search-ico" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="11" cy="11" r="8"/><path strokeLinecap="round" d="M21 21l-4.35-4.35"/></svg>
              <input className="rm-search" placeholder="Search tables…" value={tableSearch} onChange={e=>setTSearch(e.target.value)}/>
            </div>
            <select className="rm-select" value={tableLoc} onChange={e=>setTLoc(e.target.value)}>
              <option value="all">All Locations</option>
              {LOC_OPTS.map(l=><option key={l} value={l}>{l.charAt(0).toUpperCase()+l.slice(1)}</option>)}
            </select>
            <select className="rm-select" value={tableStatus} onChange={e=>setTStatus(e.target.value)}>
              <option value="all">All Status</option>
              {Object.entries(STATUS_META).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
            </select>
            <div className="rm-ctrl-actions">
              <button className="rm-btn rm-btn--ghost" onClick={fetchTables} disabled={tLoading}>↺ Refresh</button>
              <button className="rm-btn rm-btn--secondary" onClick={()=>setSBatchM(true)}>⊞ Batch</button>
              <button className="rm-btn rm-btn--primary" onClick={openCreate}>+ Add Table</button>
            </div>
          </div>

          {/* Grid */}
          {tLoading ? <div className="rm-loading"><div className="rm-spinner"/><span>Loading tables…</span></div>
          : filteredTables.length === 0
          ? <div className="rm-empty"><span className="rm-empty-ico">🍽️</span><h3>No tables found</h3><p>Add your first table or adjust filters</p><button className="rm-btn rm-btn--primary" onClick={openCreate}>+ Add Table</button></div>
          : (
            <div className="rm-table-grid">
              {filteredTables.map(t => {
                const sm = STATUS_META[t.status] || STATUS_META.available;
                return (
                  <div key={t._id} className="rm-tcard">
                    <div className="rm-tcard-header">
                      <div className="rm-tcard-num">
                        <span className="rm-tcard-circle" style={{background:sm.bg,color:sm.color}}>{t.tableNumber}</span>
                        <div>
                          <div className="rm-tcard-name">{t.tableName||`Table ${t.tableNumber}`}</div>
                          <div className="rm-tcard-loc">{t.location}</div>
                        </div>
                      </div>
                      <span className="rm-badge" style={{color:sm.color,background:sm.bg}}>{sm.label}</span>
                    </div>

                    <div className="rm-tcard-meta">
                      <span>👥 {t.capacity} guests</span>
                      {t.minSpend>0 && <span>💵 Min: NPR {t.minSpend}</span>}
                      {t.description && <span className="rm-tcard-desc">{t.description}</span>}
                    </div>

                    {/* QR Zone */}
                    <div className="rm-tcard-qr">
                      {t.qrCodeData ? (
                        <div className="rm-qr-preview" onClick={()=>{setSelTable(t);setSQRM(true);}}>
                          <img src={t.qrCodeData} alt="QR"/>
                          <span>View QR</span>
                        </div>
                      ) : (
                        <button className="rm-btn rm-btn--sm rm-btn--ghost" onClick={()=>handleGenQR(t._id)} disabled={actionLoading[`qr_${t._id}`]}>
                          {actionLoading[`qr_${t._id}`]?'Generating…':'📱 Generate QR'}
                        </button>
                      )}
                    </div>

                    {/* Status selector */}
                    <select className="rm-status-sel" value={t.status} onChange={e=>handleStatusChange(t._id,e.target.value)} disabled={actionLoading[`s_${t._id}`]}>
                      {Object.entries(STATUS_META).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
                    </select>

                    {/* Actions */}
                    <div className="rm-tcard-actions">
                      <button className="rm-icon-btn" title="Edit" onClick={()=>openEdit(t)}>✏️</button>
                      {t.qrCodeData && <>
                        <button className="rm-icon-btn" title="Download QR" onClick={()=>downloadQR(t.qrCodeData,`table-${t.tableNumber}-qr.png`)}>⬇️</button>
                        <button className="rm-icon-btn" title="Print QR" onClick={()=>printTableQR(t.qrCodeData,t.tableNumber,hotelName)}>🖨️</button>
                      </>}
                      <button className="rm-icon-btn rm-icon-btn--danger" title="Delete" onClick={()=>handleDelTable(t._id,t.tableNumber)} disabled={actionLoading[t._id]}>🗑️</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══ MENU TAB ══ */}
      {tab === 'menu' && (
        <div className="rm-section">
          <div className="rm-controls">
            <div className="rm-search-wrap">
              <svg className="rm-search-ico" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="11" cy="11" r="8"/><path strokeLinecap="round" d="M21 21l-4.35-4.35"/></svg>
              <input className="rm-search" placeholder="Search menu…" value={menuSearch} onChange={e=>setMSearch(e.target.value)}/>
            </div>
            <select className="rm-select" value={menuCat} onChange={e=>setMCat(e.target.value)}>
              <option value="all">All Categories</option>
              {menuCats.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
            <select className="rm-select" value={menuAvail} onChange={e=>setMAvail(e.target.value)}>
              <option value="all">All</option>
              <option value="available">Available</option>
              <option value="unavailable">Unavailable</option>
            </select>
            <div className="rm-ctrl-actions">
              <button
                className="rm-btn rm-btn--ghost"
                onClick={() => handleBulkToggle(false)}
                disabled={actionLoading.bulkToggle}
                title="Mark every menu item unavailable (e.g. kitchen closed for the night)"
              >
                🌙 Close Kitchen
              </button>
              <button
                className="rm-btn rm-btn--ghost"
                onClick={() => handleBulkToggle(true)}
                disabled={actionLoading.bulkToggle}
                title="Mark every menu item available (e.g. morning reset)"
              >
                ☀️ Mark All Available
              </button>
              <button className="rm-btn rm-btn--ghost" onClick={fetchMenu} disabled={mLoading}>↺ Refresh</button>
              <button className="rm-btn rm-btn--primary" onClick={openMenuCreate}>+ Add Item</button>
            </div>
          </div>

          {mLoading ? <div className="rm-loading"><div className="rm-spinner"/><span>Loading menu…</span></div>
          : filteredMenu.length === 0
          ? <div className="rm-empty"><span className="rm-empty-ico">🍜</span><h3>No menu items</h3><p>Add your first menu item</p><button className="rm-btn rm-btn--primary" onClick={openMenuCreate}>+ Add Item</button></div>
          : (
            <div className="rm-menu-grid">
              {filteredMenu.map(item => (
                <div key={item._id} className={`rm-mcard${!item.isAvailable?' rm-mcard--unavail':''}`}>
                  <div className="rm-mcard-top">
                    <div>
                      <div className="rm-mcard-name">{item.name}</div>
                      <div className="rm-mcard-cat">{item.category}</div>
                    </div>
                    <span className={`rm-badge ${item.isAvailable?'rm-badge--green':'rm-badge--red'}`}>{item.isAvailable?'Available':'Unavailable'}</span>
                  </div>
                  {item.description && <p className="rm-mcard-desc">{item.description}</p>}
                  <div className="rm-mcard-footer">
                    <span className="rm-mcard-price">NPR {Number(item.price).toLocaleString()}</span>
                    {item.preparationTime && <span className="rm-mcard-time">⏱ {item.preparationTime} min</span>}
                    <div className="rm-mcard-acts">
                      <button className="rm-icon-btn" onClick={()=>openMenuEdit(item)}>✏️</button>
                      <button className="rm-icon-btn rm-icon-btn--danger" onClick={()=>handleDelMenu(item._id,item.name)} disabled={actionLoading[`m_${item._id}`]}>🗑️</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══ KITCHEN TAB ══ */}
      {tab === 'kitchen' && (
        <div className="rm-section">
          <div className="rm-kitchen-info">
            <div className="rm-kitchen-icon">👨‍🍳</div>
            <h3>Kitchen Display</h3>
            <p>Live kitchen orders are managed in the Orders section. Switch to Orders for full kitchen controls.</p>
            <button className="rm-btn rm-btn--primary" onClick={()=>{}}>Go to Orders</button>
          </div>
        </div>
      )}

      {/* ══ TABLE MODAL ══ */}
      {showTableModal && (
        <div className="rm-overlay" onClick={()=>setSTableM(false)}>
          <div className="rm-modal" onClick={e=>e.stopPropagation()}>
            <div className="rm-modal-header">
              <h2>{selTable?'Edit Table':'Add New Table'}</h2>
              <button className="rm-modal-close" onClick={()=>setSTableM(false)}>✕</button>
            </div>
            <form onSubmit={handleTableSubmit} className="rm-form">
              <div className="rm-form-row">
                <div className="rm-fg">
                  <label>Table Number *</label>
                  <input required value={tableForm.tableNumber} onChange={e=>setTForm(p=>({...p,tableNumber:e.target.value}))} placeholder="e.g. 1, A1, VIP-1"/>
                </div>
                <div className="rm-fg">
                  <label>Table Name</label>
                  <input value={tableForm.tableName} onChange={e=>setTForm(p=>({...p,tableName:e.target.value}))} placeholder="e.g. Corner Table"/>
                </div>
              </div>
              <div className="rm-form-row">
                <div className="rm-fg">
                  <label>Capacity *</label>
                  <input type="number" required min="1" max="50" value={tableForm.capacity} onChange={e=>setTForm(p=>({...p,capacity:+e.target.value}))}/>
                </div>
                <div className="rm-fg">
                  <label>Min Spend (NPR)</label>
                  <input type="number" min="0" value={tableForm.minSpend} onChange={e=>setTForm(p=>({...p,minSpend:+e.target.value}))}/>
                </div>
              </div>
              <div className="rm-form-row">
                <div className="rm-fg">
                  <label>Location</label>
                  <select value={tableForm.location} onChange={e=>setTForm(p=>({...p,location:e.target.value}))}>
                    {LOC_OPTS.map(l=><option key={l} value={l}>{l.charAt(0).toUpperCase()+l.slice(1)}</option>)}
                  </select>
                </div>
                <div className="rm-fg">
                  <label>Status</label>
                  <select value={tableForm.status} onChange={e=>setTForm(p=>({...p,status:e.target.value}))}>
                    {Object.entries(STATUS_META).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="rm-fg rm-fg--full">
                <label>Description</label>
                <textarea rows="2" value={tableForm.description} onChange={e=>setTForm(p=>({...p,description:e.target.value}))} placeholder="Optional notes"/>
              </div>
              <div className="rm-modal-footer">
                <button type="button" className="rm-btn rm-btn--ghost" onClick={()=>setSTableM(false)}>Cancel</button>
                <button type="submit" className="rm-btn rm-btn--primary" disabled={actionLoading.submit}>
                  {actionLoading.submit?'Saving…':selTable?'Update Table':'Create Table'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ BATCH MODAL ══ */}
      {showBatchModal && (
        <div className="rm-overlay" onClick={()=>setSBatchM(false)}>
          <div className="rm-modal" onClick={e=>e.stopPropagation()}>
            <div className="rm-modal-header">
              <h2>Batch Create Tables</h2>
              <button className="rm-modal-close" onClick={()=>setSBatchM(false)}>✕</button>
            </div>
            <form onSubmit={handleBatchCreate} className="rm-form">
              <div className="rm-form-row">
                <div className="rm-fg">
                  <label>Number of Tables</label>
                  <input type="number" min="1" max="50" value={batchForm.count} onChange={e=>setBForm(p=>({...p,count:+e.target.value}))}/>
                </div>
                <div className="rm-fg">
                  <label>Starting Number</label>
                  <input type="number" min="1" value={batchForm.startNumber} onChange={e=>setBForm(p=>({...p,startNumber:+e.target.value}))}/>
                </div>
              </div>
              <div className="rm-form-row">
                <div className="rm-fg">
                  <label>Default Capacity</label>
                  <input type="number" min="1" max="20" value={batchForm.capacity} onChange={e=>setBForm(p=>({...p,capacity:+e.target.value}))}/>
                </div>
                <div className="rm-fg">
                  <label>Location</label>
                  <select value={batchForm.location} onChange={e=>setBForm(p=>({...p,location:e.target.value}))}>
                    {LOC_OPTS.map(l=><option key={l} value={l}>{l.charAt(0).toUpperCase()+l.slice(1)}</option>)}
                  </select>
                </div>
              </div>
              <label className="rm-checkbox">
                <input type="checkbox" checked={batchForm.generateQR} onChange={e=>setBForm(p=>({...p,generateQR:e.target.checked}))}/>
                <span>Generate QR codes automatically</span>
              </label>
              <div className="rm-batch-preview">
                Will create tables <strong>{batchForm.startNumber}</strong> → <strong>{batchForm.startNumber+batchForm.count-1}</strong>
              </div>
              <div className="rm-modal-footer">
                <button type="button" className="rm-btn rm-btn--ghost" onClick={()=>setSBatchM(false)}>Cancel</button>
                <button type="submit" className="rm-btn rm-btn--primary" disabled={actionLoading.batch}>
                  {actionLoading.batch?'Creating…':`Create ${batchForm.count} Tables`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ QR VIEW MODAL ══ */}
      {showQRModal && selTable && (
        <div className="rm-overlay" onClick={()=>setSQRM(false)}>
          <div className="rm-modal rm-modal--qr" onClick={e=>e.stopPropagation()}>
            <div className="rm-modal-header">
              <h2>Table {selTable.tableNumber} QR Code</h2>
              <button className="rm-modal-close" onClick={()=>setSQRM(false)}>✕</button>
            </div>
            <div className="rm-qr-view">
              {selTable.qrCodeData ? <>
                <img src={selTable.qrCodeData} alt="QR Code" className="rm-qr-big"/>
                <p className="rm-qr-token">Token: {selTable.uniqueToken}</p>
                <div className="rm-modal-footer">
                  <button className="rm-btn rm-btn--ghost" onClick={()=>downloadQR(selTable.qrCodeData,`table-${selTable.tableNumber}-qr.png`)}>⬇️ Download</button>
                  <button className="rm-btn rm-btn--primary" onClick={()=>printTableQR(selTable.qrCodeData,selTable.tableNumber,hotelName)}>🖨️ Print</button>
                </div>
              </> : <p>No QR code generated yet</p>}
            </div>
          </div>
        </div>
      )}

      {/* ══ MENU MODAL ══ */}
      {showMenuModal && (
        <div className="rm-overlay" onClick={()=>setSMenuM(false)}>
          <div className="rm-modal" onClick={e=>e.stopPropagation()}>
            <div className="rm-modal-header">
              <h2>{selMenu?'Edit Menu Item':'Add Menu Item'}</h2>
              <button className="rm-modal-close" onClick={()=>setSMenuM(false)}>✕</button>
            </div>
            <form onSubmit={handleMenuSubmit} className="rm-form">
              <div className="rm-form-row">
                <div className="rm-fg">
                  <label>Item Name *</label>
                  <input required value={menuForm.name} onChange={e=>setMForm(p=>({...p,name:e.target.value}))} placeholder="e.g. Chicken Burger"/>
                </div>
                <div className="rm-fg">
                  <label>Category *</label>
                  <select required value={menuForm.category} onChange={e=>setMForm(p=>({...p,category:e.target.value}))}>
                    <option value="" disabled>Select category…</option>
                    {menuCats.map(c=><option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="rm-form-row">
                <div className="rm-fg">
                  <label>Price (NPR) *</label>
                  <input required type="number" min="0" value={menuForm.price} onChange={e=>setMForm(p=>({...p,price:e.target.value}))}/>
                </div>
                <div className="rm-fg">
                  <label>Prep Time (min)</label>
                  <input type="number" min="0" value={menuForm.preparationTime} onChange={e=>setMForm(p=>({...p,preparationTime:e.target.value}))}/>
                </div>
              </div>
              <div className="rm-fg rm-fg--full">
                <label>Description</label>
                <textarea rows="2" value={menuForm.description} onChange={e=>setMForm(p=>({...p,description:e.target.value}))} placeholder="Describe the item"/>
              </div>
              <div className="rm-fg rm-fg--full">
                <label>Item Photo</label>
                <input type="file" accept="image/jpeg,image/png,image/jpg,image/webp" onChange={handleMenuImageChange}/>
                {menuImagePreview && (
                  <img
                    src={menuImagePreview}
                    alt="Menu item preview"
                    style={{ marginTop: 8, width: 120, height: 90, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border-color, #e2e8f0)' }}
                  />
                )}
              </div>
              <label className="rm-checkbox">
                <input type="checkbox" checked={menuForm.isAvailable} onChange={e=>setMForm(p=>({...p,isAvailable:e.target.checked}))}/>
                <span>Mark as Available</span>
              </label>
              <div className="rm-modal-footer">
                <button type="button" className="rm-btn rm-btn--ghost" onClick={()=>setSMenuM(false)}>Cancel</button>
                <button type="submit" className="rm-btn rm-btn--primary" disabled={actionLoading.msubmit}>
                  {actionLoading.msubmit?'Saving…':selMenu?'Update Item':'Add Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );

  if (embedded) return content;
  return content;
};

export default RestaurantManagement;
