import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { seedHotelAdminData } from '../../../../core/api/services/seed.service';

const SeedDataButton = ({ hotelId, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSeed = async (clear = false) => {
    if (!hotelId) {
      toast.error('No hotel ID found');
      return;
    }

    setLoading(true);
    try {
      const result = await seedHotelAdminData(hotelId, clear);

      if (result.success) {
        toast.success(result.message);

        // Show detailed summary
        const summary = result.summary;
        const details = [];

        if (summary.rooms.created > 0) details.push(`${summary.rooms.created} rooms`);
        if (summary.menuItems.created > 0) details.push(`${summary.menuItems.created} menu items`);
        if (summary.tables.created > 0) details.push(`${summary.tables.created} tables`);
        if (summary.staff.created > 0) details.push(`${summary.staff.created} staff members`);
        if (summary.orders.created > 0) details.push(`${summary.orders.created} orders`);
        if (summary.bookings.created > 0) details.push(`${summary.bookings.created} bookings`);
        if (summary.invoices.created > 0) details.push(`${summary.invoices.created} invoices`);
        if (summary.transactions.created > 0) details.push(`${summary.transactions.created} transactions`);

        if (details.length > 0) {
          toast.info(`Created: ${details.join(', ')}`, { autoClose: 5000 });
        }

        setShowConfirm(false);

        // Trigger parent refresh if callback provided
        if (onSuccess) {
          onSuccess();
        }
      } else {
        toast.error(result.message || 'Failed to seed data');
      }
    } catch (error) {
      console.error('Seed error:', error);
      toast.error(error.message || 'Failed to seed data');
    } finally {
      setLoading(false);
    }
  };

  // Only show in development mode
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        disabled={loading}
        style={{
          padding: '8px 16px',
          backgroundColor: '#6366f1',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontSize: '14px',
          fontWeight: '500',
          opacity: loading ? 0.6 : 1,
        }}
      >
        {loading ? 'Seeding...' : '🌱 Seed Test Data'}
      </button>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
          onClick={() => setShowConfirm(false)}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '500px',
              width: '90%',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0, fontSize: '20px', fontWeight: '600' }}>
              Seed Test Data
            </h3>
            <p style={{ color: '#666', marginBottom: '24px' }}>
              This will create test data for your hotel dashboard including rooms, menu items,
              tables, orders, bookings, and transactions. Existing data will be preserved.
            </p>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowConfirm(false)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#e5e7eb',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleSeed(false)}
                disabled={loading}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#6366f1',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  opacity: loading ? 0.6 : 1,
                }}
              >
                {loading ? 'Seeding...' : 'Seed Data'}
              </button>
              <button
                onClick={() => handleSeed(true)}
                disabled={loading}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  opacity: loading ? 0.6 : 1,
                }}
              >
                {loading ? 'Clearing...' : 'Clear & Seed'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SeedDataButton;
