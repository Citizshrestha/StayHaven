import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Users, ShieldCheck, Check, ChevronDown, Lock } from 'lucide-react';
import BookingPaymentModal from '../../components/BookingPaymentModal';
import { toast } from 'react-toastify';

const BookingSidebar = ({ pricePerNight, nights, taxesAndFees, guests, freeCancellationDate, hotelName, hotelAddress, hotelImage, hotelId, roomId }) => {
  const navigate = useNavigate();
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [selectedGuests, setSelectedGuests] = useState(guests);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [guestInfo, setGuestInfo] = useState({
    name: '',
    email: '',
    phone: '',
  });
  const [showGuestForm, setShowGuestForm] = useState(false);

  const subtotal = pricePerNight * nights;
  const total = subtotal + taxesAndFees;

  // Handle booking button click - show guest form first
  const handleBookNowClick = () => {
    // Validate dates
    if (!checkIn || !checkOut) {
      toast.error('Please select check-in and check-out dates');
      return;
    }

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (checkInDate < today) {
      toast.error('Check-in date cannot be in the past');
      return;
    }

    if (checkOutDate <= checkInDate) {
      toast.error('Check-out date must be after check-in date');
      return;
    }

    setShowGuestForm(true);
  };

  // Handle guest form submission - show payment modal
  const handleGuestFormSubmit = (e) => {
    e.preventDefault();

    // Validate guest info
    if (!guestInfo.name || guestInfo.name.trim().length < 2) {
      toast.error('Please enter your full name');
      return;
    }

    if (!guestInfo.phone || guestInfo.phone.replace(/\D/g, '').length < 10) {
      toast.error('Please enter a valid phone number');
      return;
    }

    if (guestInfo.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestInfo.email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setShowGuestForm(false);
    setShowPaymentModal(true);
  };

  // Handle payment success
  const handlePaymentSuccess = async (paymentData) => {
    try {
      // Navigate to confirmation page with booking details
      navigate('/booking-confirmed', {
        state: {
          bookingReference: paymentData.booking?.bookingId || paymentData.booking?.confirmationCode,
          hotelName,
          hotelAddress,
          hotelImage,
          checkIn: new Date(checkIn).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }),
          checkOut: new Date(checkOut).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }),
          guests: selectedGuests,
          roomType: paymentData.booking?.roomType || 'Room',
          totalPaid: total,
          paymentMethod: paymentData.transaction?.method || 'Card',
        },
      });
    } catch (error) {
      console.error('Navigation error:', error);
      toast.error('Booking confirmed but navigation failed. Please check your bookings.');
    }
  };

  // Handle payment error
  const handlePaymentError = (error) => {
    console.error('Payment error:', error);
    toast.error(error.message || 'Payment failed. Please try again.');
  };

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
          onClick={handleBookNowClick}
          className="w-full text-white font-bold text-[1.1rem] py-4 rounded-[14px] shadow-lg shadow-[#00BFA6]/30 hover:-translate-y-1 hover:shadow-[#00BFA6]/40 transition-all duration-300"
          style={{
            background: 'linear-gradient(135deg, #00BFA6, #00E5CC)',
            boxShadow: '0 8px 24px rgba(0,191,166,0.35)',
          }}
        >
          Book Now →
        </button>

        {/* Guest Information Form Modal */}
        {showGuestForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-slideUp">
              <h3 className="text-2xl font-bold text-[#263238] mb-4">Guest Information</h3>
              <p className="text-sm text-[#546E7A] mb-6">Please provide your details to continue with the booking</p>

              <form onSubmit={handleGuestFormSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-[#263238] mb-2">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={guestInfo.name}
                    onChange={(e) => setGuestInfo({ ...guestInfo, name: e.target.value })}
                    placeholder="John Doe"
                    className="w-full px-4 py-3 border-2 border-[rgba(0,191,166,0.3)] rounded-xl focus:border-[#00BFA6] focus:ring-2 focus:ring-[#00BFA6]/20 outline-none transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#263238] mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={guestInfo.email}
                    onChange={(e) => setGuestInfo({ ...guestInfo, email: e.target.value })}
                    placeholder="john@example.com"
                    className="w-full px-4 py-3 border-2 border-[rgba(0,191,166,0.3)] rounded-xl focus:border-[#00BFA6] focus:ring-2 focus:ring-[#00BFA6]/20 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#263238] mb-2">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={guestInfo.phone}
                    onChange={(e) => setGuestInfo({ ...guestInfo, phone: e.target.value })}
                    placeholder="+977 9800000000"
                    className="w-full px-4 py-3 border-2 border-[rgba(0,191,166,0.3)] rounded-xl focus:border-[#00BFA6] focus:ring-2 focus:ring-[#00BFA6]/20 outline-none transition-all"
                    required
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowGuestForm(false)}
                    className="flex-1 px-6 py-3 border-2 border-[#00BFA6] text-[#00BFA6] font-semibold rounded-xl hover:bg-[#00BFA6]/10 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-[#00BFA6] to-[#00E5CC] text-white font-semibold rounded-xl hover:shadow-lg transition-all"
                  >
                    Continue to Payment
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Payment Modal */}
        <BookingPaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          bookingData={{
            hotelId,
            roomId,
            checkIn,
            checkOut,
            guests: {
              adults: parseInt(selectedGuests.split(' ')[0]) || 2,
              children: 0,
            },
            guestName: guestInfo.name,
            guestEmail: guestInfo.email,
            guestPhone: guestInfo.phone,
            totalAmount: total,
            hotelName,
          }}
          onPaymentSuccess={handlePaymentSuccess}
          onPaymentError={handlePaymentError}
        />

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