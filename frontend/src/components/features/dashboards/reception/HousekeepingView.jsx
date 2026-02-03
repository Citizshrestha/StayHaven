import React, { useState, useEffect, useMemo } from 'react';
import { useTheme } from '../../../../hooks/useTheme';
import {
  Search,
  ChevronDown,
  Bed,
  Sparkles,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  User,
  Wrench,
  Filter,
  RefreshCw,
  Loader2,
  LayoutGrid,
  List,
  MessageSquare
} from 'lucide-react';
import './HousekeepingView.css';

// Generate room data
const generateRooms = () => {
  const floors = [1, 2, 3, 4, 5];
  const roomsPerFloor = 20;
  const roomTypes = ['Standard', 'Deluxe', 'Suite', 'Executive', 'Presidential'];
  const statuses = ['clean', 'dirty', 'in-progress', 'inspected', 'maintenance'];
  const statusWeights = [30, 35, 15, 15, 5];

  const housekeepers = [
    { id: 1, name: 'Maria Garcia', avatar: null },
    { id: 2, name: 'John Smith', avatar: null },
    { id: 3, name: 'Anna Lee', avatar: null },
    { id: 4, name: 'Carlos Rodriguez', avatar: null },
    { id: 5, name: 'Lisa Chen', avatar: null },
  ];

  const getWeightedStatus = () => {
    const random = Math.random() * 100;
    let cumulative = 0;
    for (let i = 0; i < statuses.length; i++) {
      cumulative += statusWeights[i];
      if (random <= cumulative) return statuses[i];
    }
    return statuses[0];
  };

  const rooms = [];

  floors.forEach(floor => {
    for (let room = 1; room <= roomsPerFloor; room++) {
      const roomNumber = `${floor}${room.toString().padStart(2, '0')}`;
      const status = getWeightedStatus();
      const isOccupied = Math.random() > 0.3;
      const checkoutToday = !isOccupied && Math.random() > 0.5;

      rooms.push({
        id: roomNumber,
        number: roomNumber,
        floor: floor,
        type: roomTypes[Math.floor(Math.random() * roomTypes.length)],
        status: status,
        isOccupied: isOccupied,
        checkoutToday: checkoutToday,
        priority: checkoutToday ? 'high' : (Math.random() > 0.8 ? 'medium' : 'normal'),
        assignedTo: status === 'in-progress' || status === 'inspected'
          ? housekeepers[Math.floor(Math.random() * housekeepers.length)]
          : null,
        lastCleaned: status === 'clean' || status === 'inspected'
          ? new Date(Date.now() - Math.random() * 3600000).toISOString()
          : null,
        notes: Math.random() > 0.9 ? 'Guest requested extra towels' : null,
        estimatedTime: status === 'in-progress' ? Math.floor(Math.random() * 30) + 10 : null
      });
    }
  });

  return rooms;
};

