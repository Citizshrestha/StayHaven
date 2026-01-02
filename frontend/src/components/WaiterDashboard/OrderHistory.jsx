/**
 * OrderHistory Component
 * 
 * Displays today's completed (delivered) orders for the waiter.
 * This helps waiters:
 * 1. Track their performance (how many orders served)
 * 2. Reference past orders if customer has questions
 * 3. See revenue generated during their shift
 */

import { useState, useEffect } from "react";
import { 
  History, 
  CheckCircle, 
  Clock, 
  DollarSign, 
  TrendingUp,
  X,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Package
} from "lucide-react";
import { getActiveProperty } from "../../api/staff";
import axiosClient from "../../axiosClient";

const OrderHistory = ({ onClose }) => {
  const [orders, setOrders] = useState([]);
  const [statistics, setStatistics] = useState({
    totalOrders: 0,
    totalRevenue: "0.00",
    averageOrderValue: "0.00",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [isMobile, setIsMobile] = useState(false);

  // Check screen size
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Fetch order history
  const fetchOrderHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const activeProperty = getActiveProperty();
      if (!activeProperty?._id) {
        setError("No active property found");
        return;
      }

      const response = await axiosClient.get("/api/staff/orders/history", {
        params: { hotelId: activeProperty._id }
      });

      if (response.data.success) {
        setOrders(response.data.orders || []);
        setStatistics(response.data.statistics || {
          totalOrders: 0,
          totalRevenue: "0.00",
          averageOrderValue: "0.00",
        });
      }
    } catch (err) {
      console.error("Failed to fetch order history:", err);
      setError(err.response?.data?.message || "Failed to load order history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrderHistory();
  }, []);

  // Format time
  const formatTime = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  // Toggle order details
  const toggleOrder = (orderId) => {
    setExpandedOrder(expandedOrder === orderId ? null : orderId);
  };

  // Styles
  const containerStyle = {
    backgroundColor: 'var(--bg-secondary)',
    minHeight: '100vh',
    padding: isMobile ? '16px' : '32px 48px',
    fontFamily: "'Nunito', sans-serif",
    paddingBottom: isMobile ? '100px' : '32px',
  };

  const headerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '24px',
    flexWrap: 'wrap',
    gap: '16px',
  };

  const titleStyle = {
    fontSize: isMobile ? '28px' : '36px',
    fontWeight: '800',
    color: 'var(--text-primary)',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  };

  const statsContainerStyle = {
    display: 'grid',
    gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
    gap: '16px',
    marginBottom: '32px',
  };

  const statCardStyle = {
    backgroundColor: 'var(--card-bg)',
    borderRadius: '16px',
    padding: '20px',
    border: '1px solid var(--border-color)',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  };

  const statIconStyle = (bgColor) => ({
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    backgroundColor: bgColor,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  });

  const orderCardStyle = {
    backgroundColor: 'var(--card-bg)',
    borderRadius: '16px',
    marginBottom: '12px',
    border: '1px solid var(--border-color)',
    overflow: 'hidden',
    transition: 'all 0.2s',
  };

  const orderHeaderStyle = {
    padding: '16px 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'pointer',
  };

  const orderDetailsStyle = {
    padding: '0 20px 16px 20px',
    borderTop: '1px solid var(--border-color)',
    paddingTop: '16px',
  };

  const buttonStyle = {
    padding: '10px 16px',
    borderRadius: '10px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'all 0.2s',
  };

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <div>
          <h1 style={titleStyle}>
            <History size={32} />
            Today's Orders
          </h1>
          <p style={{ 
            color: 'var(--text-tertiary)', 
            marginTop: '8px',
            fontSize: '16px'
          }}>
            {new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={fetchOrderHistory}
            style={{
              ...buttonStyle,
              backgroundColor: 'var(--color-primary)',
              color: 'white',
            }}
            disabled={loading}
          >
            <RefreshCw size={16} style={{ 
              animation: loading ? 'spin 1s linear infinite' : 'none' 
            }} />
            Refresh
          </button>
          
          {onClose && (
            <button
              onClick={onClose}
              style={{
                ...buttonStyle,
                backgroundColor: 'var(--bg-tertiary)',
                color: 'var(--text-secondary)',
                padding: '10px',
              }}
            >
              <X size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Statistics Cards */}
      <div style={statsContainerStyle}>
        {/* Total Orders */}
        <div style={statCardStyle}>
          <div style={statIconStyle('#DBEAFE')}>
            <Package size={24} color="#2563EB" />
          </div>
          <div>
            <p style={{ 
              margin: 0, 
              fontSize: '14px', 
              color: 'var(--text-tertiary)',
              fontWeight: '500'
            }}>
              Orders Completed
            </p>
            <p style={{ 
              margin: '4px 0 0 0', 
              fontSize: '28px', 
              fontWeight: '800',
              color: 'var(--text-primary)'
            }}>
              {statistics.totalOrders}
            </p>
          </div>
        </div>

        {/* Total Revenue */}
        <div style={statCardStyle}>
          <div style={statIconStyle('#D1FAE5')}>
            <DollarSign size={24} color="#059669" />
          </div>
          <div>
            <p style={{ 
              margin: 0, 
              fontSize: '14px', 
              color: 'var(--text-tertiary)',
              fontWeight: '500'
            }}>
              Total Revenue
            </p>
            <p style={{ 
              margin: '4px 0 0 0', 
              fontSize: '28px', 
              fontWeight: '800',
              color: 'var(--text-primary)'
            }}>
              ${statistics.totalRevenue}
            </p>
          </div>
        </div>

        {/* Average Order Value */}
        <div style={statCardStyle}>
          <div style={statIconStyle('#FEF3C7')}>
            <TrendingUp size={24} color="#D97706" />
          </div>
          <div>
            <p style={{ 
              margin: 0, 
              fontSize: '14px', 
              color: 'var(--text-tertiary)',
              fontWeight: '500'
            }}>
              Avg Order Value
            </p>
            <p style={{ 
              margin: '4px 0 0 0', 
              fontSize: '28px', 
              fontWeight: '800',
              color: 'var(--text-primary)'
            }}>
              ${statistics.averageOrderValue}
            </p>
          </div>
        </div>
      </div>

      {/* Orders List */}
      {loading ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '60px 20px',
          color: 'var(--text-tertiary)'
        }}>
          <RefreshCw 
            size={48} 
            style={{ animation: 'spin 1s linear infinite', marginBottom: '16px' }} 
          />
          <p>Loading order history...</p>
        </div>
      ) : error ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '60px 20px',
          color: '#DC2626'
        }}>
          <p>{error}</p>
          <button
            onClick={fetchOrderHistory}
            style={{
              ...buttonStyle,
              backgroundColor: '#DC2626',
              color: 'white',
              margin: '16px auto',
            }}
          >
            Try Again
          </button>
        </div>
      ) : orders.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '60px 20px',
          color: 'var(--text-tertiary)'
        }}>
          <CheckCircle size={48} style={{ marginBottom: '16px' }} />
          <h3 style={{ 
            fontSize: '18px', 
            fontWeight: '600', 
            marginBottom: '8px',
            color: 'var(--text-secondary)'
          }}>
            No completed orders yet
          </h3>
          <p>Completed orders will appear here.</p>
        </div>
      ) : (
        <div>
          {orders.map((order) => (
            <div key={order._id} style={orderCardStyle}>
              {/* Order Header (Clickable) */}
              <div 
                style={orderHeaderStyle}
                onClick={() => toggleOrder(order._id)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: '#D1FAE5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <CheckCircle size={20} color="#059669" />
                  </div>
                  <div>
                    <p style={{ 
                      margin: 0, 
                      fontWeight: '700',
                      color: 'var(--text-primary)',
                      fontSize: '16px'
                    }}>
                      Order #{order.orderNumber || order._id.slice(-5).toUpperCase()}
                    </p>
                    <p style={{ 
                      margin: '2px 0 0 0', 
                      fontSize: '13px',
                      color: 'var(--text-tertiary)'
                    }}>
                      {order.orderType === 'roomService' 
                        ? `Room ${order.roomNumber}` 
                        : `Table ${order.tableNumber}`}
                      {order.customerName && ` • ${order.customerName}`}
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ 
                      margin: 0, 
                      fontWeight: '700',
                      color: '#059669',
                      fontSize: '16px'
                    }}>
                      ${order.totalPrice?.toFixed(2) || '0.00'}
                    </p>
                    <p style={{ 
                      margin: '2px 0 0 0', 
                      fontSize: '12px',
                      color: 'var(--text-tertiary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <Clock size={12} />
                      {formatTime(order.deliveredAt)}
                    </p>
                  </div>
                  {expandedOrder === order._id ? (
                    <ChevronUp size={20} color="var(--text-tertiary)" />
                  ) : (
                    <ChevronDown size={20} color="var(--text-tertiary)" />
                  )}
                </div>
              </div>

              {/* Order Details (Expandable) */}
              {expandedOrder === order._id && (
                <div style={orderDetailsStyle}>
                  <p style={{ 
                    margin: '0 0 12px 0', 
                    fontWeight: '600',
                    fontSize: '14px',
                    color: 'var(--text-secondary)'
                  }}>
                    Items Ordered:
                  </p>
                  {order.items?.map((item, idx) => (
                    <div 
                      key={idx}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '8px 0',
                        borderBottom: idx < order.items.length - 1 
                          ? '1px solid var(--border-color)' 
                          : 'none'
                      }}
                    >
                      <span style={{ color: 'var(--text-primary)' }}>
                        {item.quantity}× {item.name}
                      </span>
                      <span style={{ color: 'var(--text-tertiary)' }}>
                        ${(item.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}
                  
                  {order.orderBy && (
                    <p style={{ 
                      margin: '12px 0 0 0', 
                      fontSize: '13px',
                      color: 'var(--text-tertiary)'
                    }}>
                      Served by: {order.orderBy.fullname || 'Staff'}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* CSS for spin animation */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default OrderHistory;
