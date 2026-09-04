/**
 * Guest Dashboard - Menu View
 * Menu browsing, cart management, real-time order tracking
 * Themed to match GuestDashboard teal/cyan color scheme
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { getGuestMenu, placeOrder, getGuestOrders } from "../guestDashboardApi";
import { useSocket } from '../../../../core/context/SocketContext';
import { useTheme } from '../../../../core/hooks/useTheme';
import { toast } from 'react-toastify';
import CancelOrderModal from '../../../../shared/components/CancelOrderModal';
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
  UtensilsCrossed,
  Flame,
  X,
} from 'lucide-react';
import { motion as Motion, AnimatePresence } from 'framer-motion';

// Brand colors matching DashboardView.jsx
const LIGHT_BRAND = {
  primary: '#00BFA6',
  primaryDark: '#00A896',
  background: '#F8FAFB',
  card: '#FFFFFF',
  textPrimary: '#263238',
  textSecondary: '#546E7A',
  border: '#E0E7EB',
};

const DARK_BRAND = {
  primary: '#2DD4BF',
  primaryDark: '#14B8A6',
  background: '#020617',
  card: '#0F172A',
  textPrimary: '#E2E8F0',
  textSecondary: '#94A3B8',
  border: '#1E293B',
};

// NOTE: Menu items are loaded exclusively from the backend, which scopes them
// to the hotel of the guest's active booking. We intentionally do NOT keep a
// hardcoded sample-menu fallback here, because rendering items that don't
// belong to the guest's current hotel would break tenant isolation.

const RoomServiceView = () => {
  const { subscribe, isConnected } = useSocket();
  const { isDark } = useTheme();
  const BRAND = isDark ? DARK_BRAND : LIGHT_BRAND;

  const [menuLoading, setMenuLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [menuData, setMenuData] = useState(null);
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [placingOrder, setPlacingOrder] = useState(false);
  const [activeOrders, setActiveOrders] = useState([]);
  const [cancelTarget, setCancelTarget] = useState(null);

  const subscribedOrderIds = useRef(new Set());

  const handleOrderCancelled = useCallback((cancelledOrder) => {
    const id = cancelledOrder?._id || cancelTarget?._id;
    if (id) {
      setActiveOrders((prev) => prev.filter((o) => o._id !== id));
      subscribedOrderIds.current.delete(id);
    }
    setCancelTarget(null);
  }, [cancelTarget]);

  // Load active orders on mount
  useEffect(() => {
    loadActiveOrders();
  }, []);

  const loadActiveOrders = async () => {
    try {
      setOrdersLoading(true);
      const res = await getGuestOrders({ limit: 20 });
      const allOrders = Array.isArray(res?.data) ? res.data : [];
      const orders = allOrders.filter((order) =>
        ['pending', 'confirmed', 'preparing', 'ready'].includes((order?.status || '').toLowerCase())
      );

      setActiveOrders(orders);
      orders.forEach((o) => subscribedOrderIds.current.add(o._id));
    } catch (error) {
      console.error('Active orders load error:', error);
    } finally {
      setOrdersLoading(false);
    }
  };

  // Load menu on mount
  useEffect(() => {
    loadMenu();
  }, []);

  const loadMenu = async () => {
    try {
      setMenuLoading(true);
      const res = await getGuestMenu();
      if (res?.success) {
        setMenuData(res);
      } else {
        console.error('Menu load failed:', res);
        toast.error(res?.message || 'Failed to load menu');
      }
    } catch (error) {
      console.error('Menu load error:', error);
      const errorMessage = error.response?.data?.message || 'Failed to load menu. Please try refreshing the page.';
      toast.error(errorMessage);
    } finally {
      setMenuLoading(false);
    }
  };

  // Real-time order status updates via Socket
  const handleOrderStatusUpdate = useCallback((data) => {
    if (subscribedOrderIds.current.has(data.orderId)) {
      setActiveOrders((prev) => {
        if (data.status === 'delivered') {
          setTimeout(() => {
            setActiveOrders((p) => p.filter((o) => o._id !== data.orderId));
          }, 5000);
        }
        return prev.map((order) =>
          order._id === data.orderId
            ? { ...order, status: data.status, items: data.items || order.items }
            : order
        );
      });
    } else {
      setActiveOrders((prev) => [
        ...prev,
        {
          _id: data.orderId,
          orderNumber: data.orderNumber,
          status: data.status,
          totalPrice: data.totalPrice || 0,
          items: data.items || [],
        },
      ]);
      subscribedOrderIds.current.add(data.orderId);
    }

    if (data.status === 'delivered') {
      toast.success(`🎉 Order #${data.orderNumber} has been delivered!`, { position: 'top-center', autoClose: 5000 });
    } else if (data.status === 'ready') {
      toast.success(`✅ Order #${data.orderNumber} is ready!`, { position: 'top-center', autoClose: 4000 });
    } else if (data.status === 'preparing') {
      toast.info(`👨‍🍳 Order #${data.orderNumber} is being prepared`, { position: 'top-center', autoClose: 3000 });
    } else if (data.status === 'confirmed') {
      toast.info(`✓ Order #${data.orderNumber} has been confirmed`, { position: 'top-center', autoClose: 3000 });
    } else {
      toast.info(`Order #${data.orderNumber} is now ${data.status}`, { position: 'top-center', autoClose: 3000 });
    }
  }, []);

  useEffect(() => {
    if (!subscribe || !isConnected) return;
    const unsub = subscribe('order-status-update', handleOrderStatusUpdate);
    return () => { unsub(); };
  }, [subscribe, isConnected, handleOrderStatusUpdate]);

  // Cart operations
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
            ? { ...item, quantity: item.quantity + delta }
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
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const submitOrder = async () => {
    if (cart.length === 0) return;
    if (!menuData?.hotel?._id) {
      toast.error('Hotel information not available. Please refresh the page.');
      return;
    }

    try {
      setPlacingOrder(true);
      const response = await placeOrder({
        hotelId: menuData.hotel._id,
        items: cart.map(({ _id, quantity, notes }) => ({
          menuItem: _id,
          quantity,
          notes,
        })),
        orderType: 'roomService',
      });

      if (response.success) {
        toast.success('Order placed successfully!');
        setCart([]);
        setShowCart(false);
        setActiveOrders((prev) => [...prev, response.data]);
        subscribedOrderIds.current.add(response.data._id);
      }
    } catch (error) {
      console.error('Order placement error:', error);
      toast.error(error.response?.data?.message || 'Failed to place order');
    } finally {
      setPlacingOrder(false);
    }
  };

  // Filter menu items
  // SECURITY/ISOLATION: Only show items returned by the backend for the user's
  // *current* hotel (resolved server-side from their active booking). We never
  // fall back to hardcoded sample items, because those would leak dishes that
  // do not belong to the hotel the guest is checked into.
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

  // Categories are sourced strictly from the backend response so the filter
  // pills reflect only the current hotel's menu. No hardcoded fallback.
  const categories = menuData?.categories || [];

  return (
    <div className="min-h-screen pb-24 md:pb-8" style={{ background: BRAND.background }}>
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-5 md:py-8 space-y-6">
        {/* Header */}
        <section
          className="rounded-2xl p-5 md:p-7 text-white shadow-lg relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #00BFA6, #00E5CC)',
          }}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <UtensilsCrossed size={24} />
                <h1 className="text-2xl md:text-3xl font-bold drop-shadow-sm">Menu</h1>
              </div>
              <p className="text-sm md:text-base text-white/90">
                Order delicious meals to your room • Fresh ingredients, authentic flavors
              </p>
            </div>
            <button
              onClick={() => setShowCart(!showCart)}
              className="relative h-12 w-12 rounded-full bg-white/20 backdrop-blur-md border border-white/40 flex items-center justify-center hover:bg-white/30 transition"
            >
              <ShoppingCart className="w-5 h-5" />
              {cartItemCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-5 h-5 rounded-full px-1 text-[11px] bg-rose-500 text-white flex items-center justify-center font-semibold">
                  {cartItemCount}
                </span>
              )}
            </button>
          </div>

          {/* Search & Filter */}
          <div className="mt-5 flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/70" />
              <input
                type="text"
                placeholder="Search dishes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/20 backdrop-blur-md border border-white/40 text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2.5 rounded-xl bg-white/20 backdrop-blur-md border border-white/40 text-white focus:outline-none focus:ring-2 focus:ring-white/50"
            >
              <option value="all" className="text-slate-900">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat} className="text-slate-900">{cat}</option>
              ))}
            </select>
          </div>
        </section>

        {/* Active Orders */}
        {ordersLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: BRAND.primary }} />
          </div>
        ) : activeOrders.length > 0 && (
          <SectionCard title="Active Orders" brand={BRAND}>
            <div className="space-y-3">
              {activeOrders.map((order) => (
                <OrderStatusCard
                  key={order._id}
                  order={order}
                  brand={BRAND}
                  onCancel={() => setCancelTarget(order)}
                />
              ))}
            </div>
          </SectionCard>
        )}

        {/* Popular Items Badge */}
        {selectedCategory === 'all' && !searchQuery && (
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5" style={{ color: BRAND.primary }} />
            <span className="font-semibold" style={{ color: BRAND.textPrimary }}>Popular Items</span>
          </div>
        )}

        {/* Menu Items */}
        {menuLoading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="w-10 h-10 animate-spin" style={{ color: BRAND.primary }} />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
            {filteredItems.map((item) => (
              <MenuItemCard key={item._id} item={item} onAdd={() => addToCart(item)} brand={BRAND} />
            ))}
          </div>
        )}

        {filteredItems.length === 0 && !menuLoading && (
          <div className="text-center py-12">
            <UtensilsCrossed className="w-12 h-12 mx-auto mb-4 opacity-30" style={{ color: BRAND.textSecondary }} />
            {!menuData?.hotel?._id ? (
              <>
                <p className="font-medium mb-1" style={{ color: BRAND.textPrimary }}>
                  Menu unavailable
                </p>
                <p className="text-sm" style={{ color: BRAND.textSecondary }}>
                  We couldn't find an active booking to load a hotel menu for.
                </p>
              </>
            ) : searchQuery || selectedCategory !== 'all' ? (
              <p style={{ color: BRAND.textSecondary }}>
                No items match your search at {menuData.hotel.name || 'this hotel'}.
              </p>
            ) : (
              <p style={{ color: BRAND.textSecondary }}>
                {menuData.hotel.name || 'Your hotel'} hasn't added any menu items yet.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Cart Sidebar */}
      <AnimatePresence>
        {showCart && (
          <Motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25 }}
            className="fixed right-0 top-0 h-screen w-full max-w-md shadow-2xl z-50 overflow-y-auto"
            style={{ background: BRAND.card, borderLeft: `1px solid ${BRAND.border}` }}
          >
            <div className="p-5 md:p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold" style={{ color: BRAND.textPrimary }}>Your Cart</h2>
                <button
                  onClick={() => setShowCart(false)}
                  className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  style={{ color: BRAND.textSecondary }}
                >
                  <Minus className="w-5 h-5" />
                </button>
              </div>

              {cart.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingCart className="w-16 h-16 mx-auto mb-4 opacity-30" style={{ color: BRAND.textSecondary }} />
                  <p style={{ color: BRAND.textSecondary }}>Your cart is empty</p>
                  <p className="text-sm mt-1" style={{ color: BRAND.textSecondary }}>Add some delicious items!</p>
                </div>
              ) : (
                <>
                  <div className="space-y-3 mb-6">
                    {cart.map((item) => (
                      <div
                        key={item._id}
                        className="flex items-center gap-4 rounded-xl p-3"
                        style={{ background: isDark ? 'rgba(30, 41, 59, 0.5)' : '#F1F5F9' }}
                      >
                        {item.image && (
                          <img src={item.image} alt={item.name} className="w-14 h-14 rounded-lg object-cover" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate" style={{ color: BRAND.textPrimary }}>{item.name}</p>
                          <p className="text-sm" style={{ color: BRAND.textSecondary }}>NPR {item.price}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQuantity(item._id, -1)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                            style={{ color: BRAND.textSecondary }}
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="w-8 text-center font-semibold" style={{ color: BRAND.textPrimary }}>{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item._id, 1)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                            style={{ color: BRAND.textSecondary }}
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => removeFromCart(item._id)}
                            aria-label={`Remove ${item.name} from cart`}
                            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-rose-100 dark:hover:bg-rose-900/30 transition text-rose-500"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="border-t pt-4 mb-6" style={{ borderColor: BRAND.border }}>
                    <div className="flex justify-between items-center">
                      <span className="font-semibold" style={{ color: BRAND.textPrimary }}>Total</span>
                      <span className="text-2xl font-bold" style={{ color: BRAND.primary }}>NPR {cartTotal.toFixed(2)}</span>
                    </div>
                  </div>

                  <button
                    onClick={submitOrder}
                    disabled={placingOrder}
                    className="w-full py-3 rounded-xl font-semibold text-white transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.primaryDark})` }}
                  >
                    {placingOrder ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Placing Order...
                      </span>
                    ) : (
                      'Place Order'
                    )}
                  </button>
                </>
              )}
            </div>
          </Motion.div>
        )}
      </AnimatePresence>

      {/* Cancel Order Modal */}
      <CancelOrderModal
        isOpen={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        order={cancelTarget}
        onCancelSuccess={handleOrderCancelled}
      />

      {/* Floating Cart Button (Mobile) */}
      {!showCart && cartItemCount > 0 && (
        <button
          onClick={() => setShowCart(true)}
          className="fixed bottom-20 md:bottom-6 right-4 h-14 px-5 rounded-full shadow-xl flex items-center gap-3 text-white font-semibold z-40"
          style={{ background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.primaryDark})` }}
        >
          <ShoppingCart className="w-5 h-5" />
          <span>{cartItemCount} items</span>
          <span className="font-bold">NPR {cartTotal.toFixed(0)}</span>
        </button>
      )}
    </div>
  );
};

// ─────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────

const SectionCard = ({ title, children, brand }) => (
  <div
    className="rounded-2xl p-4 md:p-5 border shadow-sm"
    style={{
      background: brand.card,
      borderColor: brand.border,
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    }}
  >
    <h2 className="text-lg font-semibold mb-4" style={{ color: brand.textPrimary }}>{title}</h2>
    {children}
  </div>
);

const MenuItemCard = React.memo(({ item, onAdd, brand }) => {
  const isDark = brand.background !== '#F8FAFB';

  return (
    <div
      className="rounded-2xl border overflow-hidden transition-all hover:-translate-y-1 hover:shadow-xl group"
      style={{
        background: brand.card,
        borderColor: brand.border,
        boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
      }}
    >
      {/* Image */}
      <div className="relative h-44 overflow-hidden">
        {item.image ? (
          <img
            src={item.image}
            alt={item.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ background: isDark ? '#1E293B' : '#F1F5F9' }}>
            <UtensilsCrossed size={40} className="opacity-30" style={{ color: brand.textSecondary }} />
          </div>
        )}
        {/* Popular Badge */}
        {item.isPopular && (
          <div className="absolute top-3 left-3 flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold text-white" style={{ background: 'linear-gradient(135deg, #F59E0B, #EF4444)' }}>
            <Flame size={12} />
            Popular
          </div>
        )}
        {/* Category Badge */}
        <div className="absolute top-3 right-3 px-2 py-1 rounded-full text-xs font-medium" style={{ background: isDark ? 'rgba(15, 23, 42, 0.8)' : 'rgba(255,255,255,0.9)', color: brand.primary }}>
          {item.category}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-base" style={{ color: brand.textPrimary }}>{item.name}</h3>
          <span className="text-lg font-bold shrink-0" style={{ color: brand.primary }}>NPR {item.price}</span>
        </div>
        {item.description && (
          <p className="text-sm mb-4 line-clamp-2" style={{ color: brand.textSecondary }}>{item.description}</p>
        )}
        <button
          onClick={onAdd}
          className="w-full py-2.5 rounded-xl font-semibold text-white transition-all hover:shadow-lg flex items-center justify-center gap-2"
          style={{ background: `linear-gradient(135deg, ${brand.primary}, ${brand.primaryDark})` }}
        >
          <Plus size={18} />
          Add to Cart
        </button>
      </div>
    </div>
  );
});

const OrderStatusCard = ({ order, brand, onCancel }) => {
  const isDark = brand.background !== '#F8FAFB';
  const [showItems, setShowItems] = useState(false);
  const canCancel = ['pending', 'confirmed'].includes((order.status || '').toLowerCase());

  const statusIcons = {
    pending: <Clock className="w-5 h-5" style={{ color: '#F59E0B' }} />,
    confirmed: <CheckCircle2 className="w-5 h-5" style={{ color: '#3B82F6' }} />,
    preparing: <ChefHat className="w-5 h-5" style={{ color: '#F97316' }} />,
    ready: <Truck className="w-5 h-5" style={{ color: '#10B981' }} />,
    delivered: <CheckCircle2 className="w-5 h-5" style={{ color: '#6B7280' }} />,
  };

  const statusColors = {
    pending: 'bg-amber-100 text-amber-700',
    confirmed: 'bg-blue-100 text-blue-700',
    preparing: 'bg-orange-100 text-orange-700',
    ready: 'bg-emerald-100 text-emerald-700',
    delivered: 'bg-slate-100 text-slate-700',
  };

  const statusMessages = {
    pending: 'Waiting for confirmation',
    confirmed: 'Order confirmed - Kitchen will start soon',
    preparing: 'Your food is being prepared',
    ready: 'Order is ready for delivery',
    delivered: 'Delivered - Enjoy your meal!',
  };

  const progressPercent = {
    pending: 20,
    confirmed: 40,
    preparing: 60,
    ready: 80,
    delivered: 100,
  };

  const progressColors = {
    pending: '#F59E0B',
    confirmed: '#3B82F6',
    preparing: '#F97316',
    ready: '#10B981',
    delivered: '#6B7280',
  };

  const items = order.items || [];

  return (
    <div
      className="rounded-xl p-4 border transition-all"
      style={{
        background: isDark ? 'rgba(30, 41, 59, 0.5)' : '#F8FAFB',
        borderColor: brand.border,
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="font-bold text-lg" style={{ color: brand.textPrimary }}>Order #{order.orderNumber}</p>
          <p className="text-sm" style={{ color: brand.textSecondary }}>NPR {order.totalPrice}</p>
        </div>
        <div className="flex items-center gap-2">
          {statusIcons[order.status] || <Clock className="w-5 h-5" />}
          <span className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize ${statusColors[order.status] || 'bg-slate-100 text-slate-600'}`}>
            {order.status}
          </span>
        </div>
      </div>

      <p className="text-sm mb-3" style={{ color: brand.textSecondary }}>
        {statusMessages[order.status] || 'Processing your order'}
      </p>

      {/* Items Ordered Section */}
      {items.length > 0 && (
        <div className="mb-3">
          <button
            onClick={() => setShowItems(!showItems)}
            className="flex items-center gap-2 text-sm font-medium transition-colors"
            style={{ color: brand.primary }}
          >
            <UtensilsCrossed size={16} />
            <span>{items.length} item{items.length > 1 ? 's' : ''} ordered</span>
            <Motion.span
              animate={{ rotate: showItems ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              ▼
            </Motion.span>
          </button>

          <AnimatePresence>
            {showItems && (
              <Motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="mt-2 space-y-2">
                  {items.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between py-2 px-3 rounded-lg"
                      style={{
                        background: isDark ? 'rgba(15, 23, 42, 0.5)' : 'rgba(255, 255, 255, 0.8)',
                        border: `1px solid ${brand.border}`
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
                          style={{ background: brand.primary, color: 'white' }}
                        >
                          {item.quantity}×
                        </div>
                        <div>
                          <p className="font-medium text-sm" style={{ color: brand.textPrimary }}>
                            {item.name}
                          </p>
                          {item.notes && (
                            <p className="text-xs" style={{ color: brand.textSecondary }}>
                              📝 {item.notes}
                            </p>
                          )}
                        </div>
                      </div>
                      <p className="font-semibold text-sm" style={{ color: brand.primary }}>
                        NPR {item.price * item.quantity}
                      </p>
                    </div>
                  ))}
                </div>
              </Motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      <div className="w-full rounded-full h-2 mb-2" style={{ background: isDark ? '#1E293B' : '#E2E8F0' }}>
        <div
          className="h-2 rounded-full transition-all duration-500"
          style={{
            width: `${progressPercent[order.status] || 0}%`,
            background: progressColors[order.status] || '#94A3B8',
          }}
        />
      </div>

      {order.status !== 'delivered' && order.status !== 'cancelled' && (
        <p className="text-xs mt-2" style={{ color: brand.textSecondary }}>
          {order.status === 'pending' && '⏱️ Estimated: 25-30 minutes'}
          {order.status === 'confirmed' && '⏱️ Estimated: 20-25 minutes'}
          {order.status === 'preparing' && '⏱️ Estimated: 10-15 minutes'}
          {order.status === 'ready' && '🚀 Delivering to your room now'}
        </p>
      )}

      {canCancel && onCancel && (
        <button
          onClick={onCancel}
          className="mt-3 w-full py-2 rounded-lg text-sm font-semibold border transition-colors"
          style={{
            color: '#e11d48',
            borderColor: isDark ? 'rgba(225,29,72,0.4)' : 'rgba(225,29,72,0.25)',
            background: isDark ? 'rgba(225,29,72,0.08)' : 'rgba(225,29,72,0.04)',
          }}
        >
          Cancel Order
        </button>
      )}
    </div>
  );
};

export default RoomServiceView;