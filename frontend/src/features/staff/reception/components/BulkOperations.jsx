import React, { useState } from 'react';
import './BulkOperations.css';

const BulkOperations = ({
  selectedItems = [],
  onClearSelection,
  operations = [],
  itemType = 'items'
}) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [showResult, setShowResult] = useState(false);

  const handleOperation = async (operation) => {
    if (selectedItems.length === 0) {
      alert('Please select at least one item');
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to ${operation.label.toLowerCase()} ${selectedItems.length} ${itemType}?`
    );

    if (!confirmed) return;

    setLoading(true);
    setResult(null);
    setShowResult(false);

    try {
      const response = await operation.action(selectedItems);

      if (response.data.success) {
        const successCount = response.data.results?.success?.length || response.data.successCount || 0;
        const failedCount = response.data.results?.failed?.length || response.data.failedCount || 0;

        setResult({
          success: true,
          successCount,
          failedCount,
          total: selectedItems.length,
          details: response.data.results
        });
        setShowResult(true);

        // Clear selection after successful operation
        if (onClearSelection) {
          setTimeout(() => {
            onClearSelection();
          }, 2000);
        }

        // Refresh data if callback provided
        if (operation.onSuccess) {
          operation.onSuccess();
        }
      }
    } catch (err) {
      setResult({
        success: false,
        error: err.response?.data?.message || 'Operation failed'
      });
      setShowResult(true);
    } finally {
      setLoading(false);
    }
  };

  const closeResult = () => {
    setShowResult(false);
    setResult(null);
  };

  if (selectedItems.length === 0) {
    return null;
  }

  return (
    <div className="bulk-operations">
      <div className="bulk-operations-bar">
        <div className="selection-info">
          <span className="selected-count">{selectedItems.length}</span>
          <span className="selected-text">{itemType} selected</span>
          <button className="clear-selection" onClick={onClearSelection}>
            ✕ Clear
          </button>
        </div>

        <div className="bulk-actions">
          {operations.map((op, index) => (
            <button
              key={index}
              className={`bulk-action-btn ${op.variant || 'primary'}`}
              onClick={() => handleOperation(op)}
              disabled={loading}
            >
              {op.icon && <span className="icon">{op.icon}</span>}
              {op.label}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="bulk-progress">
          <div className="progress-bar">
            <div className="progress-fill"></div>
          </div>
          <p>Processing {selectedItems.length} {itemType}...</p>
        </div>
      )}

      {showResult && result && (
        <div className={`bulk-result ${result.success ? 'success' : 'error'}`}>
          <div className="result-header">
            <h4>
              {result.success ? '✓ Operation Complete' : '✗ Operation Failed'}
            </h4>
            <button className="close-result" onClick={closeResult}>✕</button>
          </div>
          <div className="result-body">
            {result.success ? (
              <>
                <p className="result-summary">
                  <strong>{result.successCount}</strong> of <strong>{result.total}</strong> {itemType} processed successfully
                </p>
                {result.failedCount > 0 && (
                  <p className="result-failures">
                    <strong>{result.failedCount}</strong> failed
                  </p>
                )}
                {result.details?.failed && result.details.failed.length > 0 && (
                  <details className="failure-details">
                    <summary>View failed items</summary>
                    <ul>
                      {result.details.failed.map((item, idx) => (
                        <li key={idx}>
                          {item.bookingId || item.roomId || item.id}: {item.reason}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </>
            ) : (
              <p className="result-error">{result.error}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkOperations;
