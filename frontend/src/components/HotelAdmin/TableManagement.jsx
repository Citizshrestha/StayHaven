import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { 
  getTables, 
  createTable, 
  updateTable, 
  deleteTable, 
  generateTableQR,
  updateTableStatus,
  batchCreateTables
} from '../../api/qrService';
import './TableManagement.css';

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
const printQRCode = (base64Data, tableNumber, hotelName) => {
  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Table ${tableNumber} QR Code</title>
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
          .table-number {
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
          <h1 class="table-number">Table ${tableNumber}</h1>
          <img src="${base64Data}" class="qr-image" alt="QR Code" />
          <p class="instructions">Scan to view menu & order</p>
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

const TableManagement = () => {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedTable, setSelectedTable] = useState(null);
  const [hotelName, setHotelName] = useState('');
  
  // Form state
  const [formData, setFormData] = useState({
    tableNumber: '',
    capacity: 4,
    location: '',
    description: ''
  });

  // Batch form state
  const [batchData, setBatchData] = useState({
    count: 5,
    startNumber: 1,
    capacity: 4,
    location: '',
    generateQR: true
  });

  // Fetch tables
  const fetchTables = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getTables();
      if (response.success) {
        setTables(response.data || []);
        // Get hotel name from first table
        if (response.data?.[0]?.hotel?.name) {
          setHotelName(response.data[0].hotel.name);
        }
      }
    } catch (err) {
      console.error('Fetch tables error:', err);
      toast.error('Failed to load tables');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTables();
  }, [fetchTables]);

  // Handle form change
  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Handle batch form change
  const handleBatchFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setBatchData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'number' ? parseInt(value) : value
    }));
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      tableNumber: '',
      capacity: 4,
      location: '',
      description: ''
    });
    setSelectedTable(null);
  };

  // Open create modal
  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  // Open edit modal
  const openEditModal = (table) => {
    setSelectedTable(table);
    setFormData({
      tableNumber: table.tableNumber,
      capacity: table.capacity,
      location: table.location || '',
      description: table.description || ''
    });
    setShowModal(true);
  };

  // Handle create/update table
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.tableNumber) {
      toast.error('Table number is required');
      return;
    }

    try {
      setActionLoading(prev => ({ ...prev, submit: true }));
      
      if (selectedTable) {
        // Update
        const response = await updateTable(selectedTable._id, formData);
        if (response.success) {
          toast.success('Table updated successfully');
          fetchTables();
        }
      } else {
        // Create
        const response = await createTable(formData);
        if (response.success) {
          toast.success('Table created successfully');
          fetchTables();
        }
      }
      setShowModal(false);
      resetForm();
    } catch (err) {
      console.error('Submit error:', err);
      toast.error(err.message || 'Operation failed');
    } finally {
      setActionLoading(prev => ({ ...prev, submit: false }));
    }
  };

  // Handle batch create
  const handleBatchCreate = async (e) => {
    e.preventDefault();
    
    try {
      setActionLoading(prev => ({ ...prev, batch: true }));
      
      const response = await batchCreateTables(batchData);
      if (response.success) {
        toast.success(`${response.data.created} tables created successfully`);
        fetchTables();
        setShowBatchModal(false);
      }
    } catch (err) {
      console.error('Batch create error:', err);
      toast.error(err.message || 'Batch creation failed');
    } finally {
      setActionLoading(prev => ({ ...prev, batch: false }));
    }
  };

  // Handle delete table
  const handleDelete = async (tableId) => {
    if (!window.confirm('Are you sure you want to delete this table?')) return;

    try {
      setActionLoading(prev => ({ ...prev, [tableId]: true }));
      
      const response = await deleteTable(tableId);
      if (response.success) {
        toast.success('Table deleted successfully');
        fetchTables();
      }
    } catch (err) {
      console.error('Delete error:', err);
      toast.error(err.message || 'Delete failed');
    } finally {
      setActionLoading(prev => ({ ...prev, [tableId]: false }));
    }
  };

  // Handle generate QR
  const handleGenerateQR = async (tableId) => {
    try {
      setActionLoading(prev => ({ ...prev, [`qr_${tableId}`]: true }));
      
      const response = await generateTableQR(tableId);
      if (response.success) {
        toast.success('QR code generated successfully');
        fetchTables();
      }
    } catch (err) {
      console.error('QR generate error:', err);
      toast.error(err.message || 'QR generation failed');
    } finally {
      setActionLoading(prev => ({ ...prev, [`qr_${tableId}`]: false }));
    }
  };

  // Handle toggle QR status
  const handleToggleStatus = async (tableId, currentStatus) => {
    try {
      setActionLoading(prev => ({ ...prev, [`status_${tableId}`]: true }));
      
      const response = await updateTableStatus(tableId, { isActive: !currentStatus });
      if (response.success) {
        toast.success(`Table ${!currentStatus ? 'activated' : 'deactivated'}`);
        fetchTables();
      }
    } catch (err) {
      console.error('Status toggle error:', err);
      toast.error(err.message || 'Status update failed');
    } finally {
      setActionLoading(prev => ({ ...prev, [`status_${tableId}`]: false }));
    }
  };

  // View QR Code
  const viewQRCode = (table) => {
    setSelectedTable(table);
    setShowQRModal(true);
  };

  // Get status badge class
  const getStatusClass = (table) => {
    if (!table.isActive) return 'status-inactive';
    if (!table.qrCodeData) return 'status-no-qr';
    return 'status-active';
  };

  // Get status text
  const getStatusText = (table) => {
    if (!table.isActive) return 'Inactive';
    if (!table.qrCodeData) return 'No QR';
    return 'Active';
  };

  return (
    <div className="table-management">
      {/* Header */}
      <div className="tm-header">
        <div className="tm-header-content">
          <h1>🍽️ Table Management</h1>
          <p>Manage restaurant tables and QR codes</p>
        </div>
        <div className="tm-header-actions">
          <button 
            className="tm-btn tm-btn-secondary"
            onClick={() => setShowBatchModal(true)}
          >
            📦 Batch Create
          </button>
          <button 
            className="tm-btn tm-btn-primary"
            onClick={openCreateModal}
          >
            ➕ Add Table
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="tm-stats">
        <div className="tm-stat-card">
          <div className="tm-stat-icon">🍽️</div>
          <div className="tm-stat-info">
            <p className="tm-stat-value">{tables.length}</p>
            <p className="tm-stat-label">Total Tables</p>
          </div>
        </div>
        <div className="tm-stat-card">
          <div className="tm-stat-icon">✅</div>
          <div className="tm-stat-info">
            <p className="tm-stat-value">
              {tables.filter(t => t.isActive && t.qrCodeData).length}
            </p>
            <p className="tm-stat-label">Active QR</p>
          </div>
        </div>
        <div className="tm-stat-card">
          <div className="tm-stat-icon">👥</div>
          <div className="tm-stat-info">
            <p className="tm-stat-value">
              {tables.reduce((sum, t) => sum + (t.capacity || 0), 0)}
            </p>
            <p className="tm-stat-label">Total Capacity</p>
          </div>
        </div>
        <div className="tm-stat-card">
          <div className="tm-stat-icon">⚠️</div>
          <div className="tm-stat-info">
            <p className="tm-stat-value">
              {tables.filter(t => !t.qrCodeData).length}
            </p>
            <p className="tm-stat-label">Missing QR</p>
          </div>
        </div>
      </div>

      {/* Tables Grid */}
      {loading ? (
        <div className="tm-loading">
          <div className="tm-loading-spinner"></div>
          <p>Loading tables...</p>
        </div>
      ) : tables.length === 0 ? (
        <div className="tm-empty">
          <div className="tm-empty-icon">🍽️</div>
          <h3>No Tables Found</h3>
          <p>Start by adding a table or batch create multiple tables</p>
          <button 
            className="tm-btn tm-btn-primary"
            onClick={openCreateModal}
          >
            ➕ Add Your First Table
          </button>
        </div>
      ) : (
        <div className="tm-grid">
          {tables.map(table => (
            <div key={table._id} className="tm-card">
              <div className="tm-card-header">
                <div className="tm-table-number">
                  <span className="tm-table-icon">🍽️</span>
                  <span>Table {table.tableNumber}</span>
                </div>
                <span className={`tm-status ${getStatusClass(table)}`}>
                  {getStatusText(table)}
                </span>
              </div>

              <div className="tm-card-body">
                <div className="tm-card-details">
                  <div className="tm-detail">
                    <span className="tm-detail-icon">👥</span>
                    <span>Capacity: {table.capacity}</span>
                  </div>
                  {table.location && (
                    <div className="tm-detail">
                      <span className="tm-detail-icon">📍</span>
                      <span>{table.location}</span>
                    </div>
                  )}
                  {table.description && (
                    <div className="tm-detail">
                      <span className="tm-detail-icon">📝</span>
                      <span>{table.description}</span>
                    </div>
                  )}
                </div>

                {/* QR Preview */}
                {table.qrCodeData ? (
                  <div className="tm-qr-preview" onClick={() => viewQRCode(table)}>
                    <img src={table.qrCodeData} alt="QR Code" />
                    <span>Click to view</span>
                  </div>
                ) : (
                  <div className="tm-qr-placeholder">
                    <span>📱</span>
                    <p>No QR Code</p>
                    <button
                      className="tm-btn tm-btn-small tm-btn-primary"
                      onClick={() => handleGenerateQR(table._id)}
                      disabled={actionLoading[`qr_${table._id}`]}
                    >
                      {actionLoading[`qr_${table._id}`] ? 'Generating...' : 'Generate QR'}
                    </button>
                  </div>
                )}
              </div>

              <div className="tm-card-actions">
                <button
                  className="tm-action-btn tm-action-edit"
                  onClick={() => openEditModal(table)}
                  title="Edit"
                >
                  ✏️
                </button>
                <button
                  className="tm-action-btn tm-action-toggle"
                  onClick={() => handleToggleStatus(table._id, table.isActive)}
                  disabled={actionLoading[`status_${table._id}`]}
                  title={table.isActive ? 'Deactivate' : 'Activate'}
                >
                  {table.isActive ? '🔴' : '🟢'}
                </button>
                {table.qrCodeData && (
                  <>
                    <button
                      className="tm-action-btn tm-action-download"
                      onClick={() => downloadQRCode(table.qrCodeData, `table-${table.tableNumber}-qr.png`)}
                      title="Download QR"
                    >
                      ⬇️
                    </button>
                    <button
                      className="tm-action-btn tm-action-print"
                      onClick={() => printQRCode(table.qrCodeData, table.tableNumber, hotelName)}
                      title="Print QR"
                    >
                      🖨️
                    </button>
                  </>
                )}
                <button
                  className="tm-action-btn tm-action-delete"
                  onClick={() => handleDelete(table._id)}
                  disabled={actionLoading[table._id]}
                  title="Delete"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="tm-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="tm-modal" onClick={e => e.stopPropagation()}>
            <div className="tm-modal-header">
              <h2>{selectedTable ? 'Edit Table' : 'Add New Table'}</h2>
              <button className="tm-modal-close" onClick={() => setShowModal(false)}>
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="tm-modal-body">
                <div className="tm-form-group">
                  <label>Table Number *</label>
                  <input
                    type="text"
                    name="tableNumber"
                    value={formData.tableNumber}
                    onChange={handleFormChange}
                    placeholder="e.g., 1, A1, VIP-1"
                    required
                  />
                </div>
                <div className="tm-form-group">
                  <label>Capacity</label>
                  <input
                    type="number"
                    name="capacity"
                    value={formData.capacity}
                    onChange={handleFormChange}
                    min="1"
                    max="20"
                  />
                </div>
                <div className="tm-form-group">
                  <label>Location</label>
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleFormChange}
                    placeholder="e.g., Main Hall, Terrace, Private Room"
                  />
                </div>
                <div className="tm-form-group">
                  <label>Description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleFormChange}
                    placeholder="Optional notes about this table"
                    rows="3"
                  />
                </div>
              </div>
              <div className="tm-modal-footer">
                <button 
                  type="button" 
                  className="tm-btn tm-btn-secondary"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="tm-btn tm-btn-primary"
                  disabled={actionLoading.submit}
                >
                  {actionLoading.submit ? 'Saving...' : selectedTable ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Batch Create Modal */}
      {showBatchModal && (
        <div className="tm-modal-overlay" onClick={() => setShowBatchModal(false)}>
          <div className="tm-modal" onClick={e => e.stopPropagation()}>
            <div className="tm-modal-header">
              <h2>Batch Create Tables</h2>
              <button className="tm-modal-close" onClick={() => setShowBatchModal(false)}>
                ✕
              </button>
            </div>
            <form onSubmit={handleBatchCreate}>
              <div className="tm-modal-body">
                <div className="tm-form-row">
                  <div className="tm-form-group">
                    <label>Number of Tables</label>
                    <input
                      type="number"
                      name="count"
                      value={batchData.count}
                      onChange={handleBatchFormChange}
                      min="1"
                      max="50"
                    />
                  </div>
                  <div className="tm-form-group">
                    <label>Starting Number</label>
                    <input
                      type="number"
                      name="startNumber"
                      value={batchData.startNumber}
                      onChange={handleBatchFormChange}
                      min="1"
                    />
                  </div>
                </div>
                <div className="tm-form-group">
                  <label>Default Capacity</label>
                  <input
                    type="number"
                    name="capacity"
                    value={batchData.capacity}
                    onChange={handleBatchFormChange}
                    min="1"
                    max="20"
                  />
                </div>
                <div className="tm-form-group">
                  <label>Location (optional)</label>
                  <input
                    type="text"
                    name="location"
                    value={batchData.location}
                    onChange={handleBatchFormChange}
                    placeholder="e.g., Main Hall"
                  />
                </div>
                <div className="tm-form-group tm-form-checkbox">
                  <label>
                    <input
                      type="checkbox"
                      name="generateQR"
                      checked={batchData.generateQR}
                      onChange={handleBatchFormChange}
                    />
                    Generate QR codes automatically
                  </label>
                </div>
                <div className="tm-batch-preview">
                  <p>Preview: Will create tables {batchData.startNumber} to {batchData.startNumber + batchData.count - 1}</p>
                </div>
              </div>
              <div className="tm-modal-footer">
                <button 
                  type="button" 
                  className="tm-btn tm-btn-secondary"
                  onClick={() => setShowBatchModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="tm-btn tm-btn-primary"
                  disabled={actionLoading.batch}
                >
                  {actionLoading.batch ? 'Creating...' : `Create ${batchData.count} Tables`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR View Modal */}
      {showQRModal && selectedTable && (
        <div className="tm-modal-overlay" onClick={() => setShowQRModal(false)}>
          <div className="tm-modal tm-modal-qr" onClick={e => e.stopPropagation()}>
            <div className="tm-modal-header">
              <h2>Table {selectedTable.tableNumber} QR Code</h2>
              <button className="tm-modal-close" onClick={() => setShowQRModal(false)}>
                ✕
              </button>
            </div>
            <div className="tm-modal-body tm-qr-view">
              {selectedTable.qrCodeData ? (
                <>
                  <img 
                    src={selectedTable.qrCodeData} 
                    alt={`Table ${selectedTable.tableNumber} QR Code`}
                    className="tm-qr-full"
                  />
                  <p className="tm-qr-token">Token: {selectedTable.uniqueToken}</p>
                  <div className="tm-qr-actions">
                    <button
                      className="tm-btn tm-btn-secondary"
                      onClick={() => downloadQRCode(
                        selectedTable.qrCodeData, 
                        `table-${selectedTable.tableNumber}-qr.png`
                      )}
                    >
                      ⬇️ Download
                    </button>
                    <button
                      className="tm-btn tm-btn-primary"
                      onClick={() => printQRCode(
                        selectedTable.qrCodeData, 
                        selectedTable.tableNumber,
                        hotelName
                      )}
                    >
                      🖨️ Print
                    </button>
                  </div>
                </>
              ) : (
                <p>No QR code generated for this table</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TableManagement;
