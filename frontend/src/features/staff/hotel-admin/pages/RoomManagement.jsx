import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  BedDouble,
  CheckCircle2,
  DoorClosed,
  Wrench,
  Plus,
  Pencil,
  Eye,
  Trash2,
  Download,
} from 'lucide-react';
import { toast } from 'react-toastify';
import {
  getRooms,
  createRoom,
  updateRoom,
  deleteRoom,
} from '../services/roomApi';
import useHotelId from '../hooks/useHotelId';
import ConfirmDialog from '../components/ui/ConfirmModal';
import {
  PageHeader,
  Button,
  IconButton,
  Input,
  Select,
  Textarea,
  SearchInput,
  Badge,
  StatCard,
  Table,
  THead,
  SortableTh,
  EmptyState,
  ErrorState,
  TableSkeleton,
  StatCardSkeleton,
  FilterTabs,
  Pagination,
  Modal,
} from '../components/ui';
import useDebouncedValue from '../hooks/useDebouncedValue';
import useTableControls from '../hooks/useTableControls';
import { exportToCsv } from '../utils/csv';
import '../styles/hotel-admin-tokens.css';

// Values must match the enum in backend/models/room.schema.js
const ROOM_TYPES = [
  { value: 'single', label: 'Single' },
  { value: 'double', label: 'Double' },
  { value: 'deluxe', label: 'Deluxe' },
  { value: 'suite', label: 'Suite' },
  { value: 'villa', label: 'Villa' },
  { value: 'Standard Twin', label: 'Standard Twin' },
  { value: 'Standard Queen', label: 'Standard Queen' },
  { value: 'Deluxe King', label: 'Deluxe King' },
  { value: 'Executive Suite', label: 'Executive Suite' },
  { value: 'Ocean View', label: 'Ocean View' },
  { value: 'Garden View', label: 'Garden View' },
  { value: 'Presidential Suite', label: 'Presidential Suite' },
];
const typeLabel = (v) => ROOM_TYPES.find((t) => t.value === v)?.label || v || '—';

// Admins may only set these; occupied/reserved come from bookings.
const EDITABLE_STATUSES = [
  { value: 'available', label: 'Available' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'cleaning', label: 'Cleaning' },
];
const STATUS_LABEL = { available: 'Available', occupied: 'Occupied', reserved: 'Reserved', maintenance: 'Maintenance', cleaning: 'Cleaning' };

// Numbers stay strings in the form until submit.
const EMPTY_FORM = {
  roomName: '',
  roomNumber: '',
  type: 'double',
  price: '',
  floor: '1',
  maxGuests: '2',
  description: '',
  amenities: [],
  bedType: 'Queen',
  status: 'available',
};

const isInt = (s) => /^\d+$/.test(String(s).trim());
const ROOM_ACCESSORS = {
  roomNumber: (r) => r.roomNumber,
  type: (r) => typeLabel(r.type),
  status: (r) => r.status,
  price: (r) => Number(r.price) || 0,
};

// Mirrors roomController validateRoomInput
function validateRoomForm(form, rooms, selfId) {
  const errs = {};
  const num = form.roomNumber.trim();
  if (!num) errs.roomNumber = 'Room number is required';
  else if (num.length > 20) errs.roomNumber = 'Use 20 characters or fewer';
  else if (rooms.some((r) => r._id !== selfId && String(r.roomNumber).trim().toLowerCase() === num.toLowerCase())) errs.roomNumber = `Room ${num} already exists`;
  if (!form.roomName.trim()) errs.roomName = 'Room name is required';
  else if (form.roomName.trim().length > 100) errs.roomName = 'Use 100 characters or fewer';
  if (!ROOM_TYPES.some((t) => t.value === form.type)) errs.type = 'Choose a room type';
  const price = String(form.price).trim();
  if (price === '') errs.price = 'Price is required';
  else if (!/^\d+(\.\d{1,2})?$/.test(price) || Number(price) > 10000000) errs.price = 'Enter 0 to 10,000,000 (max 2 decimals)';
  if (String(form.floor).trim() !== '' && (!isInt(form.floor) || Number(form.floor) > 200)) errs.floor = 'Floor must be a whole number from 0 to 200';
  if (!isInt(form.maxGuests) || Number(form.maxGuests) < 1 || Number(form.maxGuests) > 20) errs.maxGuests = 'Max guests must be 1 to 20';
  if (form.description.length > 1000) errs.description = 'Use 1,000 characters or fewer';
  return errs;
}

