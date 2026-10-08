import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Users, ShieldCheck, Lock, Minus, Plus, Receipt } from 'lucide-react';
import { toast } from 'react-toastify';
import PropTypes from 'prop-types';
import BookingPaymentModal from '../../components/BookingPaymentModal';
import Sheet from '../../lib/Sheet';
import { cancellationNote, formatRs, nightsBetween, quoteStay, toLocalISODate, TAX_RATE } from '../../lib/money';

const MAX_STAY_NIGHTS = 365;
const dateInputClass = 'w-full min-h-[44px] text-base font-semibold text-[#263238] outline-none bg-transparent cursor-pointer';

const Stepper = ({ label, hint, value, min, max, onChange }) => (
  <div className="flex items-center justify-between gap-3">
    <div className="min-w-0">
      <p className="text-sm font-semibold text-[#263238]">{label}</p>
      {hint && <p className="text-xs text-[#546E7A]">{hint}</p>}
    </div>
    <div className="flex items-center gap-1" role="group" aria-label={`${label} count`}>
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label={`Fewer ${label.toLowerCase()}`}
        className="h-11 w-11 inline-flex items-center justify-center rounded-full border border-[rgba(0,191,166,0.4)] text-[#00A896] disabled:opacity-40"
      >
        <Minus className="w-4 h-4" />
      </button>
      <span className="w-8 text-center text-base font-bold tabular-nums text-[#263238]" aria-live="polite">{value}</span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label={`More ${label.toLowerCase()}`}
        className="h-11 w-11 inline-flex items-center justify-center rounded-full border border-[rgba(0,191,166,0.4)] text-[#00A896] disabled:opacity-40"
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  </div>
);

Stepper.propTypes = {
  label: PropTypes.string.isRequired,
  hint: PropTypes.string,
  value: PropTypes.number.isRequired,
  min: PropTypes.number.isRequired,
  max: PropTypes.number.isRequired,
  onChange: PropTypes.func.isRequired,
};

/** A booking the guest started before being sent to sign in; restored once, for this hotel only. */
const takePendingBooking = (hotelId) => {
  try {
    const raw = sessionStorage.getItem('pendingBooking');
    if (!raw) return null;
    const pending = JSON.parse(raw);
    if (!pending || String(pending.hotelId) !== String(hotelId)) return null;
    return pending; // removed in an effect, so a StrictMode double-init cannot lose it
  } catch {
    return null;
  }
};

const clearPendingBooking = () => {
  try {
    sessionStorage.removeItem('pendingBooking');
  } catch {
    return null;
  }
};

