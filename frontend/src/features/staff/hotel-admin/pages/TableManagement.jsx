import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { useStaffAuth } from '../../../../core/context/StaffAuthContext';
import {
  getTables, createTable, updateTable, deleteTable,
  generateTableQR, updateTableStatus, batchCreateTables
} from '../services/tableApi';
import './TableManagement.css';

/* ─── QR utilities ─── */
const downloadQRCode = (base64Data, filename) => {
  const link = document.createElement('a');
  link.href = base64Data; link.download = filename;
  document.body.appendChild(link); link.click(); document.body.removeChild(link);
};

const printQRCode = (base64Data, tableNumber, hotelName) => {
  const w = window.open('', '_blank');
  w.document.write(`<!DOCTYPE html><html><head><title>Table ${tableNumber}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f8fafc;font-family:system-ui,sans-serif}
    .box{background:#fff;border-radius:20px;box-shadow:0 8px 40px rgba(0,0,0,.12);padding:40px 48px;text-align:center}
    .hotel{font-size:14px;color:#64748b;margin-bottom:6px;font-weight:500}
    .num{font-size:32px;font-weight:800;color:#1e293b;margin-bottom:24px}
    .qr{width:220px;height:220px;border-radius:12px}
    .hint{margin-top:20px;font-size:13px;color:#94a3b8}
    @media print{body{background:#fff}.box{box-shadow:none}}
  </style></head><body>
  <div class="box">
    <p class="hotel">${hotelName}</p>
    <h1 class="num">Table ${tableNumber}</h1>
    <img src="${base64Data}" class="qr" alt="QR"/>
    <p class="hint">Scan to view menu &amp; place your order</p>
  </div>
  <script>window.onload=()=>{window.print();window.onafterprint=()=>window.close()}<\/script>
  </body></html>`);
  w.document.close();
};

const LOC_OPTS = [
  { value:'', label:'All Locations' },
  { value:'indoor', label:'Indoor' },
  { value:'outdoor', label:'Outdoor' },
  { value:'terrace', label:'Terrace' },
  { value:'rooftop', label:'Rooftop' },
  { value:'private', label:'Private' },
  { value:'bar', label:'Bar' },
];

const STATUS_META = {
  available:   { label:'Available', dot:'#10b981', bg:'rgba(16,185,129,.12)' },
  occupied:    { label:'Occupied', dot:'#f59e0b', bg:'rgba(245,158,11,.12)' },
  reserved:    { label:'Reserved', dot:'#6366f1', bg:'rgba(99,102,241,.12)' },
  maintenance: { label:'Maintenance', dot:'#ef4444', bg:'rgba(239,68,68,.12)' },
};

