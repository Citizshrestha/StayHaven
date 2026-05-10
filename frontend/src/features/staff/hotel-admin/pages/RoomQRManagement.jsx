import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { useStaffAuth } from '../../../../core/context/StaffAuthContext';
import {
  getRooms,
  generateRoomQR,
  batchGenerateRoomQR,
  toggleRoomQR
} from '../services/roomApi';
import './RoomQRManagement.css';

// Utility to download base64 as image
const downloadQRCode = (base64Data, filename) => {
  const link = document.createElement('a');
  link.href = base64Data;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Print QR Code
const printQRCode = (base64Data, roomNumber, hotelName) => {
  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Room ${roomNumber} QR Code</title>
        <style>
          body {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            font-family: system-ui, -apple-system, sans-serif;
            background: #f8fafc;
          }
          .qr-print-container {
            padding: 40px;
            background: white;
            border-radius: 16px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            text-align: center;
          }
          .hotel-name {
            font-size: 18px;
            color: #64748b;
            margin-bottom: 8px;
          }
          .room-number {
            font-size: 28px;
            font-weight: 700;
            color: #1e293b;
            margin-bottom: 20px;
          }
          .qr-image {
            width: 200px;
            height: 200px;
          }
          .instructions {
            margin-top: 20px;
            font-size: 14px;
            color: #64748b;
          }
          @media print {
            body { background: white; }
            .qr-print-container { box-shadow: none; }
          }
        </style>
      </head>
      <body>
        <div class="qr-print-container">
          <p class="hotel-name">${hotelName}</p>
          <h1 class="room-number">Room ${roomNumber}</h1>
          <img src="${base64Data}" class="qr-image" alt="QR Code" />
          <p class="instructions">Scan for room service & amenities</p>
        </div>
        <script>
          window.onload = function() {
            window.print();
            window.onafterprint = function() { window.close(); }
          }
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
};

// Print all QR codes
const printAllQRCodes = (rooms, hotelName) => {
  const roomsWithQR = rooms.filter(r => r.qrCodeImage);
  if (roomsWithQR.length === 0) {
    toast.error('No rooms with QR codes to print');
    return;
  }

  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>All Room QR Codes - ${hotelName}</title>
        <style>
          body {
            margin: 0;
            padding: 20px;
            font-family: system-ui, -apple-system, sans-serif;
          }
          .header {
            text-align: center;
            margin-bottom: 40px;
          }
          .header h1 {
            margin: 0;
            font-size: 24px;
            color: #1e293b;
          }
          .header p {
            margin: 8px 0 0;
            color: #64748b;
          }
          .qr-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 30px;
            page-break-inside: avoid;
          }
          .qr-item {
            text-align: center;
            padding: 20px;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            page-break-inside: avoid;
          }
          .qr-item h3 {
            margin: 0 0 10px;
            font-size: 16px;
            color: #1e293b;
          }
          .qr-item img {
            width: 120px;
            height: 120px;
          }
          .qr-item p {
            margin: 8px 0 0;
            font-size: 11px;
            color: #64748b;
          }
          @media print {
            .qr-grid {
              grid-template-columns: repeat(3, 1fr);
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${hotelName}</h1>
          <p>Room QR Codes - ${new Date().toLocaleDateString()}</p>
        </div>
        <div class="qr-grid">
          ${roomsWithQR.map(room => `
            <div class="qr-item">
              <h3>Room ${room.roomNumber}</h3>
              <img src="${room.qrCodeImage}" alt="QR Code" />
              <p>Scan for room service</p>
            </div>
          `).join('')}
        </div>
        <script>
          window.onload = function() {
            window.print();
            window.onafterprint = function() { window.close(); }
          }
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
};

const RoomQRManagement = () => {
  const { activeProperty } = useStaffAuth();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [hotelName, setHotelName] = useState('');
  const [filter, setFilter] = useState('all'); // all, with-qr, without-qr

  const hotelId = activeProperty?._id || activeProperty;

  // Fetch rooms
  const fetchRooms = useCallback(async () => {
    if (!hotelId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await getRooms({ hotelId });
      if (response.data.success) {
        setRooms(response.data.rooms || []);
        // Get hotel name from first room if available
        if (response.data.rooms?.[0]?.hotel?.name) {
          setHotelName(response.data.rooms[0].hotel.name);
        }
      }
    } catch (err) {
      console.error('Fetch rooms error:', err);
      toast.error(err.response?.data?.message || 'Failed to load rooms');
    } finally {
      setLoading(false);
    }
  }, [hotelId]);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  // Filter rooms
  const filteredRooms = rooms.filter(room => {
    if (filter === 'with-qr') return room.qrCodeImage;
    if (filter === 'without-qr') return !room.qrCodeImage;
    return true;
  });

  // Handle generate QR for single room
  const handleGenerateQR = async (roomId) => {
    try {
      setActionLoading(prev => ({ ...prev, [`qr_${roomId}`]: true }));

      const response = await generateRoomQR(roomId);
      if (response.data.success) {
        toast.success('QR code generated successfully');
        fetchRooms();
      }
    } catch (err) {
      console.error('QR generate error:', err);
      toast.error(err.response?.data?.message || 'QR generation failed');
    } finally {
      setActionLoading(prev => ({ ...prev, [`qr_${roomId}`]: false }));
    }
  };

  // Handle batch generate QR
  const handleBatchGenerateQR = async () => {
    const roomsWithoutQR = rooms.filter(r => !r.qrCodeImage);
    if (roomsWithoutQR.length === 0) {
      toast.info('All rooms already have QR codes');
      return;
    }

    if (!window.confirm(`Generate QR codes for ${roomsWithoutQR.length} rooms?`)) return;

    try {
      setActionLoading(prev => ({ ...prev, batch: true }));

      const response = await batchGenerateRoomQR(hotelId);
      if (response.data.success) {
        toast.success(`${response.data.successCount || roomsWithoutQR.length} QR codes generated`);
        fetchRooms();
      }
    } catch (err) {
      console.error('Batch QR generate error:', err);
      toast.error(err.response?.data?.message || 'Batch generation failed');
    } finally {
      setActionLoading(prev => ({ ...prev, batch: false }));
    }
  };

  // Handle toggle QR status
  const handleToggleStatus = async (roomId, currentStatus) => {
    try {
      setActionLoading(prev => ({ ...prev, [`status_${roomId}`]: true }));

      const response = await toggleRoomQR(roomId);
      if (response.data.success) {
        toast.success(`Room QR ${!currentStatus ? 'activated' : 'deactivated'}`);
        fetchRooms();
      }
    } catch (err) {
      console.error('Status toggle error:', err);
      toast.error(err.response?.data?.message || 'Status update failed');
    } finally {
      setActionLoading(prev => ({ ...prev, [`status_${roomId}`]: false }));
    }
  };

  // View QR Code
  const viewQRCode = (room) => {
    setSelectedRoom(room);
    setShowQRModal(true);
  };

  // Get room type display
  const getRoomTypeDisplay = (type) => {
    const types = {
      single: 'Single',
      double: 'Double',
      suite: 'Suite',
      deluxe: 'Deluxe',
      villa: 'Villa'
    };
    return types[type] || type;
  };

  // Get room type icon
  const getRoomTypeIcon = (type) => {
    const icons = {
      single: '🛏️',
      double: '🛏️🛏️',
      suite: '🏨',
      deluxe: '⭐',
      villa: '🏡'
    };
    return icons[type] || '🛏️';
  };

  // Get status badge class
  const getStatusClass = (room) => {
    if (!room.isQrActive) return 'status-inactive';
    if (!room.qrCodeImage) return 'status-no-qr';
    return 'status-active';
  };

  // Get status text
  const getStatusText = (room) => {
    if (!room.isQrActive) return 'QR Inactive';
    if (!room.qrCodeImage) return 'No QR';
    return 'Active';
  };

  // Stats
  const stats = {
    total: rooms.length,
    withQR: rooms.filter(r => r.qrCodeImage).length,
    active: rooms.filter(r => r.qrCodeImage && r.isQrActive !== false).length,
    inactive: rooms.filter(r => r.isQrActive === false).length
  };

  return (
    <div className="room-qr-management">
      {/* Header */}
      <div className="rqm-header">
        <div className="rqm-header-content">
          <h1>🛏️ Room QR Management</h1>
          <p>Generate and manage QR codes for hotel rooms</p>
        </div>
        <div className="rqm-header-actions">
          <button
            className="rqm-btn rqm-btn-secondary"
            onClick={() => printAllQRCodes(rooms, hotelName)}
            disabled={rooms.filter(r => r.qrCodeImage).length === 0}
          >
            🖨️ Print All
          </button>
          <button
            className="rqm-btn rqm-btn-primary"
            onClick={handleBatchGenerateQR}
            disabled={actionLoading.batch || rooms.filter(r => !r.qrCodeImage).length === 0}
          >
            {actionLoading.batch ? 'Generating...' : '⚡ Generate All QR'}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="rqm-stats">
        <div className="rqm-stat-card">
          <div className="rqm-stat-icon">🛏️</div>
          <div className="rqm-stat-info">
            <p className="rqm-stat-value">{stats.total}</p>
            <p className="rqm-stat-label">Total Rooms</p>
          </div>
        </div>
        <div className="rqm-stat-card">
          <div className="rqm-stat-icon">📱</div>
          <div className="rqm-stat-info">
            <p className="rqm-stat-value">{stats.withQR}</p>
            <p className="rqm-stat-label">With QR Code</p>
          </div>
        </div>
        <div className="rqm-stat-card">
          <div className="rqm-stat-icon">✅</div>
          <div className="rqm-stat-info">
            <p className="rqm-stat-value">{stats.active}</p>
            <p className="rqm-stat-label">Active</p>
          </div>
        </div>
        <div className="rqm-stat-card">
          <div className="rqm-stat-icon">⚠️</div>
          <div className="rqm-stat-info">
            <p className="rqm-stat-value">{stats.total - stats.withQR}</p>
            <p className="rqm-stat-label">Missing QR</p>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="rqm-filter">
        <button
          className={`rqm-filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All Rooms
        </button>
        <button
          className={`rqm-filter-btn ${filter === 'with-qr' ? 'active' : ''}`}
          onClick={() => setFilter('with-qr')}
        >
          With QR ({stats.withQR})
        </button>
        <button
          className={`rqm-filter-btn ${filter === 'without-qr' ? 'active' : ''}`}
          onClick={() => setFilter('without-qr')}
        >
          Without QR ({stats.total - stats.withQR})
        </button>
      </div>

      {/* Rooms Grid */}
      {loading ? (
        <div className="rqm-loading">
          <div className="rqm-loading-spinner"></div>
          <p>Loading rooms...</p>
        </div>
      ) : filteredRooms.length === 0 ? (
        <div className="rqm-empty">
          <div className="rqm-empty-icon">🛏️</div>
          <h3>{filter === 'all' ? 'No Rooms Found' : 'No matching rooms'}</h3>
          <p>
            {filter === 'all'
              ? 'Add rooms in Room Management first'
              : 'Try adjusting your filter'}
          </p>
        </div>
      ) : (
        <div className="rqm-grid">
          {filteredRooms.map(room => (
            <div key={room._id} className="rqm-card">
              <div className="rqm-card-header">
                <div className="rqm-room-info">
                  <span className="rqm-room-icon">{getRoomTypeIcon(room.type)}</span>
                  <div>
                    <h3>Room {room.roomNumber}</h3>
                    <span className="rqm-room-type">{getRoomTypeDisplay(room.type)}</span>
                  </div>
                </div>
                <span className={`rqm-status ${getStatusClass(room)}`}>
                  {getStatusText(room)}
                </span>
              </div>

              <div className="rqm-card-body">
                {room.qrCodeImage ? (
                  <div className="rqm-qr-container" onClick={() => viewQRCode(room)}>
                    <img src={room.qrCodeImage} alt={`Room ${room.roomNumber} QR`} />
                    <span>Click to enlarge</span>
                  </div>
                ) : (
                  <div className="rqm-qr-placeholder">
                    <span>📱</span>
                    <p>No QR Code</p>
                    <button
                      className="rqm-btn rqm-btn-small rqm-btn-primary"
                      onClick={() => handleGenerateQR(room._id)}
                      disabled={actionLoading[`qr_${room._id}`]}
                    >
                      {actionLoading[`qr_${room._id}`] ? '...' : 'Generate'}
                    </button>
                  </div>
                )}
              </div>

              <div className="rqm-card-footer">
                {room.qrCodeImage && (
                  <>
                    <button
                      className="rqm-action-btn"
                      onClick={() => handleToggleStatus(room._id, room.isQrActive !== false)}
                      disabled={actionLoading[`status_${room._id}`]}
                      title={room.isQrActive !== false ? 'Deactivate' : 'Activate'}
                    >
                      {room.isQrActive !== false ? '🔴' : '🟢'}
                    </button>
                    <button
                      className="rqm-action-btn"
                      onClick={() => downloadQRCode(room.qrCodeImage, `room-${room.roomNumber}-qr.png`)}
                      title="Download QR"
                    >
                      ⬇️
                    </button>
                    <button
                      className="rqm-action-btn"
                      onClick={() => printQRCode(room.qrCodeImage, room.roomNumber, hotelName)}
                      title="Print QR"
                    >
                      🖨️
                    </button>
                    <button
                      className="rqm-action-btn"
                      onClick={() => viewQRCode(room)}
                      title="View QR"
                    >
                      👁️
                    </button>
                  </>
                )}
                {!room.qrCodeImage && (
                  <button
                    className="rqm-action-btn rqm-action-generate"
                    onClick={() => handleGenerateQR(room._id)}
                    disabled={actionLoading[`qr_${room._id}`]}
                    title="Generate QR"
                  >
                    {actionLoading[`qr_${room._id}`] ? '⏳' : '📱'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* QR View Modal */}
      {showQRModal && selectedRoom && (
        <div className="rqm-modal-overlay" onClick={() => setShowQRModal(false)}>
          <div className="rqm-modal" onClick={e => e.stopPropagation()}>
            <div className="rqm-modal-header">
              <h2>Room {selectedRoom.roomNumber} QR Code</h2>
              <button className="rqm-modal-close" onClick={() => setShowQRModal(false)}>
                ✕
              </button>
            </div>
            <div className="rqm-modal-body">
              {selectedRoom.qrCodeImage ? (
                <>
                  <img
                    src={selectedRoom.qrCodeImage}
                    alt={`Room ${selectedRoom.roomNumber} QR Code`}
                    className="rqm-qr-full"
                  />
                  <p className="rqm-qr-token">Token: {selectedRoom.uniqueToken}</p>
                  <p className="rqm-qr-hint">
                    Guests scan this code to access room service, housekeeping, and more
                  </p>
                  <div className="rqm-qr-actions">
                    <button
                      className="rqm-btn rqm-btn-secondary"
                      onClick={() => downloadQRCode(
                        selectedRoom.qrCodeImage,
                        `room-${selectedRoom.roomNumber}-qr.png`
                      )}
                    >
                      ⬇️ Download
                    </button>
                    <button
                      className="rqm-btn rqm-btn-primary"
                      onClick={() => printQRCode(
                        selectedRoom.qrCodeImage,
                        selectedRoom.roomNumber,
                        hotelName
                      )}
                    >
                      🖨️ Print
                    </button>
                  </div>
                </>
              ) : (
                <p>No QR code generated for this room</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomQRManagement;
