import { useState } from 'react';
import { X, CreditCard, Loader2, CheckCircle2, AlertCircle, Shield, Lock, ExternalLink } from 'lucide-react';
import { toast } from 'react-toastify';
import { createBookingWithPayment } from '../../../../api/publicBooking';
import PropTypes from 'prop-types';

const BookingPaymentModal = ({
  isOpen,
  onClose,
  bookingData,
  onPaymentSuccess,
  onPaymentError
}) => {
  const [selectedMethod, setSelectedMethod] = useState('esewa');
  const [processing, setProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [cardDetails, setCardDetails] = useState({
    number: '',
    name: '',
    expiry: '',
    cvv: ''
  });
  const [bankTransferDetails, setBankTransferDetails] = useState({
    accountName: '',
    accountNumber: '',
    bankName: '',
    transactionId: ''
  });

  if (!isOpen || !bookingData) return null;

  const amount = bookingData.totalAmount || 0;

  const paymentMethods = [
    {
      id: 'esewa',
      name: 'eSewa',
      icon: '🟢',
      description: 'Pay with eSewa wallet',
      badge: 'Popular'
    },
    {
      id: 'khalti',
      name: 'Khalti',
      icon: '🟣',
      description: 'Pay with Khalti wallet',
      badge: 'Secure'
    },
    {
      id: 'card',
      name: 'Credit/Debit Card',
      icon: '💳',
      description: 'Visa, Mastercard, etc.',
      badge: null
    },
    {
      id: 'bank',
      name: 'Bank Transfer',
      icon: '🏦',
      description: 'Direct bank transfer',
      badge: null
    }
  ];

  const formatCardNumber = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    return parts.length ? parts.join(' ') : value;
  };

  const formatExpiry = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return v.slice(0, 2) + '/' + v.slice(2, 4);
    }
    return v;
  };

  const validateCardDetails = () => {
    if (!cardDetails.number || cardDetails.number.replace(/\s/g, '').length < 13) {
      toast.error('Please enter a valid card number');
      return false;
    }
    if (!cardDetails.name || cardDetails.name.length < 3) {
      toast.error('Please enter cardholder name');
      return false;
    }
    if (!cardDetails.expiry || cardDetails.expiry.length < 5) {
      toast.error('Please enter valid expiry date (MM/YY)');
      return false;
    }
    if (!cardDetails.cvv || cardDetails.cvv.length < 3) {
      toast.error('Please enter valid CVV');
      return false;
    }
    return true;
  };

  const validateBankTransferDetails = () => {
    if (!bankTransferDetails.accountName || bankTransferDetails.accountName.length < 3) {
      toast.error('Please enter account holder name');
      return false;
    }
    if (!bankTransferDetails.accountNumber || bankTransferDetails.accountNumber.length < 5) {
      toast.error('Please enter valid account number');
      return false;
    }
    if (!bankTransferDetails.bankName || bankTransferDetails.bankName.length < 3) {
      toast.error('Please enter bank name');
      return false;
    }
    if (!bankTransferDetails.transactionId || bankTransferDetails.transactionId.length < 5) {
      toast.error('Please enter transaction/reference ID');
      return false;
    }
    return true;
  };

  const handlePayment = async () => {
    if (processing) return;

    if (selectedMethod === 'card' && !validateCardDetails()) return;
    if (selectedMethod === 'bank' && !validateBankTransferDetails()) return;

    setProcessing(true);
    setErrorMessage('');
    let isRedirecting = false;

    try {
      const payload = {
        ...bookingData,
        paymentMethod: selectedMethod,
        ...(selectedMethod === 'card' && {
          cardDetails: {
            number: cardDetails.number.replace(/\s/g, ''),
            name: cardDetails.name,
            expiry: cardDetails.expiry,
            cvv: cardDetails.cvv
          }
        }),
        ...(selectedMethod === 'bank' && { bankTransferDetails })
      };

      const result = await createBookingWithPayment(payload);

      if (result.requiresRedirect) {
        isRedirecting = true;
        setPaymentStatus('redirecting');
        toast.info(`Redirecting to ${selectedMethod === 'khalti' ? 'Khalti' : 'eSewa'}...`);

        if (result.redirectType === 'url') {
          setTimeout(() => {
            window.location.href = result.paymentUrl;
          }, 1000);
        } else if (result.redirectType === 'form-post') {
          const form = document.createElement('form');
          form.method = 'POST';
          form.action = result.formUrl;
          form.style.display = 'none';
          Object.entries(result.formData).forEach(([key, value]) => {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = key;
            input.value = value;
            form.appendChild(input);
          });
          document.body.appendChild(form);
          setTimeout(() => form.submit(), 500);
        }
        return;
      }

      if (result.requiresVerification) {
        setPaymentStatus('success');
        toast.success('Bank transfer details submitted successfully!');
        toast.info('Your payment will be verified within 24 hours', { autoClose: 5000 });
        setTimeout(() => {
          onPaymentSuccess(result.data);
          onClose();
        }, 2000);
        return;
      }

      if (result.success) {
        setPaymentStatus('success');
        toast.success('Payment successful!');
        setTimeout(() => {
          onPaymentSuccess(result.data);
          onClose();
        }, 2000);
      } else {
        throw new Error(result.message || 'Payment failed');
      }
    } catch (error) {
      console.error('Payment error:', error);
      setPaymentStatus('error');
      const errorMsg = error.response?.data?.message || error.message || 'Payment failed. Please try again.';
      setErrorMessage(errorMsg);
      toast.error(errorMsg);
      if (onPaymentError) onPaymentError(error);
    } finally {
      if (!isRedirecting) setProcessing(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
      style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-[rgba(0,191,166,0.2)] animate-slideUp">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-[rgba(0,191,166,0.2)] px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00BFA6] to-[#00E5CC] flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#263238]">Complete Payment</h2>
              <p className="text-sm text-[#546E7A]">Secure payment gateway</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={processing || paymentStatus === 'redirecting'}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5 text-[#546E7A]" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Booking Summary */}
          <div className="bg-gradient-to-br from-[#E5F5F2] to-[#B2EBF2]/30 rounded-xl p-5 border border-[rgba(0,191,166,0.2)]">
            <h3 className="font-bold text-[#263238] mb-3">{bookingData.hotelName}</h3>
            <div className="space-y-2 text-sm text-[#546E7A]">
              <div className="flex justify-between">
                <span>Check-in:</span>
                <span className="font-semibold text-[#263238]">{new Date(bookingData.checkIn).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Check-out:</span>
                <span className="font-semibold text-[#263238]">{new Date(bookingData.checkOut).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Guests:</span>
                <span className="font-semibold text-[#263238]">{bookingData.guests?.adults || 2} Adults</span>
              </div>
            </div>
            <div className="border-t border-[rgba(0,191,166,0.3)] pt-3 mt-3">
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold text-[#263238]">Total Amount</span>
                <span className="text-2xl font-bold text-[#00BFA6]">NPR {amount.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Payment Status Messages */}
          {paymentStatus === 'success' && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3 animate-slideDown">
              <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-green-900 mb-1">Payment Successful!</h3>
                <p className="text-sm text-green-700">Your payment has been processed successfully. Redirecting...</p>
              </div>
            </div>
          )}

          {paymentStatus === 'redirecting' && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3 animate-slideDown">
              <Loader2 className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5 animate-spin" />
              <div>
                <h3 className="font-semibold text-blue-900 mb-1">Redirecting to Payment Gateway...</h3>
                <p className="text-sm text-blue-700">
                  You will be redirected to {selectedMethod === 'khalti' ? 'Khalti' : 'eSewa'} to complete your payment.
                  Please do not close this window.
                </p>
              </div>
            </div>
          )}

          {paymentStatus === 'error' && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 animate-slideDown">
              <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-red-900 mb-1">Payment Failed</h3>
                <p className="text-sm text-red-700 mb-3">{errorMessage}</p>
                <button
                  onClick={() => {
                    setPaymentStatus(null);
                    setErrorMessage('');
                  }}
                  className="text-sm font-semibold text-red-600 hover:underline"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}

          {/* Payment Methods */}
          {!paymentStatus && (
            <>
              <div>
                <h3 className="text-sm font-semibold text-[#263238] mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[#00BFA6]" />
                  Select Payment Method
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {paymentMethods.map((method) => (
                    <button
                      key={method.id}
                      onClick={() => setSelectedMethod(method.id)}
                      disabled={processing}
                      className={`relative p-4 rounded-xl border-2 transition-all text-left ${
                        selectedMethod === method.id
                          ? 'border-[#00BFA6] bg-[#E5F5F2]'
                          : 'border-[rgba(0,191,166,0.2)] hover:border-[#00BFA6]/50'
                      } cursor-pointer`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">{method.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-[#263238]">{method.name}</h4>
                            {method.badge && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-[#00BFA6] text-white rounded-full font-bold uppercase">
                                {method.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[#546E7A] mt-1">{method.description}</p>
                        </div>
                      </div>
                      {selectedMethod === method.id && (
                        <div className="absolute top-3 right-3">
                          <div className="w-5 h-5 rounded-full bg-[#00BFA6] flex items-center justify-center">
                            <CheckCircle2 className="w-3 h-3 text-white" />
                          </div>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Redirect notice */}
              {(selectedMethod === 'khalti' || selectedMethod === 'esewa') && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                  <ExternalLink className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-amber-900 mb-1">Redirect Payment</h4>
                    <p className="text-xs text-amber-700">
                      You will be redirected to {selectedMethod === 'khalti' ? 'Khalti' : 'eSewa'}'s secure payment page.
                    </p>
                  </div>
                </div>
              )}

              {/* Card Details Form */}
              {selectedMethod === 'card' && (
                <div className="space-y-4 animate-slideDown">
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <div className="flex items-center gap-2 mb-4">
                      <Lock className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">Your card details are encrypted and secure</span>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-[#263238] mb-2">Card Number</label>
                        <input
                          type="text"
                          value={cardDetails.number}
                          onChange={(e) => setCardDetails({ ...cardDetails, number: formatCardNumber(e.target.value) })}
                          placeholder="4111 1111 1111 1111"
                          maxLength="19"
                          className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFA6] focus:border-transparent text-[#263238]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[#263238] mb-2">Cardholder Name</label>
                        <input
                          type="text"
                          value={cardDetails.name}
                          onChange={(e) => setCardDetails({ ...cardDetails, name: e.target.value.toUpperCase() })}
                          placeholder="JOHN DOE"
                          className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFA6] focus:border-transparent text-[#263238]"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-[#263238] mb-2">Expiry Date</label>
                          <input
                            type="text"
                            value={cardDetails.expiry}
                            onChange={(e) => setCardDetails({ ...cardDetails, expiry: formatExpiry(e.target.value) })}
                            placeholder="MM/YY"
                            maxLength="5"
                            className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFA6] focus:border-transparent text-[#263238]"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-[#263238] mb-2">CVV</label>
                          <input
                            type="password"
                            value={cardDetails.cvv}
                            onChange={(e) => setCardDetails({ ...cardDetails, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                            placeholder="123"
                            maxLength="4"
                            className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFA6] focus:border-transparent text-[#263238]"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Bank Transfer Form */}
              {selectedMethod === 'bank' && (
                <div className="space-y-4 animate-slideDown">
                  <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl p-5 border border-gray-200">
                    <div className="bg-white rounded-lg p-4 mb-4 border border-blue-200">
                      <h4 className="text-sm font-bold text-[#263238] mb-3">Transfer to:</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-[#546E7A]">Account Name:</span>
                          <span className="font-semibold text-[#263238]">StayHaven Hotels Pvt. Ltd.</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#546E7A]">Bank:</span>
                          <span className="font-semibold text-[#263238]">Nabil Bank Limited</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#546E7A]">Account Number:</span>
                          <span className="font-mono font-bold text-blue-600">0123456789012345</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#546E7A]">Amount:</span>
                          <span className="font-bold text-lg text-[#00BFA6]">NPR {amount.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-[#263238] mb-2">
                          Your Account Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={bankTransferDetails.accountName}
                          onChange={(e) => setBankTransferDetails({ ...bankTransferDetails, accountName: e.target.value })}
                          placeholder="John Doe"
                          className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFA6] focus:border-transparent text-[#263238]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[#263238] mb-2">
                          Your Account Number <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={bankTransferDetails.accountNumber}
                          onChange={(e) => setBankTransferDetails({ ...bankTransferDetails, accountNumber: e.target.value.replace(/\D/g, '') })}
                          placeholder="1234567890"
                          className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFA6] focus:border-transparent text-[#263238]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[#263238] mb-2">
                          Your Bank Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={bankTransferDetails.bankName}
                          onChange={(e) => setBankTransferDetails({ ...bankTransferDetails, bankName: e.target.value })}
                          placeholder="e.g., Nabil Bank, NIC Asia Bank"
                          className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFA6] focus:border-transparent text-[#263238]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[#263238] mb-2">
                          Transaction/Reference ID <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={bankTransferDetails.transactionId}
                          onChange={(e) => setBankTransferDetails({ ...bankTransferDetails, transactionId: e.target.value.toUpperCase() })}
                          placeholder="TXN123456789"
                          className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFA6] focus:border-transparent text-[#263238] font-mono"
                        />
                        <p className="text-xs text-[#546E7A] mt-1">Enter the transaction ID from your bank transfer receipt</p>
                      </div>
                    </div>
                    <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <p className="text-xs text-amber-800">
                        <strong>Important:</strong> Your payment will be verified manually within 24 hours.
                        You will receive a confirmation email once verified.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Security Notice */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
                <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-blue-900 mb-1">Secure Payment</h4>
                  <p className="text-xs text-blue-700">
                    Your payment information is encrypted and secure. All transactions are processed through verified payment gateways.
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!paymentStatus && (
          <div className="sticky bottom-0 bg-gray-50 border-t border-[rgba(0,191,166,0.2)] px-6 py-4 flex items-center justify-between gap-4">
            <button
              onClick={onClose}
              disabled={processing}
              className="px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handlePayment}
              disabled={processing}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-[#00BFA6] to-[#00E5CC] hover:from-[#00A896] hover:to-[#00D4BB] text-white font-semibold rounded-lg transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {processing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  {selectedMethod === 'khalti' || selectedMethod === 'esewa' ? (
                    <ExternalLink className="w-5 h-5" />
                  ) : (
                    <Lock className="w-5 h-5" />
                  )}
                  {selectedMethod === 'khalti' || selectedMethod === 'esewa'
                    ? `Pay via ${selectedMethod === 'khalti' ? 'Khalti' : 'eSewa'} — NPR ${amount.toLocaleString()}`
                    : `Pay NPR ${amount.toLocaleString()}`
                  }
                </>
              )}
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes slideDown {
          from { transform: translateY(-10px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
        .animate-slideDown {
          animation: slideDown 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

BookingPaymentModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  bookingData: PropTypes.object,
  onPaymentSuccess: PropTypes.func.isRequired,
  onPaymentError: PropTypes.func,
};

export default BookingPaymentModal;