const BookingSidebar = ({
  pricePerNight, hotelName, hotelAddress, hotelImage, hotelId, roomId, roomName,
  maxGuests = 2, soldOut = false, onDatesChange,
}) => {
  const navigate = useNavigate();
  const [pending] = useState(() => takePendingBooking(hotelId));
  useEffect(() => { if (pending) clearPendingBooking(); }, [pending]);
  const today = toLocalISODate();
  const [checkIn, setCheckIn] = useState(pending?.checkIn && pending.checkIn >= today ? pending.checkIn : '');
  const [checkOut, setCheckOut] = useState(pending?.checkIn && pending.checkIn >= today ? pending.checkOut || '' : '');
  const [adults, setAdults] = useState(Number.isInteger(pending?.guests?.adults) ? pending.guests.adults : 2);
  const [children, setChildren] = useState(Number.isInteger(pending?.guests?.children) ? pending.guests.children : 0);
  const [showGuestForm, setShowGuestForm] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [guestInfo, setGuestInfo] = useState({ name: '', email: '', phone: '' });

  const capacity = Math.max(1, Number(maxGuests) || 2);
  // Keep the party inside the room's capacity when the guest switches rooms.
  useEffect(() => {
    if (adults + children > capacity) {
      const nextAdults = Math.min(adults, capacity);
      setAdults(nextAdults);
      setChildren(Math.max(0, Math.min(children, capacity - nextAdults)));
    }
  }, [capacity, adults, children]);

  const nights = nightsBetween(checkIn, checkOut);
  const datesValid = nights > 0 && nights <= MAX_STAY_NIGHTS;
  const quote = useMemo(() => quoteStay(pricePerNight, datesValid ? nights : 0), [pricePerNight, nights, datesValid]);

  useEffect(() => {
    onDatesChange?.(datesValid ? { checkIn, checkOut } : null);
  }, [datesValid, checkIn, checkOut, onDatesChange]);

  const handleBookNowClick = () => {
    if (!checkIn || !checkOut) {
      toast.error('Please select check-in and check-out dates');
      return;
    }
    if (checkIn < today) {
      toast.error('Check-in date cannot be in the past');
      return;
    }
    if (nights <= 0) {
      toast.error('Check-out date must be after check-in date');
      return;
    }
    if (nights > MAX_STAY_NIGHTS) {
      toast.error(`Stays are limited to ${MAX_STAY_NIGHTS} nights`);
      return;
    }
    if (soldOut) {
      toast.error('This room is not available for those dates. Try other dates or another room.');
      return;
    }

    if (!localStorage.getItem('accessToken')) {
      // Keep what was chosen and bring the guest back to this hotel after signing in.
      sessionStorage.setItem('pendingBooking', JSON.stringify({
        hotelId, roomId, checkIn, checkOut, guests: { adults, children },
        hotelName, hotelAddress, hotelImage, totalAmount: quote.total,
        returnUrl: window.location.pathname,
      }));
      toast.info('Please sign in to continue with your booking', { position: 'top-center', autoClose: 2000 });
      navigate('/login', { state: { from: window.location.pathname, message: 'Please login to complete your booking' } });
      return;
    }
    setShowGuestForm(true);
  };

  const handleGuestFormSubmit = (e) => {
    e.preventDefault();
    const name = guestInfo.name.trim();
    if (name.length < 2) {
      toast.error('Please enter your full name');
      return;
    }
    if (guestInfo.phone.replace(/\D/g, '').length < 10) {
      toast.error('Please enter a valid phone number (at least 10 digits)');
      return;
    }
    if (guestInfo.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestInfo.email)) {
      toast.error('Please enter a valid email address');
      return;
    }
    setShowGuestForm(false);
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = (paymentData) => {
    const booking = paymentData?.booking || paymentData || {};
    navigate('/booking-confirmed', {
      state: {
        bookingId: booking._id,
        paymentStatus: booking.paymentStatus,
        bookingReference: booking.confirmationCode || booking.bookingId,
        hotelName, hotelAddress, hotelImage,
        checkIn, checkOut, nights,
        guests: { adults, children },
        roomType: booking.roomType || roomName || 'Room',
        totalAmount: booking.totalAmount ?? quote.total,
        totalPaid: booking.paidAmount ?? (booking.paymentStatus === 'paid' ? booking.totalAmount ?? quote.total : 0),
        paymentMethod: paymentData?.transaction?.method || booking.paymentMethod || 'card',
      },
    });
  };

  const handlePaymentError = () => {
    toast.error('Payment could not be confirmed. Check your bookings before paying again.');
  };

  const guestsLabel = `${adults} adult${adults > 1 ? 's' : ''}${children ? `, ${children} child${children > 1 ? 'ren' : ''}` : ''}`;

  return (
    <>
      <div className="w-full lg:max-w-[430px] lg:sticky lg:top-[100px] z-40">
        <div className="rounded-[20px] p-5 sm:p-7 bg-white border border-[rgba(0,191,166,0.2)] shadow-[0_20px_60px_rgba(0,191,166,0.2)]">
          <div className="mb-5">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-[#263238] leading-none tabular-nums">{formatRs(pricePerNight)}</span>
              <span className="text-base font-medium text-[#546E7A]">/ night</span>
            </div>
            {roomName && <p className="text-sm text-[#546E7A] mt-1 truncate">{roomName}</p>}
            <p className="text-sm text-[#00A896] font-semibold mt-1">+ {Math.round(TAX_RATE * 100)}% taxes &amp; fees at checkout</p>
          </div>

          <hr className="border-[rgba(0,191,166,0.15)] mb-4" />

          <div className="mb-5">
            <div className="flex bg-white rounded-t-[12px] border-[1.5px] border-[rgba(0,191,166,0.3)] focus-within:border-[#00BFA6] focus-within:ring-2 focus-within:ring-[#00BFA6]/20 transition-all">
              <div className="flex-1 px-3 pt-2 pb-1 border-r border-[rgba(0,191,166,0.2)] min-w-0">
                <label htmlFor="bk-checkin" className="flex items-center gap-1.5 text-[11px] font-bold text-[#546E7A] uppercase tracking-wider">
                  <Calendar className="w-3.5 h-3.5 text-[#00BFA6]" aria-hidden="true" /> Check-in
                </label>
                <input
                  id="bk-checkin"
                  type="date"
                  value={checkIn}
                  min={today}
                  max="2099-12-31"
                  onChange={(e) => {
                    const value = e.target.value;
                    setCheckIn(value);
                    if (checkOut && value && checkOut <= value) setCheckOut('');
                  }}
                  className={dateInputClass}
                />
              </div>
              <div className="flex-1 px-3 pt-2 pb-1 min-w-0">
                <label htmlFor="bk-checkout" className="flex items-center gap-1.5 text-[11px] font-bold text-[#546E7A] uppercase tracking-wider">
                  <Calendar className="w-3.5 h-3.5 text-[#00BFA6]" aria-hidden="true" /> Check-out
                </label>
                <input
                  id="bk-checkout"
                  type="date"
                  value={checkOut}
                  min={checkIn || today}
                  max="2099-12-31"
                  onChange={(e) => setCheckOut(e.target.value)}
                  className={dateInputClass}
                />
              </div>
            </div>

            <div className="rounded-b-[12px] border-[1.5px] border-t-0 border-[rgba(0,191,166,0.3)] p-3 space-y-1">
              <p className="flex items-center gap-1.5 text-[11px] font-bold text-[#546E7A] uppercase tracking-wider">
                <Users className="w-3.5 h-3.5 text-[#00BFA6]" aria-hidden="true" /> Guests
                <span className="normal-case font-medium tracking-normal">(up to {capacity})</span>
              </p>
              <Stepper label="Adults" hint="Age 13+" value={adults} min={1} max={Math.max(1, capacity - children)} onChange={setAdults} />
              <Stepper label="Children" hint="Under 13" value={children} min={0} max={Math.max(0, capacity - adults)} onChange={setChildren} />
            </div>
          </div>

          <div className="mb-5" aria-live="polite">
            <p className="text-xs font-bold text-[#546E7A] uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Receipt className="w-3.5 h-3.5" aria-hidden="true" /> Price summary
            </p>
            {datesValid ? (
              <>
                <div className="flex justify-between gap-3 mb-2.5 text-[15px]">
                  <span className="text-[#546E7A]">{formatRs(pricePerNight)} &times; {nights} night{nights > 1 ? 's' : ''}</span>
                  <span className="font-semibold text-[#263238] tabular-nums">{formatRs(quote.subtotal)}</span>
                </div>
                <div className="flex justify-between gap-3 mb-4 text-[15px]">
                  <span className="text-[#546E7A]">Taxes &amp; fees ({Math.round(TAX_RATE * 100)}%)</span>
                  <span className="font-semibold text-[#263238] tabular-nums">{formatRs(quote.taxes)}</span>
                </div>
                <hr className="border-[rgba(0,191,166,0.15)] mb-4" />
                <div className="flex justify-between items-center gap-3">
                  <span className="text-lg font-bold text-[#263238]">Total</span>
                  <span className="text-2xl font-extrabold text-[#263238] tabular-nums">{formatRs(quote.total)}</span>
                </div>
              </>
            ) : (
              <p className="text-sm text-[#546E7A]">
                {checkIn && checkOut && nights > MAX_STAY_NIGHTS
                  ? `Stays are limited to ${MAX_STAY_NIGHTS} nights.`
                  : 'Choose your check-in and check-out dates to see the total.'}
              </p>
            )}
          </div>

          {soldOut && (
            <p role="alert" className="mb-3 rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-sm font-semibold text-red-700">
              This room is not available for those dates. Try different dates or another room.
            </p>
          )}

          <button
            type="button"
            onClick={handleBookNowClick}
            disabled={soldOut}
            className="w-full min-h-[48px] text-white font-bold text-lg py-3 rounded-[14px] shadow-lg shadow-[#00BFA6]/30 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(135deg, #00BFA6, #00E5CC)' }}
          >
            {datesValid ? `Book now \u00b7 ${formatRs(quote.total)}` : 'Check availability'}
          </button>
          <p className="mt-2 text-center text-xs text-[#546E7A]">You will confirm your details and pay on the next steps.</p>

          <div className="mt-4 space-y-2 text-center">
            <div className="flex items-center justify-center gap-2 text-[#00A896]">
              <ShieldCheck className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span className="text-[13px] font-semibold">{cancellationNote(datesValid ? checkIn : '')}</span>
            </div>
            <div className="flex items-center justify-center gap-2 text-[#00A896]">
              <Lock className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span className="text-[13px] font-semibold">Secure checkout</span>
            </div>
          </div>
        </div>
      </div>

      <Sheet
        open={showGuestForm}
        onClose={() => setShowGuestForm(false)}
        title="Guest information"
        subtitle={`${nights} night${nights > 1 ? 's' : ''} \u00b7 ${guestsLabel}`}
        maxWidth="sm:max-w-md"
        footer={(
          <div className="flex gap-3">
            <button type="button" onClick={() => setShowGuestForm(false)} className="flex-1 min-h-[48px] px-4 border-2 border-[#00BFA6] text-[#00A896] font-semibold rounded-xl hover:bg-[#00BFA6]/10">
              Cancel
            </button>
            <button type="submit" form="guest-info-form" className="flex-1 min-h-[48px] px-4 bg-gradient-to-r from-[#00BFA6] to-[#00E5CC] text-white font-semibold rounded-xl hover:shadow-lg">
              Continue to payment
            </button>
          </div>
        )}
      >
        <p className="text-sm text-[#546E7A] mb-4">Please provide your details to continue with the booking.</p>
        <form id="guest-info-form" onSubmit={handleGuestFormSubmit} className="space-y-4" noValidate>
          <div>
            <label htmlFor="gi-name" className="block text-sm font-semibold text-[#263238] mb-1.5">Full name <span className="text-red-500" aria-hidden="true">*</span></label>
            <input
              id="gi-name" type="text" autoComplete="name" required maxLength={100}
              value={guestInfo.name} onChange={(e) => setGuestInfo({ ...guestInfo, name: e.target.value })}
              placeholder="John Doe"
              className="w-full min-h-[48px] px-4 text-base border-2 border-[rgba(0,191,166,0.3)] rounded-xl focus:border-[#00BFA6] focus:ring-2 focus:ring-[#00BFA6]/20 outline-none"
            />
          </div>
          <div>
            <label htmlFor="gi-email" className="block text-sm font-semibold text-[#263238] mb-1.5">Email address</label>
            <input
              id="gi-email" type="email" inputMode="email" autoComplete="email" maxLength={100}
              value={guestInfo.email} onChange={(e) => setGuestInfo({ ...guestInfo, email: e.target.value })}
              placeholder="john@example.com"
              className="w-full min-h-[48px] px-4 text-base border-2 border-[rgba(0,191,166,0.3)] rounded-xl focus:border-[#00BFA6] focus:ring-2 focus:ring-[#00BFA6]/20 outline-none"
            />
            <p className="text-xs text-[#546E7A] mt-1">Leave empty to use your account email for the confirmation.</p>
          </div>
          <div>
            <label htmlFor="gi-phone" className="block text-sm font-semibold text-[#263238] mb-1.5">Phone number <span className="text-red-500" aria-hidden="true">*</span></label>
            <input
              id="gi-phone" type="tel" inputMode="tel" autoComplete="tel" required maxLength={20}
              value={guestInfo.phone} onChange={(e) => setGuestInfo({ ...guestInfo, phone: e.target.value })}
              placeholder="+977 9800000000"
              className="w-full min-h-[48px] px-4 text-base border-2 border-[rgba(0,191,166,0.3)] rounded-xl focus:border-[#00BFA6] focus:ring-2 focus:ring-[#00BFA6]/20 outline-none"
            />
          </div>
        </form>
      </Sheet>

      <BookingPaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        bookingData={{
          hotelId,
          roomId,
          checkIn,
          checkOut,
          nights,
          guests: { adults, children },
          guestName: guestInfo.name.trim(),
          guestEmail: guestInfo.email.trim(),
          guestPhone: guestInfo.phone.trim(),
          // Preview only: the server prices the stay from its own rates and dates and ignores this.
          totalAmount: quote.total,
          hotelName,
        }}
        onPaymentSuccess={handlePaymentSuccess}
        onPaymentError={handlePaymentError}
      />
    </>
  );
};

BookingSidebar.propTypes = {
  pricePerNight: PropTypes.number.isRequired,
  hotelName: PropTypes.string,
  hotelAddress: PropTypes.string,
  hotelImage: PropTypes.string,
  hotelId: PropTypes.string,
  roomId: PropTypes.string,
  roomName: PropTypes.string,
  maxGuests: PropTypes.number,
  soldOut: PropTypes.bool,
  onDatesChange: PropTypes.func,
};

export default BookingSidebar;
