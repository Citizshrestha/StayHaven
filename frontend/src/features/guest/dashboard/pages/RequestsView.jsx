/**
 * Guest Dashboard - Requests View
 * Submit and track service requests (housekeeping, maintenance, amenities)
 */

import React, { useEffect, useState, useCallback } from 'react';
import { getGuestRequests, submitRequest } from "../guestDashboardApi";
import { useSocket } from '../../../../core/context/SocketContext';
import { toast } from 'react-toastify';
import {
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  ClipboardList,
  Wrench,
  Sparkles,
  Coffee,
  HelpCircle,
  LogOut,
  Zap,
} from 'lucide-react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import PropTypes from 'prop-types';

const categoryIcons = {
  Maintenance: Wrench,
  Amenities: Sparkles,
  'Room Service': Coffee,
  Checkout: LogOut,
  Other: HelpCircle,
};

// Quick-request shortcuts — one tap fills the form with a common ask so
// guests don't have to type out the same handful of requests every time.
const QUICK_REQUESTS = [
  { label: 'Extra towels', category: 'Amenities', urgency: 'low', description: 'Please send extra towels to my room.' },
  { label: 'Room cleaning', category: 'Amenities', urgency: 'medium', description: 'Please clean my room when convenient.' },
  { label: 'Extra pillows', category: 'Amenities', urgency: 'low', description: 'Please send extra pillows to my room.' },
  { label: 'AC not working', category: 'Maintenance', urgency: 'urgent', description: 'The air conditioning in my room is not working.' },
  { label: 'Late checkout', category: 'Checkout', urgency: 'medium', description: 'Could I please get a late checkout?' },
];

const FILTERS = ['all', 'open', 'in-progress', 'resolved'];

