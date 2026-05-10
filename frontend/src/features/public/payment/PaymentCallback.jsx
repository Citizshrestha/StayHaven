import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Loader2, CheckCircle, XCircle, Home, RefreshCw } from 'lucide-react';

const PaymentCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [processing, setProcessing] = useState(true);
  const [status, setStatus] = useState(null);
  const hasShownToast = useRef(false); // Prevent duplicate toasts

  useEffect(() => {
    const handleCallback = async () => {
      const statusParam = searchParams.get('status');
      const method = searchParams.get('method');
      const orderId = searchParams.get('orderId');

      console.log('Payment callback received:', { statusParam, method, orderId });

      // Wait a moment for better UX
      await new Promise(resolve => setTimeout(resolve, 1500));

      setStatus(statusParam);
      setProcessing(false);

      // Show toast only once
      if (!hasShownToast.current) {
        hasShownToast.current = true;

        if (statusParam === 'success') {
          toast.success(`Payment successful via ${method === 'esewa' ? 'eSewa' : 'Khalti'}!`, {
            position: 'top-center',
            autoClose: 3000,
          });

          // Fetch booking details to get confirmation code
          try {
            const response = await fetch(
              `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/v1/public/bookings/${orderId}`
            );
            const data = await response.json();

            if (data.success) {
              // Redirect to booking confirmation with full booking data
              setTimeout(() => {
                navigate('/booking-confirmed', {
                  state: {
                    bookingId: data.data._id, // MongoDB _id for API calls
                    bookingReference: data.data.confirmationCode,
                    hotelName: data.data.hotelName,
                    hotelAddress: data.data.hotelAddress,
                    hotelImage: data.data.hotelImage,
                    checkIn: new Date(data.data.checkIn).toLocaleDateString('en-US', {
                      weekday: 'short',
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric'
                    }),
                    checkOut: new Date(data.data.checkOut).toLocaleDateString('en-US', {
                      weekday: 'short',
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric'
                    }),
                    guests: `${data.data.guests.adults} Adult${data.data.guests.adults > 1 ? 's' : ''}${data.data.guests.children > 0 ? `, ${data.data.guests.children} Child${data.data.guests.children > 1 ? 'ren' : ''}` : ''}`,
                    roomType: data.data.roomType,
                    totalPaid: data.data.paidAmount || data.data.totalAmount,
                    paymentMethod: method === 'esewa' ? 'eSewa' : 'Khalti',
                  }
                });
              }, 2000);
            } else {
              // Fallback if API fails
              setTimeout(() => {
                navigate('/booking-confirmed', {
                  state: {
                    bookingReference: orderId,
                    paymentMethod: method === 'esewa' ? 'eSewa' : 'Khalti',
                  }
                });
              }, 2000);
            }
          } catch (error) {
            console.error('Error fetching booking details:', error);
            // Fallback if API fails
            setTimeout(() => {
              navigate('/booking-confirmed', {
                state: {
                  bookingReference: orderId,
                  paymentMethod: method === 'esewa' ? 'eSewa' : 'Khalti',
                }
              });
            }, 2000);
          }
        }
        // Don't show toast for failed - the UI is clear enough
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  const handleGoHome = () => {
    navigate('/');
  };

  const handleTryAgain = () => {
    navigate('/hotels');
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-fadeIn">
      <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 max-w-md w-full border border-white/20 animate-slideUp">
        <div className="text-center">
          {processing ? (
            <>
              <div className="flex justify-center mb-6">
                <Loader2 className="w-16 h-16 text-[#00BFA6] animate-spin" />
              </div>
              <h2 className="text-2xl font-bold text-[#263238] mb-2">
                Processing Payment...
              </h2>
              <p className="text-[#546E7A]">
                Please wait while we verify your payment
              </p>
            </>
          ) : status === 'success' ? (
            <>
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center shadow-lg animate-[bounceIn_0.6s_ease]">
                  <CheckCircle className="w-12 h-12 text-white" strokeWidth={2.5} />
                </div>
              </div>
              <h2 className="text-3xl font-bold text-green-600 mb-3">
                Payment Successful!
              </h2>
              <p className="text-[#546E7A] mb-4">
                Your booking has been confirmed.
              </p>
              <div className="flex items-center justify-center gap-2 text-sm text-[#546E7A]">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Redirecting to confirmation page...</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center shadow-lg animate-[bounceIn_0.6s_ease]">
                  <XCircle className="w-12 h-12 text-white" strokeWidth={2.5} />
                </div>
              </div>
              <h2 className="text-3xl font-bold text-red-600 mb-3">
                Payment {status === 'failed' ? 'Failed' : 'Cancelled'}
              </h2>
              <p className="text-[#546E7A] mb-6 leading-relaxed">
                {status === 'failed'
                  ? 'Your payment could not be processed. No charges were made to your account.'
                  : 'The payment was cancelled. You can try again when ready.'}
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleTryAgain}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-[#00BFA6] to-[#00E5CC] text-white font-semibold rounded-xl hover:shadow-xl hover:scale-[1.02] transition-all duration-200"
                >
                  <RefreshCw className="w-5 h-5" />
                  Try Booking Again
                </button>
                <button
                  onClick={handleGoHome}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-white border-2 border-[#00BFA6] text-[#00BFA6] font-semibold rounded-xl hover:bg-[#00BFA6]/5 hover:scale-[1.02] transition-all duration-200"
                >
                  <Home className="w-5 h-5" />
                  Go to Home
                </button>
              </div>

              {/* Help Text */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-sm text-[#546E7A]">
                  Need help? Contact us at{' '}
                  <a href="mailto:support@stayhaven.com" className="text-[#00BFA6] hover:underline font-medium">
                    support@stayhaven.com
                  </a>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentCallback;
