import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import ConfirmDialog from '../../../../components/ConfirmDialog';
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

const EMPTY_FORM = {
  roomName: '',
  roomNumber: '',
  type: 'Standard',
  price: '',
  floor: 1,
  maxGuests: 2,
  description: '',
  amenities: [],
  bedType: 'Queen',
  status: 'available',
};

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
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchRooms = useCallback(async () => {
    if (!hotelId) {
      setError('No hotel selected');
      setLoading(false);
      return;
    }
    setLoading(true);
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
      maintenance: rooms.filter((r) => r.status === 'maintenance').length,
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
        room.type?.toLowerCase().includes(q);
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
    accessors: {
      roomNumber: (r) => r.roomNumber,
      type: (r) => r.type,
      status: (r) => r.status,
      price: (r) => Number(r.price) || 0,
    },
  });

  const openCreate = () => {
    setModalMode('create');
    setViewMode(false);
    setSelectedRoom(null);
    setFormData(EMPTY_FORM);
    setFormErrors({});
    setShowModal(true);
  };

  const openEdit = (room, readOnly = false) => {
    setModalMode('edit');
    setViewMode(readOnly);
    setSelectedRoom(room);
    setFormData({
      roomName: room.roomName || '',
      roomNumber: room.roomNumber || '',
      type: room.type || 'Standard',
      price: room.price ?? '',
      floor: room.floor || 1,
      maxGuests: room.maxGuests || 2,
      description: room.description || '',
      amenities: room.amenities || [],
      bedType: room.bedType || 'Queen',
      status: room.status || 'available',
    });
    setFormErrors({});
    setShowModal(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setFormErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const validate = () => {
    const errs = {};
    if (!formData.roomNumber.trim()) errs.roomNumber = 'Room number is required';
    if (!formData.roomName.trim()) errs.roomName = 'Room name is required';
    const priceNum = Number(formData.price);
    if (formData.price === '' || Number.isNaN(priceNum)) errs.price = 'Price is required';
    else if (priceNum < 0) errs.price = 'Price cannot be negative';
    if (Number(formData.maxGuests) < 1) errs.maxGuests = 'At least 1 guest';
    // Duplicate room number check (client-side pre-validation)
    const dup = rooms.find(
      (r) =>
        r.roomNumber?.toLowerCase() === formData.roomNumber.trim().toLowerCase() &&
        r._id !== selectedRoom?._id
    );
    if (dup) errs.roomNumber = 'Room number already exists';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (viewMode) return;
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = { ...formData, price: Number(formData.price) };
      if (modalMode === 'create') {
        await createRoom({ ...payload, hotelId });
        toast.success(`Room ${formData.roomNumber} created`);
      } else {
        await updateRoom(selectedRoom._id, payload);
        toast.success(`Room ${formData.roomNumber} updated`);
      }
      setShowModal(false);
      fetchRooms();
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to ${modalMode} room`);
    } finally {
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
      fetchRooms();
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
    exportToCsv(
      'rooms.csv',
      ['Room Number', 'Room Name', 'Type', 'Status', 'Cleanliness', 'Price', 'Floor', 'Max Guests'],
      filteredRooms.map((r) => [
        r.roomNumber,
        r.roomName,
        r.type,
        r.status,
        r.cleanliness || 'clean',
        r.price,
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
    { value: 'maintenance', label: 'Maintenance', count: roomStats.maintenance },
  ];

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
            <StatCard icon={<DoorClosed size={22} />} iconBg="var(--ha-info)" label="Occupied" value={roomStats.occupied} />
            <StatCard icon={<Wrench size={22} />} iconBg="var(--ha-warning)" label="Under Maintenance" value={roomStats.maintenance} />
          </>
        )}
      </div>

      {/* Table */}
      {error ? (
        <ErrorState description={error} onRetry={fetchRooms} />
      ) : (
        <>
          <Table minWidth={720}>
            <THead>
              <SortableTh sortKey="roomNumber" activeKey={sortKey} dir={sortDir} onSort={toggleSort}>Room No.</SortableTh>
              <SortableTh sortKey="type" activeKey={sortKey} dir={sortDir} onSort={toggleSort}>Type</SortableTh>
              <SortableTh sortKey="status" activeKey={sortKey} dir={sortDir} onSort={toggleSort}>Status</SortableTh>
              <th scope="col">Cleanliness</th>
              <SortableTh sortKey="price" activeKey={sortKey} dir={sortDir} onSort={toggleSort}>Price</SortableTh>
              <th scope="col">Actions</th>
            </THead>
            {loading ? (
              <TableSkeleton rows={6} cols={6} />
            ) : (
              <tbody>
                {paged.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <EmptyState
                        icon={<BedDouble size={26} />}
                        title={debouncedSearch || filterStatus !== 'all' ? 'No matching rooms' : 'No rooms yet'}
                        description={
                          debouncedSearch || filterStatus !== 'all'
                            ? 'Try adjusting your search or filters.'
                            : 'Add your first room to get started.'
                        }
                        action={
                          !debouncedSearch && filterStatus === 'all' ? (
                            <Button variant="primary" size="sm" onClick={openCreate}>
                              <Plus size={15} aria-hidden="true" /> Add Room
                            </Button>
                          ) : null
                        }
                      />
                    </td>
                  </tr>
                ) : (
                  paged.map((room) => (
                    <tr key={room._id}>
                      <td>
                        <span className="ha-body-strong haNum" style={{ color: 'var(--ha-text)' }}>
                          {room.roomNumber}
                        </span>
                        {room.roomName && (
                          <div className="ha-small" style={{ color: 'var(--ha-text-subtle)' }}>{room.roomName}</div>
                        )}
                      </td>
                      <td>{room.type}</td>
                      <td><Badge status={room.status} /></td>
                      <td>
                        <Badge tone={(room.cleanliness || 'clean') === 'clean' ? 'success' : 'warning'}>
                          {(room.cleanliness || 'clean') === 'clean' ? 'Clean' : 'Dirty'}
                        </Badge>
                      </td>
                      <td className="ha-money haNum">Rs. {Number(room.price || 0).toLocaleString('en-IN')}</td>
                      <td>
                        <div className="ha-table__row-actions">
                          <IconButton aria-label={`View room ${room.roomNumber}`} onClick={() => openEdit(room, true)}>
                            <Eye size={16} aria-hidden="true" />
                          </IconButton>
                          <IconButton aria-label={`Edit room ${room.roomNumber}`} onClick={() => openEdit(room, false)}>
                            <Pencil size={16} aria-hidden="true" />
                          </IconButton>
                          <IconButton
                            aria-label={`Delete room ${room.roomNumber}`}
                            onClick={() => setDeleteTarget(room)}
                            style={{ color: 'var(--ha-danger)' }}
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
        title={viewMode ? `Room ${formData.roomNumber}` : modalMode === 'create' ? 'Add New Room' : 'Edit Room'}
        size="lg"
        footer={
          !viewMode ? (
            <>
              <Button variant="secondary" onClick={() => setShowModal(false)} disabled={saving}>Cancel</Button>
              <Button variant="primary" onClick={handleSubmit} disabled={saving}>
                {saving ? 'Saving…' : modalMode === 'create' ? 'Create Room' : 'Update Room'}
              </Button>
            </>
          ) : (
            <Button variant="secondary" onClick={() => setShowModal(false)}>Close</Button>
          )
        }
      >
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 16 }}>
            <Input label="Room Number" name="roomNumber" required value={formData.roomNumber} onChange={handleInputChange} error={formErrors.roomNumber} disabled={viewMode} />
            <Input label="Room Name" name="roomName" required value={formData.roomName} onChange={handleInputChange} error={formErrors.roomName} disabled={viewMode} />
            <Select label="Room Type" name="type" required value={formData.type} onChange={handleInputChange} disabled={viewMode}>
              <option value="Standard">Standard</option>
              <option value="Deluxe">Deluxe</option>
              <option value="Suite">Suite</option>
              <option value="single">Single</option>
              <option value="double">Double</option>
            </Select>
            <Input label="Price (NPR)" name="price" type="number" required min="0" value={formData.price} onChange={handleInputChange} error={formErrors.price} disabled={viewMode} />
            <Input label="Floor" name="floor" type="number" min="1" value={formData.floor} onChange={handleInputChange} disabled={viewMode} />
            <Input label="Max Guests" name="maxGuests" type="number" min="1" value={formData.maxGuests} onChange={handleInputChange} error={formErrors.maxGuests} disabled={viewMode} />
            <Select label="Bed Type" name="bedType" value={formData.bedType} onChange={handleInputChange} disabled={viewMode}>
              <option value="Single">Single</option>
              <option value="Double">Double</option>
              <option value="Queen">Queen</option>
              <option value="King">King</option>
              <option value="Twin">Twin</option>
            </Select>
            <Select label="Status" name="status" value={formData.status} onChange={handleInputChange} disabled={viewMode}>
              <option value="available">Available</option>
              <option value="occupied">Occupied</option>
              <option value="maintenance">Maintenance</option>
              <option value="cleaning">Cleaning</option>
            </Select>
            <div style={{ gridColumn: '1 / -1' }}>
              <Textarea label="Description" name="description" rows="3" value={formData.description} onChange={handleInputChange} disabled={viewMode} />
            </div>
          </div>
        </form>
      </Modal>

      {/* Delete confirmation */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        variant="danger"
        title="Delete room?"
        message={deleteTarget ? `Room ${deleteTarget.roomNumber} will be permanently removed.` : ''}
        confirmText="Delete Room"
        loading={deleting}
      />
    </div>
  );
};

export default RoomsManagement;