const HousekeepingView = () => {
  const { isDark } = useTheme();
  const [rooms, setRooms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [floorFilter, setFloorFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showFloorDropdown, setShowFloorDropdown] = useState(false);
  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);

  useEffect(() => {
    const loadRooms = async () => {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 500));
      setRooms(generateRooms());
      setIsLoading(false);
    };
    loadRooms();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.hk-filter-dropdown')) {
        setShowStatusDropdown(false);
        setShowFloorDropdown(false);
        setShowPriorityDropdown(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const filteredRooms = useMemo(() => {
    return rooms.filter(room => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!room.number.includes(query) &&
          !room.type.toLowerCase().includes(query)) {
          return false;
        }
      }

      if (statusFilter !== 'all' && room.status !== statusFilter) return false;
      if (floorFilter !== 'all' && room.floor !== parseInt(floorFilter)) return false;
      if (priorityFilter !== 'all' && room.priority !== priorityFilter) return false;

      return true;
    });
  }, [rooms, searchQuery, statusFilter, floorFilter, priorityFilter]);

  const stats = useMemo(() => ({
    total: rooms.length,
    clean: rooms.filter(r => r.status === 'clean' || r.status === 'inspected').length,
    dirty: rooms.filter(r => r.status === 'dirty').length,
    inProgress: rooms.filter(r => r.status === 'in-progress').length,
    maintenance: rooms.filter(r => r.status === 'maintenance').length,
    highPriority: rooms.filter(r => r.priority === 'high').length
  }), [rooms]);

  const getStatusConfig = (status) => {
    const configs = {
      'clean': { icon: CheckCircle, label: 'Clean', class: 'hk-status-clean' },
      'dirty': { icon: Sparkles, label: 'Needs Cleaning', class: 'hk-status-dirty' },
      'in-progress': { icon: Clock, label: 'In Progress', class: 'hk-status-progress' },
      'inspected': { icon: CheckCircle, label: 'Inspected', class: 'hk-status-inspected' },
      'maintenance': { icon: Wrench, label: 'Maintenance', class: 'hk-status-maintenance' }
    };
    return configs[status] || { icon: AlertTriangle, label: status, class: 'hk-status-default' };
  };

  const updateRoomStatus = (roomId, newStatus) => {
    setRooms(prev => prev.map(room =>
      room.id === roomId ? { ...room, status: newStatus } : room
    ));
    setSelectedRoom(null);
  };

  const refreshData = async () => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setRooms(generateRooms());
    setIsLoading(false);
  };

  return (
    <div className={`housekeeping-view ${isDark ? 'dark' : ''}`}>
      {/* Stats Overview */}
      <div className="hk-stats-grid grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <div className="hk-stat-card flex items-center gap-4 p-4 rounded-xl transition-all duration-200">
          <div className="hk-stat-icon total w-12 h-12 rounded-xl flex items-center justify-center">
            <Bed size={24} />
          </div>
          <div className="hk-stat-content flex flex-col">
            <span className="hk-stat-value text-2xl font-bold">{stats.total}</span>
            <span className="hk-stat-label text-xs text-slate-500">Total Rooms</span>
          </div>
        </div>
        <div className="hk-stat-card flex items-center gap-4 p-4 rounded-xl transition-all duration-200">
          <div className="hk-stat-icon clean w-12 h-12 rounded-xl flex items-center justify-center">
            <CheckCircle size={24} />
          </div>
          <div className="hk-stat-content flex flex-col">
            <span className="hk-stat-value text-2xl font-bold">{stats.clean}</span>
            <span className="hk-stat-label text-xs text-slate-500">Clean & Ready</span>
          </div>
        </div>
        <div className="hk-stat-card flex items-center gap-4 p-4 rounded-xl transition-all duration-200">
          <div className="hk-stat-icon dirty w-12 h-12 rounded-xl flex items-center justify-center">
            <Sparkles size={24} />
          </div>
          <div className="hk-stat-content flex flex-col">
            <span className="hk-stat-value text-2xl font-bold">{stats.dirty}</span>
            <span className="hk-stat-label text-xs text-slate-500">Needs Cleaning</span>
          </div>
        </div>
        <div className="hk-stat-card flex items-center gap-4 p-4 rounded-xl transition-all duration-200">
          <div className="hk-stat-icon progress w-12 h-12 rounded-xl flex items-center justify-center">
            <Clock size={24} />
          </div>
          <div className="hk-stat-content flex flex-col">
            <span className="hk-stat-value text-2xl font-bold">{stats.inProgress}</span>
            <span className="hk-stat-label text-xs text-slate-500">In Progress</span>
          </div>
        </div>
        <div className="hk-stat-card flex items-center gap-4 p-4 rounded-xl transition-all duration-200">
          <div className="hk-stat-icon maintenance w-12 h-12 rounded-xl flex items-center justify-center">
            <Wrench size={24} />
          </div>
          <div className="hk-stat-content flex flex-col">
            <span className="hk-stat-value text-2xl font-bold">{stats.maintenance}</span>
            <span className="hk-stat-label text-xs text-slate-500">Maintenance</span>
          </div>
        </div>
        <div className="hk-stat-card flex items-center gap-4 p-4 rounded-xl transition-all duration-200">
          <div className="hk-stat-icon priority w-12 h-12 rounded-xl flex items-center justify-center">
            <AlertTriangle size={24} />
          </div>
          <div className="hk-stat-content flex flex-col">
            <span className="hk-stat-value text-2xl font-bold">{stats.highPriority}</span>
            <span className="hk-stat-label text-xs text-slate-500">High Priority</span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="hk-filter-bar flex items-center gap-4 mb-6 flex-wrap">
        <div className="hk-search-wrapper relative flex-1 min-w-[280px]">
          <Search className="hk-search-icon absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            className="hk-search-input w-full h-11 pl-11 pr-4 rounded-xl text-sm"
            placeholder="Search room number or type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="hk-filter-dropdown relative">
          <button
            className="hk-filter-btn flex items-center gap-2 h-11 px-4 rounded-xl text-sm font-medium transition-all duration-200"
            onClick={(e) => {
              e.stopPropagation();
              setShowStatusDropdown(!showStatusDropdown);
              setShowFloorDropdown(false);
              setShowPriorityDropdown(false);
            }}
          >
            <Filter size={16} />
            <span>{statusFilter === 'all' ? 'All Status' : getStatusConfig(statusFilter).label}</span>
            <ChevronDown size={16} />
          </button>
          {showStatusDropdown && (
            <div className="hk-dropdown-menu absolute top-full left-0 mt-2 min-w-[180px] rounded-xl shadow-lg z-50">
              {[
                { value: 'all', label: 'All Status' },
                { value: 'clean', label: 'Clean' },
                { value: 'dirty', label: 'Needs Cleaning' },
                { value: 'in-progress', label: 'In Progress' },
                { value: 'inspected', label: 'Inspected' },
                { value: 'maintenance', label: 'Maintenance' }
              ].map(option => (
                <button
                  key={option.value}
                  className={`hk-dropdown-item w-full text-left px-4 py-2.5 text-sm transition-colors duration-200 ${statusFilter === option.value ? 'active' : ''}`}
                  onClick={() => { setStatusFilter(option.value); setShowStatusDropdown(false); }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="hk-filter-dropdown relative">
          <button
            className="hk-filter-btn flex items-center gap-2 h-11 px-4 rounded-xl text-sm font-medium transition-all duration-200"
            onClick={(e) => {
              e.stopPropagation();
              setShowFloorDropdown(!showFloorDropdown);
              setShowStatusDropdown(false);
              setShowPriorityDropdown(false);
            }}
          >
            <span>{floorFilter === 'all' ? 'All Floors' : `Floor ${floorFilter}`}</span>
            <ChevronDown size={16} />
          </button>
          {showFloorDropdown && (
            <div className="hk-dropdown-menu absolute top-full left-0 mt-2 min-w-[180px] rounded-xl shadow-lg z-50">
              <button
                className={`hk-dropdown-item w-full text-left px-4 py-2.5 text-sm transition-colors duration-200 ${floorFilter === 'all' ? 'active' : ''}`}
                onClick={() => { setFloorFilter('all'); setShowFloorDropdown(false); }}
              >
                All Floors
              </button>
              {[1, 2, 3, 4, 5].map(floor => (
                <button
                  key={floor}
                  className={`hk-dropdown-item w-full text-left px-4 py-2.5 text-sm transition-colors duration-200 ${floorFilter === floor.toString() ? 'active' : ''}`}
                  onClick={() => { setFloorFilter(floor.toString()); setShowFloorDropdown(false); }}
                >
                  Floor {floor}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="hk-filter-dropdown relative">
          <button
            className="hk-filter-btn flex items-center gap-2 h-11 px-4 rounded-xl text-sm font-medium transition-all duration-200"
            onClick={(e) => {
              e.stopPropagation();
              setShowPriorityDropdown(!showPriorityDropdown);
              setShowStatusDropdown(false);
              setShowFloorDropdown(false);
            }}
          >
            <span>{priorityFilter === 'all' ? 'All Priority' : `${priorityFilter.charAt(0).toUpperCase() + priorityFilter.slice(1)} Priority`}</span>
            <ChevronDown size={16} />
          </button>
          {showPriorityDropdown && (
            <div className="hk-dropdown-menu absolute top-full left-0 mt-2 min-w-[180px] rounded-xl shadow-lg z-50">
              {[
                { value: 'all', label: 'All Priority' },
                { value: 'high', label: 'High Priority' },
                { value: 'medium', label: 'Medium Priority' },
                { value: 'normal', label: 'Normal Priority' }
              ].map(option => (
                <button
                  key={option.value}
                  className={`hk-dropdown-item w-full text-left px-4 py-2.5 text-sm transition-colors duration-200 ${priorityFilter === option.value ? 'active' : ''}`}
                  onClick={() => { setPriorityFilter(option.value); setShowPriorityDropdown(false); }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <button className="hk-refresh-btn w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200" onClick={refreshData} disabled={isLoading}>
          <RefreshCw size={18} className={isLoading ? 'spinning animate-spin' : ''} />
        </button>

        <div className="hk-view-toggle flex rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
          <button
            className={`hk-view-btn w-10 h-10 flex items-center justify-center transition-all duration-200 ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => setViewMode('grid')}
          >
            <LayoutGrid size={18} />
          </button>
          <button
            className={`hk-view-btn w-10 h-10 flex items-center justify-center transition-all duration-200 ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
          >
            <List size={18} />
          </button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="hk-loading flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="hk-loading-spinner animate-spin text-indigo-600" size={32} />
          <p className="text-sm text-slate-500">Loading rooms...</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredRooms.length === 0 && (
        <div className="hk-empty-state flex flex-col items-center justify-center py-20 text-center">
          <Bed size={48} className="mb-5 opacity-50 text-slate-400" />
          <h3 className="text-lg font-semibold mb-2">No rooms found</h3>
          <p className="text-sm text-slate-500 max-w-md">Try adjusting your filters to see more rooms.</p>
        </div>
      )}

      {/* Grid View */}
      {!isLoading && filteredRooms.length > 0 && viewMode === 'grid' && (
        <div className="hk-rooms-grid grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
          {filteredRooms.map(room => {
            const statusConfig = getStatusConfig(room.status);
            const StatusIcon = statusConfig.icon;

            return (
              <div
                key={room.id}
                className={`hk-room-card ${room.status} ${room.priority === 'high' ? 'high-priority' : ''} p-4 rounded-xl cursor-pointer transition-all duration-200 hover:shadow-lg`}
                onClick={() => setSelectedRoom(room)}
              >
                <div className="hk-room-header flex items-center justify-between mb-2">
                  <span className="hk-room-number text-lg font-bold">{room.number}</span>
                  {room.priority === 'high' && (
                    <span className="hk-priority-badge text-amber-500">
                      <AlertTriangle size={12} />
                    </span>
                  )}
                </div>
                <div className="hk-room-type text-xs text-slate-500 mb-3">{room.type}</div>
                <div className={`hk-room-status ${statusConfig.class} flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-lg w-fit`}>
                  <StatusIcon size={14} />
                  {statusConfig.label}
                </div>
                {room.isOccupied && (
                  <div className="hk-occupied-indicator flex items-center gap-1 text-xs mt-2 text-amber-600">
                    <User size={12} />
                    Occupied
                  </div>
                )}
                {room.assignedTo && (
                  <div className="hk-assigned-to flex items-center gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                    <div className="hk-housekeeper-avatar w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium bg-indigo-100 text-indigo-600">
                      {room.assignedTo.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <span className="text-xs text-slate-500">{room.assignedTo.name.split(' ')[0]}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* List View */}
      {!isLoading && filteredRooms.length > 0 && viewMode === 'list' && (
        <div className="hk-table-container rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
          <table className="hk-table w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="text-left p-4 font-semibold">Room</th>
                <th className="text-left p-4 font-semibold">Type</th>
                <th className="text-left p-4 font-semibold">Floor</th>
                <th className="text-left p-4 font-semibold">Status</th>
                <th className="text-left p-4 font-semibold">Occupancy</th>
                <th className="text-left p-4 font-semibold">Assigned To</th>
                <th className="text-left p-4 font-semibold">Priority</th>
                <th className="text-left p-4 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRooms.map(room => {
                const statusConfig = getStatusConfig(room.status);
                const StatusIcon = statusConfig.icon;

                return (
                  <tr key={room.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors duration-200">
                    <td className="hk-cell-room p-4 font-semibold">{room.number}</td>
                    <td className="p-4">{room.type}</td>
                    <td className="p-4">Floor {room.floor}</td>
                    <td className="p-4">
                      <span className={`hk-status-badge ${statusConfig.class} inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium`}>
                        <StatusIcon size={14} />
                        {statusConfig.label}
                      </span>
                    </td>
                    <td className="p-4">
                      {room.isOccupied ? (
                        <span className="hk-occupancy occupied text-amber-600 font-medium">Occupied</span>
                      ) : room.checkoutToday ? (
                        <span className="hk-occupancy checkout text-red-600 font-medium">Checkout Today</span>
                      ) : (
                        <span className="hk-occupancy vacant text-green-600 font-medium">Vacant</span>
                      )}
                    </td>
                    <td className="p-4">
                      {room.assignedTo ? (
                        <div className="hk-assigned-cell flex items-center gap-2">
                          <div className="hk-mini-avatar w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium bg-indigo-100 text-indigo-600">
                            {room.assignedTo.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          {room.assignedTo.name}
                        </div>
                      ) : (
                        <span className="hk-unassigned text-slate-400 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="p-4">
                      <span className={`hk-priority-label ${room.priority} px-2.5 py-1 rounded-lg text-xs font-medium`}>
                        {room.priority.charAt(0).toUpperCase() + room.priority.slice(1)}
                      </span>
                    </td>
                    <td className="p-4">
                      <button
                        className="hk-action-btn px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200"
                        onClick={() => setSelectedRoom(room)}
                      >
                        Update
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Room Detail Modal */}
      {selectedRoom && (
        <div className="hk-modal-overlay fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedRoom(null)}>
          <div className="hk-modal w-full max-w-lg rounded-2xl p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="hk-modal-header flex items-center justify-between mb-6">
              <div className="hk-modal-room-info">
                <h2 className="text-xl font-bold">Room {selectedRoom.number}</h2>
                <span className="hk-modal-room-type text-sm text-slate-500">{selectedRoom.type}</span>
              </div>
              <button className="hk-modal-close w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200" onClick={() => setSelectedRoom(null)}>
                <XCircle size={24} />
              </button>
            </div>

            <div className="hk-modal-body">
              <div className="hk-modal-section mb-6">
                <h3 className="text-sm font-semibold mb-3">Current Status</h3>
                <div className="hk-status-options grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {['clean', 'dirty', 'in-progress', 'inspected', 'maintenance'].map(status => {
                    const config = getStatusConfig(status);
                    const Icon = config.icon;
                    return (
                      <button
                        key={status}
                        className={`hk-status-option flex flex-col items-center gap-2 p-3 rounded-xl transition-all duration-200 ${selectedRoom.status === status ? 'active' : ''}`}
                        onClick={() => updateRoomStatus(selectedRoom.id, status)}
                      >
                        <Icon size={20} />
                        <span className="text-xs">{config.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="hk-modal-section mb-6">
                <h3 className="text-sm font-semibold mb-3">Room Details</h3>
                <div className="hk-modal-details flex flex-col gap-2">
                  <div className="hk-detail-row flex justify-between items-center p-3 rounded-lg">
                    <span className="hk-detail-label text-sm text-slate-500">Floor</span>
                    <span className="hk-detail-value text-sm font-medium">Floor {selectedRoom.floor}</span>
                  </div>
                  <div className="hk-detail-row flex justify-between items-center p-3 rounded-lg">
                    <span className="hk-detail-label text-sm text-slate-500">Occupancy</span>
                    <span className="hk-detail-value text-sm font-medium">
                      {selectedRoom.isOccupied ? 'Occupied' : selectedRoom.checkoutToday ? 'Checkout Today' : 'Vacant'}
                    </span>
                  </div>
                  <div className="hk-detail-row flex justify-between items-center p-3 rounded-lg">
                    <span className="hk-detail-label text-sm text-slate-500">Priority</span>
                    <span className={`hk-detail-value priority-${selectedRoom.priority} text-sm font-medium`}>
                      {selectedRoom.priority.charAt(0).toUpperCase() + selectedRoom.priority.slice(1)}
                    </span>
                  </div>
                  {selectedRoom.assignedTo && (
                    <div className="hk-detail-row flex justify-between items-center p-3 rounded-lg">
                      <span className="hk-detail-label text-sm text-slate-500">Assigned To</span>
                      <span className="hk-detail-value text-sm font-medium">{selectedRoom.assignedTo.name}</span>
                    </div>
                  )}
                  {selectedRoom.lastCleaned && (
                    <div className="hk-detail-row flex justify-between items-center p-3 rounded-lg">
                      <span className="hk-detail-label text-sm text-slate-500">Last Cleaned</span>
                      <span className="hk-detail-value text-sm font-medium">
                        {new Date(selectedRoom.lastCleaned).toLocaleTimeString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {selectedRoom.notes && (
                <div className="hk-modal-section mb-6">
                  <h3 className="text-sm font-semibold mb-3">Notes</h3>
                  <div className="hk-notes-box flex items-start gap-3 p-4 rounded-xl">
                    <MessageSquare size={16} className="text-slate-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{selectedRoom.notes}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="hk-modal-footer flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
              <button className="hk-modal-btn secondary px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200" onClick={() => setSelectedRoom(null)}>
                Close
              </button>
              <button className="hk-modal-btn primary px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200">
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HousekeepingView;
