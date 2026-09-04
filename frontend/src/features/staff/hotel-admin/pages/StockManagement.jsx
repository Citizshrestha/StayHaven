import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { useStaffAuth } from '../../../../core/context/StaffAuthContext';
import './StockManagement.css';

/* ─── Constants ─── */
const CATEGORIES = ['Beverages','Dairy','Meat & Poultry','Vegetables & Fruits','Grains & Cereals','Spices & Condiments','Cleaning Supplies','Linen & Towels','Electronics & Equipment','Miscellaneous'];
const UNITS = ['kg','g','L','mL','pcs','boxes','bottles','cans','bags','rolls'];

const STATUS_META = {
  ok:       { label:'In Stock',    color:'#10b981', bg:'rgba(16,185,129,.12)' },
  low:      { label:'Low Stock',   color:'#f59e0b', bg:'rgba(245,158,11,.12)' },
  critical: { label:'Critical',    color:'#ef4444', bg:'rgba(239,68,68,.12)' },
  out:      { label:'Out of Stock',color:'#94a3b8', bg:'rgba(148,163,184,.12)' },
};

const getStockStatus = (item) => {
  if (item.quantity <= 0) return 'out';
  if (item.quantity <= item.criticalLevel) return 'critical';
  if (item.quantity <= item.lowStockLevel) return 'low';
  return 'ok';
};

/* ─── Mock data — replace with real API when inventory routes are added ─── */
const MOCK_ITEMS = [
  { _id:'1', name:'Chicken Breast',     category:'Meat & Poultry',     quantity:25,  unit:'kg',  lowStockLevel:10, criticalLevel:5,  unitCost:350, supplier:'Fresh Farms' },
  { _id:'2', name:'Basmati Rice',       category:'Grains & Cereals',   quantity:80,  unit:'kg',  lowStockLevel:20, criticalLevel:10, unitCost:120, supplier:'Grain House' },
  { _id:'3', name:'Mineral Water 1L',   category:'Beverages',          quantity:8,   unit:'boxes',lowStockLevel:15, criticalLevel:5,  unitCost:600, supplier:'AquaFresh' },
  { _id:'4', name:'Whole Milk',         category:'Dairy',              quantity:0,   unit:'L',   lowStockLevel:20, criticalLevel:8,  unitCost:90,  supplier:'Dairy Direct' },
  { _id:'5', name:'Tomatoes',           category:'Vegetables & Fruits', quantity:15, unit:'kg',  lowStockLevel:10, criticalLevel:4,  unitCost:80,  supplier:'Farm Fresh' },
  { _id:'6', name:'Dish Soap 5L',       category:'Cleaning Supplies',  quantity:12, unit:'bottles',lowStockLevel:6, criticalLevel:2,  unitCost:450, supplier:'CleanCo' },
  { _id:'7', name:'Bed Sheets (King)',  category:'Linen & Towels',     quantity:40, unit:'pcs', lowStockLevel:15, criticalLevel:8,  unitCost:1200, supplier:'Linen Works' },
  { _id:'8', name:'Cooking Oil 5L',    category:'Spices & Condiments', quantity:4,  unit:'cans',lowStockLevel:8,  criticalLevel:3,  unitCost:900, supplier:'Golden Oil' },
];

