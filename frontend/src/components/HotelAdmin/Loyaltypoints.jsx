import React, { useState, useMemo } from 'react';
import './Loyaltypoints.css';

const Loyaltypoints = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState('all');
  const [pointsRangeFilter, setPointsRangeFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedGuests, setSelectedGuests] = useState(new Set());
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedGuestDetails, setSelectedGuestDetails] = useState(null);

  const itemsPerPage = 5;

  // Guest loyalty data
  const [guestLoyaltyData] = useState([
    { id: 1, name: 'Ethan Harper', points: 1500, tier: 'Gold', recentActivity: '+200 (Earned)', date: '2024-07-26', status: 'Active', joinDate: '2023-01-15', totalSpent: '$5,200' },
    { id: 2, name: 'Olivia Bennett', points: 800, tier: 'Silver', recentActivity: '-100 (Redeemed)', date: '2024-07-25', status: 'Active', joinDate: '2023-03-20', totalSpent: '$2,800' },
    { id: 3, name: 'Noah Carter', points: 2200, tier: 'Platinum', recentActivity: '+350 (Earned)', date: '2024-07-24', status: 'Active', joinDate: '2022-11-10', totalSpent: '$8,500' },
    { id: 4, name: 'Ava Thompson', points: 500, tier: 'Bronze', recentActivity: '+50 (Earned)', date: '2024-07-23', status: 'Inactive', joinDate: '2024-01-05', totalSpent: '$1,200' },
    { id: 5, name: 'Liam Foster', points: 100, tier: 'Bronze', recentActivity: '-50 (Redeemed)', date: '2024-07-22', status: 'Active', joinDate: '2024-02-15', totalSpent: '$800' },
    { id: 6, name: 'Emma Wilson', points: 3500, tier: 'Platinum', recentActivity: '+500 (Earned)', date: '2024-07-26', status: 'Active', joinDate: '2022-05-30', totalSpent: '$12,000' },
    { id: 7, name: 'James Rodriguez', points: 1200, tier: 'Gold', recentActivity: '+100 (Earned)', date: '2024-07-25', status: 'Active', joinDate: '2023-07-12', totalSpent: '$4,500' },
    { id: 8, name: 'Sophie Davis', points: 950, tier: 'Silver', recentActivity: '+150 (Earned)', date: '2024-07-24', status: 'Active', joinDate: '2023-09-01', totalSpent: '$3,200' },
    { id: 9, name: 'Michael Brown', points: 450, tier: 'Bronze', recentActivity: '-25 (Redeemed)', date: '2024-07-23', status: 'Active', joinDate: '2024-04-10', totalSpent: '$1,100' },
    { id: 10, name: 'Charlotte Lee', points: 2800, tier: 'Platinum', recentActivity: '+400 (Earned)', date: '2024-07-26', status: 'Active', joinDate: '2022-08-20', totalSpent: '$9,800' },
  ]);

  // Filtered and paginated data
  const filteredData = useMemo(() => {
    return guestLoyaltyData.filter(guest => {
      const matchesSearch = guest.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           guest.id.toString().includes(searchQuery);
      const matchesTier = tierFilter === 'all' || guest.tier === tierFilter;
      
      let matchesPointsRange = true;
      if (pointsRangeFilter === '0-500') matchesPointsRange = guest.points <= 500;
      else if (pointsRangeFilter === '501-1000') matchesPointsRange = guest.points > 500 && guest.points <= 1000;
      else if (pointsRangeFilter === '1001-2000') matchesPointsRange = guest.points > 1000 && guest.points <= 2000;
      else if (pointsRangeFilter === '2000+') matchesPointsRange = guest.points > 2000;

      return matchesSearch && matchesTier && matchesPointsRange;
    });
  }, [searchQuery, tierFilter, pointsRangeFilter, guestLoyaltyData]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, currentPage]);

  // Tier styling
  const getTierColor = (tier) => {
    switch(tier) {
      case 'Gold': return '#FFD700';
      case 'Silver': return '#C0C0C0';
      case 'Platinum': return '#E5E4E2';
      case 'Bronze': return '#CD7F32';
      default: return '#95a5a6';
    }
  };

  const getTierStyle = (tier) => {
    const colors = {
      'Gold': '#FFC107',
      'Silver': '#95a5a6',
      'Platinum': '#34495e',
      'Bronze': '#CD7F32'
    };
    return { backgroundColor: colors[tier] || '#95a5a6' };
  };

  const handleToggleGuest = (id) => {
    const newSelected = new Set(selectedGuests);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedGuests(newSelected);
  };

  const handleViewDetails = (guest) => {
    setSelectedGuestDetails(guest);
    setShowDetailsModal(true);
  };

  const handleRedeemPoints = (guest) => {
    const points = prompt(`Redeem points for ${guest.name}. Enter points to redeem:`, '100');
    if (points && !isNaN(points)) {
      alert(`Successfully redeemed ${points} points for ${guest.name}!`);
    }
  };

  const handleAddPoints = (guest) => {
    const points = prompt(`Add points for ${guest.name}. Enter points to add:`, '100');
    if (points && !isNaN(points)) {
      alert(`Successfully added ${points} points to ${guest.name}!`);
    }
  };

  const handleExportData = () => {
    alert('Exporting loyalty data as CSV...');
    // In a real app, this would generate and download a CSV file
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setTierFilter('all');
    setPointsRangeFilter('all');
    setCurrentPage(1);
  };

  return (
    <div className="loyalty-points-container">
      <div className="loyalty-header">
        <h1>Loyalty Points Management</h1>
        <p>Manage guest loyalty points, tier status, and program performance.</p>
      </div>

      {/* Search and Filters Section */}
      <div className="loyalty-filters-section">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search guests by name or ID"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="search-input"
          />
          <span className="search-icon">🔍</span>
        </div>

        <div className="filters-group">
          <div className="filter-item">
            <label>Filter by Tier</label>
            <select
              value={tierFilter}
              onChange={(e) => {
                setTierFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="filter-select"
            >
              <option value="all">All Tiers</option>
              <option value="Bronze">Bronze</option>
              <option value="Silver">Silver</option>
              <option value="Gold">Gold</option>
              <option value="Platinum">Platinum</option>
            </select>
          </div>

          <div className="filter-item">
            <label>Filter by Points Range</label>
            <select
              value={pointsRangeFilter}
              onChange={(e) => {
                setPointsRangeFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="filter-select"
            >
              <option value="all">All Ranges</option>
              <option value="0-500">0 - 500 Points</option>
              <option value="501-1000">501 - 1,000 Points</option>
              <option value="1001-2000">1,001 - 2,000 Points</option>
              <option value="2000+">2,000+ Points</option>
            </select>
          </div>

          <button className="btn-reset" onClick={handleResetFilters}>Reset Filters</button>
          <button className="btn-export" onClick={handleExportData}>Export Data</button>
        </div>
      </div>

      {/* Results Info */}
      <div className="results-info">
        <p>Showing {paginatedData.length} of {filteredData.length} results</p>
      </div>

      {/* Loyalty Table */}
      <div className="loyalty-table-wrapper">
        <table className="loyalty-table">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={selectedGuests.size === paginatedData.length && paginatedData.length > 0}
                  onChange={(e) => {
                    if (e.target.checked) {
                      const newSelected = new Set(paginatedData.map(g => g.id));
                      setSelectedGuests(newSelected);
                    } else {
                      setSelectedGuests(new Set());
                    }
                  }}
                  className="checkbox"
                />
              </th>
              <th>Guest Name</th>
              <th>Current Points</th>
              <th>Tier Status</th>
              <th>Recent Activity</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.length > 0 ? (
              paginatedData.map((guest) => (
                <tr key={guest.id} className={selectedGuests.has(guest.id) ? 'selected' : ''}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedGuests.has(guest.id)}
                      onChange={() => handleToggleGuest(guest.id)}
                      className="checkbox"
                    />
                  </td>
                  <td className="guest-name">{guest.name}</td>
                  <td className="points-column">
                    <span className="points-badge">{guest.points}</span>
                  </td>
                  <td>
                    <span
                      className="tier-badge"
                      style={getTierStyle(guest.tier)}
                    >
                      {guest.tier}
                    </span>
                  </td>
                  <td className="activity-column">
                    <span className={guest.recentActivity.includes('+') ? 'activity-positive' : 'activity-negative'}>
                      {guest.recentActivity}
                    </span>
                  </td>
                  <td className="actions-column">
                    <button
                      className="btn-view"
                      onClick={() => handleViewDetails(guest)}
                      title="View Details"
                    >
                      View Details
                    </button>
                    <div className="action-dropdown">
                      <button
                        className="btn-action"
                        title="More Actions"
                      >
                        ⋮
                      </button>
                      <div className="dropdown-menu">
                        <button onClick={() => handleAddPoints(guest)}>Add Points</button>
                        <button onClick={() => handleRedeemPoints(guest)}>Redeem Points</button>
                        <button onClick={() => alert(`Upgraded ${guest.name} tier!`)}>Upgrade Tier</button>
                      </div>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="no-data">No guests found matching your filters.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="pagination">
        <button
          className="pagination-btn"
          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
          disabled={currentPage === 1}
        >
          ←
        </button>

        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
          <button
            key={page}
            className={`pagination-btn ${currentPage === page ? 'active' : ''}`}
            onClick={() => setCurrentPage(page)}
          >
            {page}
          </button>
        ))}

        {totalPages > 5 && currentPage < totalPages - 2 && (
          <span className="pagination-dots">...</span>
        )}

        <button
          className="pagination-btn"
          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
          disabled={currentPage === totalPages}
        >
          →
        </button>
      </div>

      {/* Guest Details Modal */}
      {showDetailsModal && selectedGuestDetails && (
        <div className="modal-overlay" onClick={() => setShowDetailsModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Guest Loyalty Details</h2>
              <button
                className="modal-close"
                onClick={() => setShowDetailsModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-content">
              <div className="details-grid">
                <div className="detail-item">
                  <label>Guest Name</label>
                  <p>{selectedGuestDetails.name}</p>
                </div>
                <div className="detail-item">
                  <label>Current Points</label>
                  <p className="highlight">{selectedGuestDetails.points}</p>
                </div>
                <div className="detail-item">
                  <label>Tier Status</label>
                  <p>
                    <span
                      className="tier-badge"
                      style={getTierStyle(selectedGuestDetails.tier)}
                    >
                      {selectedGuestDetails.tier}
                    </span>
                  </p>
                </div>
                <div className="detail-item">
                  <label>Member Since</label>
                  <p>{selectedGuestDetails.joinDate}</p>
                </div>
                <div className="detail-item">
                  <label>Total Spent</label>
                  <p>{selectedGuestDetails.totalSpent}</p>
                </div>
                <div className="detail-item">
                  <label>Status</label>
                  <p>
                    <span className={`status-badge ${selectedGuestDetails.status.toLowerCase()}`}>
                      {selectedGuestDetails.status}
                    </span>
                  </p>
                </div>
                <div className="detail-item full-width">
                  <label>Recent Activity</label>
                  <p>{selectedGuestDetails.recentActivity} on {selectedGuestDetails.date}</p>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn-secondary"
                onClick={() => handleAddPoints(selectedGuestDetails)}
              >
                Add Points
              </button>
              <button
                className="btn-secondary"
                onClick={() => handleRedeemPoints(selectedGuestDetails)}
              >
                Redeem Points
              </button>
              <button
                className="btn-primary"
                onClick={() => setShowDetailsModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Loyaltypoints;
