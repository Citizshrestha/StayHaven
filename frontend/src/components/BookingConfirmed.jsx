import { useLocation, useNavigate } from 'react-router-dom';
import Navbar from './Navbar';

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
    totalPaid = 450.00
  } = bookingData;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#fff6f6' }}>
      <Navbar />
      
      <div style={{ 
        paddingTop: '120px', 
        paddingBottom: '60px',
        maxWidth: '800px',
        margin: '0 auto',
        padding: '120px 20px 60px'
      }}>
        {/* Success Icon */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: '32px'
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            backgroundColor: '#D1FAE5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <svg 
              style={{ width: '40px', height: '40px', color: '#10B981' }}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={3} 
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        </div>

        {/* Heading */}
        <h1 style={{
          fontSize: '2.5rem',
          fontWeight: '700',
          textAlign: 'center',
          color: '#111827',
          marginBottom: '12px',
          fontFamily: 'Nunito, sans-serif'
        }}>
          Booking Confirmed!
        </h1>

        {/* Subtext */}
        <p style={{
          textAlign: 'center',
          color: '#6B7280',
          fontSize: '1rem',
          marginBottom: '48px'
        }}>
          A confirmation email with all the details has been sent to your inbox.
        </p>

        {/* Booking Details Card */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          padding: '32px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
          border: '1px solid #F3F4F6'
        }}>
          {/* Booking Reference */}
          <div style={{ marginBottom: '16px' }}>
            <p style={{
              fontSize: '0.875rem',
              color: '#6B7280',
              marginBottom: '4px'
            }}>
              Booking Reference: <span style={{ color: '#111827', fontWeight: '600' }}>{bookingReference}</span>
            </p>
          </div>

          {/* Hotel Info Section */}
          <div style={{
            display: 'flex',
            gap: '24px',
            marginBottom: '32px',
            flexWrap: 'wrap'
          }}>
            <div style={{ flex: '1', minWidth: '200px' }}>
              <h2 style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                color: '#111827',
                marginBottom: '8px',
                fontFamily: 'Nunito, sans-serif'
              }}>
                {hotelName}
              </h2>
              <p style={{
                fontSize: '0.875rem',
                color: '#6B7280'
              }}>
                {hotelAddress}
              </p>
            </div>

            {/* Hotel Image */}
            <div style={{
              width: '200px',
              height: '150px',
              borderRadius: '12px',
              overflow: 'hidden',
              flexShrink: 0
            }}>
              <img 
                src={hotelImage}
                alt={hotelName}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
              />
            </div>
          </div>

          {/* Divider */}
          <div style={{
            borderTop: '1px solid #E5E7EB',
            marginBottom: '24px'
          }} />

          {/* Check-in/Check-out and Guest Info */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '24px',
            marginBottom: '24px'
          }}>
            {/* Check-in */}
            <div>
              <p style={{
                fontSize: '0.875rem',
                color: '#6B7280',
                marginBottom: '4px'
              }}>
                Check-in
              </p>
              <p style={{
                fontSize: '1rem',
                fontWeight: '600',
                color: '#111827'
              }}>
                {checkIn}
              </p>
            </div>

            {/* Check-out */}
            <div>
              <p style={{
                fontSize: '0.875rem',
                color: '#6B7280',
                marginBottom: '4px'
              }}>
                Check-out
              </p>
              <p style={{
                fontSize: '1rem',
                fontWeight: '600',
                color: '#111827'
              }}>
                {checkOut}
              </p>
            </div>

            {/* Guests */}
            <div>
              <p style={{
                fontSize: '0.875rem',
                color: '#6B7280',
                marginBottom: '4px'
              }}>
                Guests
              </p>
              <p style={{
                fontSize: '1rem',
                fontWeight: '600',
                color: '#111827'
              }}>
                {guests}
              </p>
            </div>

            {/* Room Type */}
            <div>
              <p style={{
                fontSize: '0.875rem',
                color: '#6B7280',
                marginBottom: '4px'
              }}>
                Room Type
              </p>
              <p style={{
                fontSize: '1rem',
                fontWeight: '600',
                color: '#111827'
              }}>
                {roomType}
              </p>
            </div>
          </div>

          {/* Divider */}
          <div style={{
            borderTop: '1px solid #E5E7EB',
            marginBottom: '24px'
          }} />

          {/* Total Paid */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '32px'
          }}>
            <p style={{
              fontSize: '1.125rem',
              fontWeight: '700',
              color: '#111827'
            }}>
              Total Paid
            </p>
            <p style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              color: '#111827'
            }}>
              ${totalPaid.toFixed(2)}
            </p>
          </div>

          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            gap: '16px',
            justifyContent: 'center',
            flexWrap: 'wrap'
          }}>
            <button
              onClick={() => navigate('/my-bookings')}
              style={{
                padding: '12px 32px',
                backgroundColor: '#14B8A6',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontFamily: 'Nunito, sans-serif'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#0D9488'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#14B8A6'}
            >
              View My Bookings
            </button>
            <button
              onClick={() => {
                // Handle download invoice
                console.log('Download Invoice');
              }}
              style={{
                padding: '12px 32px',
                backgroundColor: '#ffffff',
                color: '#111827',
                border: '2px solid #E5E7EB',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontFamily: 'Nunito, sans-serif'
              }}
              onMouseEnter={(e) => {
                e.target.style.borderColor = '#14B8A6';
                e.target.style.color = '#14B8A6';
              }}
              onMouseLeave={(e) => {
                e.target.style.borderColor = '#E5E7EB';
                e.target.style.color = '#111827';
              }}
            >
              Download Invoice
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingConfirmed;
