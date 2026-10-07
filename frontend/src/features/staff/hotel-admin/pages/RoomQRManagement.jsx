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
import ConfirmDialog from '../components/ui/ConfirmModal';
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
  ErrorState,
  Skeleton,
  Modal,
} from '../components/ui';
import useDebouncedValue from '../hooks/useDebouncedValue';
import { useStaffAuth } from '../../../../core/context/StaffAuthContext';
import { downloadQrImage, printQrSheet } from '../utils/qr';
import '../styles/hotel-admin-tokens.css';

const ROOM_HINT = 'Scan for room service & amenities';
const printRoom = (room, hotelName) =>
  printQrSheet({ items: [{ label: `Room ${room.roomNumber}`, image: room.qrCodeImage }], hotelName, hint: ROOM_HINT, title: `Room ${room.roomNumber}` });
const printAllRooms = (rooms, hotelName) =>
  printQrSheet({
    items: rooms.filter((r) => r.qrCodeImage && r.isQrActive !== false).map((r) => ({ label: `Room ${r.roomNumber}`, image: r.qrCodeImage })),
    hotelName,
    hint: ROOM_HINT,
    title: `${hotelName ? `${hotelName} · ` : ''}Room QR codes`,
  });

const roomTypeLabel = (type) => {
  if (!type) return 'Room';
  return type.charAt(0).toUpperCase() + type.slice(1);
};

