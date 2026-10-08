/**
 * Guest Dashboard - Room Service
 * Menu browsing, cart (with per-item notes), and real-time order tracking.
 * Styling comes exclusively from the guest design tokens (guest-tokens.css).
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { toast } from 'react-toastify';
import {
  ShoppingCart, Plus, Minus, Search, UtensilsCrossed, Flame, X, Clock, Truck,
  ChevronDown, StickyNote, AlertTriangle, RefreshCw,
} from 'lucide-react';
import { getGuestMenu, placeOrder, getGuestOrders } from '../guestDashboardApi';
import { useSocket } from '../../../../core/context/SocketContext';
import CancelOrderModal from '../../../../shared/components/CancelOrderModal';
import { cn } from '../../../../core/utils/cn';
import usePullToRefresh from '../hooks/usePullToRefresh';
import { errorMessage, formatMoney } from '../utils/format';
import Button from '../components/ui/Button';
import Money from '../components/ui/Money';
import PageHeader from '../components/ui/PageHeader';
import FilterTabs from '../components/ui/FilterTabs';
import StatusBadge from '../components/ui/StatusBadge';
import EmptyState from '../components/ui/EmptyState';
import Sheet from '../components/ui/Sheet';
import PullIndicator from '../components/ui/PullIndicator';
import { Skeleton, SkeletonCard } from '../components/ui/Skeleton';

// NOTE: Menu items are loaded exclusively from the backend, which scopes them
// to the hotel of the guest's active booking. We intentionally do NOT keep a
// hardcoded sample-menu fallback here, because rendering items that don't
// belong to the guest's current hotel would break tenant isolation.

const ACTIVE_STATUSES = ['pending', 'confirmed', 'preparing', 'ready'];
const NOTE_MAX = 120;
const MAX_QTY = 50; // mirrors MAX_ITEM_QUANTITY in guestDashboardController.placeOrder
const MENU_GRID_ID = 'room-service-menu';

// Stage progress (20/40/60/80/100) and its colour, driven by status tokens.
const STAGE = {
  pending: { percent: 20, bar: 'bg-(--g-warning)', eta: 'Estimated 25–30 min', message: 'Waiting for the kitchen to confirm' },
  confirmed: { percent: 40, bar: 'bg-(--g-info)', eta: 'Estimated 20–25 min', message: 'Confirmed — the kitchen will start soon' },
  preparing: { percent: 60, bar: 'bg-(--g-primary)', eta: 'Estimated 10–15 min', message: 'Your food is being prepared' },
  ready: { percent: 80, bar: 'bg-(--g-success)', eta: 'On its way to your room', message: 'Ready for delivery' },
  delivered: { percent: 100, bar: 'bg-(--g-neutral)', eta: null, message: 'Delivered — enjoy your meal' },
};

const statusKey = (status) => String(status || '').toLowerCase();

const RoomServiceView = () => {
  const { subscribe, isConnected } = useSocket();

  const [menuLoading, setMenuLoading] = useState(true);
  const [menuError, setMenuError] = useState(null);
  const [menuData, setMenuData] = useState(null);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [activeOrders, setActiveOrders] = useState([]);
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [placingOrder, setPlacingOrder] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [announcement, setAnnouncement] = useState('');

  const subscribedOrderIds = useRef(new Set());
  const removalTimers = useRef(new Map());

  useEffect(() => {
    const timers = removalTimers.current;
    return () => { timers.forEach(clearTimeout); timers.clear(); };
  }, []);

  const loadActiveOrders = useCallback(async () => {
    try {
      setOrdersLoading(true);
      const res = await getGuestOrders({ limit: 20 });
      const allOrders = Array.isArray(res?.data) ? res.data : [];
      const orders = allOrders.filter((o) => ACTIVE_STATUSES.includes(statusKey(o?.status)));
      setActiveOrders(orders);
      orders.forEach((o) => subscribedOrderIds.current.add(o._id));
    } catch (error) {
      console.error('Active orders load error:', error);
    } finally {
      setOrdersLoading(false);
    }
  }, []);

  // Errors render inline with a retry; the cart is never cleared by a failed load.
  const loadMenu = useCallback(async () => {
    try {
      setMenuLoading(true);
      setMenuError(null);
      const res = await getGuestMenu();
      if (res?.success) {
        setMenuData(res);
      } else {
        setMenuError(res?.message || 'We couldn’t load the menu.');
      }
    } catch (error) {
      console.error('Menu load error:', error);
      setMenuError(errorMessage(error, 'We couldn’t load the menu. Check your connection and try again.'));
    } finally {
      setMenuLoading(false);
    }
  }, []);

  useEffect(() => { loadActiveOrders(); loadMenu(); }, [loadActiveOrders, loadMenu]);

  const refreshAll = useCallback(() => Promise.all([loadMenu(), loadActiveOrders()]), [loadMenu, loadActiveOrders]);
  const { pull, refreshing } = usePullToRefresh(refreshAll);

  const scheduleRemoval = useCallback((orderId) => {
    if (removalTimers.current.has(orderId)) return;
    const timer = setTimeout(() => {
      removalTimers.current.delete(orderId);
      setActiveOrders((prev) => prev.filter((o) => o._id !== orderId));
    }, 5000);
    removalTimers.current.set(orderId, timer);
  }, []);

  // Real-time order status updates via Socket
  const handleOrderStatusUpdate = useCallback((data) => {
    if (subscribedOrderIds.current.has(data.orderId)) {
      setActiveOrders((prev) => prev.map((order) => (
        order._id === data.orderId
          ? { ...order, status: data.status, items: data.items || order.items }
          : order
      )));
    } else {
      subscribedOrderIds.current.add(data.orderId);
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
    }

    const status = statusKey(data.status);
    if (status === 'delivered') scheduleRemoval(data.orderId);

    const label = `Order #${data.orderNumber}`;
    const opts = { position: 'top-center', autoClose: 4000 };
    if (status === 'delivered') toast.success(`${label} has been delivered`, opts);
    else if (status === 'ready') toast.success(`${label} is ready`, opts);
    else if (status === 'preparing') toast.info(`${label} is being prepared`, opts);
    else if (status === 'confirmed') toast.info(`${label} has been confirmed`, opts);
    else toast.info(`${label} is now ${data.status}`, opts);
  }, [scheduleRemoval]);

  useEffect(() => {
    if (!subscribe || !isConnected) return undefined;
    const unsub = subscribe('order-status-update', handleOrderStatusUpdate);
    return () => { unsub(); };
  }, [subscribe, isConnected, handleOrderStatusUpdate]);

  const handleOrderCancelled = useCallback((cancelledOrder) => {
    const id = cancelledOrder?._id || cancelTarget?._id;
    if (id) {
      setActiveOrders((prev) => prev.filter((o) => o._id !== id));
      subscribedOrderIds.current.delete(id);
    }
    setCancelTarget(null);
  }, [cancelTarget]);

  // ── Cart ──────────────────────────────────────────────
  const setQuantity = useCallback((item, next) => {
    const quantity = Math.min(next, MAX_QTY);
    setCart((prev) => {
      const existing = prev.find((c) => c._id === item._id);
      if (quantity <= 0) return prev.filter((c) => c._id !== item._id);
      if (existing) return prev.map((c) => (c._id === item._id ? { ...c, quantity } : c));
      return [...prev, { ...item, quantity, notes: '' }];
    });
  }, []);

  const addToCart = useCallback((item) => {
    setQuantity(item, 1);
    setAnnouncement(`${item.name} added to cart`);
  }, [setQuantity]);

  const removeFromCart = useCallback((item) => {
    setQuantity(item, 0);
    setAnnouncement(`${item.name} removed from cart`);
  }, [setQuantity]);

  const setNotes = useCallback((itemId, notes) => {
    setCart((prev) => prev.map((c) => (c._id === itemId ? { ...c, notes: notes.slice(0, NOTE_MAX) } : c)));
  }, []);

  const cartQty = useMemo(() => new Map(cart.map((c) => [c._id, c.quantity])), [cart]);
  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const submitOrder = async () => {
    if (cart.length === 0 || placingOrder) return;
    if (!menuData?.hotel?._id) {
      toast.error('Hotel information isn’t available. Please refresh the page.');
      return;
    }

    try {
      setPlacingOrder(true);
      const response = await placeOrder({
        hotelId: menuData.hotel._id,
        items: cart.map(({ _id, quantity, notes }) => ({
          menuItem: _id,
          quantity,
          notes: notes?.trim() || undefined,
        })),
        orderType: 'roomService',
      });

      if (response?.success) {
        toast.success('Order placed');
        setCart([]);
        setShowCart(false);
        if (response.data?._id) {
          subscribedOrderIds.current.add(response.data._id);
          setActiveOrders((prev) => [...prev, response.data]);
        }
      } else {
        toast.error(response?.message || 'Failed to place order');
      }
    } catch (error) {
      console.error('Order placement error:', error);
      toast.error(errorMessage(error, 'Failed to place order'));
    } finally {
      setPlacingOrder(false);
    }
  };

  // ── Menu filtering ────────────────────────────────────
  // SECURITY/ISOLATION: Only show items returned by the backend for the user's
  // *current* hotel (resolved server-side from their active booking). We never
  // fall back to hardcoded sample items, because those would leak dishes that
  // do not belong to the hotel the guest is checked into.
  const allItems = useMemo(() => {
    if (!menuData) return [];
    let items = menuData.menuItems || menuData.data || [];
    if (menuData.groupedByCategory && items.length === 0) {
      items = Object.values(menuData.groupedByCategory).flat();
    }
    return items;
  }, [menuData]);

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return allItems.filter((item) => (
      (selectedCategory === 'all' || item.category === selectedCategory)
      && (!query || item.name?.toLowerCase().includes(query) || item.description?.toLowerCase().includes(query))
    ));
  }, [allItems, selectedCategory, searchQuery]);

  // Categories are sourced strictly from the backend response so the filter
  // tabs reflect only the current hotel's menu. No hardcoded fallback.
  const categoryOptions = useMemo(() => {
    const categories = menuData?.categories || [];
    return [
      { value: 'all', label: 'All', count: allItems.length },
      ...categories.map((cat) => ({
        value: cat,
        label: cat,
        count: allItems.filter((i) => i.category === cat).length,
      })),
    ];
  }, [menuData, allItems]);

  const hotelName = menuData?.hotel?.name;
  const hasHotel = Boolean(menuData?.hotel?._id);
  const isFiltered = Boolean(searchQuery.trim()) || selectedCategory !== 'all';

  const cartButton = (
    <button
      type="button"
      onClick={() => setShowCart(true)}
      aria-label={cartItemCount ? `Open cart, ${cartItemCount} item${cartItemCount > 1 ? 's' : ''}` : 'Open cart'}
      className="relative w-11 h-11 flex items-center justify-center rounded-(--g-radius-sm) border border-(--g-border) bg-(--g-surface) text-(--g-text) hover:bg-(--g-surface-sunken) transition-colors duration-150"
    >
      <ShoppingCart className="w-5 h-5" aria-hidden="true" />
      {cartItemCount > 0 && (
        <span aria-hidden="true" className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-(--g-radius-pill) bg-(--g-primary-fill) text-(--g-on-primary) text-[11px] font-bold guestNum flex items-center justify-center">
          {cartItemCount}
        </span>
      )}
    </button>
  );

  return (
    <div>
      <PullIndicator pull={pull} refreshing={refreshing} />
      <p className="sr-only" aria-live="polite">{announcement}</p>

      <PageHeader
        title="Room Service"
        subtitle={hotelName ? `Delivered to your room from ${hotelName}` : 'Order meals to your room'}
        actions={cartButton}
      />

      {/* Active orders sit above the menu whenever any exist */}
      {ordersLoading ? (
        <div className="mb-6" role="status" aria-live="polite">
          <span className="sr-only">Loading your orders…</span>
          <SkeletonCard lines={2} />
        </div>
      ) : activeOrders.length > 0 && (
        <section aria-labelledby="active-orders-title" className="mb-6">
          <h2 id="active-orders-title" className="g-h2 mb-3">
            Active orders <span className="text-(--g-text-muted) guestNum">({activeOrders.length})</span>
          </h2>
          <ul className="grid gap-3 lg:grid-cols-2">
            {activeOrders.map((order) => (
              <li key={order._id}>
                <OrderStatusCard order={order} onCancel={() => setCancelTarget(order)} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Search + categories: sticky under the mobile top bar */}
      {!menuError && (allItems.length > 0 || menuLoading) && (
        <div className="sticky top-14 lg:top-0 z-20 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-3 mb-4 bg-(--g-bg)/95 backdrop-blur border-b border-(--g-border)">
          <label htmlFor="menu-search" className="sr-only">Search dishes</label>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-(--g-text-subtle)" aria-hidden="true" />
            <input
              id="menu-search"
              type="search"
              placeholder="Search dishes"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full min-h-[44px] pl-10 pr-10 rounded-(--g-radius-sm) border border-(--g-border) bg-(--g-surface) text-(--g-text) text-base leading-[22px] placeholder:text-(--g-text-subtle) focus:border-(--g-primary) outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                className="absolute right-0 top-0 w-11 h-11 flex items-center justify-center text-(--g-text-muted) hover:text-(--g-text)"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            )}
          </div>
          {categoryOptions.length > 1 && (
            <FilterTabs
              label="Menu categories"
              options={categoryOptions}
              value={selectedCategory}
              onChange={setSelectedCategory}
              controls={MENU_GRID_ID}
            />
          )}
        </div>
      )}

      {/* Menu */}
      {menuLoading ? (
        <div role="status" aria-live="polite" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
          <span className="sr-only">Loading menu…</span>
          {Array.from({ length: 6 }, (_, i) => <MenuCardSkeleton key={i} />)}
        </div>
      ) : menuError ? (
        <div role="alert">
          <EmptyState
            icon={AlertTriangle}
            title="Menu unavailable"
            description={cart.length ? `${menuError} Your cart is saved.` : menuError}
            action={<Button variant="secondary" icon={RefreshCw} onClick={loadMenu}>Try again</Button>}
          />
        </div>
      ) : !hasHotel ? (
        <EmptyState
          icon={UtensilsCrossed}
          title="Menu unavailable"
          description="We couldn’t find an active booking to load a hotel menu for."
        />
      ) : allItems.length === 0 ? (
        <EmptyState
          icon={UtensilsCrossed}
          title="No dishes yet"
          description={`${hotelName || 'Your hotel'} hasn’t added any menu items yet.`}
        />
      ) : (
        <>
          <p className="g-small text-(--g-text-muted) mb-3" aria-live="polite">
            <span className="guestNum">{filteredItems.length}</span> dish{filteredItems.length === 1 ? '' : 'es'}
            {selectedCategory !== 'all' && ` in ${selectedCategory}`}
            {searchQuery.trim() && ` matching “${searchQuery.trim()}”`}
          </p>
          {filteredItems.length === 0 ? (
            <EmptyState
              icon={Search}
              title="No matching dishes"
              description={`Nothing at ${hotelName || 'this hotel'} matches your search.`}
              action={isFiltered && (
                <Button variant="secondary" onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}>
                  Clear filters
                </Button>
              )}
            />
          ) : (
            <ul id={MENU_GRID_ID} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
              {filteredItems.map((item) => (
                <li key={item._id}>
                  <MenuItemCard
                    item={item}
                    quantity={cartQty.get(item._id) || 0}
                    onAdd={addToCart}
                    onSetQuantity={setQuantity}
                  />
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {/* Floating cart button — mobile only, clears the bottom nav */}
      {!showCart && cartItemCount > 0 && (
        <button
          type="button"
          onClick={() => setShowCart(true)}
          className="lg:hidden fixed right-4 bottom-[calc(88px+env(safe-area-inset-bottom))] z-40 min-h-[52px] px-5 rounded-(--g-radius-pill) bg-(--g-primary-fill) text-(--g-on-primary) shadow-(--g-shadow-lg) flex items-center gap-3 g-body-strong"
        >
          <ShoppingCart className="w-5 h-5" aria-hidden="true" />
          <span className="guestNum">{cartItemCount} item{cartItemCount > 1 ? 's' : ''}</span>
          <span className="guestNum">{formatMoney(cartTotal, 0)}</span>
        </button>
      )}

      <Sheet
        open={showCart}
        onClose={() => setShowCart(false)}
        dismissible={!placingOrder}
        title="Your cart"
        description={cartItemCount ? `${cartItemCount} item${cartItemCount > 1 ? 's' : ''}` : undefined}
        footer={cart.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-baseline justify-between">
              <span className="g-body-strong">Total</span>
              <Money amount={cartTotal} size="lg" />
            </div>
            <Button className="w-full" onClick={submitOrder} loading={placingOrder}>
              {placingOrder ? 'Placing order…' : 'Place order'}
            </Button>
          </div>
        )}
      >
        {cart.length === 0 ? (
          <div className="py-8 text-center">
            <span className="w-14 h-14 mx-auto mb-4 rounded-(--g-radius-md) bg-(--g-primary-tint) text-(--g-primary-text) flex items-center justify-center">
              <ShoppingCart className="w-7 h-7" aria-hidden="true" />
            </span>
            <p className="g-h2">Your cart is empty</p>
            <p className="g-small text-(--g-text-muted) mt-1">Add dishes from the menu to get started.</p>
            <Button variant="secondary" className="mt-5" data-autofocus onClick={() => setShowCart(false)}>
              Browse menu
            </Button>
          </div>
        ) : (
          <ul className="space-y-3">
            {cart.map((item) => (
              <CartLine
                key={item._id}
                item={item}
                onSetQuantity={setQuantity}
                onRemove={removeFromCart}
                onNotes={setNotes}
              />
            ))}
          </ul>
        )}
      </Sheet>

      <CancelOrderModal
        isOpen={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        order={cancelTarget}
        onCancelSuccess={handleOrderCancelled}
      />
    </div>
  );
};

// ─────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────

const Stepper = ({ name, quantity, onDecrease, onIncrease, className }) => (
  <div role="group" aria-label={`Quantity of ${name}`} className={cn('inline-flex items-center rounded-(--g-radius-sm) border border-(--g-border) bg-(--g-surface)', className)}>
    <button
      type="button"
      onClick={onDecrease}
      aria-label={quantity === 1 ? `Remove ${name}` : `Decrease ${name}`}
      className="w-11 h-11 flex items-center justify-center text-(--g-text-muted) hover:text-(--g-text) hover:bg-(--g-surface-sunken) rounded-l-(--g-radius-sm)"
    >
      <Minus className="w-4 h-4" aria-hidden="true" />
    </button>
    <span className="min-w-8 text-center g-body-strong guestNum" aria-live="polite">{quantity}</span>
    <button
      type="button"
      onClick={onIncrease}
      disabled={quantity >= MAX_QTY}
      aria-label={`Increase ${name}`}
      className="w-11 h-11 flex items-center justify-center text-(--g-text-muted) hover:text-(--g-text) hover:bg-(--g-surface-sunken) rounded-r-(--g-radius-sm) disabled:opacity-40 disabled:cursor-not-allowed"
    >
      <Plus className="w-4 h-4" aria-hidden="true" />
    </button>
  </div>
);

Stepper.propTypes = {
  name: PropTypes.string.isRequired,
  quantity: PropTypes.number.isRequired,
  onDecrease: PropTypes.func.isRequired,
  onIncrease: PropTypes.func.isRequired,
  className: PropTypes.string,
};

const ItemImage = ({ src, alt, className }) => {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className={cn('flex items-center justify-center bg-(--g-surface-sunken) text-(--g-text-subtle)', className)} aria-hidden="true">
        <UtensilsCrossed className="w-8 h-8" />
      </div>
    );
  }
  return <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} className={cn('object-cover', className)} />;
};

ItemImage.propTypes = { src: PropTypes.string, alt: PropTypes.string, className: PropTypes.string };

const MenuItemCard = React.memo(({ item, quantity, onAdd, onSetQuantity }) => (
  <article className="g-lift h-full flex flex-col rounded-(--g-radius-md) border border-(--g-border) bg-(--g-surface) shadow-(--g-shadow-sm) overflow-hidden">
    <div className="relative">
      <ItemImage src={item.image} alt={item.name} className="w-full aspect-[4/3]" />
      {item.isPopular && (
        <span className="absolute top-3 left-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-(--g-radius-pill) bg-(--g-warning-bg) text-(--g-warning-text) g-small font-semibold">
          <Flame className="w-3.5 h-3.5" aria-hidden="true" />
          Popular
        </span>
      )}
      {item.category && (
        <span className="absolute top-3 right-3 px-2.5 py-1 rounded-(--g-radius-pill) bg-(--g-surface) text-(--g-primary-text) g-small font-semibold shadow-(--g-shadow-sm)">
          {item.category}
        </span>
      )}
    </div>

    <div className="flex-1 flex flex-col p-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="g-h2 min-w-0">{item.name}</h3>
        <Money amount={item.price} size="md" className="shrink-0 text-(--g-text)" />
      </div>
      {item.description && (
        <p className="g-small text-(--g-text-muted) mt-1 line-clamp-2">{item.description}</p>
      )}
      <div className="mt-auto pt-4">
        {quantity > 0 ? (
          <div className="flex items-center justify-between gap-3">
            <span className="g-small font-semibold text-(--g-primary-text)">In cart</span>
            <Stepper
              name={item.name}
              quantity={quantity}
              onDecrease={() => onSetQuantity(item, quantity - 1)}
              onIncrease={() => onSetQuantity(item, quantity + 1)}
            />
          </div>
        ) : (
          <Button className="w-full" icon={Plus} onClick={() => onAdd(item)} aria-label={`Add ${item.name} to cart`}>
            Add to cart
          </Button>
        )}
      </div>
    </div>
  </article>
));

MenuItemCard.displayName = 'MenuItemCard';
MenuItemCard.propTypes = {
  item: PropTypes.object.isRequired,
  quantity: PropTypes.number.isRequired,
  onAdd: PropTypes.func.isRequired,
  onSetQuantity: PropTypes.func.isRequired,
};

const MenuCardSkeleton = () => (
  <div aria-hidden="true" className="rounded-(--g-radius-md) border border-(--g-border) bg-(--g-surface) overflow-hidden">
    <Skeleton className="w-full aspect-[4/3] rounded-none" />
    <div className="p-4 space-y-3">
      <div className="flex justify-between gap-3">
        <Skeleton className="h-5 w-1/2" />
        <Skeleton className="h-5 w-1/5" />
      </div>
      <Skeleton className="h-4 w-4/5" />
      <Skeleton className="h-11 w-full" />
    </div>
  </div>
);

const CartLine = ({ item, onSetQuantity, onRemove, onNotes }) => {
  const [noteOpen, setNoteOpen] = useState(Boolean(item.notes));
  const noteId = `note-${item._id}`;

  return (
    <li className="rounded-(--g-radius-md) bg-(--g-surface-sunken) p-3">
      <div className="flex items-start gap-3">
        <ItemImage src={item.image} alt="" className="w-14 h-14 shrink-0 rounded-(--g-radius-sm)" />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="g-body-strong truncate">{item.name}</p>
            <button
              type="button"
              onClick={() => onRemove(item)}
              aria-label={`Remove ${item.name} from cart`}
              className="-mt-2 -mr-2 w-11 h-11 shrink-0 flex items-center justify-center rounded-(--g-radius-sm) text-(--g-danger-text) hover:bg-(--g-danger-bg)"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
          <p className="g-small text-(--g-text-muted)">
            <Money amount={item.price} /> each
          </p>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between gap-3">
        <Stepper
          name={item.name}
          quantity={item.quantity}
          onDecrease={() => onSetQuantity(item, item.quantity - 1)}
          onIncrease={() => onSetQuantity(item, item.quantity + 1)}
        />
        <Money amount={item.price * item.quantity} size="md" />
      </div>

      {noteOpen ? (
        <div className="mt-3">
          <label htmlFor={noteId} className="g-label text-(--g-text-muted)">Note for the kitchen</label>
          <input
            id={noteId}
            type="text"
            value={item.notes || ''}
            maxLength={NOTE_MAX}
            onChange={(e) => onNotes(item._id, e.target.value)}
            placeholder="e.g. no onions, extra spicy"
            aria-describedby={`${noteId}-count`}
            className="mt-1 w-full min-h-[44px] px-3 rounded-(--g-radius-sm) border border-(--g-border) bg-(--g-surface) text-(--g-text) g-small placeholder:text-(--g-text-subtle) focus:border-(--g-primary) outline-none"
          />
          <p id={`${noteId}-count`} className="g-small text-(--g-text-subtle) mt-1 text-right guestNum">
            {(item.notes || '').length}/{NOTE_MAX}
          </p>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setNoteOpen(true)}
          className="mt-2 min-h-[44px] inline-flex items-center gap-1.5 g-small font-semibold text-(--g-primary-text) hover:underline"
        >
          <StickyNote className="w-4 h-4" aria-hidden="true" />
          Add a note
        </button>
      )}
    </li>
  );
};

CartLine.propTypes = {
  item: PropTypes.object.isRequired,
  onSetQuantity: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
  onNotes: PropTypes.func.isRequired,
};

const OrderStatusCard = ({ order, onCancel }) => {
  const [showItems, setShowItems] = useState(false);
  const status = statusKey(order.status);
  const stage = STAGE[status];
  const canCancel = ['pending', 'confirmed'].includes(status);
  const items = order.items || [];
  const itemsId = `order-items-${order._id}`;

  return (
    <div className="h-full rounded-(--g-radius-md) border border-(--g-border) bg-(--g-surface) shadow-(--g-shadow-sm) p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="g-body-strong">Order #{order.orderNumber}</p>
          <Money amount={order.totalPrice} className="g-small text-(--g-text-muted)" />
        </div>
        <StatusBadge domain="order" status={order.status} />
      </div>

      <p className="g-small text-(--g-text-muted) mt-2">{stage?.message || 'Processing your order'}</p>

      <div
        role="progressbar"
        aria-label={`Order #${order.orderNumber} progress`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={stage?.percent || 0}
        className="mt-3 h-2 w-full rounded-(--g-radius-pill) bg-(--g-surface-sunken) overflow-hidden"
      >
        <div
          className={cn('h-full rounded-(--g-radius-pill) transition-[width] duration-500', stage?.bar || 'bg-(--g-neutral)')}
          style={{ width: `${stage?.percent || 0}%` }}
        />
      </div>

      {stage?.eta && (
        <p className="g-small text-(--g-text-muted) mt-2 inline-flex items-center gap-1.5">
          {status === 'ready'
            ? <Truck className="w-4 h-4" aria-hidden="true" />
            : <Clock className="w-4 h-4" aria-hidden="true" />}
          {stage.eta}
        </p>
      )}

      {items.length > 0 && (
        <div className="mt-2">
          <button
            type="button"
            onClick={() => setShowItems((v) => !v)}
            aria-expanded={showItems}
            aria-controls={itemsId}
            className="min-h-[44px] inline-flex items-center gap-1.5 g-small font-semibold text-(--g-primary-text)"
          >
            <UtensilsCrossed className="w-4 h-4" aria-hidden="true" />
            {items.length} item{items.length > 1 ? 's' : ''} ordered
            <ChevronDown className={cn('w-4 h-4 transition-transform duration-150', showItems && 'rotate-180')} aria-hidden="true" />
          </button>

          {showItems && (
            <ul id={itemsId} className="mt-1 space-y-2">
              {items.map((item, idx) => (
                <li key={item._id || idx} className="flex items-start justify-between gap-3 rounded-(--g-radius-sm) bg-(--g-surface-sunken) px-3 py-2">
                  <div className="flex items-start gap-3 min-w-0">
                    <span className="shrink-0 min-w-8 h-8 px-1 rounded-(--g-radius-sm) bg-(--g-primary-tint) text-(--g-primary-text) g-small font-bold guestNum flex items-center justify-center">
                      {item.quantity}×
                    </span>
                    <div className="min-w-0">
                      <p className="g-small font-semibold truncate">{item.name}</p>
                      {item.notes && (
                        <p className="g-small text-(--g-text-muted) inline-flex items-start gap-1">
                          <StickyNote className="w-3.5 h-3.5 mt-0.5 shrink-0" aria-hidden="true" />
                          <span className="sr-only">Note:</span>
                          {item.notes}
                        </p>
                      )}
                    </div>
                  </div>
                  <Money amount={(item.price || 0) * (item.quantity || 0)} size="sm" className="shrink-0" />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {canCancel && onCancel && (
        <Button variant="dangerOutline" className="mt-3 w-full" onClick={onCancel}>
          Cancel order
        </Button>
      )}
    </div>
  );
};

OrderStatusCard.propTypes = {
  order: PropTypes.object.isRequired,
  onCancel: PropTypes.func,
};

export default RoomServiceView;
