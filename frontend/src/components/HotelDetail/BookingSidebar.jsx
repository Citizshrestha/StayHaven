import { useState } from 'react';

const BookingSidebar = ({ pricePerNight, nights, taxesAndFees, guests }) => {
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [selectedGuests, setSelectedGuests] = useState(guests);

  const subtotal = pricePerNight * nights;
  const total = subtotal + taxesAndFees;

  return (
    <div
      style={{ 
        position: 'sticky', 
        top: '96px',
        marginTop: "1.5rem",
        width: '100%',
        maxWidth: '500px'

      }}
    >
      <div
        style={{
          width: '100%',
          borderRadius: '24px',
          padding: '1.5rem',
          background: '#ffffff',
          border: '1px solid #f3f4f6',
          boxShadow: '0 20px 40px rgba(0,0,0,0.08)',
        }}
      >
        {/* Price */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
            <span style={{ fontSize: '2rem', fontWeight: '700', color: '#111827', lineHeight: '1' }}>
              NPR {pricePerNight}
            </span>
            <span style={{ fontSize: '1rem', fontWeight: '400', color: '#6b7280' }}>/ night</span>
          </div>
        </div>

        {/* Divider */}
        <div style={{ borderTop: '1px solid #e5e7eb', marginBottom: '1rem' }} />

        {/* Check-in and Check-out */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
          <div>
            <label style={{ 
              display: 'block', 
              fontSize: '14px', 
              fontWeight: '500', 
              color: '#111827',
              marginBottom: '8px' 
            }}>
              Check-in
            </label>
            <input
              type="date"
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
              placeholder="mm/dd/yyyy"
              style={{
                width: '100%',
                height: '48px',
                padding: '12px 16px',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                fontSize: '15px',
                color: '#111827',
                outline: 'none',
                background: '#ffffff',
              }}
            />
          </div>
          <div>
            <label style={{ 
              display: 'block', 
              fontSize: '14px', 
              fontWeight: '500', 
              color: '#111827',
              marginBottom: '8px' 
            }}>
              Check-out
            </label>
            <input
              type="date"
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
              placeholder="mm/dd/yyyy"
              style={{
                width: '100%',
                height: '48px',
                padding: '12px 16px',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                fontSize: '15px',
                color: '#111827',
                outline: 'none',
                background: '#ffffff',
              }}
            />
          </div>
        </div>
        
        {/* Guests */}
        <div style={{ marginBottom: '28px' }}>
          <label style={{ 
            display: 'block', 
            fontSize: '14px', 
            fontWeight: '500', 
            color: '#111827',
            marginBottom: '8px' 
          }}>
            Guests
          </label>
          <select
            value={selectedGuests}
            onChange={(e) => setSelectedGuests(e.target.value)}
            style={{
              width: '100%',
              height: '48px',
              padding: '12px 16px',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              fontSize: '15px',
              color: '#111827',
              background: '#ffffff',
              cursor: 'pointer',
              outline: 'none',
              appearance: 'none',
            }}
          >
            <option>1 Adult</option>
            <option>2 Adults</option>
            <option>2 Adults, 1 Child</option>
            <option>2 Adults, 2 Children</option>
            <option>3 Adults</option>
          </select>
        </div>
        
        {/* Price Breakdown */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '15px', color: '#6b7280' }}>
              NPR {pricePerNight} × {nights} nights
            </span>
            <span style={{ fontSize: '15px', fontWeight: '600', color: '#111827' }}>
              NPR {subtotal}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
            <span style={{ fontSize: '15px', color: '#6b7280' }}>Taxes & fees</span>
            <span style={{ fontSize: '15px', fontWeight: '600', color: '#111827' }}>
              NPR {taxesAndFees}
            </span>
          </div>
        </div>

        {/* Divider */}
        <div style={{ borderTop: '1px solid #e5e7eb', marginBottom: '20px' }} />

        {/* Total */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '1.5rem', fontWeight: '700', color: '#111827' }}>Total</span>
            <span style={{ fontSize: '1.5rem', fontWeight: '700', color: '#111827' }}>
              NPR {total}
            </span>
          </div>
        </div>
        
        {/* Book Now Button */}
        <button
          style={{
            width: '85%',
            height: '48px',
            borderRadius: '14px',
            padding: '0',
            border: 'none',
            color: '#ffffff',
            fontSize: '16px',
            fontWeight: '700',
            background: 'linear-gradient(90deg, #14b8a6 0%, #3b82f6 100%)',
            boxShadow: '0 4px 14px rgba(20, 184, 166, 0.4)',
            cursor: 'pointer',
            transition: 'all 0.2s',
            marginLeft: "2.5rem"
          }}
        >
          Book Now
        </button>
      </div>
    </div>
  );
};

export default BookingSidebar;