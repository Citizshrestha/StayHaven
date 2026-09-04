import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { useStaffAuth } from '../../../../core/context/StaffAuthContext';
import {
  getRooms, generateRoomQR, batchGenerateRoomQR, toggleRoomQR
} from '../services/roomApi';
import './RoomQRManagement.css';

/* ─── QR utilities ─── */
const downloadQRCode = (data, filename) => {
  const a = document.createElement('a'); a.href = data; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
};

const printQRCode = (data, roomNumber, hotelName) => {
  const w = window.open('', '_blank');
  w.document.write(`<!DOCTYPE html><html><head><title>Room ${roomNumber}</title>
  <style>*{margin:0;padding:0;box-sizing:border-box}body{display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f8fafc;font-family:system-ui,sans-serif}.box{background:#fff;border-radius:20px;box-shadow:0 8px 40px rgba(0,0,0,.12);padding:40px 48px;text-align:center}.hotel{font-size:14px;color:#64748b;margin-bottom:6px}.num{font-size:32px;font-weight:800;color:#1e293b;margin-bottom:24px}.qr{width:220px;height:220px;border-radius:12px}.hint{margin-top:20px;font-size:13px;color:#94a3b8}@media print{body{background:#fff}.box{box-shadow:none}}</style>
  </head><body><div class="box"><p class="hotel">${hotelName}</p><h1 class="num">Room ${roomNumber}</h1><img src="${data}" class="qr" alt="QR"/><p class="hint">Scan for room service &amp; amenities</p></div>
  <script>window.onload=()=>{window.print();window.onafterprint=()=>window.close()}<\/script></body></html>`);
  w.document.close();
};

const printAllQRCodes = (rooms, hotelName) => {
  const withQR = rooms.filter(r => r.qrCodeImage);
  if (!withQR.length) { toast.error('No QR codes to print'); return; }
  const w = window.open('', '_blank');
  w.document.write(`<!DOCTYPE html><html><head><title>All Room QR Codes — ${hotelName}</title>
  <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui,sans-serif;padding:24px}.header{text-align:center;margin-bottom:36px}.header h1{font-size:24px;font-weight:800;color:#1e293b}.header p{color:#64748b;margin-top:6px}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}.item{text-align:center;padding:20px;border:1px solid #e2e8f0;border-radius:12px;page-break-inside:avoid}.item h3{font-size:15px;font-weight:700;color:#1e293b;margin-bottom:10px}.item img{width:130px;height:130px}.item p{margin-top:8px;font-size:11px;color:#94a3b8}@media print{.grid{grid-template-columns:repeat(3,1fr)}}</style>
  </head><body><div class="header"><h1>${hotelName}</h1><p>Room QR Codes — ${new Date().toLocaleDateString()}</p></div>
  <div class="grid">${withQR.map(r=>`<div class="item"><h3>Room ${r.roomNumber}</h3><img src="${r.qrCodeImage}" alt="QR"/><p>Scan for room service</p></div>`).join('')}</div>
  <script>window.onload=()=>{window.print();window.onafterprint=()=>window.close()}<\/script></body></html>`);
  w.document.close();
};

const ROOM_TYPE_META = {
  single:  { label:'Single',  icon:'🛏️' },
  double:  { label:'Double',  icon:'🛏️' },
  twin:    { label:'Twin',    icon:'🛏️' },
  suite:   { label:'Suite',   icon:'🏨' },
  deluxe:  { label:'Deluxe',  icon:'⭐' },
  villa:   { label:'Villa',   icon:'🏡' },
  studio:  { label:'Studio',  icon:'🏢' },
};
const roomMeta = (type) => ROOM_TYPE_META[type?.toLowerCase()] || { label: type || 'Room', icon: '🛏️' };

