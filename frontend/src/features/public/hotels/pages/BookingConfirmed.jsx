import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle, Download, Calendar, Users, Home, MapPin, CreditCard } from 'lucide-react';

const BookingConfirmed = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const bookingData = location.state || {};

  const {
    bookingReference = '#SH837190',
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

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #E5F5F2 0%, #B2EBF2 100%)' }}>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8" style={{ paddingTop: '120px', paddingBottom: '60px' }}>
        {/* Success Icon with Animation */}
        <div className="flex justify-center mb-8 animate-[bounceIn_0.6s_ease]">
          <div className="relative">
            <div className="absolute inset-0 bg-[#00BFA6] rounded-full blur-2xl opacity-30 animate-pulse"></div>
            <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-[#00BFA6] to-[#00E5CC] flex items-center justify-center shadow-2xl">
              <CheckCircle className="w-14 h-14 text-white" strokeWidth={2.5} />
            </div>
          </div>
        </div>

        {/* Heading */}
        <h1 className="text-4xl md:text-5xl font-extrabold text-center text-[#263238] mb-4 animate-[fadeInUp_0.7s_ease]">
          Booking Confirmed! 🎉
        </h1>

        {/* Subtext */}
        <p className="text-center text-[#546E7A] text-lg mb-12 animate-[fadeInUp_0.8s_ease]">
          A confirmation email with all the details has been sent to your inbox.
        </p>

        {/* Booking Details Card */}
        <div className="bg-white rounded-3xl shadow-2xl border border-[rgba(0,191,166,0.2)] overflow-hidden animate-[fadeInUp_0.9s_ease]">
          {/* Booking Reference Banner */}
          <div className="bg-gradient-to-r from-[#00BFA6] to-[#00E5CC] px-6 py-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-sm text-white/80 mb-1">Booking Reference</p>
                <p className="text-2xl font-bold text-white tracking-wide">{bookingReference}</p>
              </div>
              <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
                <CreditCard className="w-5 h-5 text-white" />
                <span className="text-sm font-semibold text-white">Paid via {paymentMethod}</span>
              </div>
            </div>
          </div>

          <div className="p-6 md:p-8">
            {/* Hotel Info Section */}
            <div className="flex flex-col md:flex-row gap-6 mb-8">
              {/* Hotel Image */}
              <div className="w-full md:w-64 h-48 rounded-2xl overflow-hidden shadow-lg flex-shrink-0">
                <img
                  src={hotelImage}
                  alt={hotelName}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                />
              </div>

              <div className="flex-1">
                <div className="flex items-start gap-3 mb-3">
                  <Home className="w-6 h-6 text-[#00BFA6] flex-shrink-0 mt-1" />
                  <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-[#263238] mb-2">
                      {hotelName}
                    </h2>
                    <div className="flex items-center gap-2 text-[#546E7A]">
                      <MapPin className="w-4 h-4 text-[#00BFA6]" />
                      <p className="text-sm">{hotelAddress}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-gradient-to-r from-transparent via-[rgba(0,191,166,0.3)] to-transparent mb-8" />

            {/* Booking Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {/* Check-in */}
              <div className="bg-gradient-to-br from-[#E5F5F2] to-[#B2EBF2]/30 rounded-xl p-5 border border-[rgba(0,191,166,0.2)]">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-5 h-5 text-[#00BFA6]" />
                  <p className="text-xs font-bold text-[#546E7A] uppercase tracking-wider">Check-in</p>
                </div>
                <p className="text-lg font-bold text-[#263238]">{checkIn}</p>
              </div>

              {/* Check-out */}
              <div className="bg-gradient-to-br from-[#E5F5F2] to-[#B2EBF2]/30 rounded-xl p-5 border border-[rgba(0,191,166,0.2)]">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-5 h-5 text-[#00BFA6]" />
                  <p className="text-xs font-bold text-[#546E7A] uppercase tracking-wider">Check-out</p>
                </div>
                <p className="text-lg font-bold text-[#263238]">{checkOut}</p>
              </div>

              {/* Guests */}
              <div className="bg-gradient-to-br from-[#E5F5F2] to-[#B2EBF2]/30 rounded-xl p-5 border border-[rgba(0,191,166,0.2)]">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-5 h-5 text-[#00BFA6]" />
                  <p className="text-xs font-bold text-[#546E7A] uppercase tracking-wider">Guests</p>
                </div>
                <p className="text-lg font-bold text-[#263238]">{guests}</p>
              </div>

              {/* Room Type */}
              <div className="bg-gradient-to-br from-[#E5F5F2] to-[#B2EBF2]/30 rounded-xl p-5 border border-[rgba(0,191,166,0.2)]">
                <div className="flex items-center gap-2 mb-2">
                  <Home className="w-5 h-5 text-[#00BFA6]" />
                  <p className="text-xs font-bold text-[#546E7A] uppercase tracking-wider">Room Type</p>
                </div>
                <p className="text-lg font-bold text-[#263238]">{roomType}</p>
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-gradient-to-r from-transparent via-[rgba(0,191,166,0.3)] to-transparent mb-8" />

            {/* Total Paid */}
            <div className="bg-gradient-to-br from-[#00BFA6]/10 to-[#00E5CC]/10 rounded-2xl p-6 mb-8 border-2 border-[#00BFA6]/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#546E7A] mb-1">Total Amount Paid</p>
                  <p className="text-4xl font-extrabold text-[#00BFA6]">
                    NPR {totalPaid.toFixed(2)}
                  </p>
                </div>
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#00BFA6] to-[#00E5CC] flex items-center justify-center shadow-lg">
                  <CheckCircle className="w-8 h-8 text-white" />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => navigate('/guest-dashboard/bookings')}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-[#00BFA6] to-[#00E5CC] text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300"
              >
                <Home className="w-5 h-5" />
                View My Bookings
              </button>
              <button
                onClick={() => {
                  console.log('Download Invoice');
                }}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-white text-[#00BFA6] font-bold text-lg rounded-xl border-2 border-[#00BFA6] hover:bg-[#00BFA6] hover:text-white transition-all duration-300 shadow-md hover:shadow-lg"
              >
                <Download className="w-5 h-5" />
                Download Invoice
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes bounceIn {
          0% { transform: scale(0); opacity: 0; }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default BookingConfirmed;