const RequestsView = () => {
  const { subscribe, isConnected } = useSocket();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [requests, setRequests] = useState([]);
  const [filter, setFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);

  const [formData, setFormData] = useState({
    category: 'Amenities',
    urgency: 'medium',
    description: '',
  });

  const loadRequests = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getGuestRequests({ status: filter !== 'all' ? filter : undefined });
      const normalized = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
      setRequests(normalized);
    } catch (error) {
      console.error('Requests load error:', error);
      toast.error(error.response?.data?.message || 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const handleRequestStatusUpdate = useCallback((data) => {
    setRequests((prev) =>
      prev.map((req) => (req._id === data.requestId ? { ...req, status: data.status, resolvedAt: data.resolvedAt } : req))
    );
    if (data.status === 'resolved') {
      toast.success(`Request #${data.requestNumber || 'N/A'} has been resolved!`, { position: 'top-center' });
    } else if (data.status === 'in-progress') {
      toast.info(`Request #${data.requestNumber || 'N/A'} is being handled`, { position: 'top-center' });
    }
  }, []);

  useEffect(() => {
    if (!subscribe || !isConnected) return;
    const unsub = subscribe('request-status-update', handleRequestStatusUpdate);
    return () => unsub();
  }, [subscribe, isConnected, handleRequestStatusUpdate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const applyQuickRequest = (quick) => {
    setFormData({ category: quick.category, urgency: quick.urgency, description: quick.description });
    setShowForm(true);
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
        setFormData({ category: 'Amenities', urgency: 'medium', description: '' });
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0b1220]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-teal-500" />
          <p className="text-gray-500 dark:text-gray-400">Loading your requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 lg:pb-8 bg-gray-50 dark:bg-[#0b1220]">
      {/* Header */}
      <div className="hidden lg:block bg-white/90 dark:bg-[#0f1c2e]/90 backdrop-blur-lg border-b border-gray-100 dark:border-white/5 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-8 py-7">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Service Requests</h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Submit and track your requests</p>
            </div>
            <button
              onClick={() => setShowForm((v) => !v)}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-teal-500/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              New Request
            </button>
          </div>

          <div className="flex gap-1.5 flex-wrap p-1 bg-gray-100 dark:bg-white/5 rounded-xl w-fit">
            {FILTERS.map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold capitalize transition-all ${
                  filter === status
                    ? 'bg-white dark:bg-teal-600 text-teal-700 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                {status === 'all' ? 'All' : status.replace('-', ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 lg:pt-8 pb-8">
        {/* Mobile header */}
        <div className="lg:hidden mb-5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xl font-bold text-gray-900 dark:text-white truncate">Requests</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">Housekeeping, maintenance & more</p>
            </div>
            <button
              onClick={() => setShowForm((v) => !v)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-xl font-semibold text-sm shrink-0 shadow-md shadow-teal-600/20"
            >
              <Plus className="w-4 h-4" />
              New
            </button>
          </div>
          <div className="flex gap-2 overflow-x-auto pt-4 -mx-4 px-4 scrollbar-hide">
            {FILTERS.map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-3.5 py-2 rounded-full font-semibold capitalize transition-all whitespace-nowrap text-sm shrink-0 ${
                  filter === status
                    ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
                    : 'bg-white dark:bg-white/5 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-white/10'
                }`}
              >
                {status === 'all' ? 'All' : status.replace('-', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Quick Requests */}
        {!showForm && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-teal-500" />
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Quick Requests</p>
            </div>
            <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-4 px-4 lg:mx-0 lg:px-0 scrollbar-hide">
              {QUICK_REQUESTS.map((q) => (
                <button
                  key={q.label}
                  onClick={() => applyQuickRequest(q)}
                  className="shrink-0 px-4 py-2.5 rounded-xl bg-white dark:bg-[#0f1c2e] border border-gray-200 dark:border-white/10 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:border-teal-400 hover:text-teal-700 dark:hover:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-500/10 transition-all shadow-sm"
                >
                  {q.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* New Request Form */}
        <AnimatePresence>
          {showForm && (
            <Motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white dark:bg-[#0f1c2e] rounded-2xl shadow-sm p-6 mb-6 border border-gray-100 dark:border-white/5"
            >
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Submit New Request</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Category</label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-white/10 rounded-xl bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                    required
                  >
                    <option value="Maintenance">Maintenance</option>
                    <option value="Amenities">Amenities</option>
                    <option value="Room Service">Room Service</option>
                    <option value="Checkout">Checkout</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Urgency Level</label>
                  <div className="grid grid-cols-3 gap-3">
                    {['low', 'medium', 'urgent'].map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, urgency: level }))}
                        className={`px-4 py-2 rounded-xl font-medium capitalize transition-all ${
                          formData.urgency === level
                            ? level === 'urgent'
                              ? 'bg-red-500 text-white'
                              : level === 'medium'
                              ? 'bg-amber-500 text-white'
                              : 'bg-teal-500 text-white'
                            : 'bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10'
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Please describe your request in detail..."
                    rows="4"
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-white/10 rounded-xl bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none resize-none"
                    required
                    minLength="5"
                  />
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    Minimum 5 characters ({formData.description.length}/5)
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-3 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                    className="px-6 py-3 bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </Motion.div>
          )}
        </AnimatePresence>

        {/* Requests List */}
        {requests.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-[#0f1c2e] rounded-2xl shadow-sm border border-gray-100 dark:border-white/5">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-teal-50 dark:bg-teal-500/10 flex items-center justify-center">
              <ClipboardList className="w-8 h-8 text-teal-500" />
            </div>
            <p className="text-gray-700 dark:text-gray-200 text-lg font-semibold">
              {filter === 'all' ? 'No requests yet' : `No ${filter.replace('-', ' ')} requests`}
            </p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Use Quick Requests above or submit a new one to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {requests.map((request) => (
              <RequestCard key={request._id} request={request} categoryIcon={categoryIcons[request.category] || HelpCircle} />
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

const statusMeta = {
  open: { icon: Clock, className: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300' },
  'in-progress': { icon: Loader2, className: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300', spin: true },
  resolved: { icon: CheckCircle2, className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' },
  cancelled: { icon: XCircle, className: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300' },
};

const urgencyDot = {
  urgent: 'bg-red-500',
  medium: 'bg-amber-500',
  low: 'bg-teal-500',
};

const RequestCard = ({ request, categoryIcon: CategoryIcon }) => {
  const meta = statusMeta[request.status] || statusMeta.open;
  const StatusIcon = meta.icon;

  return (
    <Motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-[#0f1c2e] rounded-2xl shadow-sm hover:shadow-lg dark:hover:shadow-black/30 transition-all overflow-hidden border border-gray-100 dark:border-white/5"
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-teal-50 dark:bg-teal-500/10 flex items-center justify-center shrink-0">
              <CategoryIcon className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-gray-900 dark:text-gray-100">{request.category}</h3>
                <span className={`w-1.5 h-1.5 rounded-full ${urgencyDot[request.urgency] || 'bg-gray-400'}`} title={`${request.urgency} urgency`} />
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Room {request.roomNumber || '—'}</p>
            </div>
          </div>
          <span className={`px-3 py-1.5 rounded-full text-xs font-bold capitalize flex items-center gap-1.5 shrink-0 ${meta.className}`}>
            <StatusIcon className={`w-3.5 h-3.5 ${meta.spin ? 'animate-spin' : ''}`} />
            {request.status.replace('-', ' ')}
          </span>
        </div>

        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{request.description}</p>

        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-white/5 flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
          <span>{new Date(request.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
          {request.resolvedAt && (
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
              Resolved {new Date(request.resolvedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </span>
          )}
        </div>
      </div>
    </Motion.div>
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