const RoomQRManagement = () => {
  const hotelId = useHotelId();
  const { staffUser } = useStaffAuth();

  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [actionLoading, setActionLoading] = useState({});
  const [hotelName, setHotelName] = useState(staffUser?.activeProperty?.name || '');
  const [regenRoom, setRegenRoom] = useState(null);

  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 250);
  const [typeFilter, setTypeFilter] = useState('all');

  const [selRoom, setSelRoom] = useState(null);
  const [confirmBatch, setConfirmBatch] = useState(false);

  const setAct = (k, v) => setActionLoading((p) => ({ ...p, [k]: v }));

  // Patch a single room in local state (merge changed fields) so an operation
  // updates just that card — no full refetch, no loading-skeleton flash.
  const patchRoom = (roomId, changes) =>
    setRooms((prev) => prev.map((r) => (r._id === roomId ? { ...r, ...changes } : r)));

  // Silent refetch: refresh data WITHOUT flipping the global loading flag, so
  // the grid is updated in place rather than being blanked to skeletons.
  const refetchSilently = useCallback(async () => {
    if (!hotelId) return;
    try {
      const res = await getRooms({ hotelId });
      if (res.data.success) {
        const data = res.data.rooms || [];
        setRooms(data);
        if (data[0]?.hotel?.name) setHotelName(data[0].hotel.name);
      }
    } catch {
      /* keep existing rooms on a background refresh failure */
    }
  }, [hotelId]);

  const fetchRooms = useCallback(async () => {
    if (!hotelId) { setLoading(false); return; }
    setLoading(true);
    setLoadError(null);
    try {
      const res = await getRooms({ hotelId });
      if (res.data.success) {
        const data = res.data.rooms || [];
        setRooms(data);
        if (data[0]?.hotel?.name) setHotelName(data[0].hotel.name);
      }
    } catch (e) {
      setLoadError(e.response?.data?.message || 'Failed to load rooms');
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
    return rooms
      .filter((r) => {
        const matchF = filter === 'all'
          || (filter === 'with-qr' && !!r.qrCodeImage)
          || (filter === 'without-qr' && !r.qrCodeImage)
          || (filter === 'inactive' && !!r.qrCodeImage && r.isQrActive === false);
        const matchS = !q || String(r.roomNumber).toLowerCase().includes(q) || (r.roomName || '').toLowerCase().includes(q) || (r.type || '').toLowerCase().includes(q);
        const matchT = typeFilter === 'all' || r.type === typeFilter;
        return matchF && matchS && matchT;
      })
      .sort((a, b) => String(a.roomNumber).localeCompare(String(b.roomNumber), undefined, { numeric: true }));
  }, [rooms, filter, debouncedSearch, typeFilter]);

  const handleGenQR = async (roomId, regenerate = false) => {
    setAct(`qr_${roomId}`, true);
    try {
      const res = await generateRoomQR(roomId, regenerate);
      if (res.data.success) {
        toast.success(regenerate ? 'New QR issued. The old code no longer works.' : 'QR code generated');
        setRegenRoom(null);
        // Merge the returned QR fields into just this room. The controller sets
        // isQrActive=true on generate, so reflect that locally too.
        const updated = res.data.room || {};
        patchRoom(roomId, {
          qrCodeImage: updated.qrCodeImage,
          qrCodeData: updated.qrCodeData,
          uniqueToken: updated.uniqueToken ?? undefined,
          isQrActive: true,
        });
      }
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
        const n = res.data.successCount ?? 0;
        if (res.data.errorCount) toast.warning(`${n} QR code(s) generated, ${res.data.errorCount} failed`);
        else toast.success(`${n} QR code${n === 1 ? '' : 's'} generated`);
        // Many rooms change at once — refresh in place without the skeleton flash.
        await refetchSilently();
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
      if (res.data.success) {
        toast.success(`QR ${isActive ? 'deactivated' : 'activated'}`);
        // Reflect the server's authoritative new state on just this room.
        patchRoom(roomId, { isQrActive: res.data.isQrActive });
      }
    } catch (e) {
      toast.error(e.response?.data?.message || 'Status update failed');
    } finally {
      setAct(`tog_${roomId}`, false);
    }
  };

  const filterOptions = [
    { value: 'all', label: 'All Rooms', count: stats.total },
    { value: 'with-qr', label: 'With QR', count: stats.withQR },
    { value: 'without-qr', label: 'No QR', count: stats.noQR },
    { value: 'inactive', label: 'Inactive', count: stats.inactive },
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
            <Button variant="secondary" onClick={() => printAllRooms(rooms, hotelName)} disabled={!stats.active}>
              <Printer size={16} aria-hidden="true" /> Print All
            </Button>
            <Button variant="primary" onClick={() => setConfirmBatch(true)} disabled={!stats.noQR} loading={actionLoading.batch}>
              {!actionLoading.batch && <Zap size={16} aria-hidden="true" />} {actionLoading.batch ? 'Generating…' : `Generate All (${stats.noQR})`}
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

      {loadError ? (
        <ErrorState description={loadError} onRetry={fetchRooms} />
      ) : loading ? (
        <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fill,minmax(min(240px,100%),1fr))' }} aria-busy="true" aria-label="Loading rooms">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="ha-card ha-card--pad" style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
              <Skeleton width="50%" height={16} />
              <Skeleton width={120} height={120} />
              <Skeleton width="80%" height={32} />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<BedDouble size={26} />}
          title={rooms.length === 0 ? 'No rooms yet' : 'No matching rooms'}
          description={rooms.length === 0 ? 'Add rooms first, then generate their QR codes here.' : 'Try a different search or clear the filters.'}
          action={rooms.length === 0
            ? <Button variant="primary" size="sm" onClick={() => { window.location.hash = '#rooms'; }}>Go to Rooms</Button>
            : <Button variant="secondary" size="sm" onClick={() => { setSearch(''); setFilter('all'); setTypeFilter('all'); }}>Clear filters</Button>}
        />
      ) : (
        <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fill,minmax(min(240px,100%),1fr))' }}>
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
                      style={{ border: 'none', background: '#fff', cursor: 'pointer', padding: 6, borderRadius: 'var(--ha-radius-sm)', lineHeight: 0 }}
                    >
                      <img src={room.qrCodeImage} alt={`QR for room ${room.roomNumber}`} width={120} height={120} loading="lazy" style={{ width: 120, height: 120, opacity: isActive ? 1 : 0.4 }} />
                    </button>
                  ) : (
                    <div style={{ textAlign: 'center', color: 'var(--ha-text-subtle)' }}>
                      <Smartphone size={32} aria-hidden="true" />
                      <p className="ha-small" style={{ margin: '6px 0' }}>No QR Code</p>
                    </div>
                  )}
                </div>

                {(room.floor != null || room.price) && (
                  <div className="ha-small haNum" style={{ color: 'var(--ha-text-subtle)', textAlign: 'center' }}>
                    {[room.floor != null ? `Floor ${room.floor}` : null, room.price ? `Rs. ${Number(room.price).toLocaleString('en-IN')}` : null].filter(Boolean).join(' · ')}
                  </div>
                )}

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 'auto' }}>
                  {hasQR ? (
                    <>
                      <Button size="sm" variant="secondary" onClick={() => handleToggle(room._id, isActive)} disabled={actionLoading[`tog_${room._id}`]}>
                        {isActive ? <PowerOff size={14} aria-hidden="true" /> : <Power size={14} aria-hidden="true" />}
                        {isActive ? 'Deactivate' : 'Activate'}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => downloadQrImage(room.qrCodeImage, `room-${room.roomNumber}-qr.png`)} aria-label={`Download QR for room ${room.roomNumber}`}>
                        <Download size={14} aria-hidden="true" /> Download
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => printRoom(room, hotelName)} aria-label={`Print QR for room ${room.roomNumber}`}>
                        <Printer size={14} aria-hidden="true" /> Print
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setRegenRoom(room)} disabled={actionLoading[`qr_${room._id}`]} aria-label={`Regenerate QR for room ${room.roomNumber}`}>
                        <RotateCcw size={14} aria-hidden="true" /> Regenerate
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
              <Button variant="secondary" onClick={() => downloadQrImage(selRoom.qrCodeImage, `room-${selRoom.roomNumber}-qr.png`)}>
                <Download size={16} aria-hidden="true" /> Download
              </Button>
              <Button variant="primary" onClick={() => printRoom(selRoom, hotelName)}>
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
            <div style={{ display: 'inline-block', background: '#fff', padding: 12, borderRadius: 'var(--ha-radius-md)' }}>
              <img src={selRoom.qrCodeImage} alt={`QR code for room ${selRoom.roomNumber}`} width={220} height={220} style={{ width: 220, height: 220, maxWidth: '100%', display: 'block' }} />
            </div>
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

      {/* Regenerate confirm */}
      <ConfirmDialog
        isOpen={!!regenRoom}
        onClose={() => setRegenRoom(null)}
        onConfirm={() => regenRoom && handleGenQR(regenRoom._id, true)}
        variant="warning"
        title={regenRoom ? `Regenerate QR for room ${regenRoom.roomNumber}?` : ''}
        message="A new QR code is issued and the current one stops working immediately. Replace the printed code in the room afterwards."
        confirmText="Regenerate QR"
        loading={!!(regenRoom && actionLoading[`qr_${regenRoom._id}`])}
      />
    </div>
  );
};

export default RoomQRManagement;
