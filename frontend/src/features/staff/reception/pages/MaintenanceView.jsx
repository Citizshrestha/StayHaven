import React, { useState, useEffect, useCallback } from 'react';
import { useStaffAuth } from '../../../../core/context/StaffAuthContext';
import {
  getMaintenanceSchedules,
  getMaintenanceCalendar,
  createMaintenanceSchedule,
  updateMaintenanceSchedule,
  startMaintenance,
  completeMaintenance,
  cancelMaintenance
} from '../services/maintenanceApi';
import { getRooms } from '../../../staff/hotel-admin/services/roomApi';
import { getStaffList } from '../../../staff/hotel-admin/services/staffApi';
import './MaintenanceView.css';

const MaintenanceView = () => {
  const { activeProperty } = useStaffAuth();
  const [view, setView] = useState('calendar'); // 'calendar' or 'list'
  const [maintenanceSchedules, setMaintenanceSchedules] = useState([]);
  const [calendarData, setCalendarData] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Filters
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterRoom, setFilterRoom] = useState('all');
  const [filterDateRange, setFilterDateRange] = useState({ start: '', end: '' });

  const [formData, setFormData] = useState({
    roomId: '',
    title: '',
    description: '',
    category: 'routine',
    scheduleType: 'scheduled',
    scheduledDate: '',
    scheduledTime: '',
    duration: 60,
    assignedTo: '',
    assignedToName: '',
    priority: 'medium',
    notes: ''
  });

  const hotelId = activeProperty?._id || activeProperty;

  const categories = [
    { value: 'routine', label: 'Routine Maintenance' },
    { value: 'repair', label: 'Repair' },
    { value: 'inspection', label: 'Inspection' },
    { value: 'cleaning', label: 'Deep Cleaning' },
    { value: 'upgrade', label: 'Upgrade' }
  ];

  const priorities = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' }
  ];

  // Fetch data
  useEffect(() => {
    if (hotelId) {
      fetchMaintenanceSchedules();
      fetchRooms();
      fetchStaff();
    }
  }, [hotelId, filterStatus, filterRoom, filterDateRange]);

  useEffect(() => {
    if (hotelId && view === 'calendar') {
      fetchCalendarData();
    }
  }, [hotelId, view, currentMonth]);

  const fetchMaintenanceSchedules = async () => {
    if (!hotelId) return;

    setLoading(true);
    setError(null);
    setLoadError('');
    try {
      const params = { hotelId };
      if (filterStatus !== 'all') params.status = filterStatus;
      if (filterRoom !== 'all') params.roomId = filterRoom;
      if (filterDateRange.start) params.startDate = filterDateRange.start;
      if (filterDateRange.end) params.endDate = filterDateRange.end;

      const response = await getMaintenanceSchedules(params);
      if (response.data.success) {
        setMaintenanceSchedules(response.data.schedules || []);
      } else {
        setLoadError('Unable to load maintenance schedules. Please try again.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch maintenance schedules');
      setLoadError('Unable to load maintenance schedules. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchCalendarData = async () => {
    if (!hotelId) return;

    try {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth() + 1;
      const response = await getMaintenanceCalendar({ hotelId, year, month });
      if (response.data.success) {
        setCalendarData(response.data.calendar || []);
      }
    } catch (err) {
      console.error('Failed to fetch calendar data:', err);
    }
  };

  const fetchRooms = async () => {
    if (!hotelId) return;
    try {
      const response = await getRooms({ hotelId });
      if (response.data.success) {
        setRooms(response.data.rooms || []);
      }
    } catch (err) {
      console.error('Failed to fetch rooms:', err);
    }
  };

  const fetchStaff = async () => {
    try {
      const response = await getStaffList({ department: 'Maintenance' });
      if (response.data.success) {
        setStaff(response.data.staff || []);
      }
    } catch (err) {
      console.error('Failed to fetch staff:', err);
    }
  };

  const handleAddSchedule = (date = null) => {
    setSelectedSchedule(null);
    setSelectedDate(date);
    setFormData({
      roomId: '',
      title: '',
      description: '',
      category: 'routine',
      scheduleType: 'scheduled',
      scheduledDate: date || '',
      scheduledTime: '',
      duration: 60,
      assignedTo: '',
      assignedToName: '',
      priority: 'medium',
      notes: ''
    });
    setShowModal(true);
  };

  const handleEditSchedule = (schedule) => {
    setSelectedSchedule(schedule);
    setFormData({
      roomId: schedule.room?._id || schedule.roomId || '',
      title: schedule.title || '',
      description: schedule.description || '',
      category: schedule.category || 'routine',
      scheduleType: schedule.scheduleType || 'scheduled',
      scheduledDate: schedule.scheduledDate?.split('T')[0] || '',
      scheduledTime: schedule.scheduledTime || '',
      duration: schedule.duration || 60,
      assignedTo: schedule.assignedTo || '',
      assignedToName: schedule.assignedToName || '',
      priority: schedule.priority || 'medium',
      notes: schedule.notes || ''
    });
    setShowModal(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Auto-fill assigned staff name
    if (name === 'assignedTo') {
      const selectedStaff = staff.find(s => s._id === value);
      if (selectedStaff) {
        setFormData(prev => ({ ...prev, assignedToName: selectedStaff.name }));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload = { ...formData, hotelId };

      if (selectedSchedule) {
        await updateMaintenanceSchedule(selectedSchedule._id, payload);
      } else {
        await createMaintenanceSchedule(payload);
      }

      setShowModal(false);
      fetchMaintenanceSchedules();
      if (view === 'calendar') fetchCalendarData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save maintenance schedule');
    } finally {
      setLoading(false);
    }
  };

  const handleStartMaintenance = async (id) => {
    setLoading(true);
    try {
      await startMaintenance(id);
      fetchMaintenanceSchedules();
      if (view === 'calendar') fetchCalendarData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to start maintenance');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteMaintenance = async (id) => {
    const notes = window.prompt('Add completion notes (optional):');
    setLoading(true);
    try {
      await completeMaintenance(id, { completionNotes: notes });
      fetchMaintenanceSchedules();
      if (view === 'calendar') fetchCalendarData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to complete maintenance');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSchedule = async (id) => {
    const reason = window.prompt('Reason for cancellation:');
    if (!reason) return;

    setLoading(true);
    try {
      await cancelMaintenance(id, reason);
      fetchMaintenanceSchedules();
      if (view === 'calendar') fetchCalendarData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to cancel maintenance');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      scheduled: 'blue',
      'in-progress': 'yellow',
      completed: 'green',
      cancelled: 'gray'
    };
    return colors[status] || 'gray';
  };

  const renderCalendarView = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const daySchedules = maintenanceSchedules.filter(s =>
        s.scheduledDate?.startsWith(dateStr)
      );

      days.push(
        <div
          key={day}
          className="calendar-day"
          onClick={() => handleAddSchedule(dateStr)}
        >
          <div className="day-number">{day}</div>
          <div className="day-schedules">
            {daySchedules.map(schedule => (
              <div
                key={schedule._id}
                className={`schedule-dot ${getStatusColor(schedule.status)}`}
                title={schedule.title}
                onClick={(e) => {
                  e.stopPropagation();
                  handleEditSchedule(schedule);
                }}
              ></div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="calendar-container">
        <div className="calendar-header">
          <button onClick={() => setCurrentMonth(new Date(year, month - 1))}>
            ← Previous
          </button>
          <h3>{currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h3>
          <button onClick={() => setCurrentMonth(new Date(year, month + 1))}>
            Next →
          </button>
        </div>
        <div className="calendar-weekdays">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="weekday">{day}</div>
          ))}
        </div>
        <div className="calendar-grid">{days}</div>
        <div className="calendar-legend">
          <span><span className="legend-dot blue"></span> Scheduled</span>
          <span><span className="legend-dot yellow"></span> In Progress</span>
          <span><span className="legend-dot green"></span> Completed</span>
        </div>
      </div>
    );
  };

  const renderListView = () => {
    const filteredSchedules = maintenanceSchedules;

    return (
      <div className="list-container">
        <div className="list-filters">
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="all">All Status</option>
            <option value="scheduled">Scheduled</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select value={filterRoom} onChange={(e) => setFilterRoom(e.target.value)}>
            <option value="all">All Rooms</option>
            {rooms.map(room => (
              <option key={room._id} value={room._id}>Room {room.roomNumber}</option>
            ))}
          </select>
          <button className="btn-primary" onClick={() => handleAddSchedule()}>
            Add Schedule
          </button>
        </div>

        {loading && <div className="loading-spinner">Loading...</div>}

        {!loading && filteredSchedules.length === 0 && (
          <div className="empty-state">No maintenance schedules found</div>
        )}

        <div className="schedules-list">
          {filteredSchedules.map(schedule => (
            <div key={schedule._id} className="schedule-card">
              <div className="schedule-header">
                <h4>{schedule.title}</h4>
                <span className={`status-badge ${schedule.status}`}>
                  {schedule.status}
                </span>
              </div>
              <div className="schedule-details">
                <p><strong>Room:</strong> {schedule.roomNumber || 'N/A'}</p>
                <p><strong>Category:</strong> {schedule.category}</p>
                <p><strong>Date:</strong> {new Date(schedule.scheduledDate).toLocaleDateString()}</p>
                <p><strong>Assigned To:</strong> {schedule.assignedToName || 'Unassigned'}</p>
                <p><strong>Priority:</strong> {schedule.priority}</p>
                {schedule.description && <p><strong>Description:</strong> {schedule.description}</p>}
              </div>
              <div className="schedule-actions">
                {schedule.status === 'scheduled' && (
                  <button
                    className="btn-start"
                    onClick={() => handleStartMaintenance(schedule._id)}
                    disabled={loading}
                  >
                    Start
                  </button>
                )}
                {schedule.status === 'in-progress' && (
                  <button
                    className="btn-complete"
                    onClick={() => handleCompleteMaintenance(schedule._id)}
                    disabled={loading}
                  >
                    Complete
                  </button>
                )}
                <button
                  className="btn-edit"
                  onClick={() => handleEditSchedule(schedule)}
                >
                  Edit
                </button>
                {schedule.status === 'scheduled' && (
                  <button
                    className="btn-cancel"
                    onClick={() => handleCancelSchedule(schedule._id)}
                    disabled={loading}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="maintenance-view">
      <div className="content-header">
        <h1>Maintenance Management</h1>
        <p className="subtitle">Schedule and track maintenance activities</p>
      </div>

      {/* Error Banner with Retry */}
      {!!loadError && (
        <div style={{ marginBottom: 16, padding: '12px 16px', borderRadius: 10, border: '1px solid #fecaca', background: '#fef2f2', color: '#b91c1c', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 500 }}>{loadError}</span>
          <button
            onClick={fetchMaintenanceSchedules}
            style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #fca5a5', background: '#fff', color: '#991b1b', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
          >
            Retry
          </button>
        </div>
      )}

      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      <div className="view-toggle">
        <button
          className={view === 'calendar' ? 'active' : ''}
          onClick={() => setView('calendar')}
        >
          Calendar View
        </button>
        <button
          className={view === 'list' ? 'active' : ''}
          onClick={() => setView('list')}
        >
          List View
        </button>
      </div>

      {view === 'calendar' ? renderCalendarView() : renderListView()}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedSchedule ? 'Edit Schedule' : 'Add Maintenance Schedule'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Title *</label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Room</label>
                  <select name="roomId" value={formData.roomId} onChange={handleInputChange}>
                    <option value="">Select Room</option>
                    {rooms.map(room => (
                      <option key={room._id} value={room._id}>
                        Room {room.roomNumber}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Category *</label>
                  <select name="category" value={formData.category} onChange={handleInputChange} required>
                    {categories.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Priority *</label>
                  <select name="priority" value={formData.priority} onChange={handleInputChange} required>
                    {priorities.map(p => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Scheduled Date *</label>
                  <input
                    type="date"
                    name="scheduledDate"
                    value={formData.scheduledDate}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Scheduled Time</label>
                  <input
                    type="time"
                    name="scheduledTime"
                    value={formData.scheduledTime}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-group">
                  <label>Duration (minutes)</label>
                  <input
                    type="number"
                    name="duration"
                    value={formData.duration}
                    onChange={handleInputChange}
                    min="15"
                  />
                </div>
                <div className="form-group">
                  <label>Assign To</label>
                  <select name="assignedTo" value={formData.assignedTo} onChange={handleInputChange}>
                    <option value="">Unassigned</option>
                    {staff.map(s => (
                      <option key={s._id} value={s._id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group full-width">
                  <label>Description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows="3"
                  />
                </div>
                <div className="form-group full-width">
                  <label>Notes</label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    rows="2"
                  />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Saving...' : selectedSchedule ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaintenanceView;
