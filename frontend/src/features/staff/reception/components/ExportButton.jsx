import React, { useState } from 'react';
import { downloadFile } from '../services/exportApi';
import './ExportButton.css';

const ExportButton = ({
  exportType,
  exportFunction,
  label = 'Export',
  icon = '📥',
  showDateRange = false,
  additionalParams = {},
  filename = 'export.csv'
}) => {
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });

  const handleExport = async () => {
    if (showDateRange && !showDatePicker) {
      setShowDatePicker(true);
      return;
    }

    setLoading(true);
    try {
      const params = { ...additionalParams };

      if (showDateRange && dateRange.startDate) {
        params.startDate = dateRange.startDate;
      }
      if (showDateRange && dateRange.endDate) {
        params.endDate = dateRange.endDate;
      }

      const response = await exportFunction(params);

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().split('T')[0];
      const finalFilename = filename.replace('.csv', `_${timestamp}.csv`).replace('.pdf', `_${timestamp}.pdf`);

      downloadFile(response.data, finalFilename);

      // Reset date picker
      if (showDateRange) {
        setShowDatePicker(false);
        setDateRange({ startDate: '', endDate: '' });
      }
    } catch (err) {
      console.error('Export failed:', err);
      alert(err.response?.data?.message || 'Export failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setShowDatePicker(false);
    setDateRange({ startDate: '', endDate: '' });
  };

  return (
    <div className="export-button-container">
      <button
        className="export-button"
        onClick={handleExport}
        disabled={loading}
      >
        {loading ? (
          <>
            <span className="spinner"></span>
            Exporting...
          </>
        ) : (
          <>
            <span className="icon">{icon}</span>
            {label}
          </>
        )}
      </button>

      {showDatePicker && (
        <div className="date-picker-popup">
          <div className="date-picker-header">
            <h4>Select Date Range</h4>
            <button className="close-btn" onClick={handleCancel}>✕</button>
          </div>
          <div className="date-picker-body">
            <div className="date-input-group">
              <label>Start Date:</label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
              />
            </div>
            <div className="date-input-group">
              <label>End Date:</label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
              />
            </div>
          </div>
          <div className="date-picker-actions">
            <button className="btn-secondary" onClick={handleCancel}>
              Cancel
            </button>
            <button className="btn-primary" onClick={handleExport} disabled={loading}>
              {loading ? 'Exporting...' : 'Export'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExportButton;
