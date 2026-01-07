import { useRef } from "react";
import { X, Printer, Send } from "lucide-react";
import { toast } from "react-toastify";

/**
 * BillPreview Component
 * 
 * Displays a printable bill/receipt for an order with options to:
 * 1. Print the bill (thermal receipt or full page)
 * 2. Send bill to customer (Coming Soon)
 * 
 * @param {Object} order - The order object containing all order details
 * @param {Function} onClose - Callback to close the modal
 * @param {boolean} isDarkMode - Theme mode
 * @param {Object} hotelInfo - Hotel information for bill header
 */
const BillPreview = ({ order, onClose, isDarkMode = false, hotelInfo = {} }) => {
  const billRef = useRef(null);

  // Theme colors
  const colors = {
    bg: isDarkMode ? "#1E293B" : "white",
    text: isDarkMode ? "#F8FAFC" : "#111827",
    textSecondary: isDarkMode ? "#94A3B8" : "#6B7280",
    border: isDarkMode ? "#334155" : "#E5E7EB",
    cardBg: isDarkMode ? "#334155" : "#F9FAFB",
    accent: "#10B981",
  };

  // Calculate totals
  const calculateSubtotal = () => {
    if (!order?.items || !Array.isArray(order.items)) return 0;
    return order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const subtotal = calculateSubtotal();
  const taxRate = 0.13; // 13% VAT for Nepal
  const tax = subtotal * taxRate;
  const serviceCharge = subtotal * 0.10; // 10% service charge
  const total = order?.totalPrice || (subtotal + tax + serviceCharge);

  // Format currency in Nepali Rupees
  const formatCurrency = (amount) => {
    return `Rs. ${Number(amount).toLocaleString('en-NP', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`;
  };

  // Format date
  const formatDate = (date) => {
    if (!date) return new Date().toLocaleDateString();
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Print handler - opens print dialog for the bill content
  const handlePrint = () => {
    if (!billRef.current) {
      toast.error("Bill content not found");
      return;
    }

    // Create a new window for printing
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (!printWindow) {
      toast.error("Please allow popups to print the bill");
      return;
    }

    // Get the bill content HTML
    const billContent = billRef.current.innerHTML;

    // Write the print document
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Bill #${order?.orderNumber || 'Order'}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Courier New', Courier, monospace;
              padding: 20px;
              max-width: 400px;
              margin: 0 auto;
            }
            @media print {
              body { padding: 10px; }
              @page { margin: 10mm; size: 80mm auto; }
            }
          </style>
        </head>
        <body>
          ${billContent}
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() { window.close(); };
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
    toast.success("Print dialog opened!");
  };

  // Send bill handler - Coming Soon
  const handleSendBill = () => {
    toast.info("Send Bill feature coming soon!", {
      icon: "🚀",
    });
  };

  if (!order) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2000,
        padding: "16px",
        backdropFilter: "blur(4px)",
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: colors.bg,
          borderRadius: "20px",
          maxWidth: "480px",
          width: "100%",
          maxHeight: "90vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: `1px solid ${colors.border}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h2 style={{ fontSize: "20px", fontWeight: "800", color: colors.text, margin: 0 }}>
            Bill Preview
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "8px",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: colors.textSecondary,
            }}
          >
            <X size={24} />
          </button>
        </div>

        {/* Bill Content (Printable Area) */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "24px",
          }}
        >
          <div
            ref={billRef}
            style={{
              backgroundColor: "white",
              color: "#111827",
              padding: "32px",
              borderRadius: "12px",
              border: "1px solid #E5E7EB",
              fontFamily: "'Courier New', Courier, monospace",
            }}
          >
            {/* Hotel Header */}
            <div style={{ textAlign: "center", marginBottom: "24px", borderBottom: "2px dashed #E5E7EB", paddingBottom: "16px" }}>
              <h1 style={{ fontSize: "24px", fontWeight: "800", margin: "0 0 4px 0", color: "#111827" }}>
                {hotelInfo.name || "Hotel Restaurant"}
              </h1>
              <p style={{ fontSize: "12px", color: "#6B7280", margin: "0 0 4px 0" }}>
                {hotelInfo.address || "Address not available"}
              </p>
              <p style={{ fontSize: "12px", color: "#6B7280", margin: "0 0 4px 0" }}>
                Tel: {hotelInfo.phone || "Phone not available"}
              </p>
             
            </div>

            {/* Bill Info */}
            <div style={{ marginBottom: "20px", fontSize: "13px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                <span style={{ color: "#6B7280" }}>Bill No:</span>
                <span style={{ fontWeight: "700" }}>#{order.orderNumber || order.id?.slice(-5)?.toUpperCase()}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                <span style={{ color: "#6B7280" }}>Date:</span>
                <span style={{ fontWeight: "600" }}>{formatDate(order.createdAt || order.placedAt)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                <span style={{ color: "#6B7280" }}>Location:</span>
                <span style={{ fontWeight: "600" }}>{order.table || `Table ${order.tableNumber}` || `Room ${order.roomNumber}`}</span>
              </div>
              {order.customerName && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#6B7280" }}>Customer:</span>
                  <span style={{ fontWeight: "600" }}>{order.customerName}</span>
                </div>
              )}
            </div>

            {/* Divider */}
            <div style={{ borderTop: "1px dashed #D1D5DB", margin: "16px 0" }} />

            {/* Items Header */}
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px", fontSize: "11px", fontWeight: "700", color: "#6B7280", textTransform: "uppercase" }}>
              <span style={{ flex: 2 }}>Item</span>
              <span style={{ flex: 1, textAlign: "center" }}>Qty</span>
              <span style={{ flex: 1, textAlign: "right" }}>Price</span>
              <span style={{ flex: 1, textAlign: "right" }}>Total</span>
            </div>

            {/* Items List */}
            <div style={{ marginBottom: "16px" }}>
              {Array.isArray(order.items) && order.items.map((item, index) => (
                <div
                  key={item.id || index}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: "8px",
                    fontSize: "13px",
                  }}
                >
                  <span style={{ flex: 2, fontWeight: "500" }}>{item.name}</span>
                  <span style={{ flex: 1, textAlign: "center" }}>{item.quantity}</span>
                  <span style={{ flex: 1, textAlign: "right" }}>{formatCurrency(item.price)}</span>
                  <span style={{ flex: 1, textAlign: "right", fontWeight: "600" }}>
                    {formatCurrency(item.price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            {/* Divider */}
            <div style={{ borderTop: "1px dashed #D1D5DB", margin: "16px 0" }} />

            {/* Totals */}
            <div style={{ fontSize: "13px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                <span style={{ color: "#6B7280" }}>Subtotal:</span>
                <span style={{ fontWeight: "600" }}>{formatCurrency(subtotal)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                <span style={{ color: "#6B7280" }}>VAT (13%):</span>
                <span style={{ fontWeight: "600" }}>{formatCurrency(tax)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                <span style={{ color: "#6B7280" }}>Service Charge (10%):</span>
                <span style={{ fontWeight: "600" }}>{formatCurrency(serviceCharge)}</span>
              </div>
              <div style={{ borderTop: "2px solid #111827", paddingTop: "12px", display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: "16px", fontWeight: "800" }}>TOTAL:</span>
                <span style={{ fontSize: "18px", fontWeight: "800" }}>{formatCurrency(total)}</span>
              </div>
            </div>

            {/* Footer */}
            <div style={{ marginTop: "24px", textAlign: "center", borderTop: "2px dashed #E5E7EB", paddingTop: "16px" }}>
              <p style={{ fontSize: "12px", color: "#6B7280", margin: "0 0 4px 0" }}>
                धन्यवाद! Thank you for dining with us!
              </p>
              <p style={{ fontSize: "11px", color: "#9CA3AF", margin: 0 }}>
                Please visit again
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div
          style={{
            padding: "20px 24px",
            borderTop: `1px solid ${colors.border}`,
            display: "flex",
            gap: "12px",
          }}
        >
          <button
            onClick={handlePrint}
            style={{
              flex: 1,
              padding: "14px 20px",
              backgroundColor: "#10B981",
              color: "white",
              border: "none",
              borderRadius: "12px",
              fontSize: "14px",
              fontWeight: "700",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              transition: "all 0.2s",
            }}
          >
            <Printer size={18} />
            Print Bill
          </button>
          <button
            onClick={handleSendBill}
            style={{
              flex: 1,
              padding: "14px 20px",
              backgroundColor: "#3B82F6",
              color: "white",
              border: "none",
              borderRadius: "12px",
              fontSize: "14px",
              fontWeight: "700",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              transition: "all 0.2s",
            }}
          >
            <Send size={18} />
            Send Bill
          </button>
        </div>
      </div>
    </div>
  );
};

export default BillPreview;
