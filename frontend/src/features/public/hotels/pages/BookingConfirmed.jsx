import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle, Download, Calendar, Users, Home, MapPin, CreditCard, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { getApiBaseUrl } from '../../../../utils/apiConfig';

const BookingConfirmed = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const bookingData = location.state || {};
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const {
    bookingId, // MongoDB _id for API calls
    bookingReference = 'SH837190',
    hotelName = 'The Grand Coastal Hotel',
    hotelAddress = '123 Ocean Drive, Sunnyville',
    hotelImage = 'https://plus.unsplash.com/premium_photo-1687960116497-0dc41e1808a2?q=80&w=1171&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    checkIn = 'Fri, 16 Aug 2024',
    checkOut = 'Mon, 19 Aug 2024',
    guests = '2 Adults',
    roomType = 'Deluxe Queen Room',
    totalPaid = 450.00,
    paymentMethod = 'eSewa'
  } = bookingData;

  // Clean booking reference - remove query params and MongoDB ObjectId patterns
  const cleanReference = bookingReference.split('?')[0];

  // Format the reference for display
  const displayReference = cleanReference;

  const handleCopyReference = () => {
    navigator.clipboard.writeText(cleanReference);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadInvoice = async () => {
    if (!bookingId) {
      alert('Booking ID not available. Please try again later.');
      return;
    }

    setDownloading(true);
    try {
      const response = await fetch(
        `${getApiBaseUrl()}/api/public/bookings/${bookingId}/confirmation-pdf`
      );

      if (!response.ok) {
        throw new Error('Failed to download confirmation');
      }

      // Get the PDF blob
      const blob = await response.blob();

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
      alert('Failed to download confirmation. Please try again later.');
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
                <CheckCircle className="w-11 h-11 text-white" strokeWidth={2.5} />
              </div>
            </div>
          </div>

          {/* Heading */}
          <div className="text-center mb-8 animate-fade-in-up">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
              Booking Confirmed! 🎉
            </h1>
            <p className="text-gray-600 text-base sm:text-lg">
              A confirmation email has been sent to your inbox
            </p>
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
                        className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                        title="Copy reference"
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
                      Total Amount Paid
                    </p>
                    <p className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent">
                      NPR {totalPaid.toFixed(2)}
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
