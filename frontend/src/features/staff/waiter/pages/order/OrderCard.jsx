import { useState, useEffect, useMemo } from "react";
import { X, Clock, MapPin, User, Trash2, MoreVertical, Edit, Copy, AlertTriangle, Printer, Send } from "lucide-react";
import ItemCarousel from "../../../../../components/shared/ItemCarousel";
import BillPreviewModal from "../../../../../shared/components/BillPreviewModal";
import OrderDetailsModal from "./OrderDetailsModal";
import axiosClient from "../../../../../core/api/client";
import { deleteOrder } from "../../../../../api/staff";
import { toast } from "react-toastify";
import useClickOutside from "../../../../../hooks/useClickOutSide";
import useRelativeTime from "../../../../../hooks/useRelativeTime";
import EditOrderModal from "./EditOrderModal";
import { useStaffAuth } from "../../../../../context/StaffAuthContext";
import { useSocket } from "../../../../../core/context/SocketContext";
import { useTheme } from "../../../../../core/hooks/useTheme";


const OrderCard = ({ order, onMarkServed, onDelete, onUpdate }) => {
  const { isDark } = useTheme();
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showBillPreview, setShowBillPreview] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  // Get staff auth context for hotel info
  const { staffUser } = useStaffAuth();

  // Socket for real-time updates
  const { subscribe } = useSocket();

  // use custom hook for handling click outside
  const menuRef = useClickOutside(() => setShowMenu(false));
  const placedAtRelativeTime = useRelativeTime(order?.placedAt, true);

  const isHighPriority = (order?.priority || "").toLowerCase() === "high";

  // Prepare hotel info for bill
  const hotelInfo = useMemo(() => {
    const property = staffUser?.activeProperty;
    if (!property) return {};

    // Construct full address from available parts
    let fullAddress = '';
    if (property.address && property.city) {
      fullAddress = `${property.address}, ${property.city}`;
    } else if (property.address) {
      fullAddress = property.address;
    } else if (property.city) {
      fullAddress = property.city;
    }

    return {
      name: property.name || '',
      address: fullAddress,
      phone: property.phone || '',
      email: property.email || '',
      website: property.website || '',
    };
  }, [staffUser?.activeProperty]);

  const getCompletionDate = (o) => {
    const raw = o?.deliveredAt || o?.servedAt || o?.updatedAt;
    if (!raw) return null;
    const d = raw instanceof Date ? raw : new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
  };

  const formatCompletionTime = (o) => {
    const d = getCompletionDate(o);
    if (!d) return "";

    const now = new Date();
    const diffMs = now - d;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    // More than 48 hours - show exact date and time
    if (diffHours > 48) {
      const day = d.getDate();
      const month = d.toLocaleString('en-US', { month: 'short' });
      const year = d.getFullYear();
      const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      return `${day} ${month}, ${year} at ${time}`;
    }

    // More than 24 hours - show "Yesterday at [time]"
    if (diffHours > 24) {
      const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      return `Yesterday at ${time}`;
    }

    // Within 24 hours - show just the time
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // Handle responsive breakpoints
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 640);
      setIsTablet(window.innerWidth >= 640 && window.innerWidth < 1024);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Subscribe to real-time payment and bill events
  useEffect(() => {
    if (!subscribe || !order?._id) return;

    const unsubscribeBill = subscribe('bill-sent', (data) => {
      if (data.orderId === order._id) {
        // Refresh order data
        if (onUpdate) {
          onUpdate({ ...order, billSent: true, ...data });
        }
      }
    });

    return () => {
      unsubscribeBill();
    };
  }, [subscribe, order?._id, onUpdate, order]);



  if (!order) {
    return null;
  }

  // Calculate order total from items
  const calculateOrderTotal = () => {
    if (!order.items || !Array.isArray(order.items)) return '0.00';
    return order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2);
  };

  const handleViewDetails = () => {
    setShowDetailsModal(true);
  };

  const handleMarkServed = () => {
    onMarkServed(order.id);
  };


  // Helper to get items display text (supports both old string and new array format)
  const getItemsDisplay = () => {
    if (Array.isArray(order.items)) {
      return order.items.map(item => `${item.quantity}× ${item.name}`).join(", ");
    }
    return order.itemsText || order.items || "";
  };

  // Get total item count
  const getTotalItemCount = () => {
    if (Array.isArray(order.items)) {
      return order.items.reduce((sum, item) => sum + item.quantity, 0);
    }
    return 0;
  };

  const getStatusDuration = (order) => {
    const now = new Date();

    // Helper function to format duration nicely
    const formatDuration = (diffMins) => {
      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m`;
      const hours = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      if (hours < 24) {
        return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
      }
      const days = Math.floor(hours / 24);
      const remHours = hours % 24;
      return remHours > 0 ? `${days}d ${remHours}h` : `${days}d`;
    };

    // For "preparing" status, show how long it's been preparing
    if (order.status === "preparing" && order.startedPreparingAt) {
      const startTime = new Date(order.startedPreparingAt);
      const diffMins = Math.floor((now - startTime) / 60000);
      const duration = formatDuration(diffMins);
      return duration === "Just now" ? `Preparing - Just now` : `Preparing for ${duration}`;
    }

    // For "ready" status, show how long it's been ready
    else if (order.status === "ready" && order.readyAt) {
      const readyTime = new Date(order.readyAt);
      const diffMins = Math.floor((now - readyTime) / 60000);
      const duration = formatDuration(diffMins);
      return duration === "Just now" ? `Ready - Just now` : `Ready for ${duration}`;
    }

    // For "delivered" status, show completion time
    else if (order.status === "delivered") {
      const t = formatCompletionTime(order);
      return t ? `Served on ${t}` : "Completed";
    }

    // For "new" or other status, use relative time
    return placedAtRelativeTime;
  };



  const getStatusStyles = (status) => {
    switch (status) {
      case "new":
        return {
          backgroundColor: "#DBEAFE",
          color: "#2563EB",
          label: "New",
        };
      case "preparing":
        return {
          backgroundColor: "#FEF3C7",
          color: "#D97706",
          label: "Preparing",
        };
      case "ready":
        return {
          backgroundColor: "#D1FAE5",
          color: "#059669",
          label: "Ready for Pickup",
        };
      case "delivered":
        return {
          backgroundColor: "#D1FAE5",
          color: "#059669",
          label: "Delivered ✓",
          isDelivered: true,
        };
      default:
        return {
          backgroundColor: "#F3F4F6",
          color: "#4B5563",
          label: status,
        };
    }
  };

  const statusStyle = getStatusStyles(order.status);

  // Responsive Inline Styles
  const cardStyle = {
    backgroundColor: "var(--card-bg)",
    borderRadius: isMobile ? "16px" : "24px",
    padding: isMobile ? "16px" : "24px",
    display: "flex",
    flexDirection: isMobile ? "column" : "row",
    gap: isMobile ? "16px" : "24px",
    boxShadow: "var(--shadow-sm)",
    border: "1px solid var(--card-border)",
  };

  const contentStyle = {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    minWidth: 0, // Prevent text overflow
  };

  const headerStyle = {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: isMobile ? "8px" : "12px",
    marginBottom: isMobile ? "12px" : "16px",
  };

  const badgeStyle = {
    padding: isMobile ? "3px 8px" : "4px 12px",
    borderRadius: "8px",
    fontSize: isMobile ? "11px" : "12px",
    fontWeight: "700",
    backgroundColor: statusStyle.backgroundColor,
    color: statusStyle.color,
  };

  const metaStyle = {
    color: isDark ? "#E5E7EB" : "#000000",
    fontSize: isMobile ? "12px" : "14px",
    fontWeight: "600",
  };

  const titleStyle = {
    fontSize: isMobile ? "18px" : isTablet ? "20px" : "24px",
    fontWeight: "800",
    color: isDark ? "#ffffff" : "#000000",
    marginBottom: "8px",
    lineHeight: "1.2",
    wordBreak: "break-word",
  };

  const itemsStyle = {
    color: isDark ? "#E5E7EB" : "#000000",
    fontSize: isMobile ? "13px" : "14px",
    lineHeight: "1.5",
    marginBottom: isMobile ? "16px" : "24px",
    flex: 1,
    fontWeight: "600",
  };

  const buttonsContainerStyle = {
    marginTop: "auto",
    display: "flex",
    flexDirection: isMobile ? "column" : "row",
    gap: isMobile ? "8px" : "12px",
  };

  const primaryButtonStyle = {
    flex: isMobile ? "none" : 1,
    padding: isMobile ? "10px 16px" : "12px 24px",
    backgroundColor: "#10B981",
    color: "white",
    borderRadius: "9999px",
    fontWeight: "700",
    fontSize: isMobile ? "13px" : "14px",
    border: "none",
    cursor: "pointer",
    transition: "background-color 0.2s",
    textAlign: "center",
    width: isMobile ? "100%" : "auto",
  };

  const secondaryButtonStyle = {
    flex: isMobile ? "none" : 1,
    padding: isMobile ? "10px 16px" : "12px 24px",
    backgroundColor: "var(--bg-tertiary)",
    color: "var(--text-secondary)",
    borderRadius: "9999px",
    fontWeight: "700",
    fontSize: isMobile ? "13px" : "14px",
    border: "none",
    cursor: "pointer",
    transition: "background-color 0.2s",
    textAlign: "center",
    width: isMobile ? "100%" : "auto",
  };

  const standaloneButtonStyle = {
    padding: isMobile ? "10px 20px" : "12px 28px",
    backgroundColor: "#10B981",
    color: "white",
    borderRadius: "12px",
    fontWeight: "700",
    fontSize: isMobile ? "13px" : "14px",
    border: "none",
    cursor: "pointer",
    transition: "all 0.2s",
    textAlign: "center",
    boxShadow: "0 2px 4px rgba(16, 185, 129, 0.2)",
    width: isMobile ? "100%" : "auto",
  };

  const imageContainerStyle = {
    width: isMobile ? "100%" : isTablet ? "180px" : "240px",
    flexShrink: 0,
    order: isMobile ? -1 : 0, // Image on top for mobile
  };

  const imageStyle = {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    borderRadius: "16px",
    aspectRatio: "4/3",
  };

  const handleDelete = async () => {
    if (!order) return;

    setIsDeleting(true);
    setDeleteError("");
    try {
      const orderId = order._id || order.id;
      if (!orderId) {
        setDeleteError("Order ID not found");
        setIsDeleting(false);
        return;
      }

      // Check if it's a real order (from backend) or dummy order
      if (order.isReal) {
        // Real order - call backend API
        const response = await deleteOrder(orderId);
        if (response.success) {
          setShowDeleteConfirm(false);
          if (onDelete) {
            onDelete(orderId);
            toast.success("Order Deleted Successfully");
          }
        } else {
          setDeleteError(response.message || "Failed to delete order");
        }
      } else {
        // Dummy order - just remove locally
        setShowDeleteConfirm(false);
        if (onDelete) {
          onDelete(orderId);
          toast.success("Order Deleted Successfully");
        }
      }
    } catch (err) {
      setDeleteError(err.response?.data?.message || "Failed to delete order. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const openDeleteConfirm = () => {
    setDeleteError("");
    setShowDeleteConfirm(true);
  };

  const handleMenuAction = (action) => {
    setShowMenu(false);
    switch (action) {
      case "delete":
        openDeleteConfirm();
        break;
      case "edit":
        // Backend only allows editing for pending/confirmed orders.
        // Frontend displays pending as "new".
        if (order?.isReal && !["new", "confirmed"].includes(order.status)) {
          toast.error(
            `Cannot edit order with status "${order.status}". Only new/confirmed orders can be edited.`
          );
          return;
        }
        setShowEditModal(true);
        break;
      default:
        break;
    }
  };

  const handleSaveOrder = async (updatedOrder) => {
    if (onUpdate) {
      await onUpdate(updatedOrder);
    }
    setShowEditModal(false);
  };

  // Handle send bill
  const handleSendBill = async (orderId, billData) => {
    try {
      const response = await axiosClient.post(`/api/v1/staff/orders/${orderId}/send-bill`, billData);

      if (response.data.success) {
        // Just return success - the socket event will update the UI
        // No need to call onUpdate which triggers the edit API
        return response.data;
      }
    } catch (error) {

      throw error;
    }
  };

  return (
    <div
      style={{ ...cardStyle, position: "relative" }}
      data-order-id={order._id}
    >
      {/* Three-dot Menu Button */}
      <div ref={menuRef} style={{ position: "absolute", top: "16px", right: "16px", zIndex: 10 }}>
        <button
          onClick={() => setShowMenu(!showMenu)}
          style={{
            background: "var(--card-bg)",
            border: "1px solid var(--border-color)",
            borderRadius: "8px",
            padding: "8px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.2s",
            boxShadow: showMenu ? "var(--shadow-md)" : "none",
          }}
        >
          <MoreVertical size={18} color="var(--text-tertiary)" />
        </button>

        {/* Dropdown Menu */}
        {showMenu && (
          <div
            style={{
              position: "absolute",
              top: "100%",
              right: 0,
              marginTop: "4px",
              backgroundColor: "var(--card-bg)",
              borderRadius: "12px",
              boxShadow: "var(--shadow-lg)",
              border: "1px solid var(--border-color)",
              minWidth: "180px",
              overflow: "hidden",
              zIndex: 100,
            }}
          >
            <button
              onClick={() => handleMenuAction("edit")}
              style={{
                width: "100%",
                padding: "12px 16px",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                border: "none",
                background: "none",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "500",
                color: "var(--text-secondary)",
                transition: "background 0.2s",
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = "var(--bg-tertiary)"}
              onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
            >
              <Edit size={16} color="var(--text-tertiary)" />
              Edit Order
            </button>
            <div style={{ height: "1px", backgroundColor: "var(--border-color)", margin: "4px 0" }} />
            <button
              onClick={() => handleMenuAction("delete")}
              style={{
                width: "100%",
                padding: "12px 16px",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                border: "none",
                background: "none",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "500",
                color: "#DC2626",
                transition: "background 0.2s",
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = "#FEE2E2"}
              onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
            >
              <Trash2 size={16} color="#DC2626" />
              Delete Order
            </button>
          </div>
        )}
      </div>

      {/* Left Content */}
      <div style={contentStyle}>
        <div style={headerStyle}>
          <span style={badgeStyle}>{statusStyle.label}</span>
          {/* Item count badge */}
          {Array.isArray(order.items) && order.items.length > 1 && (
            <span style={{
              padding: "4px 10px",
              borderRadius: "8px",
              fontSize: "11px",
              fontWeight: "700",
              backgroundColor: "#EDE9FE",
              color: "#7C3AED",
            }}>
              🍽️ {getTotalItemCount()} items
            </span>
          )}
          {isHighPriority ? (
            <span
              style={{
                padding: "4px 12px",
                borderRadius: "8px",
                fontSize: "11px",
                fontWeight: "700",
                backgroundColor: "#FEE2E2",
                color: "#DC2626",
              }}
            >
              Urgent
            </span>
          ) : null}
          <span style={metaStyle}>
            {order.table} - {getStatusDuration(order)}
          </span>
        </div>

        <h3 style={titleStyle}>Order #{order.orderNumber || order.id?.slice?.(-5)?.toUpperCase() || order.id}</h3>
        {order.customerName && (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "12px",

            }}
          >
            <User size={20} style={{ color: "#0284C7", flexShrink: 0 }} />
            <span
              style={{
                fontSize: "16px",
                fontWeight: "800",
                letterSpacing: "0.01em",
                color: isDark ? "#ffffff" : "#000000"
              }}
            >
              {order.customerName}
            </span>
          </div>
        )}
        <p style={itemsStyle}>{getItemsDisplay()}</p>

        {/* Show special notes indicator if any items have notes */}
        {Array.isArray(order.items) && order.items.some(item => item.notes) && (
          <div style={{
            marginBottom: "12px",
            padding: "8px 12px",
            backgroundColor: "#FFFBEB",
            borderRadius: "8px",
            borderLeft: "3px solid #F59E0B",
            maxWidth: "280px",
          }}>
            <div style={{
              fontSize: "11px",
              fontWeight: "700",
              color: "#B45309",
              marginBottom: "4px",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}>
              📝 Special Instructions
            </div>
            {order.items.filter(item => item.notes).slice(0, 2).map(item => (
              <div key={item.id} style={{
                fontSize: "11px",
                color: "#78350F",
                marginBottom: "2px",
                lineHeight: "1.3",
              }}>
                <span style={{ fontWeight: "600" }}>{item.name}:</span>{" "}
                <span style={{ color: "#92400E" }}>{item.notes.length > 25 ? item.notes.slice(0, 25) + "..." : item.notes}</span>
              </div>
            ))}
            {order.items.filter(item => item.notes).length > 2 && (
              <div style={{ fontSize: "10px", color: "#B45309", marginTop: "4px", fontStyle: "italic" }}>
                +{order.items.filter(item => item.notes).length - 2} more in details
              </div>
            )}
          </div>
        )}

        <div style={buttonsContainerStyle}>
          {order.status === "delivered" ? (
            <div style={{ width: "100%" }}>
              <div
                style={{
                  padding: "12px",
                  backgroundColor: "#D1FAE5",
                  borderRadius: "12px",
                  textAlign: "center",
                  marginBottom: "12px",
                }}
              >
                <div
                  style={{
                    fontSize: "16px",
                    fontWeight: "700",
                    color: "#059669",
                    marginBottom: "4px",
                  }}
                >
                  ✓ Order Completed
                </div>
                <div style={{ fontSize: "14px", color: "#6B7280" }}>
                  {(() => {
                    const t = formatCompletionTime(order);
                    return t ? `Served on ${t}` : "Completed";
                  })()}
                </div>
              </div>
              {/* Print Bill & Send Bill Buttons */}
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <button
                  onClick={() => setShowBillPreview(true)}
                  style={{
                    flex: 1,
                    minWidth: isMobile ? "100%" : "120px",
                    padding: "10px 16px",
                    backgroundColor: "#10B981",
                    color: "white",
                    border: "none",
                    borderRadius: "10px",
                    fontSize: "13px",
                    fontWeight: "700",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    transition: "all 0.2s",
                  }}
                >
                  <Printer size={16} />
                  Print Bill
                </button>
                <button
                  onClick={() => setShowBillPreview(true)}
                  style={{
                    flex: 1,
                    minWidth: isMobile ? "100%" : "120px",
                    padding: "10px 16px",
                    backgroundColor: "#3B82F6",
                    color: "white",
                    border: "none",
                    borderRadius: "10px",
                    fontSize: "13px",
                    fontWeight: "700",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    transition: "all 0.2s",
                  }}
                >
                  <Send size={16} />
                  Send Bill
                </button>
              </div>
            </div>
          ) : order.status === "ready" ? (
            <>
              <button onClick={handleViewDetails} style={secondaryButtonStyle}>
                View Details
              </button>
              <button onClick={handleMarkServed} style={primaryButtonStyle}>
                Mark Served
              </button>
            </>
          ) : (
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              flexWrap: "wrap",
            }}>
              <button onClick={handleViewDetails} style={standaloneButtonStyle}>
                View Details
              </button>
              <div style={{
                padding: "10px 16px",
                backgroundColor: "#FEF3C7",
                borderRadius: "10px",
                fontSize: "13px",
                color: "#92400E",
                fontWeight: "600",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}>
                {order.status === "new" ? (
                  <>
                    <span style={{ fontSize: "16px" }}>⏳</span>
                    <span>Waiting for kitchen</span>
                  </>
                ) : (
                  <>
                    <span style={{ fontSize: "16px" }}>👨‍🍳</span>
                    <span>Being prepared</span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>



      {/* Right Image Carousel */}
      <div style={imageContainerStyle}>
        {Array.isArray(order.items) && order.items.length > 0 ? (
          <ItemCarousel
            items={order.items}
            width={isMobile ? "100%" : isTablet ? 180 : 240}
            height={isMobile ? 200 : 180}
          />
        ) : (
          <img src={order.image} alt="Food" style={imageStyle} />
        )}
      </div>

      {/* Order Details Modal */}
      {showDetailsModal && (
        <OrderDetailsModal
          order={order}
          onClose={() => setShowDetailsModal(false)}
          isDarkMode={false}
          onMarkReady={() => {
            toast.info("Mark ready functionality");
          }}
          onPrintBill={() => {
            setShowDetailsModal(false);
            setTimeout(() => setShowBillPreview(true), 100);
          }}
          onSendBill={() => {
            setShowDetailsModal(false);
            setTimeout(() => setShowBillPreview(true), 100);
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2000,
            backdropFilter: "blur(4px)",
          }}
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            style={{
              backgroundColor: "var(--card-bg)",
              borderRadius: "24px",
              padding: "32px",
              maxWidth: "400px",
              width: "90%",
              boxShadow: "var(--shadow-lg)",
              animation: "fadeIn 0.2s ease-out",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Warning Icon */}
            <div
              style={{
                width: "64px",
                height: "64px",
                backgroundColor: "#FEE2E2",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 20px",
              }}
            >
              <AlertTriangle size={32} color="#DC2626" />
            </div>

            {/* Title */}
            <h3
              style={{
                fontSize: "20px",
                fontWeight: "700",
                color: "var(--text-primary)",
                textAlign: "center",
                marginBottom: "8px",
              }}
            >
              Delete Order
            </h3>

            {/* Description */}
            <p
              style={{
                fontSize: "14px",
                color: "var(--text-tertiary)",
                textAlign: "center",
                marginBottom: "8px",
                lineHeight: "1.5",
              }}
            >
              Are you sure you want to delete this order?
            </p>

            {/* Order Info */}
            <div
              style={{
                backgroundColor: "var(--bg-tertiary)",
                borderRadius: "12px",
                padding: "16px",
                marginBottom: "24px",
              }}
            >
              <div
                style={{
                  fontSize: "15px",
                  fontWeight: "600",
                  color: "var(--text-primary)",
                  marginBottom: "4px",
                }}
              >
                Order #{order?.orderNumber || order?.id?.slice?.(-5)?.toUpperCase() || order?.id || "Unknown"}
              </div>
              <div style={{ fontSize: "13px", color: "var(--text-tertiary)" }}>
                {order?.table || "Unknown table"} • {getItemsDisplay()?.substring(0, 50) || "No items"}
                {(getItemsDisplay()?.length || 0) > 50 ? "..." : ""}
              </div>
            </div>

            {/* Warning Text */}
            <p
              style={{
                fontSize: "12px",
                color: "#DC2626",
                textAlign: "center",
                marginBottom: deleteError ? "12px" : "24px",
                backgroundColor: "#FEF2F2",
                padding: "10px 16px",
                borderRadius: "8px",
                fontWeight: "500",
              }}
            >
              ⚠️ This action cannot be undone
            </p>

            {/* Error Message */}
            {deleteError && (
              <div
                style={{
                  backgroundColor: "#FEE2E2",
                  border: "1px solid #FECACA",
                  borderRadius: "12px",
                  padding: "12px 16px",
                  marginBottom: "24px",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    backgroundColor: "#DC2626",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <X size={16} color="white" />
                </div>
                <div>
                  <div
                    style={{
                      fontSize: "13px",
                      fontWeight: "600",
                      color: "#991B1B",
                      marginBottom: "2px",
                    }}
                  >
                    Delete Failed
                  </div>
                  <div style={{ fontSize: "12px", color: "#DC2626" }}>
                    {deleteError}
                  </div>
                </div>
              </div>
            )}

            {/* Buttons */}
            <div style={{ display: "flex", gap: "12px" }}>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                style={{
                  flex: 1,
                  padding: "14px 24px",
                  backgroundColor: "var(--bg-tertiary)",
                  color: "var(--text-secondary)",
                  border: "none",
                  borderRadius: "12px",
                  fontSize: "15px",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                style={{
                  flex: 1,
                  padding: "14px 24px",
                  backgroundColor: "#DC2626",
                  color: "white",
                  border: "none",
                  borderRadius: "12px",
                  fontSize: "15px",
                  fontWeight: "600",
                  cursor: isDeleting ? "not-allowed" : "pointer",
                  transition: "all 0.2s",
                  opacity: isDeleting ? 0.7 : 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                }}
              >
                {isDeleting ? (
                  <>
                    <span
                      style={{
                        width: "16px",
                        height: "16px",
                        border: "2px solid white",
                        borderTopColor: "transparent",
                        borderRadius: "50%",
                        animation: "spin 1s linear infinite",
                      }}
                    />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSS Animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* Edit Order Modal */}
      {showEditModal && (
        <EditOrderModal
          order={order}
          onClose={() => setShowEditModal(false)}
          onSave={handleSaveOrder}
        />
      )}

      {/* Bill Preview Modal */}
      {showBillPreview && (
        <BillPreviewModal
          order={order}
          hotel={hotelInfo}
          onClose={() => setShowBillPreview(false)}
          onSendBill={handleSendBill}
          isOpen={showBillPreview}
        />
      )}
    </div>
  );
};

export default OrderCard;

