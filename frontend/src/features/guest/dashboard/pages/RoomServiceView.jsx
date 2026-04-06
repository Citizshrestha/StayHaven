/**
 * Guest Dashboard - Room Service View
 * Menu browsing, cart management, real-time order tracking
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getGuestMenu, placeOrder, getGuestOrders } from "../guestDashboardApi";
import { useSocket } from '../../../../core/context/SocketContext';
import { toast } from 'react-toastify';
import {
  ShoppingCart,
  Plus,
  Minus,
  ChefHat,
  Clock,
  CheckCircle2,
  Truck,
  Loader2,
  Search,
  Filter,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const RoomServiceView = () => {
  const navigate = useNavigate();
  const { subscribe, isConnected } = useSocket();
  const [menuLoading, setMenuLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [menuData, setMenuData] = useState(null);
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [placingOrder, setPlacingOrder] = useState(false);
  const [activeOrders, setActiveOrders] = useState([]);

  // Track subscribed orders so we don't double-count socket updates
  const subscribedOrderIds = useRef(new Set());

  // ── Load active orders on mount ──────────────────────────────────
  useEffect(() => {
    loadActiveOrders();
  }, []);

  const loadActiveOrders = async () => {
    try {
      setOrdersLoading(true);
      const res = await getGuestOrders({ status: 'pending,confirmed,preparing,ready' });
      if (res?.success) {
        const orders = res.data || [];
        setActiveOrders(orders);
        // Track IDs so socket updates find the right orders
        orders.forEach((o) => subscribedOrderIds.current.add(o._id));
      }
    } catch (error) {
      console.error('Active orders load error:', error);
    } finally {
      setOrdersLoading(false);
    }
  };

  // ── Load menu on mount ───────────────────────────────────────────
  useEffect(() => {
    loadMenu();
  }, []);

  const loadMenu = async () => {
    try {
      setMenuLoading(true);
      const res = await getGuestMenu();
      if (res?.success) {
        setMenuData(res);
      }
    } catch (error) {
      console.error('Menu load error:', error);
      toast.error(error.response?.data?.message || 'Failed to load menu');
    } finally {
      setMenuLoading(false);
    }
  };

  // ── Real-time order status updates via Socket ────────────────────
  const handleOrderStatusUpdate = useCallback((data) => {
    // If we know about this order, update its status
    if (subscribedOrderIds.current.has(data.orderId)) {
      setActiveOrders((prev) => {
        // Remove delivered orders after a short delay
        if (data.status === 'delivered') {
          setTimeout(() => {
            setActiveOrders((p) => p.filter((o) => o._id !== data.orderId));
          }, 5000);
        }
        return prev.map((order) =>
          order._id === data.orderId ? { ...order, status: data.status } : order
        );
      });
    } else {
      // Order appeared via socket (placed from another tab) -- add it
      setActiveOrders((prev) => [
        ...prev,
        {
          _id: data.orderId,
          orderNumber: data.orderNumber,
          status: data.status,
          totalPrice: data.totalPrice || 0,
        },
      ]);
      subscribedOrderIds.current.add(data.orderId);
    }

    if (data.status === 'delivered') {
      toast.success(`Order #${data.orderNumber} has been delivered!`);
    } else {
      toast.info(`Order #${data.orderNumber} is now ${data.status}`);
    }
  }, []);

  useEffect(() => {
    if (!subscribe || !isConnected) return;

    const unsub = subscribe('order-status-update', handleOrderStatusUpdate);
    return () => { unsub(); };
  }, [subscribe, isConnected, handleOrderStatusUpdate]);

  // ── Cart operations ──────────────────────────────────────────────
  const addToCart = (item) => {
    setCart((prev) => {
      const existing = prev.find((c) => c._id === item._id);
      if (existing) {
        return prev.map((c) =>
          c._id === item._id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
    toast.success(`${item.name} added to cart`);
  };

  const updateQuantity = (itemId, delta) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item._id === itemId
            ? { ...item, quantity: Math.max(1, item.quantity + delta) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const removeFromCart = (itemId) => {
    setCart((prev) => prev.filter((item) => item._id !== itemId));
    toast.info('Item removed from cart');
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const submitOrder = async () => {
    if (cart.length === 0) return;

    try {
      setPlacingOrder(true);
      const { data } = await placeOrder({
        items: cart.map(({ _id, quantity, notes }) => ({
          menuItem: _id,
          quantity,
          notes,
        })),
        orderType: 'roomService',
      });

      if (data.success) {
        toast.success('Order placed successfully!');
        setCart([]);
        setShowCart(false);
        setActiveOrders((prev) => [...prev, data.data]);
        subscribedOrderIds.current.add(data.data._id);
      }
    } catch (error) {
      console.error('Order placement error:', error);
      toast.error(error.response?.data?.message || 'Failed to place order');
    } finally {
      setPlacingOrder(false);
    }
  };

  // ── Filter menu items ────────────────────────────────────────────
  const filteredItems = React.useMemo(() => {
    if (!menuData) return [];
    let items = menuData.menuItems || menuData.data || [];

    if (menuData.groupedByCategory && items.length === 0) {
      items = Object.values(menuData.groupedByCategory).flat();
    }

    if (selectedCategory !== 'all') {
      items = items.filter((item) => item.category === selectedCategory);
    }
    if (searchQuery) {
      items = items.filter((item) =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return items;
  }, [menuData, selectedCategory, searchQuery]);

  const categories = menuData?.categories || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 pb-20">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-lg border-b border-gray-100 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Room Service</h1>
              <p className="text-sm text-gray-600">Order delicious meals to your room</p>
            </div>
            <button
              onClick={() => setShowCart(!showCart)}
              className="relative p-3 bg-gradient-to-r from-orange-500 to-red-500 rounded-full shadow-lg hover:shadow-xl transition-all"
            >
              <ShoppingCart className="w-6 h-6 text-white" />
              {cart.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center">
                  {cart.reduce((sum, item) => sum + item.quantity, 0)}
                </span>
              )}
            </button>
          </div>

          {/* Search & Filter */}
          <div className="mt-4 flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search menu items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-orange-500"
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Active Orders */}
        {ordersLoading ? (
          <div className="mb-8 flex justify-center py-6">
            <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
          </div>
        ) : activeOrders.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Active Orders</h2>
            <div className="grid gap-3">
              {activeOrders.map((order) => (
                <OrderStatusCard key={order._id} order={order} />
              ))}
            </div>
          </div>
        )}

        {/* Menu Items */}
        {menuLoading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="w-10 h-10 animate-spin text-orange-600" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredItems.map((item) => (
                <MenuItem key={item._id} item={item} onAdd={() => addToCart(item)} />
              ))}
            </div>

            {filteredItems.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">No menu items found</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Cart Sidebar */}
      <AnimatePresence>
        {showCart && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25 }}
            className="fixed right-0 top-0 h-screen w-full max-w-md bg-white shadow-2xl z-50 overflow-y-auto"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Your Cart</h2>
                <button
                  onClick={() => setShowCart(false)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <Minus className="w-5 h-5" />
                </button>
              </div>

              {cart.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingCart className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">Your cart is empty</p>
                </div>
              ) : (
                <>
                  <div className="space-y-4 mb-6">
                    {cart.map((item) => (
                      <div key={item._id} className="flex items-center gap-4 bg-gray-50 rounded-lg p-4">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{item.name}</p>
                          <p className="text-sm text-gray-500">${item.price}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQuantity(item._id, -1)}
                            className="p-1 hover:bg-gray-200 rounded"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="w-8 text-center font-medium">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item._id, 1)}
                            className="p-1 hover:bg-gray-200 rounded"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                        <button
                          onClick={() => removeFromCart(item._id)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="border-t pt-4 mb-6">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold">Total</span>
                      <span className="text-2xl font-bold text-orange-600">${cartTotal.toFixed(2)}</span>
                    </div>
                  </div>

                  <button
                    onClick={submitOrder}
                    disabled={placingOrder}
                    className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50"
                  >
                    {placingOrder ? 'Placing Order...' : 'Place Order'}
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────

const MenuItem = React.memo(({ item, onAdd }) => (
  <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-all border border-gray-100">
    {item.image && (
      <img src={item.image} alt={item.name} className="w-full h-48 object-cover" />
    )}
    <div className="p-4">
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-semibold text-gray-900">{item.name}</h3>
        <span className="text-lg font-bold text-orange-600">${item.price}</span>
      </div>
      {item.description && (
        <p className="text-sm text-gray-600 mb-4">{item.description}</p>
      )}
      <button
        onClick={onAdd}
        className="w-full py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg hover:shadow-md transition-all"
      >
        Add to Cart
      </button>
    </div>
  </div>
));

const OrderStatusCard = ({ order }) => {
  const statusIcons = {
    pending: <Clock className="w-5 h-5 text-yellow-600" />,
    confirmed: <CheckCircle2 className="w-5 h-5 text-blue-600" />,
    preparing: <ChefHat className="w-5 h-5 text-orange-600" />,
    ready: <Truck className="w-5 h-5 text-green-600" />,
    delivered: <CheckCircle2 className="w-5 h-5 text-gray-600" />,
  };

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-700',
    confirmed: 'bg-blue-100 text-blue-700',
    preparing: 'bg-orange-100 text-orange-700',
    ready: 'bg-green-100 text-green-700',
    delivered: 'bg-gray-100 text-gray-700',
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-gray-900">Order #{order.orderNumber}</p>
          <p className="text-sm text-gray-500">${order.totalPrice}</p>
        </div>
        <div className="flex items-center gap-2">
          {statusIcons[order.status] || <Clock className="w-5 h-5" />}
          <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${statusColors[order.status] || 'bg-gray-100 text-gray-700'}`}>
            {order.status}
          </span>
        </div>
      </div>
    </div>
  );
};

export default RoomServiceView;
