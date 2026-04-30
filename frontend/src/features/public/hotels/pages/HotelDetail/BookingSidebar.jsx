import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Users, ShieldCheck, Check, ChevronDown, Lock } from 'lucide-react';

const BookingSidebar = ({ pricePerNight, nights, taxesAndFees, guests, freeCancellationDate, hotelName, hotelAddress, hotelImage }) => {
  const navigate = useNavigate();
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [selectedGuests, setSelectedGuests] = useState(guests);

  const subtotal = pricePerNight * nights;
  const total = subtotal + taxesAndFees;

  return (
    <div style={{ position: 'sticky', top: '100px', width: '100%', maxWidth: '430px', zIndex: 40 }}>
      <div
        className="transition-all duration-300 hover:-translate-y-[3px]"
        style={{
          borderRadius: '20px',
          padding: '28px',
          background: '#ffffff',
          border: '1px solid rgba(0,191,166,0.2)',
          boxShadow: '0 20px 60px rgba(0,191,166,0.2)',
        }}
      >
        <div style={{ marginBottom: '22px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '2rem', fontWeight: '800', color: '#263238', lineHeight: '1' }}>
              NPR {pricePerNight}
            </span>
            <span style={{ fontSize: '1rem', fontWeight: '500', color: '#546E7A' }}>/night</span>
          </div>
          <p className="text-sm text-[#00BFA6] font-semibold mt-1">Taxes included</p>
        </div>

        <hr style={{ borderTop: '1px solid rgba(0,191,166,0.15)', marginBottom: '18px' }} />

        <div style={{ marginBottom: '20px' }}>
          <div className="flex bg-white rounded-t-[12px] border-[1.5px] border-[rgba(0,191,166,0.3)] overflow-hidden focus-within:border-[#00BFA6] focus-within:ring-2 focus-within:ring-[#00BFA6]/20 transition-all duration-300">
            <div className="flex-1 p-3 border-r border-[rgba(0,191,166,0.2)]">
              <label className="flex items-center gap-1.5 text-[11px] font-bold text-[#546E7A] uppercase tracking-wider mb-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#00BFA6]" /> Check-In
              </label>
              <input
                type="date"
                value={checkIn}
                onChange={(e) => {
                  const parts = e.target.value.split('-');
                  if (parts[0] && parts[0].length > 4) parts[0] = parts[0].slice(0, 4);
                  setCheckIn(parts.join('-'));
                }}
                min={new Date().toISOString().split('T')[0]}
                max="2099-12-31"
                className="w-full text-sm font-semibold text-[#263238] outline-none bg-transparent cursor-pointer"
              />
            </div>
            <div className="flex-1 p-3">
              <label className="flex items-center gap-1.5 text-[11px] font-bold text-[#546E7A] uppercase tracking-wider mb-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#00BFA6]" /> Check-Out
              </label>
              <input
                type="date"
                value={checkOut}
                onChange={(e) => {
                  const parts = e.target.value.split('-');
                  if (parts[0] && parts[0].length > 4) parts[0] = parts[0].slice(0, 4);
                  setCheckOut(parts.join('-'));
                }}
                min={checkIn || new Date().toISOString().split('T')[0]}
                max="2099-12-31"
                className="w-full text-sm font-semibold text-[#263238] outline-none bg-transparent cursor-pointer"
              />
            </div>
          </div>

          <div className="bg-white rounded-b-[12px] border-[1.5px] border-t-0 border-[rgba(0,191,166,0.3)] overflow-hidden focus-within:border-[#00BFA6] focus-within:ring-2 focus-within:ring-[#00BFA6]/20 transition-all duration-300 p-3">
            <label className="flex items-center gap-1.5 text-[11px] font-bold text-[#546E7A] uppercase tracking-wider mb-1">
              <Users className="w-3.5 h-3.5 text-[#00BFA6]" /> Guests
            </label>
            <div className="flex items-center gap-2">
              <select
                value={selectedGuests}
                onChange={(e) => setSelectedGuests(e.target.value)}
                className="w-full text-sm font-semibold text-[#263238] outline-none bg-transparent cursor-pointer appearance-none"
              >
                <option>1 Adult</option>
                <option>2 Adults</option>
                <option>2 Adults, 1 Child</option>
                <option>3 Adults</option>
              </select>
              <ChevronDown className="w-4 h-4 text-[#00A896]" />
            </div>
          </div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <p className="text-xs font-bold text-[#546E7A] uppercase tracking-wider mb-3">Price Summary</p>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ fontSize: '14.5px', color: '#546E7A', textDecoration: 'underline', textDecorationStyle: 'dotted' }}>
              NPR {pricePerNight} × {nights} nights
            </span>
            <span style={{ fontSize: '15px', fontWeight: '600', color: '#263238' }}>
              NPR {subtotal}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
            <span style={{ fontSize: '14.5px', color: '#546E7A', textDecoration: 'underline', textDecorationStyle: 'dotted' }}>
              Taxes & fees
            </span>
            <span style={{ fontSize: '15px', fontWeight: '600', color: '#263238' }}>
              NPR {taxesAndFees}
            </span>
          </div>

          <hr style={{ borderTop: '1px solid rgba(0,191,166,0.15)', marginBottom: '16px' }} />

          {/* Total */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '1.1rem', fontWeight: '700', color: '#263238' }}>Total</span>
            <span style={{ fontSize: '1.45rem', fontWeight: '800', color: '#263238' }}>
              NPR {total}
            </span>
          </div>
        </div>

        <button
          onClick={() => {
            navigate('/booking-confirmed', {
              state: {
                bookingReference: '#SH837190',
                hotelName: hotelName || 'The Grand Coastal Hotel',
                hotelAddress: hotelAddress || '123 Ocean Drive, Sunnyville',
                hotelImage: hotelImage || 'https://via.placeholder.com/200x150',
              }
            });
          }}
          className="w-full text-white font-bold text-[1.1rem] py-4 rounded-[14px] shadow-lg shadow-[#00BFA6]/30 hover:-translate-y-1 hover:shadow-[#00BFA6]/40 transition-all duration-300"
          style={{
            background: 'linear-gradient(135deg, #00BFA6, #00E5CC)',
            boxShadow: '0 8px 24px rgba(0,191,166,0.35)',
          }}
        >
          Book Now →
        </button>

        <div className="mt-5 space-y-2 text-center">
          <div className="flex items-center justify-center gap-2 text-[#00A896]">
            <ShieldCheck className="w-4 h-4" />
            <span className="text-[13px] font-semibold">Free cancellation until {freeCancellationDate}</span>
          </div>
          <div className="flex items-center justify-center gap-2 text-[#00A896]">
            <Check className="w-4 h-4" />
            <span className="text-[13px] font-semibold">No booking fees</span>
          </div>
          <div className="flex items-center justify-center gap-2 text-[#00A896]">
            <Lock className="w-4 h-4" />
            <span className="text-[13px] font-semibold">Secure checkout</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingSidebar;