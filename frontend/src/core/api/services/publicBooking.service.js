import axiosClient from '../client';

const checkoutPrefix = 'stayhaven:payment-checkout:';
const checkoutCache = new Map();

const canonicalize = (value) => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
  }
  return value;
};

const saveCheckout = (storageKey, checkout) => {
  checkoutCache.set(storageKey, checkout);
  try {
    sessionStorage.setItem(storageKey, JSON.stringify(checkout));
  } catch {
    // Keep retries safe in this page even when browser storage is unavailable.
  }
};

// Only a payload hash, UUID and attempt ID are stored; no guest or payment details.
// Closing/reopening the modal or reloading the page must not create another charge.
export const getCheckoutIdempotencyKey = async (scope, payload) => {
  const fingerprint = JSON.stringify(canonicalize({ scope, userId: localStorage.getItem('userId'), payload }));
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(fingerprint));
  const hash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
  const storageKey = `${checkoutPrefix}${hash}`;
  let checkout = checkoutCache.get(storageKey);
  if (!checkout) {
    try {
      checkout = JSON.parse(sessionStorage.getItem(storageKey));
    } catch {
      // Storage may be blocked or contain an interrupted write.
    }
  }
  if (!checkout?.key) checkout = { key: crypto.randomUUID() };
  saveCheckout(storageKey, checkout);
  return checkout.key;
};

export const rememberPaymentAttempt = (idempotencyKey, attemptId) => {
  if (!attemptId) return;
  for (const [storageKey, checkout] of checkoutCache) {
    if (checkout.key === idempotencyKey) saveCheckout(storageKey, { ...checkout, attemptId });
  }
};

// Only a server-confirmed terminal result ends a logical wallet checkout.
export const completePaymentCheckout = (attemptId) => {
  try {
    for (let index = 0; index < sessionStorage.length; index += 1) {
      const storageKey = sessionStorage.key(index);
      if (storageKey?.startsWith(checkoutPrefix)) {
        try {
          checkoutCache.set(storageKey, JSON.parse(sessionStorage.getItem(storageKey)));
        } catch {
          // Ignore unrelated malformed records.
        }
      }
    }
  } catch {
    // The in-memory records are still usable.
  }
  for (const [storageKey, checkout] of checkoutCache) {
    if (checkout?.attemptId !== attemptId) continue;
    checkoutCache.delete(storageKey);
    try {
      sessionStorage.removeItem(storageKey);
    } catch {
      // Storage is optional.
    }
  }
};

export const getPaymentGatewayConfig = async (options = {}) => {
  const response = await axiosClient.get('/api/v1/payments/config', { timeout: 10000, ...options });
  if (!response.data?.success || !response.data.data) throw new Error('Payment options are unavailable.');
  return response.data;
};

export const getPaymentAttempt = async (attemptId, options = {}) => {
  const response = await axiosClient.get(`/api/v1/payments/${encodeURIComponent(attemptId)}`, { timeout: 10000, preservePaymentReturn: true, ...options });
  if (!response.data?.success || !response.data.data) throw new Error('Payment status is not available yet.');
  return response.data.data;
};

export const verifyPaymentAttempt = async (attemptId, options = {}) => {
  // The shared client supplies authentication, CSRF and safe interceptor retries.
  const response = await axiosClient.post(`/api/v1/payments/${encodeURIComponent(attemptId)}/verify`, {}, { timeout: 15000, preservePaymentReturn: true, ...options });
  if (!response.data?.success) throw new Error('Payment verification is not available yet.');
  return response.data;
};

export const getBookingDetails = async (bookingId, options = {}) => {
  const response = await axiosClient.get(`/api/v1/public/bookings/${encodeURIComponent(bookingId)}`, { timeout: 10000, preservePaymentReturn: true, ...options });
  if (!response.data?.success || !response.data.data) throw new Error('Booking details are not available yet.');
  return response.data.data;
};

