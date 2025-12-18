import { useState } from 'react';
import { formatPriceToNPR } from './utils';

const BookingSidebar = ({ pricePerNight, nights, taxesAndFees, guests }) => {
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [selectedGuests, setSelectedGuests] = useState(guests);

  const subtotal = pricePerNight * nights;
  const total = subtotal + taxesAndFees;

  return (
    <div
      className="lg:sticky lg:top-24"
      style={{ position: 'sticky', top: 96 }}
    >
      <div
        className="rounded-xl shadow-xl p-6 bg-white border border-gray-200"
        style={{
          width: 420,
          maxWidth: '100%',
          borderRadius: 16,
          padding: 24,
          background: 'rgba(255,255,255,0.6)',
          border: '1px solid rgba(255,255,255,0.2)',
          boxShadow: '0 10px 25px rgba(0,0,0,0.08)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
        }}
      >
        <div
          className="flex items-end gap-2 mb-6"
          style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginBottom: 24 }}
        >
          <span className="text-3xl font-bold text-gray-900" style={{ fontSize: 24, fontWeight: 700, color: '#111827' }}>
            {formatPriceToNPR(pricePerNight)}
          </span>
          <span className="text-base text-gray-500" style={{ fontSize: 16, color: '#6b7280' }}>/ night</span>
        </div>

        <div style={{ borderTop: '1px solid #d1d5db', margin: '16px 0' }} />

        {/* Check-in and Check-out */}
        <div
          className="grid grid-cols-2 gap-3 mb-4"
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}
        >
          <div>
            <label className="block text-gray-700 text-sm font-semibold mb-2" style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
              Check-in
            </label>
            <input
              type="date"
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-teal-500 focus:outline-none text-sm"
              style={{
                width: '100%',
                height: 44,
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: 10,
                fontSize: 14,
                outline: 'none',
                background: 'rgba(255,255,255,0.5)',
              }}
              placeholder="mm/dd/yyyy"
            />
          </div>
          <div>
            <label className="block text-gray-700 text-sm font-semibold mb-2" style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
              Check-out
            </label>
            <input
              type="date"
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-teal-500 focus:outline-none text-sm"
              style={{
                width: '100%',
                height: 44,
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: 10,
                fontSize: 14,
                outline: 'none',
                background: 'rgba(255,255,255,0.5)',
              }}
              placeholder="mm/dd/yyyy"
            />
          </div>
        </div>
        
        {/* Guests */}
        <div className="mb-6" style={{ marginBottom: 24 }}>
          <label className="block text-gray-700 text-sm font-semibold mb-2" style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
            Guests
          </label>
          <select
            value={selectedGuests}
            onChange={(e) => setSelectedGuests(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-teal-500 focus:outline-none text-sm appearance-none bg-white cursor-pointer"
            style={{
              width: '100%',
              height: 44,
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: 10,
              fontSize: 14,
              background: 'rgba(255,255,255,0.5)',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option>1 Adult</option>
            <option>2 Adults</option>
            <option>2 Adults, 1 Child</option>
            <option>2 Adults, 2 Children</option>
            <option>3 Adults</option>
            <option>4 Adults</option>
          </select>
        </div>
        
        {/* Price Breakdown */}
        <div className="border-t border-gray-200 pt-4 mb-4" style={{ borderTop: '1px solid #e5e7eb', paddingTop: 16, marginBottom: 16 }}>
          <div className="space-y-3 text-sm" style={{ display: 'grid', rowGap: 12, fontSize: 14 }}>
            <div className="flex justify-between" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="text-gray-600" style={{ color: '#4b5563' }}>
                {formatPriceToNPR(pricePerNight)} × {nights} nights
              </span>
              <span className="font-semibold text-gray-900" style={{ fontWeight: 600, color: '#111827' }}>
                {formatPriceToNPR(subtotal)}
              </span>
            </div>
            <div className="flex justify-between" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="text-gray-600" style={{ color: '#4b5563' }}>Taxes & fees</span>
              <span className="font-semibold text-gray-900" style={{ fontWeight: 600, color: '#111827' }}>
                {formatPriceToNPR(taxesAndFees)}
              </span>
            </div>
          </div>
        </div>

        {/* Total */}
        <div className="border-t border-gray-200 pt-4 mb-6" style={{ borderTop: '1px solid #e5e7eb', paddingTop: 16, marginBottom: 24 }}>
          <div className="flex justify-between items-center" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="font-bold text-lg text-gray-900" style={{ fontWeight: 700, fontSize: 18, color: '#111827' }}>Total</span>
            <span className="font-bold text-2xl text-gray-900" style={{ fontWeight: 700, fontSize: 24, color: '#111827' }}>
              {formatPriceToNPR(total)}
            </span>
          </div>
        </div>
        
        {/* Book Now Button */}
        <button
          className="w-full flex items-center justify-center rounded-lg h-12 px-6 text-white text-base font-bold bg-linear-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          style={{
            width: '100%',
            height: 52,
            borderRadius: 12,
            padding: '0 24px',
            color: '#ffffff',
            fontSize: 16,
            fontWeight: 700,
            background: 'linear-gradient(90deg, #00A99D 0%, #3b82f6 100%)',
            boxShadow: '0 10px 20px rgba(20,184,166,0.25)',
          }}
        >
          Book Now
        </button>
        
        <p className="text-xs text-gray-500 text-center mt-4" style={{ fontSize: 12, color: '#6b7280', textAlign: 'center', marginTop: 16 }}>
          Free cancellation for 48 hours
        </p>
      </div>
    </div>
  );
};

export default BookingSidebar;