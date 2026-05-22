import React, { useState, useEffect } from 'react';
import {
  Building2,
  Search,
  Filter,
  Grid3x3,
  List,
  MapPin,
  Star,
  TrendingUp,
  DollarSign,
  Calendar,
  MoreVertical,
  Eye,
  Edit,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronDown,
  Download,
  Plus,
} from 'lucide-react';
import './HotelsManagement.css';

const HotelsManagement = () => {
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'table'
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('revenue');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTab, setSelectedTab] = useState('all'); // 'all' or 'pending'

  // Mock data - replace with API calls
  const hotels = [
    {
      id: 1,
      name: 'Hotel Annapurna',
      location: 'Kathmandu, Nepal',
      type: 'Luxury',
      status: 'active',
      rating: 4.8,
      reviews: 234,
      revenue: 245000,
      bookings: 89,
      commission: 15,
      image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400',
      featured: true,
    },
    {
      id: 2,
      name: 'Soaltee Crown Plaza',
      location: 'Kathmandu, Nepal',
      type: 'Luxury',
      status: 'active',
      rating: 4.7,
      reviews: 189,
      revenue: 198000,
      bookings: 67,
      commission: 15,
      image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=400',
      featured: true,
    },
    {
      id: 3,
      name: 'Hyatt Regency',
      location: 'Kathmandu, Nepal',
      type: 'Luxury',
      status: 'active',
      rating: 4.9,
      reviews: 312,
      revenue: 176000,
      bookings: 54,
      commission: 15,
      image: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=400',
      featured: false,
    },
    {
      id: 4,
      name: 'Dwarika\'s Hotel',
      location: 'Kathmandu, Nepal',
      type: 'Boutique',
      status: 'active',
      rating: 4.9,
      reviews: 278,
      revenue: 165000,
      bookings: 48,
      commission: 12,
      image: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=400',
      featured: true,
    },
  ];

  const pendingHotels = [
    {
      id: 5,
      name: 'Mountain View Resort',
      location: 'Pokhara, Nepal',
      type: 'Resort',
      status: 'pending',
      submittedDate: '2026-05-18',
      image: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=400',
    },
    {
      id: 6,
      name: 'Lakeside Boutique Hotel',
      location: 'Pokhara, Nepal',
      type: 'Boutique',
      status: 'pending',
      submittedDate: '2026-05-17',
      image: 'https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=400',
    },
  ];

  const stats = {
    total: hotels.length,
    active: hotels.filter(h => h.status === 'active').length,
    pending: pendingHotels.length,
    suspended: 0,
  };

  return (
    <div className="hotels-management">
      {/* Header */}
      <div className="page-header">
        <div className="header-left">
          <h1 className="page-title">
            <Building2 size={32} />
            Hotels Management
          </h1>
          <p className="page-subtitle">
            Manage and monitor all hotels on the platform
          </p>
        </div>
        <div className="header-actions">
          <button className="action-btn secondary">
            <Download size={18} />
            Export
          </button>
          <button className="action-btn primary">
            <Plus size={18} />
            Add Hotel
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-icon total">
            <Building2 size={20} />
          </div>
          <div className="stat-content">
            <p className="stat-label">Total Hotels</p>
            <h3 className="stat-value">{stats.total}</h3>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon active">
            <CheckCircle2 size={20} />
          </div>
          <div className="stat-content">
            <p className="stat-label">Active</p>
            <h3 className="stat-value">{stats.active}</h3>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon pending">
            <Clock size={20} />
          </div>
          <div className="stat-content">
            <p className="stat-label">Pending Approval</p>
            <h3 className="stat-value">{stats.pending}</h3>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon suspended">
            <XCircle size={20} />
          </div>
          <div className="stat-content">
            <p className="stat-label">Suspended</p>
            <h3 className="stat-value">{stats.suspended}</h3>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs-container">
        <div className="tabs">
          <button
            className={`tab ${selectedTab === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedTab('all')}
          >
            All Hotels
            <span className="tab-count">{stats.total}</span>
          </button>
          <button
            className={`tab ${selectedTab === 'pending' ? 'active' : ''}`}
            onClick={() => setSelectedTab('pending')}
          >
            Pending Approval
            <span className="tab-count pending">{stats.pending}</span>
          </button>
        </div>
      </div>

      {/* Filters & Controls */}
      <div className="controls-bar">
        <div className="search-box">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search hotels by name, location, or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="controls-right">
          <button
            className={`filter-btn ${showFilters ? 'active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={18} />
            Filters
          </button>

          <div className="view-toggle">
            <button
              className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
            >
              <Grid3x3 size={18} />
            </button>
            <button
              className={`view-btn ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
            >
              <List size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="filters-panel">
          <div className="filter-group">
            <label className="filter-label">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-label">Hotel Type</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Types</option>
              <option value="luxury">Luxury</option>
              <option value="boutique">Boutique</option>
              <option value="resort">Resort</option>
              <option value="budget">Budget</option>
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-label">Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="filter-select"
            >
              <option value="revenue">Revenue (High to Low)</option>
              <option value="bookings">Bookings (High to Low)</option>
              <option value="rating">Rating (High to Low)</option>
              <option value="name">Name (A-Z)</option>
            </select>
          </div>

          <button className="filter-reset">Reset Filters</button>
        </div>
      )}

      {/* Content */}
      {selectedTab === 'all' ? (
        viewMode === 'grid' ? (
          <div className="hotels-grid">
            {hotels.map((hotel, index) => (
              <HotelCard key={hotel.id} hotel={hotel} delay={index * 100} />
            ))}
          </div>
        ) : (
          <HotelsTable hotels={hotels} />
        )
      ) : (
        <div className="pending-hotels">
          {pendingHotels.map((hotel, index) => (
            <PendingHotelCard key={hotel.id} hotel={hotel} delay={index * 100} />
          ))}
        </div>
      )}
    </div>
  );
};

// Hotel Card Component (Grid View)
const HotelCard = ({ hotel, delay }) => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="hotel-card" style={{ animationDelay: `${delay}ms` }}>
      <div className="hotel-image-container">
        <img src={hotel.image} alt={hotel.name} className="hotel-image" />
        {hotel.featured && (
          <div className="featured-badge">
            <Star size={14} fill="currentColor" />
            Featured
          </div>
        )}
        <div className={`status-badge ${hotel.status}`}>
          {hotel.status}
        </div>
      </div>

      <div className="hotel-card-content">
        <div className="hotel-header">
          <div>
            <h3 className="hotel-name">{hotel.name}</h3>
            <p className="hotel-location">
              <MapPin size={14} />
              {hotel.location}
            </p>
          </div>
          <div className="hotel-menu">
            <button
              className="menu-btn"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <MoreVertical size={18} />
            </button>
            {menuOpen && (
              <div className="menu-dropdown">
                <button className="menu-item">
                  <Eye size={16} />
                  View Details
                </button>
                <button className="menu-item">
                  <Edit size={16} />
                  Edit
                </button>
                <button className="menu-item danger">
                  <XCircle size={16} />
                  Suspend
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="hotel-rating">
          <Star size={16} fill="currentColor" />
          <span className="rating-value">{hotel.rating}</span>
          <span className="rating-reviews">({hotel.reviews} reviews)</span>
        </div>

        <div className="hotel-type-badge">{hotel.type}</div>

        <div className="hotel-stats">
          <div className="stat-item">
            <DollarSign size={14} />
            <span className="stat-label">Revenue</span>
            <span className="stat-value">${hotel.revenue.toLocaleString()}</span>
          </div>
          <div className="stat-item">
            <Calendar size={14} />
            <span className="stat-label">Bookings</span>
            <span className="stat-value">{hotel.bookings}</span>
          </div>
          <div className="stat-item">
            <TrendingUp size={14} />
            <span className="stat-label">Commission</span>
            <span className="stat-value">{hotel.commission}%</span>
          </div>
        </div>

        <div className="hotel-actions">
          <button className="card-btn secondary">
            <Eye size={16} />
            View Details
          </button>
          <button className="card-btn primary">
            <Edit size={16} />
            Manage
          </button>
        </div>
      </div>
    </div>
  );
};

// Hotels Table Component
const HotelsTable = ({ hotels }) => {
  return (
    <div className="hotels-table-container">
      <table className="hotels-table">
        <thead>
          <tr>
            <th>Hotel</th>
            <th>Location</th>
            <th>Type</th>
            <th>Rating</th>
            <th>Revenue</th>
            <th>Bookings</th>
            <th>Commission</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {hotels.map((hotel) => (
            <tr key={hotel.id}>
              <td>
                <div className="table-hotel-cell">
                  <img src={hotel.image} alt={hotel.name} className="table-hotel-image" />
                  <div>
                    <p className="table-hotel-name">{hotel.name}</p>
                    {hotel.featured && (
                      <span className="table-featured">
                        <Star size={12} fill="currentColor" />
                        Featured
                      </span>
                    )}
                  </div>
                </div>
              </td>
              <td>{hotel.location}</td>
              <td>
                <span className="table-type-badge">{hotel.type}</span>
              </td>
              <td>
                <div className="table-rating">
                  <Star size={14} fill="currentColor" />
                  {hotel.rating}
                </div>
              </td>
              <td className="table-revenue">${hotel.revenue.toLocaleString()}</td>
              <td>{hotel.bookings}</td>
              <td>{hotel.commission}%</td>
              <td>
                <span className={`table-status ${hotel.status}`}>
                  {hotel.status}
                </span>
              </td>
              <td>
                <div className="table-actions">
                  <button className="table-action-btn">
                    <Eye size={16} />
                  </button>
                  <button className="table-action-btn">
                    <Edit size={16} />
                  </button>
                  <button className="table-action-btn">
                    <MoreVertical size={16} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// Pending Hotel Card Component
const PendingHotelCard = ({ hotel, delay }) => {
  return (
    <div className="pending-hotel-card" style={{ animationDelay: `${delay}ms` }}>
      <img src={hotel.image} alt={hotel.name} className="pending-hotel-image" />
      <div className="pending-hotel-content">
        <div className="pending-hotel-header">
          <div>
            <h3 className="pending-hotel-name">{hotel.name}</h3>
            <p className="pending-hotel-location">
              <MapPin size={14} />
              {hotel.location}
            </p>
          </div>
          <span className="pending-hotel-type">{hotel.type}</span>
        </div>
        <p className="pending-hotel-date">
          <Clock size={14} />
          Submitted on {new Date(hotel.submittedDate).toLocaleDateString()}
        </p>
      </div>
      <div className="pending-hotel-actions">
        <button className="pending-btn view">
          <Eye size={16} />
          Review
        </button>
        <button className="pending-btn approve">
          <CheckCircle2 size={16} />
          Approve
        </button>
        <button className="pending-btn reject">
          <XCircle size={16} />
          Reject
        </button>
      </div>
    </div>
  );
};

export default HotelsManagement;
