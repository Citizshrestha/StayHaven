/**
 * Guest Dashboard - Dashboard View
 * Welcome header, quick stats, and action buttons
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDashboardOverview } from "../guestDashboardApi";
import { useSocket } from '../../../core/context/SocketContext';
import { toast } from 'react-toastify';
import {
  CalendarDays,
  UtensilsCrossed,
  FileText,
  Bell,
  Coffee,
  BedDouble,
  Clock,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { motion } from 'framer-motion';

const DashboardView = () => {
  const navigate = useNavigate();
  const { subscribe, isConnected } = useSocket();
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  // Real-time socket event subscriptions
  const handleOrderPlaced = useCallback((data) => {
    toast.success(`Order #${data.orderNumber} placed! Estimated: ${data.estimatedDelivery} mins`);
    loadDashboard();
  }, []);

  const handleOrderStatusUpdate = useCallback((data) => {
    toast.info(`Order #${data.orderNumber} is now ${data.status}`);
    loadDashboard();
  }, []);

  const handlePaymentConfirmed = useCallback((data) => {
    toast.success(`Payment confirmed! Transaction: ${data.transactionId}`);
    loadDashboard();
  }, []);

  useEffect(() => {
    if (!subscribe || !isConnected) return;

    const unsub1 = subscribe('order-placed', handleOrderPlaced);
    const unsub2 = subscribe('order-status-update', handleOrderStatusUpdate);
    const unsub3 = subscribe('payment-confirmed', handlePaymentConfirmed);

    return () => {
      unsub1();
      unsub2();
      unsub3();
    };
  }, [subscribe, isConnected, handleOrderPlaced, handleOrderStatusUpdate, handlePaymentConfirmed]);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const res = await getDashboardOverview();
      if (res?.success) {
        setDashboard(res.data);
      }
    } catch (error) {
      console.error('Dashboard load error:', error);
      toast.error(error.response?.data?.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
      </div>
    );
  }

  const { activeBooking, pendingOrdersCount, openRequestsCount, recentOrders, upcomingBookings } = dashboard || {};

  const quickActions = [
    {
      label: 'Room Service',
      icon: UtensilsCrossed,
      action: () => navigate('/guest-dashboard/room-service'),
      color: 'from-orange-500 to-red-500',
    },
    {
      label: 'View Menu',
      icon: Coffee,
      action: () => navigate('/guest-dashboard/room-service'),
      color: 'from-amber-500 to-orange-500',
    },
    {
      label: 'Billing',
      icon: FileText,
      action: () => navigate('/guest-dashboard/billing'),
      color: 'from-green-500 to-emerald-500',
    },
    {
      label: 'My Bookings',
      icon: CalendarDays,
      action: () => navigate('/guest-dashboard/bookings'),
      color: 'from-blue-500 to-indigo-500',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 pb-12">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-lg border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between"
          >
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Welcome, {activeBooking?.hotel?.name || 'Guest'}
              </h1>
              <p className="text-gray-600 mt-1">
                {activeBooking
                  ? `Enjoy your stay! Room ${activeBooking.room?.roomNumber || 'N/A'}`
                  : 'No active booking found'}
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <Bell className="w-6 h-6 text-indigo-600" />
              {openRequestsCount > 0 && (
                <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1">
                  {openRequestsCount}
                </span>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Active Booking Card */}
        {activeBooking && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-indigo-100"
          >
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-gray-500 mb-1">Check-in</p>
                <p className="font-semibold text-gray-900">
                  {new Date(activeBooking.checkIn).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Check-out</p>
                <p className="font-semibold text-gray-900">
                  {new Date(activeBooking.checkOut).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Nights Left</p>
                <p className="font-semibold text-gray-900">{activeBooking.nightsLeft}</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          <StatCard
            icon={UtensilsCrossed}
            label="Pending Orders"
            value={pendingOrdersCount || 0}
            color="text-orange-600"
          />
          <StatCard
            icon={BedDouble}
            label="Upcoming Trips"
            value={upcomingBookings?.length || 0}
            color="text-blue-600"
          />
          <StatCard
            icon={Clock}
            label="Total Stays"
            value={dashboard?.totalStays || 0}
            color="text-purple-600"
          />
        </div>

        {/* Quick Actions */}
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {quickActions.map((action, idx) => (
            <button
              key={idx}
              onClick={action.action}
              className="group bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 p-6 border border-gray-100"
            >
              <action.icon
                className={`w-8 h-8 mb-3 bg-gradient-to-br ${action.color} text-transparent group-hover:scale-110 transition-transform mx-auto`}
                style={{ WebkitBackgroundClip: 'text', backgroundClip: 'text' }}
              />
              <p className="font-medium text-gray-700">{action.label}</p>
            </button>
          ))}
        </div>

        {/* Recent Orders */}
        {recentOrders?.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Recent Orders</h2>
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <OrderCard key={order._id} order={order} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────

const StatCard = ({ icon: Icon, label, value, color }) => (
  <div className="bg-white rounded-xl shadow-md p-5 border border-gray-100">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      </div>
      <Icon className={`w-8 h-8 ${color}`} />
    </div>
  </div>
);

const OrderCard = ({ order }) => {
  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-700',
    confirmed: 'bg-blue-100 text-blue-700',
    preparing: 'bg-orange-100 text-orange-700',
    ready: 'bg-green-100 text-green-700',
    delivered: 'bg-gray-100 text-gray-700',
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100 flex items-center justify-between">
      <div>
        <p className="font-medium text-gray-900">Order #{order.orderNumber}</p>
        <p className="text-sm text-gray-500">
          {order.orderType === 'roomService' ? 'Room Service' : order.orderType} • ${order.totalPrice}
        </p>
      </div>
      <span
        className={`px-3 py-1 rounded-full text-sm font-medium ${
          statusColors[order.status] || 'bg-gray-100 text-gray-700'
        }`}
      >
        {order.status}
      </span>
    </div>
  );
};

export default DashboardView;
