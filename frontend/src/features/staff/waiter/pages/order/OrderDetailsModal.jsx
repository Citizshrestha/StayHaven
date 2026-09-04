import { X, Clock, MapPin, User, Check, Printer, Send, ChefHat } from "lucide-react";
import { useState } from "react";

const OrderDetailsModal = ({ order, onClose, isDarkMode = false, onMarkReady, onPrintBill, onSendBill }) => {
  if (!order) return null;

  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Theme colors
  const colors = {
    bg: isDarkMode ? "#0F172A" : "#FFFFFF",
    text: isDarkMode ? "#F8FAFC" : "#263238",
    textSecondary: isDarkMode ? "#CBD5E1" : "#546E7A",
    textTertiary: isDarkMode ? "#94A3B8" : "#94A3B8",
    border: isDarkMode ? "#334155" : "#E0E7EB",
    cardBg: isDarkMode ? "#111827" : "#F8FAFB",
    accent: isDarkMode ? "#34D399" : "#00BFA6",
    accentLight: isDarkMode ? "#10B981" : "#00E5CC",
  };

  const itemsArray = Array.isArray(order.items)
    ? order.items
    : typeof order.items === "string"
      ? order.items.split(", ").map((name, index) => ({ id: index, name, quantity: 1, price: 0 }))
      : typeof order.itemsText === "string"
        ? order.itemsText.split(", ").map((name, index) => ({ id: index, name, quantity: 1, price: 0 }))
        : [];

  // Calculate totals
  const subtotal = itemsArray.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 1)), 0);
  const serviceCharge = subtotal * 0.05; // 5%
  const tax = 0; // VAT 13% if needed
  const total = order.totalAmount || (subtotal + serviceCharge + tax);

  const getStatusStyles = (status) => {
    switch (status?.toLowerCase()) {
      case "new":
      case "pending":
        return {
          bg: "rgba(255,255,255,0.2)",
          border: "rgba(255,255,255,0.4)",
          color: "#FFFFFF",
          label: "NEW"
        };
      case "preparing":
        return {
          bg: "rgba(255,255,255,0.2)",
          border: "rgba(255,255,255,0.4)",
          color: "#FFFFFF",
          label: "PREPARING"
        };
      case "ready":
        return {
          bg: "rgba(255,255,255,0.2)",
          border: "rgba(255,255,255,0.4)",
          color: "#FFFFFF",
          label: "READY"
        };
      case "delivered":
        return {
          bg: "rgba(255,255,255,0.2)",
          border: "rgba(255,255,255,0.4)",
          color: "#FFFFFF",
          label: "DELIVERED",
          showCheck: true
        };
      default:
        return {
          bg: "rgba(255,255,255,0.2)",
          border: "rgba(255,255,255,0.4)",
          color: "#FFFFFF",
          label: status?.toUpperCase() || "NEW"
        };
    }
  };

  const statusStyle = getStatusStyles(order.status);

  // Get order type icon
  const getOrderTypeIcon = () => {
    const type = order.orderType?.toLowerCase() || order.table?.toLowerCase() || "";
    if (type.includes("room")) return "🛏️";
    if (type.includes("table")) return "🏪";
    return "🥡";
  };

  const getOrderTypeLabel = () => {
    const type = order.orderType?.toLowerCase() || order.table?.toLowerCase() || "";
    if (type.includes("room")) return "Room Service";
    if (type.includes("table")) return "Dine In";
    return "Takeaway";
  };

  // Images for carousel
  const images = itemsArray
    .filter(item => item.image)
    .map(item => ({
      url: item.image,
      name: item.name,
      quantity: item.quantity
    }));

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "16px",
        animation: "fadeIn 0.2s ease",
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: isDarkMode ? "#0F172A" : colors.bg,
          borderRadius: "24px",
          width: "100%",
          maxWidth: "620px",
          maxHeight: "88vh",
          overflow: "hidden",
          boxShadow: isDarkMode
            ? "0 25px 80px rgba(0,0,0,0.5)"
            : "0 25px 80px rgba(0,0,0,0.18)",
          display: "flex",
          flexDirection: "column",
          animation: "modalIn 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER - Gradient with all key info */}
        <div
          style={{
            background: "linear-gradient(135deg, #00BFA6, #00E5CC)",
            padding: "24px 28px 28px",
            color: "#FFFFFF",
            position: "relative",
          }}
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            style={{
              position: "absolute",
              top: "18px",
              right: "18px",
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              background: "rgba(255,255,255,0.2)",
              border: "none",
              color: "white",
              fontSize: "1.1rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.35)"}
            onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.2)"}
          >
            <X size={18} />
          </button>

          {/* Status Badge */}
          <div
            style={{
              position: "absolute",
              top: "20px",
              right: "52px",
              padding: "5px 14px",
              borderRadius: "20px",
              background: statusStyle.bg,
              border: `1.5px solid ${statusStyle.border}`,
              color: statusStyle.color,
              fontSize: "0.8rem",
              fontWeight: "700",
              letterSpacing: "0.05em",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            {statusStyle.showCheck && <Check size={12} />}
            {statusStyle.label}
          </div>

          {/* Order Title */}
          <h2
            style={{
              fontSize: "1.6rem",
              fontWeight: "700",
              color: "#FFFFFF",
              margin: "0 0 6px 0",
              fontFamily: "'Poppins', sans-serif",
            }}
          >
            Order #{order.orderNumber || order.id?.slice?.(-5)?.toUpperCase() || order.id}
          </h2>

          {/* Order Meta */}
          <div
            style={{
              fontSize: "0.9rem",
              color: "rgba(255,255,255,0.85)",
              display: "flex",
              gap: "16px",
              alignItems: "center",
              marginBottom: "20px",
              flexWrap: "wrap",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              {getOrderTypeIcon()} {order.table || getOrderTypeLabel()}
            </span>
            <span>•</span>
            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              🕐 {order.time || "Just now"}
            </span>
            {order.customerName && (
              <>
                <span>•</span>
                <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  👤 {order.customerName}
                </span>
              </>
            )}
          </div>

          {/* Mini Stat Pills */}
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <div
              style={{
                background: "rgba(255,255,255,0.2)",
                backdropFilter: "blur(8px)",
                border: "1px solid rgba(255,255,255,0.3)",
                borderRadius: "20px",
                padding: "6px 16px",
                fontSize: "0.85rem",
                fontWeight: "600",
                color: "#FFFFFF",
              }}
            >
              {itemsArray.length} {itemsArray.length === 1 ? "Item" : "Items"}
            </div>
            <div
              style={{
                background: "rgba(255,255,255,0.2)",
                backdropFilter: "blur(8px)",
                border: "1px solid rgba(255,255,255,0.3)",
                borderRadius: "20px",
                padding: "6px 16px",
                fontSize: "0.85rem",
                fontWeight: "600",
                color: "#FFFFFF",
              }}
            >
              Rs. {typeof total === 'number' ? total.toFixed(0) : total}
            </div>
            <div
              style={{
                background: "rgba(255,255,255,0.2)",
                backdropFilter: "blur(8px)",
                border: "1px solid rgba(255,255,255,0.3)",
                borderRadius: "20px",
                padding: "6px 16px",
                fontSize: "0.85rem",
                fontWeight: "600",
                color: "#FFFFFF",
              }}
            >
              {getOrderTypeLabel()}
            </div>
          </div>
        </div>

        {/* SCROLLABLE BODY */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "24px 28px",
            display: "flex",
            flexDirection: "column",
            gap: "24px",
            scrollbarWidth: "thin",
            scrollbarColor: "#00BFA6 transparent",
          }}
        >
          {/* ORDER ITEMS SECTION */}
          <div>
            <div
              style={{
                fontSize: "0.75rem",
                fontWeight: "700",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                  color: isDarkMode ? "#CBD5E1" : "#94A3B8",
                marginBottom: "12px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontFamily: "'Poppins', sans-serif",
              }}
            >
              ORDER ITEMS
              <span
                style={{
                  background: "#00BFA6",
                  color: "white",
                  fontSize: "0.7rem",
                  padding: "1px 8px",
                  borderRadius: "10px",
                  fontWeight: "700",
                }}
              >
                {itemsArray.length}
              </span>
            </div>

            {itemsArray.map((item, index) => (
              <div
                key={item.id || index}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                  padding: "14px 16px",
                  background: isDarkMode ? "#1E293B" : "#F8FAFB",
                  borderRadius: "14px",
                  border: isDarkMode ? "1px solid #334155" : "1px solid #E0E7EB",
                  marginBottom: "10px",
                  transition: "all 0.2s ease",
                  animation: `slideIn 0.3s ease ${index * 0.05}s backwards`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = isDarkMode ? "rgba(0,191,166,0.4)" : "rgba(0,191,166,0.25)";
                  e.currentTarget.style.background = isDarkMode ? "#0F172A" : "#F0FDFB";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = isDarkMode ? "#334155" : "#E0E7EB";
                  e.currentTarget.style.background = isDarkMode ? "#1E293B" : "#F8FAFB";
                }}
              >
                {/* Item Image */}
                {item.image && (
                  <img
                    src={item.image}
                    alt={item.name}
                    style={{
                      width: "52px",
                      height: "52px",
                      borderRadius: "10px",
                      objectFit: "cover",
                      flexShrink: 0,
                    }}
                    onError={(e) => {
                      e.target.src = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop";
                    }}
                  />
                )}

                {/* Item Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: "0.95rem",
                      fontWeight: "600",
                      color: isDarkMode ? "#F1F5F9" : "#263238",
                      fontFamily: "'Poppins', sans-serif",
                      marginBottom: item.notes ? "4px" : "0",
                    }}
                  >
                    {item.name}
                  </div>
                  {item.notes && (
                    <div
                      style={{
                        fontSize: "0.8rem",
                        fontStyle: "italic",
                        color: isDarkMode ? "#FCD34D" : "#CA8A04",
                        background: isDarkMode ? "#422006" : "#FEF9C3",
                        padding: "3px 10px",
                        borderRadius: "6px",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        marginTop: "4px",
                      }}
                    >
                      🌶 {item.notes}
                    </div>
                  )}
                </div>

                {/* Quantity + Price */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-end",
                    gap: "4px",
                  }}
                >
                  <div
                    style={{
                      background: "linear-gradient(135deg, #00BFA6, #00E5CC)",
                      color: "white",
                      fontSize: "0.8rem",
                      fontWeight: "700",
                      padding: "3px 10px",
                      borderRadius: "10px",
                      minWidth: "32px",
                      textAlign: "center",
                    }}
                  >
                    ×{item.quantity || 1}
                  </div>
                  {item.price && (
                    <div
                      style={{
                        fontSize: "0.9rem",
                        fontWeight: "600",
                        color: isDarkMode ? "#E2E8F0" : "#263238",
                      }}
                    >
                      Rs. {item.price}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* BILL SUMMARY */}
          {subtotal > 0 && (
            <div>
              <div
                style={{
                  fontSize: "0.75rem",
                  fontWeight: "700",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: isDarkMode ? "#94A3B8" : "#94A3B8",
                  marginBottom: "12px",
                  fontFamily: "'Poppins', sans-serif",
                }}
              >
                BILL SUMMARY
              </div>
              <div
                style={{
                  background: isDarkMode
                    ? "linear-gradient(135deg, #1E293B, #0F172A)"
                    : "linear-gradient(135deg, #F0FDFB, #E6FEFA)",
                  border: isDarkMode
                    ? "1.5px solid rgba(0,191,166,0.3)"
                    : "1.5px solid rgba(0,191,166,0.2)",
                  borderRadius: "16px",
                  padding: "20px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "0.9rem",
                    color: isDarkMode ? "#E2E8F0" : "#546E7A",
                    padding: "6px 0",
                  }}
                >
                  <span>Subtotal ({itemsArray.length} items)</span>
                  <span>Rs. {subtotal.toFixed(0)}</span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "0.9rem",
                    color: isDarkMode ? "#E2E8F0" : "#546E7A",
                    padding: "6px 0",
                  }}
                >
                  <span>Service charge (5%)</span>
                  <span>Rs. {serviceCharge.toFixed(0)}</span>
                </div>
                {tax > 0 && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "0.9rem",
                      color: isDarkMode ? "#E2E8F0" : "#546E7A",
                      padding: "6px 0",
                    }}
                  >
                    <span>Tax (VAT 13%)</span>
                    <span>Rs. {tax.toFixed(0)}</span>
                  </div>
                )}
                <div
                  style={{
                    height: "1px",
                    background: isDarkMode
                      ? "rgba(0,191,166,0.3)"
                      : "rgba(0,191,166,0.2)",
                    margin: "10px 0",
                  }}
                />
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "1.1rem",
                    fontWeight: "700",
                    color: isDarkMode ? "#F1F5F9" : "#263238",
                    paddingTop: "4px",
                    fontFamily: "'Poppins', sans-serif",
                  }}
                >
                  <span>TOTAL</span>
                  <span style={{ color: isDarkMode ? "#34D399" : "#00BFA6", fontSize: "1.2rem" }}>
                    Rs. {total.toFixed(0)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* IMAGE CAROUSEL */}
          {images.length > 0 && (
            <div>
              <div
                style={{
                  fontSize: "0.75rem",
                  fontWeight: "700",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: isDarkMode ? "#F8FAFC" : "#000000",
                  marginBottom: "12px",
                  fontFamily: "'Poppins', sans-serif",
                }}
              >
                ORDER IMAGES
              </div>
              <div
                style={{
                  borderRadius: "16px",
                  overflow: "hidden",
                  position: "relative",
                  background: isDarkMode ? "#1E293B" : "#F8FAFB",
                  border: isDarkMode ? "1px solid #334155" : "1px solid #E0E7EB",
                }}
              >
                <img
                  src={images[currentImageIndex].url}
                  alt={images[currentImageIndex].name}
                  style={{
                    width: "100%",
                    height: "220px",
                    objectFit: "cover",
                  }}
                  onError={(e) => {
                    e.target.src = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&h=600&fit=crop";
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background: "linear-gradient(transparent, rgba(0,0,0,0.6))",
                    padding: "20px 16px 14px",
                    color: "white",
                  }}
                >
                  <div style={{ fontSize: "0.95rem", fontWeight: "600" }}>
                    {images[currentImageIndex].name}
                  </div>
                  <div style={{ fontSize: "0.8rem", opacity: 0.9 }}>
                    ×{images[currentImageIndex].quantity}
                  </div>
                </div>

                {/* Navigation Buttons */}
                {images.length > 1 && (
                  <>
                    <button
                      onClick={prevImage}
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "50%",
                        background: "rgba(255,255,255,0.9)",
                        border: "none",
                        position: "absolute",
                        top: "50%",
                        left: "12px",
                        transform: "translateY(-50%)",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "all 0.2s",
                        color: "#000000",
                        fontSize: "16px",
                        fontWeight: "bold",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#FFFFFF";
                        e.currentTarget.style.transform = "translateY(-50%) scale(1.05)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "rgba(255,255,255,0.9)";
                        e.currentTarget.style.transform = "translateY(-50%) scale(1)";
                      }}
                    >
                      ◀
                    </button>
                    <button
                      onClick={nextImage}
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "50%",
                        background: "rgba(255,255,255,0.9)",
                        border: "none",
                        position: "absolute",
                        top: "50%",
                        right: "12px",
                        transform: "translateY(-50%)",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "all 0.2s",
                        color: "#000000",
                        fontSize: "16px",
                        fontWeight: "bold",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#FFFFFF";
                        e.currentTarget.style.transform = "translateY(-50%) scale(1.05)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "rgba(255,255,255,0.9)";
                        e.currentTarget.style.transform = "translateY(-50%) scale(1)";
                      }}
                    >
                      ▶
                    </button>

                    {/* Dot Indicators */}
                    <div
                      style={{
                        position: "absolute",
                        bottom: "8px",
                        left: "50%",
                        transform: "translateX(-50%)",
                        display: "flex",
                        gap: "6px",
                      }}
                    >
                      {images.map((_, idx) => (
                        <div
                          key={idx}
                          style={{
                            width: idx === currentImageIndex ? "20px" : "8px",
                            height: "8px",
                            borderRadius: "4px",
                            background: idx === currentImageIndex ? "white" : "rgba(255,255,255,0.5)",
                            transition: "all 0.3s",
                            cursor: "pointer",
                          }}
                          onClick={() => setCurrentImageIndex(idx)}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* MODAL FOOTER - ACTION BUTTONS */}
        <div
          style={{
            padding: "16px 28px",
            borderTop: isDarkMode ? "1px solid #334155" : "1px solid #E0E7EB",
            display: "flex",
            gap: "12px",
            background: isDarkMode ? "#1E293B" : "#FFFFFF",
            borderRadius: "0 0 24px 24px",
          }}
        >
          <button
            onClick={() => {
              onClose();
              setTimeout(() => onPrintBill(), 100);
            }}
            style={{
              flex: 1,
              padding: "12px",
              border: "none",
              borderRadius: "12px",
              fontSize: "0.9rem",
              fontWeight: "600",
              color: "#ffffff",
              background: isDarkMode ? "#059669" : "#10b981",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              transition: "all 0.2s",
              fontFamily: "'Poppins', sans-serif",
              boxShadow: isDarkMode 
                ? "0 2px 4px rgba(5, 150, 105, 0.2)" 
                : "0 2px 4px rgba(16, 185, 129, 0.2)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = isDarkMode ? "#047857" : "#059669";
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow = isDarkMode 
                ? "0 6px 12px rgba(5, 150, 105, 0.3)" 
                : "0 6px 12px rgba(16, 185, 129, 0.3)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = isDarkMode ? "#059669" : "#10b981";
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = isDarkMode 
                ? "0 2px 4px rgba(5, 150, 105, 0.2)" 
                : "0 2px 4px rgba(16, 185, 129, 0.2)";
            }}
          >
            <Printer size={16} />
            Print Bill
          </button>
          <button
            onClick={() => {
              onClose();
              setTimeout(() => onSendBill(), 100);
            }}
            style={{
              flex: 1,
              padding: "12px",
              border: "none",
              borderRadius: "12px",
              fontSize: "0.9rem",
              fontWeight: "600",
              color: "#ffffff",
              background: isDarkMode ? "#0891b2" : "#06b6d4",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              transition: "all 0.2s",
              fontFamily: "'Poppins', sans-serif",
              boxShadow: isDarkMode 
                ? "0 2px 4px rgba(8, 145, 178, 0.2)" 
                : "0 2px 4px rgba(6, 182, 212, 0.2)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = isDarkMode ? "#0e7490" : "#0891b2";
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow = isDarkMode 
                ? "0 6px 12px rgba(8, 145, 178, 0.3)" 
                : "0 6px 12px rgba(6, 182, 212, 0.3)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = isDarkMode ? "#0891b2" : "#06b6d4";
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = isDarkMode 
                ? "0 2px 4px rgba(8, 145, 178, 0.2)" 
                : "0 2px 4px rgba(6, 182, 212, 0.2)";
            }}
          >
            <Send size={16} />
            Send Bill
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes modalIn {
          from {
            opacity: 0;
            transform: scale(0.94) translateY(20px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
};

export default OrderDetailsModal;
