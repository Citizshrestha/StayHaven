import React, { useState, useEffect, useCallback } from 'react';
import { createLogger } from '../../../../core/utils/logger.js';
import { getOrders, updateOrderStatus, getActiveProperty } from '../../../../core/api/services/staff.service.js';

const logger = createLogger('OrderManagement');

const OrderManagement = () => {
  const [activeSection, setActiveSection] = useState('orders');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');

  const hotelId = getActiveProperty()?._id;

  const fetchOrders = useCallback(async () => {
    if (!hotelId) {
      setError('No active hotel selected');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const statuses = ['pending', 'preparing', 'ready', 'delivered'];
      const types = ['dineIn', 'roomService', 'takeaway'];

      const results = await Promise.all(
        statuses.flatMap(status =>
          types.map(type => getOrders(hotelId, status, type))
        )
      );

      const allOrders = results
        .filter(r => r.status === 'fulfilled' || r.orders)
        .flatMap(r => r.orders || [])
        .map(order => ({
          ...order,
          id: order._id,
          displayStatus: order.status === 'pending' ? 'New' : order.status,
        }));

      setOrders(allOrders);
    } catch (err) {
      logger.error('Failed to fetch orders', { error: err.message });
      setError(err.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [hotelId]);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  const handleOrderAction = async (orderId, action) => {
    try {
      setLoading(true);
      const statusMap = {
        confirm: 'preparing',
        ready: 'ready',
        deliver: 'delivered',
      };

      if (statusMap[action]) {
        await updateOrderStatus(orderId, statusMap[action]);
        await fetchOrders();
        logger.info(`Order ${orderId} ${action}ed`);
      }
    } catch (err) {
      logger.error(`Failed to ${action} order`, { orderId, error: err.message });
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter(order => {
    const statusMatch = filterStatus === 'all' || order.status === filterStatus;
    const typeMatch = filterType === 'all' || order.orderType === filterType;
    return statusMatch && typeMatch;
  });

  const orderStats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    preparing: orders.filter(o => o.status === 'preparing').length,
    ready: orders.filter(o => o.status === 'ready').length,
    delivered: orders.filter(o => o.status === 'delivered').length,
  };

  return (
    <div className="order-management">
      <div className="content-header">
        <h1>Order Management</h1>
        <p className="subtitle">View and manage all orders across your hotel.</p>
      </div>

      {/* Order Statistics */}
      <div className="order-stats">
        <div className="stat-card">
          <div className="stat-icon">📦</div>
          <div className="stat-info">
            <h3>Total Orders</h3>
            <div className="stat-number">{orderStats.total}</div>
          </div>
        </div>
        <div className="stat-card pending">
          <div className="stat-icon">🆕</div>
          <div className="stat-info">
            <h3>Pending</h3>
            <div className="stat-number">{orderStats.pending}</div>
          </div>
        </div>
        <div className="stat-card preparing">
          <div className="stat-icon">👨‍🍳</div>
          <div className="stat-info">
            <h3>Preparing</h3>
            <div className="stat-number">{orderStats.preparing}</div>
          </div>
        </div>
        <div className="stat-card ready">
          <div className="stat-icon">✅</div>
          <div className="stat-info">
            <h3>Ready</h3>
            <div className="stat-number">{orderStats.ready}</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="filter-group">
          <label>Status:</label>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="preparing">Preparing</option>
            <option value="ready">Ready</option>
            <option value="delivered">Delivered</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Type:</label>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="all">All Types</option>
            <option value="dineIn">Dine In</option>
            <option value="roomService">Room Service</option>
            <option value="takeaway">Takeaway</option>
          </select>
        </div>
        <button className="btn-refresh" onClick={fetchOrders} disabled={loading}>
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {/* Error Display */}
      {error && <div className="error-message">{error}</div>}

      {/* Orders Table */}
      <div className="orders-table-container">
        {loading && !orders.length ? (
          <div className="loading-state">Loading orders...</div>
        ) : !filteredOrders.length ? (
          <div className="empty-state">No orders found</div>
        ) : (
          <table className="orders-table">
            <thead>
              <tr>
                <th>Order #</th>
                <th>Customer</th>
                <th>Type</th>
                <th>Table/Room</th>
                <th>Items</th>
                <th>Status</th>
                <th>Total</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map(order => (
                <tr key={order.id}>
                  <td>{order.orderNumber || order.id.slice(-6)}</td>
                  <td>{order.customerName || 'Guest'}</td>
                  <td>
                    <span className={`type-badge ${order.orderType}`}>
                      {order.orderType === 'dineIn' ? 'Dine In' :
                       order.orderType === 'roomService' ? 'Room Service' : 'Takeaway'}
                    </span>
                  </td>
                  <td>{order.tableNumber || order.roomNumber || '-'}</td>
                  <td>{order.items?.length || 0} items</td>
                  <td>
                    <span className={`status-badge ${order.status}`}>
                      {order.displayStatus || order.status}
                    </span>
                  </td>
                  <td>Rs. {order.totalPrice?.toLocaleString() || 0}</td>
                  <td>
                    <div className="action-buttons">
                      {order.status === 'pending' && (
                        <button
                          className="btn-confirm"
                          onClick={() => handleOrderAction(order.id, 'confirm')}
                        >
                          Confirm
                        </button>
                      )}
                      {order.status === 'preparing' && (
                        <button
                          className="btn-ready"
                          onClick={() => handleOrderAction(order.id, 'ready')}
                        >
                          Ready
                        </button>
                      )}
                      {order.status === 'ready' && (
                        <button
                          className="btn-deliver"
                          onClick={() => handleOrderAction(order.id, 'deliver')}
                        >
                          Deliver
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default OrderManagement;