/* ══════════════════════════════════════════════════════════════ */
const RoomQRManagement = () => {
  const { activeProperty } = useStaffAuth();
  const hotelId = activeProperty?._id || activeProperty;

  const [rooms, setRooms]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [actionLoading, setAL]      = useState({});
  const [hotelName, setHotelName]   = useState('');

  const [filter, setFilter]         = useState('all'); // all | with-qr | without-qr
  const [search, setSearch]         = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const [showQRModal, setShowQR]    = useState(false);
  const [selRoom, setSelRoom]       = useState(null);

  const setAct = (k, v) => setAL(p => ({ ...p, [k]: v }));

  /* ─── Fetch ─── */
  const fetchRooms = useCallback(async () => {
    if (!hotelId) { setLoading(false); return; }
    setLoading(true);
    try {
      const res = await getRooms({ hotelId });
      if (res.data.success) {
        const data = res.data.rooms || [];
        setRooms(data);
        if (data[0]?.hotel?.name) setHotelName(data[0].hotel.name);
      }
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to load rooms');
    } finally { setLoading(false); }
  }, [hotelId]);

  useEffect(() => { fetchRooms(); }, [fetchRooms]);

  /* ─── Actions ─── */
  const handleGenQR = async (roomId) => {
    setAct(`qr_${roomId}`, true);
    try {
      const res = await generateRoomQR(roomId);
      if (res.data.success) { toast.success('QR code generated'); fetchRooms(); }
    } catch (e) { toast.error(e.response?.data?.message || 'QR generation failed'); }
    finally { setAct(`qr_${roomId}`, false); }
  };

  const handleBatchGenQR = async () => {
    const noQR = rooms.filter(r => !r.qrCodeImage);
    if (!noQR.length) { toast.info('All rooms already have QR codes'); return; }
    if (!window.confirm(`Generate QR codes for ${noQR.length} rooms?`)) return;
    setAct('batch', true);
    try {
      const res = await batchGenerateRoomQR(hotelId);
      if (res.data.success) {
        toast.success(`${res.data.successCount || noQR.length} QR codes generated`);
        fetchRooms();
      }
    } catch (e) { toast.error(e.response?.data?.message || 'Batch generation failed'); }
    finally { setAct('batch', false); }
  };

  const handleToggle = async (roomId, isActive) => {
    setAct(`tog_${roomId}`, true);
    try {
      const res = await toggleRoomQR(roomId);
      if (res.data.success) {
        toast.success(`QR ${isActive ? 'deactivated' : 'activated'}`);
        fetchRooms();
      }
    } catch (e) { toast.error('Status update failed'); }
    finally { setAct(`tog_${roomId}`, false); }
  };

  /* ─── Derived ─── */
  const uniqueTypes = [...new Set(rooms.map(r => r.type).filter(Boolean))];

  const filtered = rooms.filter(r => {
    const matchF = filter === 'all' || (filter === 'with-qr' ? !!r.qrCodeImage : !r.qrCodeImage);
    const matchS = !search || String(r.roomNumber).toLowerCase().includes(search.toLowerCase());
    const matchT = typeFilter === 'all' || r.type === typeFilter;
    return matchF && matchS && matchT;
  });

  const stats = {
    total:  rooms.length,
    withQR: rooms.filter(r=>r.qrCodeImage).length,
    noQR:   rooms.filter(r=>!r.qrCodeImage).length,
    active: rooms.filter(r=>r.qrCodeImage && r.isQrActive !== false).length,
    inactive: rooms.filter(r=>r.isQrActive === false).length,
  };

  /* ──────────────── RENDER ──────────────── */
  return (
    <div className="rqm2-root">

      {/* ── Header ── */}
      <div className="rqm2-header">
        <div className="rqm2-header-left">
          <div className="rqm2-header-icon">
            <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
          </div>
          <div>
            <h1>Room QR Codes</h1>
            <p>Generate and manage QR codes for hotel rooms</p>
          </div>
        </div>
        <div className="rqm2-header-actions">
          <button className="rqm2-btn rqm2-btn--ghost" onClick={fetchRooms} disabled={loading}>↺ Refresh</button>
          <button className="rqm2-btn rqm2-btn--secondary"
            onClick={()=>printAllQRCodes(rooms,hotelName)}
            disabled={!stats.withQR}
          >🖨️ Print All</button>
          <button className="rqm2-btn rqm2-btn--primary"
            onClick={handleBatchGenQR}
            disabled={actionLoading.batch || !stats.noQR}
          >
            {actionLoading.batch ? '⏳ Generating…' : `⚡ Gen All QR (${stats.noQR})`}
          </button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="rqm2-stats">
        {[
          { label:'Total Rooms',  value:stats.total,    icon:'🛏️', color:'#6366f1' },
          { label:'With QR',      value:stats.withQR,   icon:'📱', color:'#10b981' },
          { label:'No QR Yet',    value:stats.noQR,     icon:'⚠️', color:'#f59e0b' },
          { label:'QR Active',    value:stats.active,   icon:'✅', color:'#10b981' },
          { label:'QR Inactive',  value:stats.inactive, icon:'🔴', color:'#ef4444' },
        ].map(s=>(
          <div key={s.label} className="rqm2-stat" style={{'--c':s.color}}>
            <span className="rqm2-stat-ico">{s.icon}</span>
            <div className="rqm2-stat-val">{s.value}</div>
            <div className="rqm2-stat-lbl">{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Progress Bar ── */}
      {stats.total > 0 && (
        <div className="rqm2-progress-wrap">
          <div className="rqm2-progress-bar">
            <div className="rqm2-progress-fill" style={{width:`${Math.round(stats.withQR/stats.total*100)}%`}}/>
          </div>
          <span className="rqm2-progress-label">
            {Math.round(stats.withQR/stats.total*100)}% rooms have QR codes ({stats.withQR}/{stats.total})
          </span>
        </div>
      )}

      {/* ── Filters ── */}
      <div className="rqm2-filters">
        <div className="rqm2-filter-tabs">
          {[['all','All Rooms'],['with-qr',`With QR (${stats.withQR})`],['without-qr',`No QR (${stats.noQR})`]].map(([k,l])=>(
            <button key={k} className={`rqm2-ftab${filter===k?' rqm2-ftab--active':''}`} onClick={()=>setFilter(k)}>{l}</button>
          ))}
        </div>
        <div className="rqm2-filter-right">
          <div className="rqm2-search-wrap">
            <svg className="rqm2-search-ico" width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="11" cy="11" r="8"/><path strokeLinecap="round" d="M21 21l-4.35-4.35"/></svg>
            <input className="rqm2-search" placeholder="Search room…" value={search} onChange={e=>setSearch(e.target.value)}/>
          </div>
          <select className="rqm2-sel" value={typeFilter} onChange={e=>setTypeFilter(e.target.value)}>
            <option value="all">All Types</option>
            {uniqueTypes.map(t=><option key={t} value={t}>{roomMeta(t).label}</option>)}
          </select>
        </div>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="rqm2-loading"><div className="rqm2-spinner"/><span>Loading rooms…</span></div>
      ) : filtered.length === 0 ? (
        <div className="rqm2-empty">
          <span className="rqm2-empty-ico">🛏️</span>
          <h3>{rooms.length === 0 ? 'No Rooms Found' : 'No Matching Rooms'}</h3>
          <p>{rooms.length === 0 ? 'Add rooms in Room Management first' : 'Try adjusting your filters'}</p>
        </div>
      ) : (
        <div className="rqm2-grid">
          {filtered.map(room => {
            const { label, icon } = roomMeta(room.type);
            const hasQR = !!room.qrCodeImage;
            const isActive = room.isQrActive !== false;
            return (
              <div key={room._id} className={`rqm2-card${!hasQR?' rqm2-card--no-qr':''}`}>
                {/* Header */}
                <div className="rqm2-card-top">
                  <div className="rqm2-room-id">
                    <span className="rqm2-room-ico">{icon}</span>
                    <div>
                      <div className="rqm2-room-num">Room {room.roomNumber}</div>
                      <div className="rqm2-room-type">{label}</div>
                    </div>
                  </div>
                  <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:4}}>
                    {hasQR ? (
                      <span className={`rqm2-badge ${isActive?'rqm2-badge--active':'rqm2-badge--inactive'}`}>
                        <span className="rqm2-dot" style={{background:isActive?'#10b981':'#ef4444'}}/>
                        {isActive ? 'Active' : 'Inactive'}
                      </span>
                    ) : (
                      <span className="rqm2-badge rqm2-badge--missing">No QR</span>
                    )}
                  </div>
                </div>

                {/* QR Area */}
                <div className="rqm2-qr-area">
                  {hasQR ? (
                    <div className="rqm2-qr-box" onClick={()=>{setSelRoom(room);setShowQR(true);}}>
                      <img src={room.qrCodeImage} alt={`Room ${room.roomNumber}`}/>
                      <div className="rqm2-qr-overlay"><span>Enlarge QR</span></div>
                    </div>
                  ) : (
                    <div className="rqm2-qr-empty">
                      <div className="rqm2-qr-empty-ico">📱</div>
                      <p>No QR Code</p>
                      <button className="rqm2-btn rqm2-btn--sm rqm2-btn--primary"
                        onClick={()=>handleGenQR(room._id)}
                        disabled={actionLoading[`qr_${room._id}`]}
                      >
                        {actionLoading[`qr_${room._id}`] ? 'Generating…' : 'Generate QR'}
                      </button>
                    </div>
                  )}
                </div>

                {/* Room info */}
                {room.floor && <div className="rqm2-info">Floor {room.floor}{room.price ? ` · NPR ${Number(room.price).toLocaleString()}` : ''}</div>}

                {/* Actions */}
                <div className="rqm2-card-actions">
                  {hasQR && <>
                    <button className="rqm2-act" title={isActive?'Deactivate QR':'Activate QR'}
                      onClick={()=>handleToggle(room._id, isActive)}
                      disabled={actionLoading[`tog_${room._id}`]}
                    >
                      {isActive ? '🔴 Deactivate' : '🟢 Activate'}
                    </button>
                    <button className="rqm2-act" title="Download QR"
                      onClick={()=>downloadQRCode(room.qrCodeImage,`room-${room.roomNumber}-qr.png`)}
                    >⬇️ Download</button>
                    <button className="rqm2-act" title="Print QR"
                      onClick={()=>printQRCode(room.qrCodeImage,room.roomNumber,hotelName)}
                    >🖨️ Print</button>
                    <button className="rqm2-act" title="Regenerate QR"
                      onClick={()=>handleGenQR(room._id)}
                      disabled={actionLoading[`qr_${room._id}`]}
                    >↺ Regen</button>
                  </>}
                  {!hasQR && (
                    <button className="rqm2-act rqm2-act--full rqm2-btn--primary"
                      onClick={()=>handleGenQR(room._id)}
                      disabled={actionLoading[`qr_${room._id}`]}
                    >
                      {actionLoading[`qr_${room._id}`] ? '⏳ Generating…' : '📱 Generate QR Code'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ══ QR VIEW MODAL ══ */}
      {showQRModal && selRoom && (
        <div className="rqm2-overlay" onClick={()=>setShowQR(false)}>
          <div className="rqm2-modal" onClick={e=>e.stopPropagation()}>
            <div className="rqm2-modal-hd">
              <h2>Room {selRoom.roomNumber} — QR Code</h2>
              <button className="rqm2-close" onClick={()=>setShowQR(false)}>✕</button>
            </div>
            <div className="rqm2-qr-full">
              {selRoom.qrCodeImage ? <>
                <div className="rqm2-qr-card">
                  {hotelName && <p className="rqm2-qr-hotel">{hotelName}</p>}
                  <h3 className="rqm2-qr-title">Room {selRoom.roomNumber}</h3>
                  <img src={selRoom.qrCodeImage} alt="QR Code" className="rqm2-qr-img"/>
                  <p className="rqm2-qr-hint">Scan for room service &amp; amenities</p>
                </div>
                {selRoom.uniqueToken && <p className="rqm2-qr-token">Token: <code>{selRoom.uniqueToken}</code></p>}
                <div className="rqm2-modal-ft">
                  <button className="rqm2-btn rqm2-btn--ghost" onClick={()=>downloadQRCode(selRoom.qrCodeImage,`room-${selRoom.roomNumber}-qr.png`)}>⬇️ Download</button>
                  <button className="rqm2-btn rqm2-btn--primary" onClick={()=>printQRCode(selRoom.qrCodeImage,selRoom.roomNumber,hotelName)}>🖨️ Print</button>
                </div>
              </> : <p style={{padding:24,color:'#64748b'}}>No QR code for this room.</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomQRManagement;
