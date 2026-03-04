import React, { useState, useEffect, useMemo } from 'react';
import { useTheme } from '../../../../hooks/useTheme';
import {
    Search,
    ChevronDown,
    DoorOpen,
    Bed,
    Users,
    Wifi,
    Wind,
    Tv,
    Coffee,
    Bath,
    Sparkles,
    AlertTriangle,
    Wrench,
    CheckCircle,
    XCircle,
    Loader2,
    Eye,
    Settings,
    Filter,
    LayoutGrid,
    List,
    Star,
    DollarSign,
    Clock,
    User,
    Calendar,
    ArrowUpDown
} from 'lucide-react';
import * as receptionApi from '../../../../core/api/services/reception.service';
import './RoomsView.css';

const RoomsView = () => {
    const { isDark } = useTheme();
    const [rooms, setRooms] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [floorFilter, setFloorFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');
    const [showStatusDropdown, setShowStatusDropdown] = useState(false);
    const [showFloorDropdown, setShowFloorDropdown] = useState(false);
    const [showTypeDropdown, setShowTypeDropdown] = useState(false);
    const [selectedRoom, setSelectedRoom] = useState(null);
    const [sortBy, setSortBy] = useState('number');

    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            try {
                const res = await receptionApi.getRoomsList();
                if (res?.success && res.data) {
                    const mapped = res.data.map(r => {
                        const bedRaw = r.beds || r.bedType || 'Queen';
                        const bedFormatted = bedRaw.includes('King') ? (bedRaw.includes('+') || bedRaw.includes('2') ? bedRaw : '1 King')
                            : bedRaw.includes('Queen') ? '1 Queen'
                            : bedRaw.includes('Twin') ? '2 Twin' : bedRaw;
                        const isOccupied = r.status === 'occupied';
                        const isReserved = r.status === 'reserved';
                        return {
                            id: r._id || `RM-${r.number || r.roomNumber}`,
                            number: r.number || r.roomNumber || '',
                            floor: r.floor || parseInt((r.number || r.roomNumber || '1')[0]) || 1,
                            type: r.type || r.roomName || '',
                            status: r.status || 'available',
                            basePrice: r.basePrice || r.price || 0,
                            maxGuests: r.maxGuests || r.capacity?.adults || 2,
                            beds: bedFormatted,
                            sqft: 300,
                            amenities: r.amenities || [],
                            rating: r.rating || 4.0,
                            lastCleaned: r.lastCleaned ? new Date(r.lastCleaned) : null,
                            condition: 'good',
                            guest: (isOccupied && r.guest) ? {
                                name: r.guest.name,
                                checkIn: r.guest.checkIn ? new Date(r.guest.checkIn) : null,
                                checkOut: r.guest.checkOut ? new Date(r.guest.checkOut) : null,
                            } : null,
                            reservation: (isReserved && r.guest) ? {
                                guestName: r.guest.name,
                                checkIn: r.guest.checkIn ? new Date(r.guest.checkIn) : null,
                            } : null,
                        };
                    });
                    setRooms(mapped);
                }
            } catch (err) {
                console.error('Error loading rooms:', err);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, []);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (!e.target.closest('.rv-filter-dropdown')) {
                setShowStatusDropdown(false);
                setShowFloorDropdown(false);
                setShowTypeDropdown(false);
            }
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    const roomTypes = useMemo(() => {
        return [...new Set(rooms.map(r => r.type))].sort();
    }, [rooms]);

    const floors = useMemo(() => {
        return [...new Set(rooms.map(r => r.floor))].sort((a, b) => a - b);
    }, [rooms]);

    const filteredRooms = useMemo(() => {
        let result = rooms.filter(room => {
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                const matches = room.number.includes(q) ||
                    room.type.toLowerCase().includes(q) ||
                    (room.guest?.name?.toLowerCase().includes(q));
                if (!matches) return false;
            }
            if (statusFilter !== 'all' && room.status !== statusFilter) return false;
            if (floorFilter !== 'all' && room.floor !== parseInt(floorFilter)) return false;
            if (typeFilter !== 'all' && room.type !== typeFilter) return false;
            return true;
        });

        result.sort((a, b) => {
            switch (sortBy) {
                case 'number': return a.number.localeCompare(b.number);
                case 'type': return a.type.localeCompare(b.type);
                case 'price': return a.basePrice - b.basePrice;
                case 'status': return a.status.localeCompare(b.status);
                default: return 0;
            }
        });

        return result;
    }, [rooms, searchQuery, statusFilter, floorFilter, typeFilter, sortBy]);

    const stats = useMemo(() => ({
        total: rooms.length,
        available: rooms.filter(r => r.status === 'available').length,
        occupied: rooms.filter(r => r.status === 'occupied').length,
        cleaning: rooms.filter(r => r.status === 'cleaning').length,
        maintenance: rooms.filter(r => r.status === 'maintenance').length,
        reserved: rooms.filter(r => r.status === 'reserved').length,
        occupancyRate: rooms.length > 0
            ? Math.round((rooms.filter(r => r.status === 'occupied').length / rooms.length) * 100)
            : 0,
        avgPrice: rooms.length > 0
            ? Math.round(rooms.reduce((sum, r) => sum + r.basePrice, 0) / rooms.length)
            : 0
    }), [rooms]);

    const getStatusConfig = (status) => {
        const configs = {
            'available': { class: 'rv-status-available', icon: CheckCircle, label: 'Available', color: '#10b981' },
            'occupied': { class: 'rv-status-occupied', icon: Users, label: 'Occupied', color: '#6366f1' },
            'cleaning': { class: 'rv-status-cleaning', icon: Sparkles, label: 'Cleaning', color: '#f59e0b' },
            'maintenance': { class: 'rv-status-maintenance', icon: Wrench, label: 'Maintenance', color: '#ef4444' },
            'reserved': { class: 'rv-status-reserved', icon: Calendar, label: 'Reserved', color: '#3b82f6' },
        };
        return configs[status] || { class: 'rv-status-default', icon: DoorOpen, label: status, color: '#94a3b8' };
    };

    const getAmenityIcon = (amenity) => {
        const a = amenity.toLowerCase();
        const icons = {
            wifi: <Wifi size={14} />,
            tv: <Tv size={14} />,
            'smart tv': <Tv size={14} />,
            ac: <Wind size={14} />,
            coffee: <Coffee size={14} />,
            bath: <Bath size={14} />,
            minibar: <Coffee size={14} />,
            workspace: <DoorOpen size={14} />,
            balcony: <DoorOpen size={14} />,
            jacuzzi: <Bath size={14} />,
        };
        return icons[a] || null;
    };

    const getAmenityLabel = (amenity) => {
        const labels = {
            wifi: 'WiFi', tv: 'TV', 'smart tv': 'TV', ac: 'AC',
            coffee: 'Coffee', bath: 'Bath', minibar: 'Mini Bar',
            workspace: 'Desk', balcony: 'Balcony', jacuzzi: 'Jacuzzi',
        };
        return labels[amenity.toLowerCase()] || amenity;
    };

    const formatTimeSince = (date) => {
        const hours = Math.floor((Date.now() - new Date(date)) / (1000 * 60 * 60));
        if (hours < 1) return 'Just now';
        if (hours < 24) return `${hours}h ago`;
        return `${Math.floor(hours / 24)}d ago`;
    };

    return (
        <div className={`rooms-view ${isDark ? 'dark' : ''}`}>
            {/* Stats Overview */}
            <div className="rv-stats-grid">
                <div className="rv-stat-card rv-stat-total">
                    <div className="rv-stat-icon-wrap total">
                        <DoorOpen size={22} />
                    </div>
                    <div className="rv-stat-info">
                        <span className="rv-stat-number">{stats.total}</span>
                        <span className="rv-stat-label">Total Rooms</span>
                    </div>
                </div>
                <div className="rv-stat-card rv-stat-available">
                    <div className="rv-stat-icon-wrap available">
                        <CheckCircle size={22} />
                    </div>
                    <div className="rv-stat-info">
                        <span className="rv-stat-number">{stats.available}</span>
                        <span className="rv-stat-label">Available</span>
                    </div>
                </div>
                <div className="rv-stat-card rv-stat-occupied">
                    <div className="rv-stat-icon-wrap occupied">
                        <Users size={22} />
                    </div>
                    <div className="rv-stat-info">
                        <span className="rv-stat-number">{stats.occupied}</span>
                        <span className="rv-stat-label">Occupied</span>
                    </div>
                </div>
                <div className="rv-stat-card rv-stat-occupancy">
                    <div className="rv-stat-icon-wrap occupancy">
                        <Bed size={22} />
                    </div>
                    <div className="rv-stat-info">
                        <span className="rv-stat-number">{stats.occupancyRate}%</span>
                        <span className="rv-stat-label">Occupancy Rate</span>
                    </div>
                </div>
            </div>

            {/* Room Type Summary */}
            <div className="rv-type-summary">
                {[
                    { status: 'available', count: stats.available },
                    { status: 'occupied', count: stats.occupied },
                    { status: 'cleaning', count: stats.cleaning },
                    { status: 'maintenance', count: stats.maintenance },
                    { status: 'reserved', count: stats.reserved },
                ].map(item => {
                    const config = getStatusConfig(item.status);
                    const Icon = config.icon;
                    return (
                        <button
                            key={item.status}
                            className={`rv-type-chip ${statusFilter === item.status ? 'active' : ''}`}
                            onClick={() => setStatusFilter(statusFilter === item.status ? 'all' : item.status)}
                            style={{ '--chip-color': config.color }}
                        >
                            <Icon size={14} />
                            <span>{config.label}</span>
                            <span className="rv-chip-count">{item.count}</span>
                        </button>
                    );
                })}
            </div>

            {/* Filter Bar */}
            <div className="rv-filter-bar">
                <div className="rv-search-wrapper">
                    <Search className="rv-search-icon" size={18} />
                    <input
                        type="text"
                        className="rv-search-input"
                        placeholder="Search rooms by number, type, guest..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="rv-filter-dropdown relative">
                    <button
                        className="rv-filter-btn"
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowFloorDropdown(!showFloorDropdown);
                            setShowStatusDropdown(false);
                            setShowTypeDropdown(false);
                        }}
                    >
                        <span>{floorFilter === 'all' ? 'All Floors' : `Floor ${floorFilter}`}</span>
                        <ChevronDown size={16} />
                    </button>
                    {showFloorDropdown && (
                        <div className="rv-dropdown-menu">
                            <button
                                className={`rv-dropdown-item ${floorFilter === 'all' ? 'active' : ''}`}
                                onClick={() => { setFloorFilter('all'); setShowFloorDropdown(false); }}
                            >
                                All Floors
                            </button>
                            {floors.map(floor => (
                                <button
                                    key={floor}
                                    className={`rv-dropdown-item ${floorFilter === String(floor) ? 'active' : ''}`}
                                    onClick={() => { setFloorFilter(String(floor)); setShowFloorDropdown(false); }}
                                >
                                    Floor {floor}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="rv-filter-dropdown relative">
                    <button
                        className="rv-filter-btn"
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowTypeDropdown(!showTypeDropdown);
                            setShowStatusDropdown(false);
                            setShowFloorDropdown(false);
                        }}
                    >
                        <span>{typeFilter === 'all' ? 'All Types' : typeFilter}</span>
                        <ChevronDown size={16} />
                    </button>
                    {showTypeDropdown && (
                        <div className="rv-dropdown-menu rv-dropdown-scrollable">
                            <button
                                className={`rv-dropdown-item ${typeFilter === 'all' ? 'active' : ''}`}
                                onClick={() => { setTypeFilter('all'); setShowTypeDropdown(false); }}
                            >
                                All Types
                            </button>
                            {roomTypes.map(type => (
                                <button
                                    key={type}
                                    className={`rv-dropdown-item ${typeFilter === type ? 'active' : ''}`}
                                    onClick={() => { setTypeFilter(type); setShowTypeDropdown(false); }}
                                >
                                    {type}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="rv-sort-wrapper">
                    <ArrowUpDown size={16} />
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="rv-sort-select"
                    >
                        <option value="number">Room Number</option>
                        <option value="type">Room Type</option>
                        <option value="price">Price</option>
                        <option value="status">Status</option>
                    </select>
                </div>
            </div>

            {/* Loading */}
            {isLoading && (
                <div className="rv-loading">
                    <Loader2 className="rv-loading-spinner" size={32} />
                    <p>Loading rooms...</p>
                </div>
            )}

            {/* Empty State */}
            {!isLoading && filteredRooms.length === 0 && (
                <div className="rv-empty-state">
                    <DoorOpen size={48} className="rv-empty-icon" />
                    <h3>No rooms found</h3>
                    <p>Try adjusting your search or filters.</p>
                    <button className="rv-clear-btn" onClick={() => {
                        setSearchQuery('');
                        setStatusFilter('all');
                        setFloorFilter('all');
                        setTypeFilter('all');
                    }}>
                        Clear all filters
                    </button>
                </div>
            )}

            {/* Room Grid */}
            {!isLoading && filteredRooms.length > 0 && (
                <div className="rv-rooms-grid">
                    {filteredRooms.map(room => {
                        const statusConfig = getStatusConfig(room.status);
                        const StatusIcon = statusConfig.icon;
                        return (
                            <div
                                key={room.id}
                                className={`rv-room-card ${room.status}`}
                                onClick={() => setSelectedRoom(selectedRoom?.id === room.id ? null : room)}
                            >
                                <div className="rv-room-header">
                                    <div className="rv-room-number-wrap">
                                        <DoorOpen size={16} className="rv-room-door-icon" />
                                        <span className="rv-room-number">{room.number}</span>
                                    </div>
                                    <span className={`rv-room-status ${statusConfig.class}`} style={{ '--status-color': statusConfig.color }}>
                                        <StatusIcon size={12} />
                                        {statusConfig.label}
                                    </span>
                                </div>

                                <div className="rv-room-type-row">
                                    <span className="rv-room-type">{room.type}</span>
                                    <span className="rv-room-floor">Floor {room.floor}</span>
                                </div>

                                <div className="rv-room-details">
                                    <div className="rv-room-detail">
                                        <Bed size={14} />
                                        <span>{room.beds}</span>
                                    </div>
                                    <div className="rv-room-detail">
                                        <Users size={14} />
                                        <span>Max {room.maxGuests}</span>
                                    </div>
                                    <div className="rv-room-detail">
                                        <DollarSign size={14} />
                                        <span>Rs {room.basePrice}/night</span>
                                    </div>
                                </div>

                                <div className="rv-room-amenities">
                                    {room.amenities.slice(0, 5).map(amenity => (
                                        <span key={amenity} className="rv-amenity-chip" title={getAmenityLabel(amenity)}>
                                            {getAmenityIcon(amenity) || getAmenityLabel(amenity)}
                                        </span>
                                    ))}
                                    {room.amenities.length > 5 && (
                                        <span className="rv-amenity-more">+{room.amenities.length - 5}</span>
                                    )}
                                </div>

                                {room.status === 'occupied' && room.guest && (
                                    <div className="rv-room-guest">
                                        <User size={14} />
                                        <span className="rv-guest-name">{room.guest.name}</span>
                                        <span className="rv-guest-checkout">
                                            <Clock size={12} />
                                            {new Date(room.guest.checkOut).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                        </span>
                                    </div>
                                )}

                                {room.status === 'reserved' && room.reservation && (
                                    <div className="rv-room-reservation">
                                        <Calendar size={14} />
                                        <span>{room.reservation.guestName}</span>
                                        <span className="rv-reservation-date">
                                            {new Date(room.reservation.checkIn).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                        </span>
                                    </div>
                                )}

                                {room.status === 'cleaning' && (
                                    <div className="rv-room-cleaning">
                                        <Sparkles size={14} />
                                        <span>Last cleaned: {formatTimeSince(room.lastCleaned)}</span>
                                    </div>
                                )}

                                {room.status === 'maintenance' && (
                                    <div className="rv-room-maintenance-info">
                                        <AlertTriangle size={14} />
                                        <span>Under maintenance</span>
                                    </div>
                                )}

                                <div className="rv-room-footer">
                                    <div className="rv-room-rating">
                                        <Star size={14} />
                                        <span>{room.rating}</span>
                                    </div>
                                    {room.condition === 'needs-attention' && (
                                        <span className="rv-needs-attention">
                                            <AlertTriangle size={12} />
                                            Needs attention
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Results count */}
            {!isLoading && filteredRooms.length > 0 && (
                <div className="rv-results-info">
                    Showing <strong>{filteredRooms.length}</strong> of <strong>{rooms.length}</strong> rooms
                </div>
            )}
        </div>
    );
};

export default RoomsView;
