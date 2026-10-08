import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, Clock, Download, Calendar, Users, Home, MapPin, CreditCard, Copy, Check } from 'lucide-react';
import { useEffect, useState } from 'react';
import axiosClient from '../../../../core/api/client';
import { getBookingDetails } from '../../../../core/api/services/publicBooking.service';
import { formatRs } from '../lib/money';
import { usePageMeta } from '../lib/pageMeta';

const fmtDate = (value) => {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
};
const fmtGuests = (g) => {
  if (!g) return '';
  if (typeof g === 'string') return g;
  const parts = [`${g.adults || 1} adult${(g.adults || 1) > 1 ? 's' : ''}`];
  if (g.children) parts.push(`${g.children} child${g.children > 1 ? 'ren' : ''}`);
  return parts.join(', ');
};

const BookingConfirmed = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const stateData = location.state || {};
  const bookingId = stateData.bookingId || searchParams.get('booking') || '';
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState(false);
  const [server, setServer] = useState(null); // what the server says about this booking (source of truth)
  const [loadState, setLoadState] = useState(bookingId ? 'loading' : 'idle');

  // The page used to trust router state alone (lost on reload) and filled gaps with demo text.
  useEffect(() => {
    if (!bookingId) return undefined;
    const controller = new AbortController();
    getBookingDetails(bookingId, { signal: controller.signal })
      .then((data) => { if (!controller.signal.aborted) { setServer(data); setLoadState('ready'); } })
      .catch(() => { if (!controller.signal.aborted) setLoadState('error'); });
    return () => controller.abort();
  }, [bookingId]);

  const confirmed = server ? ['Confirmed', 'Checked-In', 'Checked-Out'].includes(server.status) && server.paymentStatus === 'paid'
    : stateData.paymentStatus === 'paid';
  const bookingReference = server?.confirmationCode || server?.bookingId || stateData.bookingReference || '';
  const hotelName = server?.hotelName || stateData.hotelName || 'Your hotel';
  const hotelAddress = server?.hotelAddress || stateData.hotelAddress || '';
  const hotelImage = server?.hotelImage || stateData.hotelImage || '';
  const checkIn = fmtDate(server?.checkIn || stateData.checkIn);
  const checkOut = fmtDate(server?.checkOut || stateData.checkOut);
  const guests = fmtGuests(server?.guests || stateData.guests);
  const roomType = server?.roomType || stateData.roomType || 'Room';
  const totalAmount = Number(server?.totalAmount ?? stateData.totalAmount ?? 0);
  const totalPaid = Number(server?.paidAmount ?? stateData.totalPaid ?? 0);
  const paymentMethod = server?.paymentMethod || stateData.paymentMethod || '';
  const cleanReference = String(bookingReference).split('?')[0];
  const displayReference = cleanReference;

  usePageMeta({ title: confirmed ? 'Booking confirmed' : 'Booking received' });

  if (!bookingId) return (
    <div className="p-8 text-center">
      <h1 className="text-xl font-semibold">Booking confirmation unavailable</h1>
      <p>Open your bookings to view the saved booking details.</p>
      <button type="button" onClick={() => navigate('/guest-dashboard/bookings')} className="mt-4 min-h-[48px] px-6 rounded-xl bg-teal-600 text-white font-semibold">View my bookings</button>
    </div>
  );

  const handleCopyReference = () => {
    navigator.clipboard?.writeText(cleanReference).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadInvoice = async () => {
    if (!bookingId) {
      return;
    }

    setDownloading(true);
    setDownloadError(false);
    try {
      const response = await axiosClient.get(
        `/api/v1/public/bookings/${encodeURIComponent(bookingId)}/confirmation-pdf`,
        { responseType: 'blob', timeout: 15000 }
      );
      const blob = response.data;

      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `booking-confirmation-${cleanReference}.pdf`;
      document.body.appendChild(link);
      link.click();

      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading confirmation:', error);
      setDownloadError(true);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="booking-confirmed-wrapper">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Base gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-teal-50/30 to-cyan-50/40" />

        {/* Animated orbs */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-br from-teal-200/20 to-cyan-200/20 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-emerald-200/20 to-teal-200/20 rounded-full blur-3xl animate-float-delayed" />

        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: `linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }} />
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">

          {/* Success Icon */}
          <div className="flex justify-center mb-6 animate-scale-in">
            <div className="relative">
              <div className="absolute inset-0 bg-teal-500 rounded-full blur-xl opacity-30 animate-pulse" />
              <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center shadow-xl ring-4 ring-white">
                {confirmed ? <CheckCircle className="w-11 h-11 text-white" strokeWidth={2.5} /> : <Clock className="w-11 h-11 text-white" strokeWidth={2.5} />}
              </div>
            </div>
          </div>

          {/* Heading */}
          <div className="text-center mb-8 animate-fade-in-up">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
              {confirmed ? 'Booking confirmed' : 'Booking received'}
            </h1>
            <p className="text-gray-600 text-base sm:text-lg">
              {confirmed ? 'A confirmation email is on its way to your inbox' : 'Your booking is not confirmed until your payment is verified. We will email you once it is.'}
            </p>
            {loadState === 'loading' && <p role="status" className="mt-2 text-sm text-gray-500">Checking the latest status…</p>}
            {loadState === 'error' && <p role="status" className="mt-2 text-sm text-amber-700">We could not load the latest status. Check My bookings for the current state.</p>}
          </div>

          {/* Main Card */}
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/60 overflow-hidden animate-fade-in-up-delayed">

            {/* Booking Reference Header */}
            <div className="bg-gradient-to-r from-teal-500 via-teal-600 to-emerald-600 px-6 py-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div>
                    <p className="text-xs text-white/70 mb-0.5 uppercase tracking-wide font-medium">
                      Booking Reference
                    </p>
                    <div className="flex items-center gap-2">
                      <p className="text-lg sm:text-xl font-bold text-white font-mono tracking-wide">
                        {displayReference}
                      </p>
                      <button
                        onClick={handleCopyReference}
                        type="button"
                        aria-label="Copy booking reference"
                        className="h-11 w-11 inline-flex items-center justify-center hover:bg-white/20 rounded-lg transition-colors"
                      >
                        {copied ? (
                          <Check className="w-4 h-4 text-white" />
                        ) : (
                          <Copy className="w-4 h-4 text-white" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full">
                  <CreditCard className="w-4 h-4 text-white" />
                  <span className="text-sm font-semibold text-white">
                    {paymentMethod}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-6 sm:p-8">

              {/* Hotel Info */}
              <div className="flex flex-col sm:flex-row gap-5 mb-6">
                <div className="w-full sm:w-48 h-36 rounded-xl overflow-hidden shadow-md flex-shrink-0 ring-1 ring-gray-200">
                  <img
                    src={hotelImage}
                    alt={hotelName}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                  />
                </div>

                <div className="flex-1 flex flex-col justify-center">
                  <div className="flex items-start gap-2 mb-2">
                    <Home className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">
                        {hotelName}
                      </h2>
                      <div className="flex items-center gap-1.5 text-gray-600">
                        <MapPin className="w-4 h-4 text-teal-500" />
                        <p className="text-sm">{hotelAddress}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent mb-6" />

              {/* Booking Details Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">

                {/* Check-in */}
                <div className="bg-gradient-to-br from-teal-50 to-cyan-50/50 rounded-xl p-4 border border-teal-100/50">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Calendar className="w-4 h-4 text-teal-600" />
                    <p className="text-[10px] sm:text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      Check-in
                    </p>
                  </div>
                  <p className="text-sm sm:text-base font-bold text-gray-900">
                    {checkIn}
                  </p>
                </div>

                {/* Check-out */}
                <div className="bg-gradient-to-br from-teal-50 to-cyan-50/50 rounded-xl p-4 border border-teal-100/50">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Calendar className="w-4 h-4 text-teal-600" />
                    <p className="text-[10px] sm:text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      Check-out
                    </p>
                  </div>
                  <p className="text-sm sm:text-base font-bold text-gray-900">
                    {checkOut}
                  </p>
                </div>

                {/* Guests */}
                <div className="bg-gradient-to-br from-teal-50 to-cyan-50/50 rounded-xl p-4 border border-teal-100/50">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Users className="w-4 h-4 text-teal-600" />
                    <p className="text-[10px] sm:text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      Guests
                    </p>
                  </div>
                  <p className="text-sm sm:text-base font-bold text-gray-900">
                    {guests}
                  </p>
                </div>

                {/* Room Type */}
                <div className="bg-gradient-to-br from-teal-50 to-cyan-50/50 rounded-xl p-4 border border-teal-100/50">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Home className="w-4 h-4 text-teal-600" />
                    <p className="text-[10px] sm:text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      Room
                    </p>
                  </div>
                  <p className="text-sm sm:text-base font-bold text-gray-900">
                    {roomType}
                  </p>
                </div>
              </div>

              {/* Total Paid */}
              <div className="bg-gradient-to-br from-teal-500/10 via-emerald-500/10 to-cyan-500/10 rounded-xl p-5 mb-6 border border-teal-200/50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm text-gray-600 mb-1 font-medium">
                      {confirmed ? 'Amount paid' : 'Amount due'}
                    </p>
                    <p className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent">
                      {formatRs(confirmed ? totalPaid : totalAmount)}
                    </p>
                  </div>
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center shadow-lg">
                    <CheckCircle className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => {
                    // Check if user is authenticated
                    const token = localStorage.getItem('accessToken');
                    if (token) {
                      navigate('/guest-dashboard/bookings');
                    } else {
                      // Redirect to guest login
                      navigate('/guest/login', { state: { from: '/guest-dashboard/bookings' } });
                    }
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-5 py-3.5 bg-gradient-to-r from-teal-600 to-emerald-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 active:scale-95"
                >
                  <Home className="w-5 h-5" />
                  <span>View My Bookings</span>
                </button>
                <button
                  onClick={handleDownloadInvoice}
                  disabled={downloading || !bookingId}
                  className="flex-1 flex items-center justify-center gap-2 px-5 py-3.5 bg-white text-teal-600 font-semibold rounded-xl border-2 border-teal-600 hover:bg-teal-50 transition-all duration-300 shadow-md hover:shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className={`w-5 h-5 ${downloading ? 'animate-bounce' : ''}`} />
                  <span>{downloading ? 'Downloading...' : 'Download Confirmation'}</span>
                </button>
              </div>
              {downloadError && <p role="alert" className="mt-3 text-sm text-red-700">The confirmation could not be downloaded. Please try again from My bookings.</p>}
            </div>
          </div>

        </div>
      </div>

      <style>{`
        @keyframes scale-in {
          0% { transform: scale(0); opacity: 0; }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); opacity: 1; }
        }

        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes float {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          33% { transform: translate(30px, -30px) rotate(5deg); }
          66% { transform: translate(-20px, 20px) rotate(-5deg); }
        }

        @keyframes float-delayed {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          33% { transform: translate(-30px, 30px) rotate(-5deg); }
          66% { transform: translate(20px, -20px) rotate(5deg); }
        }

        .animate-scale-in {
          animation: scale-in 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .animate-fade-in-up {
          animation: fade-in-up 0.7s ease-out 0.2s both;
        }

        .animate-fade-in-up-delayed {
          animation: fade-in-up 0.7s ease-out 0.4s both;
        }

        .animate-fade-in-up-more-delayed {
          animation: fade-in-up 0.7s ease-out 0.6s both;
        }

        .animate-float {
          animation: float 20s ease-in-out infinite;
        }

        .animate-float-delayed {
          animation: float-delayed 25s ease-in-out infinite;
        }

        .booking-confirmed-wrapper {
          min-height: 100vh;
          position: relative;
        }
      `}</style>
    </div>
  );
};

export default BookingConfirmed;
