import apiClient from '../../../axiosClient';

/**
 * Payment Service
 * Handles all payment-related API calls with proper error handling and token management.
 */
export const createPaymentIntent = async ({ amount, currency = 'usd', bookingId, metadata = {} }) => {
  try {
    const response = await apiClient.post('/api/v1/reception/payments/intent', {
      amount,
      currency,
      bookingId,
      metadata,
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: 'Failed to create payment intent' };
  }
};

export const confirmPayment = async (paymentData) => {
  try {
    const { bookingId, amount, paymentIntentId, method = 'credit-card', last4, receiptEmail } = paymentData;
    const response = await apiClient.post('/api/v1/reception/payments/confirm', {
      bookingId,
      amount,
      paymentIntentId,
      method,
      last4,
      receiptEmail,
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: 'Payment confirmation failed' };
  }
};

export const processRefund = async ({ transactionId, amount, reason, requiresApproval = false }) => {
  try {
    const response = await apiClient.post('/api/v1/reception/payments/refund', {
      transactionId,
      amount,
      reason,
      requiresApproval,
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: 'Refund processing failed' };
  }
};

export const getPaymentSummary = async (bookingId) => {
  try {
    const response = await apiClient.get(`/api/v1/reception/payments/summary/${bookingId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: 'Failed to fetch payment summary' };
  }
};

export const getInvoices = async (params = {}) => {
  try {
    const response = await apiClient.get('/api/v1/reception/invoices', { params });
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: 'Failed to fetch invoices' };
  }
};

export const generatePaymentLink = async (bookingId, redirectUrl) => {
  try {
    const response = await apiClient.post('/api/v1/reception/payments/generate-link', {
      bookingId,
      redirectUrl,
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: 'Failed to generate payment link' };
  }
};