/* ══════════════════════════════════════════════════════════════ */
const StockManagement = () => {
  const { activeProperty } = useStaffAuth();

  const [items, setItems]           = useState(MOCK_ITEMS);
  const [loading, setLoading]       = useState(false);
  const [search, setSearch]         = useState('');
  const [catFilter, setCatFilter]   = useState('all');
  const [stFilter, setStFilter]     = useState('all');
  const [showModal, setShowModal]   = useState(false);
  const [selItem, setSelItem]       = useState(null);
  const [showAdj, setShowAdj]       = useState(false);
  const [adjItem, setAdjItem]       = useState(null);
  const [adjQty, setAdjQty]         = useState(0);
  const [adjType, setAdjType]       = useState('add'); // add | remove | set

  const [form, setForm] = useState({
    name:'', category:'Beverages', quantity:0, unit:'kg',
    lowStockLevel:10, criticalLevel:5, unitCost:0, supplier:'', notes:''
  });

  /* ─── Derived ─── */
  const filtered = items.filter(item => {
    const matchS = !search || item.name.toLowerCase().includes(search.toLowerCase()) || (item.supplier||'').toLowerCase().includes(search.toLowerCase());
    const matchC = catFilter === 'all' || item.category === catFilter;
    const matchSt = stFilter === 'all' || getStockStatus(item) === stFilter;
    return matchS && matchC && matchSt;
  });

  const stats = {
    total:    items.length,
    ok:       items.filter(i=>getStockStatus(i)==='ok').length,
    low:      items.filter(i=>getStockStatus(i)==='low').length,
    critical: items.filter(i=>getStockStatus(i)==='critical').length,
    out:      items.filter(i=>getStockStatus(i)==='out').length,
    value:    items.reduce((s,i)=>s+(i.quantity||0)*(i.unitCost||0),0),
  };

  const alertItems = items.filter(i => ['critical','out'].includes(getStockStatus(i)));

  /* ─── CRUD (local for now — replace with API calls when routes exist) ─── */
  const openCreate = () => {
    setSelItem(null);
    setForm({ name:'', category:'Beverages', quantity:0, unit:'kg', lowStockLevel:10, criticalLevel:5, unitCost:0, supplier:'', notes:'' });
    setShowModal(true);
  };
  const openEdit = (item) => {
    setSelItem(item);
    setForm({ ...item });
    setShowModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Item name is required'); return; }
    if (selItem) {
      setItems(p => p.map(i => i._id === selItem._id ? { ...i, ...form } : i));
      toast.success('Item updated');
    } else {
      setItems(p => [...p, { ...form, _id: Date.now().toString() }]);
      toast.success('Item added');
    }
    setShowModal(false);
  };

  const handleDelete = (id, name) => {
    if (!window.confirm(`Delete "${name}"?`)) return;
    setItems(p => p.filter(i => i._id !== id));
    toast.success('Item deleted');
  };

  const openAdj = (item) => {
    setAdjItem(item); setAdjQty(0); setAdjType('add'); setShowAdj(true);
  };

  const handleAdj = () => {
    if (!adjItem) return;
    const qty = Number(adjQty);
    setItems(p => p.map(i => {
      if (i._id !== adjItem._id) return i;
      let newQty = i.quantity;
      if (adjType === 'add') newQty = i.quantity + qty;
      else if (adjType === 'remove') newQty = Math.max(0, i.quantity - qty);
      else newQty = qty;
      return { ...i, quantity: newQty };
    }));
    toast.success(`Stock adjusted for ${adjItem.name}`);
    setShowAdj(false);
  };

  /* ──────────────── RENDER ──────────────── */
  return (
    <div className="stk-root">

      {/* ── Header ── */}
      <div className="stk-header">
        <div className="stk-header-left">
          <div className="stk-header-icon">
            <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
          </div>
          <div>
            <h1>Stock / Inventory</h1>
            <p>Track ingredients, supplies, and inventory levels</p>
          </div>
        </div>
        <div className="stk-header-actions">
          <button className="stk-btn stk-btn--ghost" onClick={()=>toast.info('Export feature coming soon')}>↓ Export</button>
          <button className="stk-btn stk-btn--primary" onClick={openCreate}>+ Add Item</button>
        </div>
      </div>

      {/* ── Alerts ── */}
      {alertItems.length > 0 && (
        <div className="stk-alert">
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
          <span><strong>{alertItems.length} items</strong> need attention: {alertItems.map(i=>i.name).join(', ')}</span>
        </div>
      )}

      {/* ── Stats ── */}
      <div className="stk-stats">
        {[
          { label:'Total Items',   value:stats.total,    color:'#6366f1', icon:'📦' },
          { label:'In Stock',      value:stats.ok,       color:'#10b981', icon:'✅' },
          { label:'Low Stock',     value:stats.low,      color:'#f59e0b', icon:'⚠️' },
          { label:'Critical',      value:stats.critical, color:'#ef4444', icon:'🔴' },
          { label:'Out of Stock',  value:stats.out,      color:'#94a3b8', icon:'❌' },
          { label:'Total Value',   value:`NPR ${stats.value.toLocaleString()}`, color:'#10b981', icon:'💰' },
        ].map(s=>(
          <div key={s.label} className="stk-stat" style={{'--c':s.color}}
            onClick={()=>{if(s.label.includes('Stock')||s.label==='Critical'||s.label==='Out of Stock'){setStFilter(s.label.toLowerCase().replace(' ','').replace('critical','critical').replace('out of stock','out').replace('in stock','ok').replace('low stock','low'));}}}
          >
            <span className="stk-stat-ico">{s.icon}</span>
            <div className="stk-stat-val">{s.value}</div>
            <div className="stk-stat-lbl">{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="stk-filters">
        <div className="stk-search-wrap">
          <svg className="stk-search-ico" width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="11" cy="11" r="8"/><path strokeLinecap="round" d="M21 21l-4.35-4.35"/></svg>
          <input className="stk-search" placeholder="Search items or suppliers…" value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
        <select className="stk-sel" value={catFilter} onChange={e=>setCatFilter(e.target.value)}>
          <option value="all">All Categories</option>
          {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
        </select>
        <select className="stk-sel" value={stFilter} onChange={e=>setStFilter(e.target.value)}>
          <option value="all">All Status</option>
          {Object.entries(STATUS_META).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
        </select>
        {(catFilter!=='all'||stFilter!=='all'||search) && (
          <button className="stk-btn stk-btn--ghost stk-btn--sm" onClick={()=>{setCatFilter('all');setStFilter('all');setSearch('');}}>✕ Clear</button>
        )}
      </div>

      {/* ── Table ── */}
      {filtered.length === 0 ? (
        <div className="stk-empty">
          <span className="stk-empty-ico">📦</span>
          <h3>{items.length === 0 ? 'No Items Yet' : 'No Matching Items'}</h3>
          <p>{items.length === 0 ? 'Add your first inventory item' : 'Try adjusting your filters'}</p>
          {items.length === 0 && <button className="stk-btn stk-btn--primary" onClick={openCreate}>+ Add First Item</button>}
        </div>
      ) : (
        <div className="stk-table-wrap">
          <table className="stk-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Category</th>
                <th>Quantity</th>
                <th>Status</th>
                <th>Unit Cost</th>
                <th>Total Value</th>
                <th>Supplier</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => {
                const status = getStockStatus(item);
                const sm = STATUS_META[status];
                return (
                  <tr key={item._id} className={status === 'critical' || status === 'out' ? 'stk-tr-alert' : ''}>
                    <td>
                      <div className="stk-item-name">
                        <span className="stk-item-icon">📦</span>
                        <div>
                          <div className="stk-name">{item.name}</div>
                          {item.notes && <div className="stk-notes">{item.notes}</div>}
                        </div>
                      </div>
                    </td>
                    <td><span className="stk-cat">{item.category}</span></td>
                    <td>
                      <div className="stk-qty-wrap">
                        <span className="stk-qty">{item.quantity} {item.unit}</span>
                        {status === 'low' && <span className="stk-qty-warn">Low!</span>}
                        {status === 'critical' && <span className="stk-qty-crit">Critical!</span>}
                      </div>
                      <div className="stk-qty-bar">
                        <div className="stk-qty-fill" style={{
                          width: `${Math.min(100,Math.max(0,(item.quantity/Math.max(item.lowStockLevel*3,1))*100))}%`,
                          background: sm.color
                        }}/>
                      </div>
                      <div className="stk-qty-levels">Low: {item.lowStockLevel} · Critical: {item.criticalLevel}</div>
                    </td>
                    <td>
                      <span className="stk-badge" style={{color:sm.color,background:sm.bg}}>{sm.label}</span>
                    </td>
                    <td>NPR {Number(item.unitCost).toLocaleString()}/{item.unit}</td>
                    <td className="stk-value">NPR {((item.quantity||0)*(item.unitCost||0)).toLocaleString()}</td>
                    <td className="stk-supplier">{item.supplier || '—'}</td>
                    <td>
                      <div className="stk-acts">
                        <button className="stk-act-btn" title="Adjust Quantity" onClick={()=>openAdj(item)}>
                          ±
                        </button>
                        <button className="stk-act-btn" title="Edit" onClick={()=>openEdit(item)}>✏️</button>
                        <button className="stk-act-btn stk-act-btn--danger" title="Delete" onClick={()=>handleDelete(item._id,item.name)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ══ ADD / EDIT MODAL ══ */}
      {showModal && (
        <div className="stk-overlay" onClick={()=>setShowModal(false)}>
          <div className="stk-modal" onClick={e=>e.stopPropagation()}>
            <div className="stk-modal-hd">
              <h2>{selItem ? 'Edit Item' : 'Add Inventory Item'}</h2>
              <button className="stk-close" onClick={()=>setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit} className="stk-form">
              <div className="stk-form-row">
                <div className="stk-fg">
                  <label>Item Name *</label>
                  <input required placeholder="e.g. Chicken Breast" value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))}/>
                </div>
                <div className="stk-fg">
                  <label>Category</label>
                  <select value={form.category} onChange={e=>setForm(p=>({...p,category:e.target.value}))}>
                    {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="stk-form-row">
                <div className="stk-fg">
                  <label>Quantity</label>
                  <input type="number" min="0" value={form.quantity} onChange={e=>setForm(p=>({...p,quantity:+e.target.value}))}/>
                </div>
                <div className="stk-fg">
                  <label>Unit</label>
                  <select value={form.unit} onChange={e=>setForm(p=>({...p,unit:e.target.value}))}>
                    {UNITS.map(u=><option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div className="stk-form-row">
                <div className="stk-fg">
                  <label>Low Stock Level</label>
                  <input type="number" min="0" value={form.lowStockLevel} onChange={e=>setForm(p=>({...p,lowStockLevel:+e.target.value}))}/>
                </div>
                <div className="stk-fg">
                  <label>Critical Level</label>
                  <input type="number" min="0" value={form.criticalLevel} onChange={e=>setForm(p=>({...p,criticalLevel:+e.target.value}))}/>
                </div>
              </div>
              <div className="stk-form-row">
                <div className="stk-fg">
                  <label>Unit Cost (NPR)</label>
                  <input type="number" min="0" value={form.unitCost} onChange={e=>setForm(p=>({...p,unitCost:+e.target.value}))}/>
                </div>
                <div className="stk-fg">
                  <label>Supplier</label>
                  <input placeholder="Supplier name" value={form.supplier} onChange={e=>setForm(p=>({...p,supplier:e.target.value}))}/>
                </div>
              </div>
              <div className="stk-fg">
                <label>Notes</label>
                <textarea rows="2" placeholder="Optional notes" value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))}/>
              </div>
              <div className="stk-modal-ft">
                <button type="button" className="stk-btn stk-btn--ghost" onClick={()=>setShowModal(false)}>Cancel</button>
                <button type="submit" className="stk-btn stk-btn--primary">{selItem ? 'Update Item' : 'Add Item'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ ADJUST MODAL ══ */}
      {showAdj && adjItem && (
        <div className="stk-overlay" onClick={()=>setShowAdj(false)}>
          <div className="stk-modal stk-modal--sm" onClick={e=>e.stopPropagation()}>
            <div className="stk-modal-hd">
              <h2>Adjust Stock — {adjItem.name}</h2>
              <button className="stk-close" onClick={()=>setShowAdj(false)}>✕</button>
            </div>
            <div className="stk-adj-body">
              <div className="stk-adj-current">
                Current: <strong>{adjItem.quantity} {adjItem.unit}</strong>
              </div>
              <div className="stk-adj-types">
                {[['add','+ Add'],['remove','− Remove'],['set','= Set']].map(([k,l])=>(
                  <button key={k} className={`stk-adj-type${adjType===k?' stk-adj-type--sel':''}`} onClick={()=>setAdjType(k)}>{l}</button>
                ))}
              </div>
              <div className="stk-fg">
                <label>{adjType === 'set' ? 'New Quantity' : 'Quantity'} ({adjItem.unit})</label>
                <input type="number" min="0" value={adjQty} onChange={e=>setAdjQty(e.target.value)} placeholder="Enter amount"/>
              </div>
              {adjQty > 0 && (
                <div className="stk-adj-preview">
                  After adjustment: <strong>
                    {adjType === 'add' ? adjItem.quantity + Number(adjQty) :
                     adjType === 'remove' ? Math.max(0, adjItem.quantity - Number(adjQty)) :
                     Number(adjQty)} {adjItem.unit}
                  </strong>
                </div>
              )}
            </div>
            <div className="stk-modal-ft">
              <button className="stk-btn stk-btn--ghost" onClick={()=>setShowAdj(false)}>Cancel</button>
              <button className="stk-btn stk-btn--primary" onClick={handleAdj} disabled={!adjQty}>Apply</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockManagement;