export const redirectToWalletPayment = (result) => {
  const destination = result.redirectType === 'url' ? result.paymentUrl : result.formUrl;
  const url = new URL(destination);
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error('The payment gateway returned an invalid redirect.');
  if (result.redirectType === 'url') {
    window.location.assign(url.href);
  } else if (result.redirectType === 'form-post' && result.formData && typeof result.formData === 'object' && !Array.isArray(result.formData)) {
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = url.href;
    form.style.display = 'none';
    Object.entries(result.formData).forEach(([key, value]) => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      input.value = value;
      form.appendChild(input);
    });
    document.body.appendChild(form);
    try {
      HTMLFormElement.prototype.submit.call(form);
    } finally {
      form.remove();
    }
  } else {
    throw new Error('The payment gateway did not provide a usable redirect.');
  }
};

/**
 * Get authentication token from localStorage
 */
const getAuthToken = () => {
  const token = localStorage.getItem('accessToken');
  return token;
};

/**
 * Create a booking with payment
 * REQUIRES AUTHENTICATION - User must be logged in
 */
export const createBookingWithPayment = async (bookingData, idempotencyKey) => {
  try {
    const token = getAuthToken();

    if (!token) {
      throw new Error('Authentication required. Please login to continue.');
    }

    // Validate token format
    if (!token.includes('.') || token.split('.').length !== 3) {
      console.error('Invalid token format detected');
      localStorage.removeItem('accessToken'); // Clear invalid token
      throw new Error('Invalid authentication token. Please login again.');
    }

    // Use axiosClient which automatically handles CSRF tokens via interceptor
    const response = await axiosClient.post('/api/v1/public/bookings/create-with-payment', bookingData, {
      timeout: 30000, // 30 second timeout
      ...(idempotencyKey && { headers: { 'Idempotency-Key': idempotencyKey } }),
    });

    return response.data;
  } catch (error) {
    console.error('Booking creation error:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
    });

    // Handle authentication errors
    if (error.response?.status === 401) {
      // Clear potentially invalid token
      localStorage.removeItem('accessToken');
      localStorage.removeItem('userId');
      localStorage.removeItem('username');

      if (error.response?.data?.message?.includes('Invalid token')) {
        throw new Error('Your session has expired. Please login again to continue.');
      }
      throw new Error('Please login to create a booking');
    }

    // Handle CSRF errors (though interceptor should handle this automatically)
    if (error.response?.status === 403 && error.response?.data?.code?.includes('CSRF')) {
      throw new Error('Security validation failed. Please refresh the page and try again.');
    }

    // Handle validation errors
    if (error.response?.status === 400) {
      const message = error.response?.data?.message || 'Invalid booking details. Please check your information.';
      throw new Error(message);
    }

    // Re-throw with better error message
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    } else if (error.message) {
      throw new Error(error.message);
    } else {
      throw new Error('Failed to create booking. Please try again.');
    }
  }
};

/**
 * Verify a card payment after Stripe confirms it client-side, and finalize
 * the booking server-side (server re-checks the charge with Stripe before
 * marking anything paid — see Backend webhookController.finalizeStripeBookingPayment).
 */
export const verifyCardPayment = async (paymentIntentId) => {
  try {
    const response = await axiosClient.post('/api/v1/public/bookings/verify-card-payment', {
      paymentIntentId,
    });
    return response.data;
  } catch (error) {
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }
    throw new Error('Failed to verify payment. Please contact support if you were charged.');
  }
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = () => {
  const token = getAuthToken();
  return !!token;
};

/**
 * Format booking data for API
 */
export const formatBookingData = ({
  hotelId,
  roomId,
  checkIn,
  checkOut,
  guests,
  specialRequests,
  guestName,
  guestEmail,
  guestPhone,
  paymentMethod,
  cardDetails,
  bankTransferDetails,
}) => {
  return {
    hotelId,
    roomId,
    checkIn,
    checkOut,
    guests,
    specialRequests,
    guestName,
    guestEmail,
    guestPhone,
    paymentMethod,
    cardDetails,
    bankTransferDetails,
  };
};
