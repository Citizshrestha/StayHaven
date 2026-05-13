/**
 * Guest Dashboard - Requests View
 * Submit and track service requests (housekeeping, maintenance, amenities)
 */

import React, { useEffect, useState, useCallback } from 'react';
import { getGuestRequests, submitRequest } from "../guestDashboardApi";
import { useSocket } from '../../../../core/context/SocketContext';
import { useTheme } from '../../../../core/hooks/useTheme';
import { toast } from 'react-toastify';
import {
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  Wrench,
  Sparkles,
  Coffee,
  HelpCircle,
  User,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import PropTypes from 'prop-types';

const RequestsView = () => {
  const { subscribe, isConnected } = useSocket();
  const { isDark } = useTheme();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [requests, setRequests] = useState([]);
  const [filter, setFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    category: 'Amenities',
    urgency: 'medium',
    description: '',
  });

  useEffect(() => {
    loadRequests();
  }, [filter]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const res = await getGuestRequests({ status: filter !== 'all' ? filter : undefined });
      const normalizedRequests = Array.isArray(res)
        ? res
        : Array.isArray(res?.data)
          ? res.data
          : [];
      setRequests(normalizedRequests);
    } catch (error) {
      console.error('Requests load error:', error);
      toast.error(error.response?.data?.message || 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  // Real-time request status updates
  const handleRequestStatusUpdate = useCallback((data) => {
    console.log('🔔 [Requests] Received request-status-update:', data);
    
    setRequests((prev) =>
      prev.map((req) =>
        req._id === data.requestId
          ? { ...req, status: data.status, resolvedAt: data.resolvedAt }
          : req
      )
    );

    if (data.status === 'resolved') {
      toast.success(`✅ Request #${data.requestNumber || 'N/A'} has been resolved!`, {
        position: 'top-center',
      });
    } else if (data.status === 'in-progress') {
      toast.info(`🔧 Request #${data.requestNumber || 'N/A'} is being handled`, {
        position: 'top-center',
      });
    }
  }, []);

  useEffect(() => {
    if (!subscribe || !isConnected) return;

    console.log('✅ [Requests] Subscribing to request-status-update events');
    const unsub = subscribe('request-status-update', handleRequestStatusUpdate);
    return () => {
      console.log('🔌 [Requests] Unsubscribing from request-status-update');
      unsub();
    };
  }, [subscribe, isConnected, handleRequestStatusUpdate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.description || formData.description.trim().length < 5) {
      toast.error('Please provide a detailed description (minimum 5 characters)');
      return;
    }

    try {
      setSubmitting(true);
      const response = await submitRequest(formData);

      if (response.success) {
        toast.success('Request submitted successfully!');
        setFormData({
          category: 'Amenities',
          urgency: 'medium',
          description: '',
        });
        setShowForm(false);
        loadRequests();
      }
    } catch (error) {
      console.error('Request submission error:', error);
      toast.error(error.response?.data?.message || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  const categoryIcons = {
    Maintenance: Wrench,
    Amenities: Coffee,
    'Room Service': Coffee,
    Checkout: User,
    Other: HelpCircle,
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-linear-to-br from-slate-950 to-slate-900' : 'bg-linear-to-br from-purple-50 to-pink-50'}`}>
        <Loader2 className="w-10 h-10 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className={`min-h-screen pb-24 md:pb-8 ${isDark ? 'bg-linear-to-br from-slate-950 via-slate-900 to-gray-950 text-gray-100' : 'bg-linear-to-br from-purple-50 via-pink-50 to-rose-50'}`}>
      {/* Header */}
      <div className="hidden md:block bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b border-gray-100 dark:border-slate-800 shadow-sm md:sticky md:top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Service Requests</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">Submit and track your requests</p>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 px-4 py-2 bg-linear-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
            >
              <Plus className="w-5 h-5" />
              New Request
            </button>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 overflow-x-auto">
            {['all', 'open', 'in-progress', 'resolved'].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
                  filter === status
                    ? 'bg-linear-to-r from-purple-500 to-pink-500 text-white shadow-md'
                    : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700'
                }`}
              >
                {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 md:pt-8 pb-8">
        <div className="md:hidden mb-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-base font-semibold text-gray-900 dark:text-gray-100 truncate">Requests</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">Housekeeping, maintenance, amenities</p>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 px-3 py-2 bg-linear-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all text-sm"
            >
              <Plus className="w-4 h-4" />
              New
            </button>
          </div>

          <div className="flex gap-2 overflow-x-auto pt-3 scrollbar-hide">
            {['all', 'open', 'in-progress', 'resolved'].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-3 py-2 rounded-xl font-medium transition-all whitespace-nowrap text-sm ${
                  filter === status
                    ? 'bg-linear-to-r from-purple-500 to-pink-500 text-white shadow-md'
                    : 'bg-white/90 dark:bg-slate-800 text-gray-700 dark:text-gray-300 border border-gray-100 dark:border-slate-700'
                }`}
              >
                {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* New Request Form */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white dark:bg-slate-900 rounded-xl shadow-lg p-6 mb-8 border border-purple-100 dark:border-slate-800"
            >
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Submit New Request</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Category
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    required
                  >
                    <option value="Maintenance">Maintenance</option>
                    <option value="Amenities">Amenities</option>
                    <option value="Room Service">Room Service</option>
                    <option value="Checkout">Checkout</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Urgency */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Urgency Level
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {['low', 'medium', 'urgent'].map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, urgency: level }))}
                        className={`px-4 py-2 rounded-lg font-medium transition-all ${
                          formData.urgency === level
                            ? level === 'urgent'
                              ? 'bg-red-500 text-white'
                              : level === 'medium'
                              ? 'bg-yellow-500 text-white'
                              : 'bg-green-500 text-white'
                            : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        {level.charAt(0).toUpperCase() + level.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Please describe your request in detail..."
                    rows="4"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                    required
                    minLength="5"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Minimum 5 characters ({formData.description.length}/5)
                  </p>
                </div>

                {/* Buttons */}
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-3 bg-linear-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Submitting...
                      </span>
                    ) : (
                      'Submit Request'
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-6 py-3 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-200 dark:hover:bg-slate-700 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Requests List */}
        {requests.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-xl shadow-md border border-transparent dark:border-slate-800">
            <AlertCircle className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 dark:text-gray-400 text-lg">No requests found</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">Submit a new request to get started</p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <RequestCard
                key={request._id}
                request={request}
                categoryIcon={categoryIcons[request.category] || HelpCircle}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────

const RequestCard = ({ request, categoryIcon: CategoryIcon }) => {
  const statusIcons = {
    open: <Clock className="w-5 h-5 text-yellow-600" />,
    'in-progress': <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />,
    resolved: <CheckCircle2 className="w-5 h-5 text-green-600" />,
    cancelled: <XCircle className="w-5 h-5 text-red-600" />,
  };

  const statusColors = {
    open: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    'in-progress': 'bg-blue-100 text-blue-700 border-blue-200',
    resolved: 'bg-green-100 text-green-700 border-green-200',
    cancelled: 'bg-red-100 text-red-700 border-red-200',
  };

  const urgencyColors = {
    urgent: 'bg-red-100 text-red-700',
    medium: 'bg-yellow-100 text-yellow-700',
    low: 'bg-green-100 text-green-700',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-slate-900 rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-all border border-gray-100 dark:border-slate-800"
    >
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 bg-linear-to-br from-purple-100 to-pink-100 rounded-lg flex items-center justify-center shrink-0">
              <CategoryIcon className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">{request.category}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Room {request.roomNumber}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span
              className={`px-4 py-2 rounded-full text-sm font-semibold capitalize border-2 flex items-center gap-2 ${
                statusColors[request.status] || 'bg-gray-100 text-gray-700 border-gray-200'
              }`}
            >
              {statusIcons[request.status] || <Clock className="w-5 h-5" />}
              {request.status.replace('-', ' ')}
            </span>
            <span
              className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${
                urgencyColors[request.urgency] || 'bg-gray-100 text-gray-700'
              }`}
            >
              {request.urgency}
            </span>
          </div>
        </div>

        {/* Description */}
        <p className="text-gray-700 dark:text-gray-300 mb-4">{request.description}</p>

        {/* Metadata */}
        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 pt-4 border-t border-gray-100 dark:border-slate-800">
          <span>Submitted: {new Date(request.createdAt).toLocaleString()}</span>
          {request.resolvedAt && (
            <span className="text-green-600">
              Resolved: {new Date(request.resolvedAt).toLocaleString()}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
};

RequestCard.propTypes = {
  request: PropTypes.shape({
    _id: PropTypes.string.isRequired,
    category: PropTypes.string.isRequired,
    urgency: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    status: PropTypes.string.isRequired,
    roomNumber: PropTypes.string,
    createdAt: PropTypes.string.isRequired,
    resolvedAt: PropTypes.string,
  }).isRequired,
  categoryIcon: PropTypes.elementType.isRequired,
};

export default RequestsView;
