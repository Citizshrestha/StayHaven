import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'react-toastify';
import {
  QrCode,
  BedDouble,
  RefreshCw,
  Printer,
  Zap,
  Download,
  Power,
  PowerOff,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Smartphone,
} from 'lucide-react';
import { getRooms, generateRoomQR, batchGenerateRoomQR, toggleRoomQR } from '../services/roomApi';
import useHotelId from '../hooks/useHotelId';
import ConfirmDialog from '../../../../components/ConfirmDialog';
import {
  PageHeader,
  Button,
  Badge,
  StatCard,
  StatCardSkeleton,
  SearchInput,
  Select,
  FilterTabs,
  EmptyState,
  Modal,
} from '../components/ui';
import useDebouncedValue from '../hooks/useDebouncedValue';
import '../styles/hotel-admin-tokens.css';

/* ─── QR utilities (kept from original — real print/download) ─── */
const downloadQRCode = (data, filename) => {
  const a = document.createElement('a');
  a.href = data;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

const printQRCode = (data, roomNumber, hotelName) => {
  const w = window.open('', '_blank');
  if (!w) { toast.error('Popup blocked. Allow popups to print.'); return; }
  w.document.write(`<!DOCTYPE html><html><head><title>Room ${roomNumber}</title>
  <style>*{margin:0;padding:0;box-sizing:border-box}body{display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f8fafc;font-family:system-ui,sans-serif}.box{background:#fff;border-radius:20px;box-shadow:0 8px 40px rgba(0,0,0,.12);padding:40px 48px;text-align:center}.hotel{font-size:14px;color:#64748b;margin-bottom:6px}.num{font-size:32px;font-weight:800;color:#1e293b;margin-bottom:24px}.qr{width:220px;height:220px;border-radius:12px}.hint{margin-top:20px;font-size:13px;color:#94a3b8}@media print{body{background:#fff}.box{box-shadow:none}}</style>
  </head><body><div class="box"><p class="hotel">${hotelName}</p><h1 class="num">Room ${roomNumber}</h1><img src="${data}" class="qr" alt="QR"/><p class="hint">Scan for room service &amp; amenities</p></div>
  <script>window.onload=()=>{window.print();window.onafterprint=()=>window.close()}${'<'}/script></body></html>`);
  w.document.close();
};

const printAllQRCodes = (rooms, hotelName) => {
  const withQR = rooms.filter((r) => r.qrCodeImage);
  if (!withQR.length) { toast.error('No QR codes to print'); return; }
  const w = window.open('', '_blank');
  if (!w) { toast.error('Popup blocked. Allow popups to print.'); return; }
  w.document.write(`<!DOCTYPE html><html><head><title>All Room QR Codes — ${hotelName}</title>
  <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui,sans-serif;padding:24px}.header{text-align:center;margin-bottom:36px}.header h1{font-size:24px;font-weight:800;color:#1e293b}.header p{color:#64748b;margin-top:6px}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}.item{text-align:center;padding:20px;border:1px solid #e2e8f0;border-radius:12px;page-break-inside:avoid}.item h3{font-size:15px;font-weight:700;color:#1e293b;margin-bottom:10px}.item img{width:130px;height:130px}.item p{margin-top:8px;font-size:11px;color:#94a3b8}</style>
  </head><body><div class="header"><h1>${hotelName}</h1><p>Room QR Codes — ${new Date().toLocaleDateString()}</p></div>
  <div class="grid">${withQR.map((r) => `<div class="item"><h3>Room ${r.roomNumber}</h3><img src="${r.qrCodeImage}" alt="QR"/><p>Scan for room service</p></div>`).join('')}</div>
  <script>window.onload=()=>{window.print();window.onafterprint=()=>window.close()}${'<'}/script></body></html>`);
  w.document.close();
};

const roomTypeLabel = (type) => {
  if (!type) return 'Room';
  return type.charAt(0).toUpperCase() + type.slice(1);
};

const RoomQRManagement = () => {
  const hotelId = useHotelId();

  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const [hotelName, setHotelName] = useState('');

  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 250);
  const [typeFilter, setTypeFilter] = useState('all');

  const [selRoom, setSelRoom] = useState(null);
  const [confirmBatch, setConfirmBatch] = useState(false);

  const setAct = (k, v) => setActionLoading((p) => ({ ...p, [k]: v }));

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
    } finally {
      setLoading(false);
    }
  }, [hotelId]);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  const stats = useMemo(
    () => ({
      total: rooms.length,
      withQR: rooms.filter((r) => r.qrCodeImage).length,
      noQR: rooms.filter((r) => !r.qrCodeImage).length,
      active: rooms.filter((r) => r.qrCodeImage && r.isQrActive !== false).length,
      inactive: rooms.filter((r) => r.isQrActive === false).length,
    }),
    [rooms]
  );

  const uniqueTypes = useMemo(() => [...new Set(rooms.map((r) => r.type).filter(Boolean))], [rooms]);

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    return rooms.filter((r) => {
      const matchF = filter === 'all' || (filter === 'with-qr' ? !!r.qrCodeImage : !r.qrCodeImage);
      const matchS = !q || String(r.roomNumber).toLowerCase().includes(q);
      const matchT = typeFilter === 'all' || r.type === typeFilter;
      return matchF && matchS && matchT;
    });
  }, [rooms, filter, debouncedSearch, typeFilter]);

  const handleGenQR = async (roomId) => {
    setAct(`qr_${roomId}`, true);
    try {
      const res = await generateRoomQR(roomId);
      if (res.data.success) { toast.success('QR code generated'); fetchRooms(); }
    } catch (e) {
      toast.error(e.response?.data?.message || 'QR generation failed');
    } finally {
      setAct(`qr_${roomId}`, false);
    }
  };

  const doBatchGen = async () => {
    setConfirmBatch(false);
    setAct('batch', true);
    try {
      const res = await batchGenerateRoomQR(hotelId);
      if (res.data.success) {
        toast.success(`${res.data.successCount || stats.noQR} QR codes generated`);
        fetchRooms();
      }
    } catch (e) {
      toast.error(e.response?.data?.message || 'Batch generation failed');
    } finally {
      setAct('batch', false);
    }
  };

  const handleToggle = async (roomId, isActive) => {
    setAct(`tog_${roomId}`, true);
    try {
      const res = await toggleRoomQR(roomId);
      if (res.data.success) { toast.success(`QR ${isActive ? 'deactivated' : 'activated'}`); fetchRooms(); }
    } catch {
      toast.error('Status update failed');
    } finally {
      setAct(`tog_${roomId}`, false);
    }
  };

  const filterOptions = [
    { value: 'all', label: 'All Rooms', count: stats.total },
    { value: 'with-qr', label: 'With QR', count: stats.withQR },
    { value: 'without-qr', label: 'No QR', count: stats.noQR },
  ];

  const pct = stats.total ? Math.round((stats.withQR / stats.total) * 100) : 0;

  return (
    <div className="ha-page">
      <PageHeader
        title="Room QR Codes"
        subtitle="Generate and manage QR codes for hotel rooms."
        actions={
          <>
            <Button variant="secondary" onClick={fetchRooms} disabled={loading}>
              <RefreshCw size={16} aria-hidden="true" /> Refresh
            </Button>
            <Button variant="secondary" onClick={() => printAllQRCodes(rooms, hotelName)} disabled={!stats.withQR}>
              <Printer size={16} aria-hidden="true" /> Print All
            </Button>
            <Button variant="primary" onClick={() => setConfirmBatch(true)} disabled={actionLoading.batch || !stats.noQR}>
              <Zap size={16} aria-hidden="true" /> {actionLoading.batch ? 'Generating…' : `Generate All (${stats.noQR})`}
            </Button>
          </>
        }
        toolbar={
          <>
            <div className="ha-toolbar__group">
              <SearchInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search room…" ariaLabel="Search rooms" />
              <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} aria-label="Filter by room type">
                <option value="all">All Types</option>
                {uniqueTypes.map((t) => <option key={t} value={t}>{roomTypeLabel(t)}</option>)}
              </Select>
            </div>
            <FilterTabs options={filterOptions} value={filter} onChange={setFilter} ariaLabel="Filter by QR presence" />
          </>
        }
      />

      <div className="ha-kpi-grid" style={{ marginBottom: 20, gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))' }}>
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard icon={<BedDouble size={22} />} iconBg="linear-gradient(135deg,#6366f1,#4f46e5)" label="Total Rooms" value={stats.total} />
            <StatCard icon={<QrCode size={22} />} iconBg="var(--ha-success)" label="With QR" value={stats.withQR} />
            <StatCard icon={<Smartphone size={22} />} iconBg="var(--ha-warning)" label="No QR Yet" value={stats.noQR} />
            <StatCard icon={<CheckCircle2 size={22} />} iconBg="var(--ha-info)" label="QR Active" value={stats.active} />
          </>
        )}
      </div>

      {/* Progress */}
      {stats.total > 0 && (
        <div className="ha-card ha-card--pad" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span className="ha-body-strong" style={{ color: 'var(--ha-text)' }}>QR coverage</span>
            <span className="ha-body-strong haNum" style={{ color: 'var(--ha-primary)' }}>{pct}%</span>
          </div>
          <div style={{ height: 8, borderRadius: 999, background: 'var(--ha-surface-sunken)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: 'var(--ha-primary)', borderRadius: 999, transition: 'width 300ms ease-out' }} />
          </div>
          <span className="ha-small" style={{ color: 'var(--ha-text-subtle)' }}>{stats.withQR} of {stats.total} rooms have QR codes</span>
        </div>
      )}

      {loading ? null : filtered.length === 0 ? (
        <EmptyState
          icon={<BedDouble size={26} />}
          title={rooms.length === 0 ? 'No rooms found' : 'No matching rooms'}
          description={rooms.length === 0 ? 'Add rooms in Room Management first.' : 'Try adjusting your filters.'}
        />
      ) : (
        <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))' }}>
          {filtered.map((room) => {
            const hasQR = !!room.qrCodeImage;
            const isActive = room.isQrActive !== false;
            return (
              <div key={room._id} className="ha-card ha-card--pad" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div className="ha-body-strong haNum" style={{ color: 'var(--ha-text)' }}>Room {room.roomNumber}</div>
                    <div className="ha-small" style={{ color: 'var(--ha-text-subtle)' }}>{roomTypeLabel(room.type)}</div>
                  </div>
                  {hasQR ? <Badge tone={isActive ? 'success' : 'danger'}>{isActive ? 'Active' : 'Inactive'}</Badge> : <Badge tone="warning">No QR</Badge>}
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', padding: 8 }}>
                  {hasQR ? (
                    <button
                      type="button"
                      onClick={() => setSelRoom(room)}
                      aria-label={`Enlarge QR for room ${room.roomNumber}`}
                      style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 0 }}
                    >
                      <img src={room.qrCodeImage} alt={`QR for room ${room.roomNumber}`} style={{ width: 120, height: 120, borderRadius: 'var(--ha-radius-sm)' }} />
                    </button>
                  ) : (
                    <div style={{ textAlign: 'center', color: 'var(--ha-text-subtle)' }}>
                      <Smartphone size={32} aria-hidden="true" />
                      <p className="ha-small" style={{ margin: '6px 0' }}>No QR Code</p>
                    </div>
                  )}
                </div>

                {room.floor && (
                  <div className="ha-small haNum" style={{ color: 'var(--ha-text-subtle)', textAlign: 'center' }}>
                    Floor {room.floor}{room.price ? ` · Rs. ${Number(room.price).toLocaleString('en-IN')}` : ''}
                  </div>
                )}

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 'auto' }}>
                  {hasQR ? (
                    <>
                      <Button size="sm" variant="secondary" onClick={() => handleToggle(room._id, isActive)} disabled={actionLoading[`tog_${room._id}`]}>
                        {isActive ? <PowerOff size={14} aria-hidden="true" /> : <Power size={14} aria-hidden="true" />}
                        {isActive ? 'Deactivate' : 'Activate'}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => downloadQRCode(room.qrCodeImage, `room-${room.roomNumber}-qr.png`)}>
                        <Download size={14} aria-hidden="true" /> Download
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => printQRCode(room.qrCodeImage, room.roomNumber, hotelName)}>
                        <Printer size={14} aria-hidden="true" /> Print
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleGenQR(room._id)} disabled={actionLoading[`qr_${room._id}`]}>
                        <RotateCcw size={14} aria-hidden="true" /> Regen
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" variant="primary" block onClick={() => handleGenQR(room._id)} disabled={actionLoading[`qr_${room._id}`]}>
                      <QrCode size={14} aria-hidden="true" /> {actionLoading[`qr_${room._id}`] ? 'Generating…' : 'Generate QR Code'}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* QR enlarge modal */}
      <Modal
        isOpen={!!selRoom}
        onClose={() => setSelRoom(null)}
        title={selRoom ? `Room ${selRoom.roomNumber} — QR Code` : ''}
        size="sm"
        footer={
          selRoom?.qrCodeImage && (
            <>
              <Button variant="secondary" onClick={() => downloadQRCode(selRoom.qrCodeImage, `room-${selRoom.roomNumber}-qr.png`)}>
                <Download size={16} aria-hidden="true" /> Download
              </Button>
              <Button variant="primary" onClick={() => printQRCode(selRoom.qrCodeImage, selRoom.roomNumber, hotelName)}>
                <Printer size={16} aria-hidden="true" /> Print
              </Button>
            </>
          )
        }
      >
        {selRoom?.qrCodeImage ? (
          <div style={{ textAlign: 'center' }}>
            {hotelName && <p className="ha-small" style={{ color: 'var(--ha-text-subtle)' }}>{hotelName}</p>}
            <h3 className="ha-h3" style={{ margin: '4px 0 16px' }}>Room {selRoom.roomNumber}</h3>
            <img src={selRoom.qrCodeImage} alt="QR Code" style={{ width: 220, height: 220, borderRadius: 'var(--ha-radius-md)' }} />
            <p className="ha-small" style={{ color: 'var(--ha-text-subtle)', marginTop: 12 }}>Scan for room service & amenities</p>
          </div>
        ) : (
          <p className="ha-body" style={{ color: 'var(--ha-text-subtle)' }}>No QR code for this room.</p>
        )}
      </Modal>

      {/* Batch confirm */}
      <ConfirmDialog
        isOpen={confirmBatch}
        onClose={() => setConfirmBatch(false)}
        onConfirm={doBatchGen}
        variant="info"
        title="Generate QR codes?"
        message={`QR codes will be generated for ${stats.noQR} room${stats.noQR > 1 ? 's' : ''} that don't have one yet.`}
        confirmText="Generate All"
      />
    </div>
  );
};

export default RoomQRManagement;