const RoomsManagement = ({ onCount }) => {
  const hotelId = useHotelId();

  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebouncedValue(searchQuery, 250);

  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [viewMode, setViewMode] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [formAlert, setFormAlert] = useState('');
  const [saving, setSaving] = useState(false);
  // Synchronous guard: state updates are async, so two clicks in one tick would both pass saving.
  const savingRef = useRef(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchRooms = useCallback(async ({ silent = false } = {}) => {
    if (!hotelId) {
      setError('No hotel selected');
      setLoading(false);
      return;
    }
    if (!silent) setLoading(true);
    setError(null);
    try {
      const response = await getRooms({ hotelId });
      const list = response.data.rooms || [];
      setRooms(list);
      onCount?.(list.length);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch rooms');
    } finally {
      setLoading(false);
    }
  }, [hotelId, onCount]);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  const roomStats = useMemo(
    () => ({
      available: rooms.filter((r) => r.status === 'available').length,
      occupied: rooms.filter((r) => r.status === 'occupied').length,
      reserved: rooms.filter((r) => r.status === 'reserved').length,
      maintenance: rooms.filter((r) => r.status === 'maintenance').length,
      cleaning: rooms.filter((r) => r.status === 'cleaning').length,
      total: rooms.length,
    }),
    [rooms]
  );

  const filteredRooms = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    return rooms.filter((room) => {
      const matchesStatus = filterStatus === 'all' || room.status === filterStatus;
      const matchesSearch =
        q === '' ||
        room.roomNumber?.toLowerCase().includes(q) ||
        room.roomName?.toLowerCase().includes(q) ||
        typeLabel(room.type).toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [rooms, filterStatus, debouncedSearch]);

  const {
    paged,
    page,
    setPage,
    pageSize,
    totalItems,
    sortKey,
    sortDir,
    toggleSort,
  } = useTableControls(filteredRooms, {
    pageSize: 10,
    initialSortKey: 'roomNumber',
    accessors: ROOM_ACCESSORS,
  });

  // A filter or search change always starts from page 1
  useEffect(() => {
    setPage(1);
  }, [filterStatus, debouncedSearch, setPage]);

  const openCreate = () => {
    setModalMode('create');
    setViewMode(false);
    setSelectedRoom(null);
    setFormData(EMPTY_FORM);
    setFormErrors({});
    setFormAlert('');
    setShowModal(true);
  };

  const openEdit = (room, readOnly = false) => {
    setModalMode('edit');
    setViewMode(readOnly);
    setSelectedRoom(room);
    setFormData({
      roomName: room.roomName || '',
      roomNumber: room.roomNumber || '',
      type: room.type || 'double',
      price: String(room.price ?? ''),
      floor: String(room.floor ?? 1),
      maxGuests: String(room.maxGuests ?? 2),
      description: room.description || '',
      amenities: room.amenities || [],
      bedType: room.bedType || 'Queen',
      status: room.status || 'available',
    });
    setFormErrors({});
    setFormAlert('');
    setShowModal(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setFormErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (viewMode || saving) return;
    const errs = validateRoomForm(formData, rooms, selectedRoom?._id);
    setFormErrors(errs);
    if (Object.keys(errs).length) return;
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setFormAlert('');
    try {
      const payload = {
        roomNumber: formData.roomNumber.trim(),
        roomName: formData.roomName.trim(),
        type: formData.type,
        price: Number(formData.price),
        floor: String(formData.floor).trim() === '' ? 1 : Number(formData.floor),
        maxGuests: Number(formData.maxGuests),
        description: formData.description.trim(),
        bedType: formData.bedType,
        // occupied/reserved are booking-driven: only send status when admin-editable
        ...(EDITABLE_STATUSES.some((s) => s.value === formData.status) ? { status: formData.status } : {}),
      };
      if (modalMode === 'create') {
        await createRoom({ ...payload, hotelId });
        toast.success(`Room ${payload.roomNumber} created`);
      } else {
        await updateRoom(selectedRoom._id, payload);
        toast.success(`Room ${payload.roomNumber} updated`);
      }
      setShowModal(false);
      fetchRooms({ silent: true });
    } catch (err) {
      const data = err.response?.data;
      if (data?.errors) setFormErrors(data.errors);
      setFormAlert(data?.message || `Could not ${modalMode === 'create' ? 'create' : 'update'} the room. Please try again.`);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteRoom(deleteTarget._id);
      toast.success(`Room ${deleteTarget.roomNumber} deleted`);
      setDeleteTarget(null);
      fetchRooms({ silent: true });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete room');
    } finally {
      setDeleting(false);
    }
  };

  const handleExport = () => {
    if (filteredRooms.length === 0) {
      toast.info('No rooms to export.');
      return;
    }
    // Cleanliness isn't tracked on rooms, so it is no longer exported/shown.
    exportToCsv(
      'rooms.csv',
      ['Room Number', 'Room Name', 'Type', 'Status', 'Price (NPR)', 'Floor', 'Max Guests'],
      filteredRooms.map((r) => [
        r.roomNumber,
        r.roomName,
        typeLabel(r.type),
        STATUS_LABEL[r.status] || r.status,
        Number(r.price) || 0,
        r.floor,
        r.maxGuests,
      ])
    );
    toast.success(`Exported ${filteredRooms.length} rooms to CSV.`);
  };

  const statusFilters = [
    { value: 'all', label: 'All', count: roomStats.total },
    { value: 'available', label: 'Available', count: roomStats.available },
    { value: 'occupied', label: 'Occupied', count: roomStats.occupied },
    { value: 'reserved', label: 'Reserved', count: roomStats.reserved },
    { value: 'maintenance', label: 'Maintenance', count: roomStats.maintenance },
    { value: 'cleaning', label: 'Cleaning', count: roomStats.cleaning },
  ];

  const filtersActive = !!(debouncedSearch || filterStatus !== 'all');
  // A status the admin can't pick (occupied/reserved) is shown read-only.
  const statusLocked = modalMode === 'edit' && !EDITABLE_STATUSES.some((s) => s.value === formData.status);

  return (
    <div className="ha-page">
      <PageHeader
        title="Rooms"
        subtitle="Manage rooms, availability, and pricing."
        actions={
          <>
            <Button variant="secondary" onClick={handleExport}>
              <Download size={16} aria-hidden="true" /> Export
            </Button>
            <Button variant="primary" onClick={openCreate}>
              <Plus size={16} aria-hidden="true" /> Add Room
            </Button>
          </>
        }
        toolbar={
          <>
            <div className="ha-toolbar__group">
              <SearchInput
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by number, name, or type…"
                ariaLabel="Search rooms"
              />
            </div>
            <FilterTabs
              options={statusFilters}
              value={filterStatus}
              onChange={setFilterStatus}
              ariaLabel="Filter rooms by status"
            />
          </>
        }
      />

      {/* KPI row */}
      <div className="ha-kpi-grid" style={{ marginBottom: 24 }}>
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard icon={<BedDouble size={22} />} iconBg="linear-gradient(135deg,#6366f1,#4f46e5)" label="Total Rooms" value={roomStats.total} />
            <StatCard icon={<CheckCircle2 size={22} />} iconBg="var(--ha-success)" label="Available" value={roomStats.available} />
            <StatCard icon={<DoorClosed size={22} />} iconBg="var(--ha-info)" label="Occupied / Reserved" value={roomStats.occupied + roomStats.reserved} />
            <StatCard icon={<Wrench size={22} />} iconBg="var(--ha-warning)" label="Maintenance / Cleaning" value={roomStats.maintenance + roomStats.cleaning} />
          </>
        )}
      </div>

      {/* Table */}
      {error ? (
        <ErrorState description={error} onRetry={() => fetchRooms()} />
      ) : (
        <>
          <Table minWidth={680} stack>
            <THead>
              <SortableTh sortKey="roomNumber" activeKey={sortKey} dir={sortDir} onSort={toggleSort}>Room No.</SortableTh>
              <SortableTh sortKey="type" activeKey={sortKey} dir={sortDir} onSort={toggleSort}>Type</SortableTh>
              <SortableTh sortKey="status" activeKey={sortKey} dir={sortDir} onSort={toggleSort}>Status</SortableTh>
              <SortableTh sortKey="price" activeKey={sortKey} dir={sortDir} onSort={toggleSort}>Price</SortableTh>
              <th scope="col">Actions</th>
            </THead>
            {loading ? (
              <TableSkeleton rows={6} cols={5} />
            ) : (
              <tbody>
                {paged.length === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      <EmptyState
                        icon={<BedDouble size={26} />}
                        title={filtersActive ? 'No matching rooms' : 'No rooms yet'}
                        description={filtersActive ? 'Try a different search or clear the filters.' : 'Add your first room to get started.'}
                        action={
                          filtersActive ? (
                            <Button variant="secondary" size="sm" onClick={() => { setSearchQuery(''); setFilterStatus('all'); }}>Clear filters</Button>
                          ) : (
                            <Button variant="primary" size="sm" onClick={openCreate}>
                              <Plus size={15} aria-hidden="true" /> Add Room
                            </Button>
                          )
                        }
                      />
                    </td>
                  </tr>
                ) : (
                  paged.map((room) => (
                    <tr key={room._id}>
                      <td data-primary>
                        <span className="ha-body-strong haNum" style={{ color: 'var(--ha-text)' }}>
                          Room {room.roomNumber}
                        </span>
                        {room.roomName && (
                          <div className="ha-small" style={{ color: 'var(--ha-text-subtle)', overflowWrap: 'anywhere' }}>{room.roomName}</div>
                        )}
                      </td>
                      <td data-label="Type">{typeLabel(room.type)}</td>
                      <td data-label="Status"><Badge status={room.status}>{STATUS_LABEL[room.status] || room.status}</Badge></td>
                      <td data-label="Price" className="ha-money haNum">Rs. {Number(room.price || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                      <td data-actions>
                        <div className="ha-table__row-actions">
                          <IconButton aria-label={`View room ${room.roomNumber}`} title="View" onClick={() => openEdit(room, true)}>
                            <Eye size={16} aria-hidden="true" />
                          </IconButton>
                          <IconButton aria-label={`Edit room ${room.roomNumber}`} title="Edit" onClick={() => openEdit(room, false)}>
                            <Pencil size={16} aria-hidden="true" />
                          </IconButton>
                          <IconButton
                            aria-label={`Delete room ${room.roomNumber}`}
                            title="Delete"
                            onClick={() => setDeleteTarget(room)}
                            style={{ color: 'var(--ha-danger-text)' }}
                          >
                            <Trash2 size={16} aria-hidden="true" />
                          </IconButton>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            )}
          </Table>
          {!loading && (
            <Pagination page={page} pageSize={pageSize} totalItems={totalItems} onPageChange={setPage} itemLabel="rooms" />
          )}
        </>
      )}

      {/* Create / Edit / View modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={viewMode ? `Room ${formData.roomNumber}` : modalMode === 'create' ? 'Add New Room' : `Edit room ${selectedRoom?.roomNumber || ''}`}
        size="lg"
        busy={saving}
        footer={
          !viewMode ? (
            <>
              <Button variant="secondary" onClick={() => setShowModal(false)} disabled={saving}>Cancel</Button>
              <Button variant="primary" type="submit" form="ha-room-form" loading={saving}>
                {saving ? 'Saving…' : modalMode === 'create' ? 'Create Room' : 'Update Room'}
              </Button>
            </>
          ) : (
            <>
              <Button variant="secondary" onClick={() => setShowModal(false)}>Close</Button>
              <Button variant="primary" onClick={() => setViewMode(false)}><Pencil size={16} aria-hidden="true" /> Edit</Button>
            </>
          )
        }
      >
        {viewMode ? (
          <dl className="ha-dl">
            <div><dt>Room number</dt><dd className="haNum">{formData.roomNumber}</dd></div>
            <div><dt>Room name</dt><dd>{formData.roomName || '—'}</dd></div>
            <div><dt>Type</dt><dd>{typeLabel(formData.type)}</dd></div>
            <div><dt>Status</dt><dd><Badge status={formData.status}>{STATUS_LABEL[formData.status] || formData.status}</Badge></dd></div>
            <div><dt>Price per night</dt><dd className="haNum">Rs. {Number(formData.price || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</dd></div>
            <div><dt>Floor</dt><dd className="haNum">{formData.floor}</dd></div>
            <div><dt>Max guests</dt><dd className="haNum">{formData.maxGuests}</dd></div>
            <div><dt>Bed type</dt><dd>{formData.bedType || '—'}</dd></div>
            <div className="ha-dl__full"><dt>Description</dt><dd>{formData.description || '—'}</dd></div>
          </dl>
        ) : (
          <form id="ha-room-form" onSubmit={handleSubmit} noValidate className="ha-form-grid">
            <p className="ha-form-section-title">Identity</p>
            <Input label="Room Number" name="roomNumber" required maxLength={20} autoComplete="off" value={formData.roomNumber} onChange={handleInputChange} error={formErrors.roomNumber} />
            <Input label="Room Name" name="roomName" required maxLength={100} value={formData.roomName} onChange={handleInputChange} error={formErrors.roomName} placeholder="e.g. Deluxe King with balcony" />
            <Select label="Room Type" name="type" required value={formData.type} onChange={handleInputChange} error={formErrors.type}>
              {ROOM_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </Select>
            <Select label="Bed Type" name="bedType" value={formData.bedType} onChange={handleInputChange}>
              <option value="Single">Single</option>
              <option value="Double">Double</option>
              <option value="Queen">Queen</option>
              <option value="King">King</option>
              <option value="Twin">Twin</option>
            </Select>

            <p className="ha-form-section-title">Pricing & capacity</p>
            <Input label="Price per night (NPR)" name="price" required inputMode="decimal" value={formData.price} onChange={handleInputChange} error={formErrors.price} hint="0 to 10,000,000" />
            <Input label="Max Guests" name="maxGuests" required inputMode="numeric" value={formData.maxGuests} onChange={handleInputChange} error={formErrors.maxGuests} hint="1–20 guests" />
            <Input label="Floor" name="floor" inputMode="numeric" value={formData.floor} onChange={handleInputChange} error={formErrors.floor} hint="0 = ground floor" />

            {statusLocked ? (
              <div className="ha-field">
                <span className="ha-field__label">Status</span>
                <span><Badge status={formData.status}>{STATUS_LABEL[formData.status] || formData.status}</Badge></span>
                <span className="ha-field__hint">Set by bookings. Check the guest out at reception to change it.</span>
              </div>
            ) : (
              <Select label="Status" name="status" value={formData.status} onChange={handleInputChange} error={formErrors.status}>
                {EDITABLE_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </Select>
            )}

            <div className="ha-form-grid__full">
              <Textarea label="Description" name="description" rows="3" maxLength={1000} counter value={formData.description} onChange={handleInputChange} error={formErrors.description} />
            </div>
            {formAlert && <div className="ha-alert ha-alert--danger ha-form-grid__full" role="alert">{formAlert}</div>}
          </form>
        )}
      </Modal>

      {/* Delete confirmation */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        variant="danger"
        title={deleteTarget ? `Delete room ${deleteTarget.roomNumber}?` : ''}
        message={deleteTarget ? `Room ${deleteTarget.roomNumber} and its QR code are removed permanently. Rooms with active bookings or open orders can't be deleted.` : ''}
        confirmText="Delete Room"
        loading={deleting}
      />
    </div>
  );
};

export default RoomsManagement;