/* ══════════════════════════════════════════════════════════════════ */
const TableManagement = () => {
  const { activeProperty } = useStaffAuth();
  const hotelId = activeProperty?._id || activeProperty;

  const [tables, setTables]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [actionLoading, setAL]      = useState({});
  const [hotelName, setHotelName]   = useState('');

  // filters
  const [search, setSearch]         = useState('');
  const [locFilter, setLocFilter]   = useState('');
  const [stFilter, setStFilter]     = useState('');
  const [qrFilter, setQrFilter]     = useState('all'); // all | with-qr | no-qr

  // modals
  const [showModal, setShowModal]         = useState(false);
  const [showBatch, setShowBatch]         = useState(false);
  const [showQR, setShowQR]               = useState(false);
  const [selTable, setSelTable]           = useState(null);

  const [form, setForm] = useState({ tableNumber:'', tableName:'', capacity:4, location:'indoor', description:'', minSpend:0, status:'available' });
  const [batch, setBatch] = useState({ count:5, startNumber:1, capacity:4, location:'indoor', generateQR:true });

  const setAct = (k, v) => setAL(p => ({ ...p, [k]: v }));

  /* ─── Fetch ─── */
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
    } finally { setLoading(false); }
  }, [hotelId]);

  useEffect(() => { fetchTables(); }, [fetchTables]);

  /* ─── CRUD ─── */
  const openCreate = () => {
    setSelTable(null);
    setForm({ tableNumber:'', tableName:'', capacity:4, location:'indoor', description:'', minSpend:0, status:'available' });
    setShowModal(true);
  };
  const openEdit = (t) => {
    setSelTable(t);
    setForm({ tableNumber:t.tableNumber||'', tableName:t.tableName||'', capacity:t.capacity||4, location:t.location||'indoor', description:t.description||'', minSpend:t.minSpend||0, status:t.status||'available' });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.tableNumber.trim()) { toast.error('Table number is required'); return; }
    setAct('submit', true);
    try {
      if (selTable) {
        const res = await updateTable(selTable._id, form);
        if (res.data.success) { toast.success('Table updated'); fetchTables(); setShowModal(false); }
      } else {
        const res = await createTable({ ...form, hotelId });
        if (res.data.success) { toast.success('Table created'); fetchTables(); setShowModal(false); }
      }
    } catch (e) { toast.error(e.response?.data?.message || 'Operation failed'); }
    finally { setAct('submit', false); }
  };

  const handleDelete = async (id, num) => {
    if (!window.confirm(`Delete Table ${num}? This cannot be undone.`)) return;
    setAct(id, true);
    try {
      const res = await deleteTable(id);
      if (res.data.success) { toast.success('Table deleted'); fetchTables(); }
    } catch (e) { toast.error(e.response?.data?.message || 'Delete failed'); }
    finally { setAct(id, false); }
  };

  const handleStatusChange = async (id, newStatus) => {
    setAct(`s_${id}`, true);
    try {
      const res = await updateTableStatus(id, newStatus);
      if (res.data.success) { toast.success(`Status → ${newStatus}`); fetchTables(); }
    } catch (e) { toast.error('Status update failed'); }
    finally { setAct(`s_${id}`, false); }
  };

  const handleGenQR = async (id) => {
    setAct(`qr_${id}`, true);
    try {
      const res = await generateTableQR(id);
      if (res.data.success) { toast.success('QR code generated'); fetchTables(); }
    } catch (e) { toast.error('QR generation failed'); }
    finally { setAct(`qr_${id}`, false); }
  };

  const handleBatch = async (e) => {
    e.preventDefault();
    setAct('batch', true);
    try {
      const res = await batchCreateTables({ ...batch, hotelId });
      if (res.data.success) {
        toast.success(`${res.data.createdCount || batch.count} tables created`);
        fetchTables(); setShowBatch(false);
      }
    } catch (e) { toast.error(e.response?.data?.message || 'Batch failed'); }
    finally { setAct('batch', false); }
  };

  /* ─── Derived ─── */
  const filtered = tables.filter(t => {
    const s = search.toLowerCase();
    const matchS = !s || t.tableNumber.toLowerCase().includes(s) || (t.tableName||'').toLowerCase().includes(s) || (t.location||'').toLowerCase().includes(s);
    const matchL = !locFilter || t.location === locFilter;
    const matchSt = !stFilter || t.status === stFilter;
    const matchQR = qrFilter === 'all' || (qrFilter === 'with-qr' ? !!t.qrCodeData : !t.qrCodeData);
    return matchS && matchL && matchSt && matchQR;
  });

  const stats = {
    total: tables.length,
    withQR: tables.filter(t=>t.qrCodeData).length,
    noQR: tables.filter(t=>!t.qrCodeData).length,
    capacity: tables.reduce((s,t)=>s+(t.capacity||0),0),
    available: tables.filter(t=>t.status==='available').length,
    occupied: tables.filter(t=>t.status==='occupied').length,
  };

  /* ──────────────────── RENDER ──────────────────── */
  return (
    <div className="tm2-root">

      {/* ── Header ── */}
      <div className="tm2-header">
        <div className="tm2-header-left">
          <div className="tm2-header-icon">
            <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
          </div>
          <div>
            <h1>Table QR Codes</h1>
            <p>Manage restaurant tables and generate QR codes for ordering</p>
          </div>
        </div>
        <div className="tm2-header-actions">
          <button className="tm2-btn tm2-btn--ghost" onClick={fetchTables} disabled={loading}>↺ Refresh</button>
          <button className="tm2-btn tm2-btn--secondary" onClick={()=>setShowBatch(true)}>⊞ Batch Create</button>
          <button className="tm2-btn tm2-btn--primary" onClick={openCreate}>+ Add Table</button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="tm2-stats">
        {[
          { label:'Total Tables', value:stats.total, icon:'🍽️', color:'#6366f1' },
          { label:'With QR Code', value:stats.withQR, icon:'📱', color:'#10b981' },
          { label:'No QR Yet',    value:stats.noQR,   icon:'⚠️', color:'#f59e0b' },
          { label:'Available',    value:stats.available, icon:'✅', color:'#10b981' },
          { label:'Occupied',     value:stats.occupied, icon:'🔴', color:'#ef4444' },
          { label:'Total Capacity', value:stats.capacity, icon:'👥', color:'#3b82f6' },
        ].map(s=>(
          <div key={s.label} className="tm2-stat" style={{'--c':s.color}}>
            <span className="tm2-stat-ico">{s.icon}</span>
            <div className="tm2-stat-val">{s.value}</div>
            <div className="tm2-stat-lbl">{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="tm2-filters">
        <div className="tm2-search-wrap">
          <svg className="tm2-search-ico" width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="11" cy="11" r="8"/><path strokeLinecap="round" d="M21 21l-4.35-4.35"/></svg>
          <input className="tm2-search" placeholder="Search tables…" value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
        <select className="tm2-sel" value={locFilter} onChange={e=>setLocFilter(e.target.value)}>
          {LOC_OPTS.map(l=><option key={l.value} value={l.value}>{l.label}</option>)}
        </select>
        <select className="tm2-sel" value={stFilter} onChange={e=>setStFilter(e.target.value)}>
          <option value="">All Status</option>
          {Object.entries(STATUS_META).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
        </select>
        <div className="tm2-qr-filter">
          {[['all','All'],['with-qr','Has QR'],['no-qr','No QR']].map(([k,l])=>(
            <button key={k} className={`tm2-qr-btn${qrFilter===k?' tm2-qr-btn--active':''}`} onClick={()=>setQrFilter(k)}>{l}</button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="tm2-loading"><div className="tm2-spinner"/><span>Loading tables…</span></div>
      ) : filtered.length === 0 ? (
        <div className="tm2-empty">
          <span className="tm2-empty-ico">🍽️</span>
          <h3>{tables.length === 0 ? 'No Tables Yet' : 'No Matching Tables'}</h3>
          <p>{tables.length === 0 ? 'Start by adding tables or batch-creating them.' : 'Try adjusting your search or filters.'}</p>
          {tables.length === 0 && <button className="tm2-btn tm2-btn--primary" onClick={openCreate}>+ Add First Table</button>}
        </div>
      ) : (
        <div className="tm2-grid">
          {filtered.map(table => {
            const sm = STATUS_META[table.status] || STATUS_META.available;
            return (
              <div key={table._id} className="tm2-card">
                {/* Card Header */}
                <div className="tm2-card-top">
                  <div className="tm2-card-id">
                    <div className="tm2-card-num" style={{background:sm.bg, color:sm.dot}}>
                      {table.tableNumber}
                    </div>
                    <div>
                      <div className="tm2-card-name">{table.tableName || `Table ${table.tableNumber}`}</div>
                      <div className="tm2-card-meta">
                        {table.location && <span className="tm2-tag">{table.location}</span>}
                        <span className="tm2-tag">👥 {table.capacity}</span>
                        {table.minSpend > 0 && <span className="tm2-tag">Min: NPR {table.minSpend}</span>}
                      </div>
                    </div>
                  </div>
                  <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:6}}>
                    <span className="tm2-badge" style={{color:sm.dot,background:sm.bg}}>
                      <span className="tm2-dot" style={{background:sm.dot}}/>
                      {sm.label}
                    </span>
                    {!table.isActive && <span className="tm2-badge tm2-badge--inactive">Inactive</span>}
                  </div>
                </div>

                {/* Description */}
                {table.description && <p className="tm2-desc">{table.description}</p>}

                {/* QR Section */}
                <div className="tm2-qr-zone">
                  {table.qrCodeData ? (
                    <div className="tm2-qr-box" onClick={()=>{setSelTable(table);setShowQR(true);}}>
                      <img src={table.qrCodeData} alt="QR Code"/>
                      <div className="tm2-qr-overlay">
                        <span>View Full QR</span>
                      </div>
                    </div>
                  ) : (
                    <div className="tm2-qr-placeholder">
                      <div className="tm2-qr-pl-icon">📱</div>
                      <p>No QR Code</p>
                      <button className="tm2-btn tm2-btn--sm tm2-btn--primary" onClick={()=>handleGenQR(table._id)} disabled={actionLoading[`qr_${table._id}`]}>
                        {actionLoading[`qr_${table._id}`] ? 'Generating…' : 'Generate QR'}
                      </button>
                    </div>
                  )}
                </div>

                {/* Status Change */}
                <div className="tm2-status-row">
                  <label className="tm2-status-label">Status:</label>
                  <select
                    className="tm2-status-sel"
                    value={table.status}
                    onChange={e=>handleStatusChange(table._id, e.target.value)}
                    disabled={actionLoading[`s_${table._id}`]}
                    style={{borderColor:sm.dot+'44'}}
                  >
                    {Object.entries(STATUS_META).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
                  </select>
                  {actionLoading[`s_${table._id}`] && <div className="tm2-mini-spin"/>}
                </div>

                {/* Actions */}
                <div className="tm2-card-actions">
                  <button className="tm2-act-btn" title="Edit Table" onClick={()=>openEdit(table)}>
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                    Edit
                  </button>
                  {table.qrCodeData && <>
                    <button className="tm2-act-btn" title="Download QR" onClick={()=>downloadQRCode(table.qrCodeData,`table-${table.tableNumber}-qr.png`)}>
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                      Download
                    </button>
                    <button className="tm2-act-btn" title="Print QR" onClick={()=>printQRCode(table.qrCodeData,table.tableNumber,hotelName)}>
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
                      Print
                    </button>
                    <button className="tm2-act-btn" title="Regenerate QR" onClick={()=>handleGenQR(table._id)} disabled={actionLoading[`qr_${table._id}`]}>
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                      Regen QR
                    </button>
                  </>}
                  <button className="tm2-act-btn tm2-act-btn--danger" title="Delete" onClick={()=>handleDelete(table._id,table.tableNumber)} disabled={actionLoading[table._id]}>
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ══ CREATE / EDIT MODAL ══ */}
      {showModal && (
        <div className="tm2-overlay" onClick={()=>setShowModal(false)}>
          <div className="tm2-modal" onClick={e=>e.stopPropagation()}>
            <div className="tm2-modal-hd">
              <h2>{selTable ? 'Edit Table' : 'Add New Table'}</h2>
              <button className="tm2-close" onClick={()=>setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit} className="tm2-form">
              <div className="tm2-form-row">
                <div className="tm2-fg">
                  <label>Table Number *</label>
                  <input required placeholder="e.g. 1, A1, VIP-1" value={form.tableNumber} onChange={e=>setForm(p=>({...p,tableNumber:e.target.value}))}/>
                </div>
                <div className="tm2-fg">
                  <label>Table Name</label>
                  <input placeholder="e.g. Corner Table" value={form.tableName} onChange={e=>setForm(p=>({...p,tableName:e.target.value}))}/>
                </div>
              </div>
              <div className="tm2-form-row">
                <div className="tm2-fg">
                  <label>Capacity *</label>
                  <input required type="number" min="1" max="50" value={form.capacity} onChange={e=>setForm(p=>({...p,capacity:+e.target.value}))}/>
                </div>
                <div className="tm2-fg">
                  <label>Min Spend (NPR)</label>
                  <input type="number" min="0" value={form.minSpend} onChange={e=>setForm(p=>({...p,minSpend:+e.target.value}))}/>
                </div>
              </div>
              <div className="tm2-form-row">
                <div className="tm2-fg">
                  <label>Location</label>
                  <select value={form.location} onChange={e=>setForm(p=>({...p,location:e.target.value}))}>
                    {LOC_OPTS.filter(l=>l.value).map(l=><option key={l.value} value={l.value}>{l.label}</option>)}
                  </select>
                </div>
                <div className="tm2-fg">
                  <label>Status</label>
                  <select value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))}>
                    {Object.entries(STATUS_META).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="tm2-fg">
                <label>Description</label>
                <textarea rows="2" placeholder="Optional notes about this table" value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))}/>
              </div>
              <div className="tm2-modal-ft">
                <button type="button" className="tm2-btn tm2-btn--ghost" onClick={()=>setShowModal(false)}>Cancel</button>
                <button type="submit" className="tm2-btn tm2-btn--primary" disabled={actionLoading.submit}>
                  {actionLoading.submit ? 'Saving…' : selTable ? 'Update Table' : 'Create Table'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ BATCH MODAL ══ */}
      {showBatch && (
        <div className="tm2-overlay" onClick={()=>setShowBatch(false)}>
          <div className="tm2-modal" onClick={e=>e.stopPropagation()}>
            <div className="tm2-modal-hd">
              <h2>Batch Create Tables</h2>
              <button className="tm2-close" onClick={()=>setShowBatch(false)}>✕</button>
            </div>
            <form onSubmit={handleBatch} className="tm2-form">
              <div className="tm2-form-row">
                <div className="tm2-fg">
                  <label>Number of Tables</label>
                  <input type="number" min="1" max="50" value={batch.count} onChange={e=>setBatch(p=>({...p,count:+e.target.value}))}/>
                </div>
                <div className="tm2-fg">
                  <label>Starting Number</label>
                  <input type="number" min="1" value={batch.startNumber} onChange={e=>setBatch(p=>({...p,startNumber:+e.target.value}))}/>
                </div>
              </div>
              <div className="tm2-form-row">
                <div className="tm2-fg">
                  <label>Default Capacity</label>
                  <input type="number" min="1" max="20" value={batch.capacity} onChange={e=>setBatch(p=>({...p,capacity:+e.target.value}))}/>
                </div>
                <div className="tm2-fg">
                  <label>Location</label>
                  <select value={batch.location} onChange={e=>setBatch(p=>({...p,location:e.target.value}))}>
                    {LOC_OPTS.filter(l=>l.value).map(l=><option key={l.value} value={l.value}>{l.label}</option>)}
                  </select>
                </div>
              </div>
              <label className="tm2-chk">
                <input type="checkbox" checked={batch.generateQR} onChange={e=>setBatch(p=>({...p,generateQR:e.target.checked}))}/>
                <span>Generate QR codes automatically for all tables</span>
              </label>
              <div className="tm2-preview-box">
                Will create tables <strong>{batch.startNumber}</strong> through <strong>{batch.startNumber+batch.count-1}</strong>
                {batch.generateQR && ' with QR codes'}
              </div>
              <div className="tm2-modal-ft">
                <button type="button" className="tm2-btn tm2-btn--ghost" onClick={()=>setShowBatch(false)}>Cancel</button>
                <button type="submit" className="tm2-btn tm2-btn--primary" disabled={actionLoading.batch}>
                  {actionLoading.batch ? 'Creating…' : `Create ${batch.count} Tables`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ QR VIEW MODAL ══ */}
      {showQR && selTable && (
        <div className="tm2-overlay" onClick={()=>setShowQR(false)}>
          <div className="tm2-modal tm2-modal--qr" onClick={e=>e.stopPropagation()}>
            <div className="tm2-modal-hd">
              <h2>Table {selTable.tableNumber} — QR Code</h2>
              <button className="tm2-close" onClick={()=>setShowQR(false)}>✕</button>
            </div>
            <div className="tm2-qr-full-view">
              {selTable.qrCodeData ? <>
                <div className="tm2-qr-card">
                  {hotelName && <p className="tm2-qr-hotel">{hotelName}</p>}
                  <h3 className="tm2-qr-title">Table {selTable.tableNumber}</h3>
                  <img src={selTable.qrCodeData} alt="QR Code" className="tm2-qr-img"/>
                  <p className="tm2-qr-hint">Scan to view menu &amp; order</p>
                </div>
                {selTable.uniqueToken && <p className="tm2-qr-token">Token: <code>{selTable.uniqueToken}</code></p>}
                <div className="tm2-modal-ft">
                  <button className="tm2-btn tm2-btn--ghost" onClick={()=>downloadQRCode(selTable.qrCodeData,`table-${selTable.tableNumber}-qr.png`)}>
                    ⬇️ Download PNG
                  </button>
                  <button className="tm2-btn tm2-btn--primary" onClick={()=>printQRCode(selTable.qrCodeData,selTable.tableNumber,hotelName)}>
                    🖨️ Print QR
                  </button>
                </div>
              </> : <p style={{padding:24,color:'#64748b'}}>No QR code generated yet.</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TableManagement;
