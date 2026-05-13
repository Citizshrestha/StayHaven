import React from "react";
import { MoreVertical } from "lucide-react";

const OrderCard = ({ order = {}, onMarkServed }) => {
  const status = order.status || "unknown";
  return (
    <div style={{
      backgroundColor: "var(--card-bg)",
      border: "1px solid var(--card-border)",
      borderRadius: 12,
      padding: 12,
      display: "flex",
      gap: 12,
      alignItems: "center"
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 800, color: "var(--text-primary)" }}>{order.customerName || order.customer || "Guest"}</div>
            <div style={{ color: "var(--text-tertiary)", fontSize: 13 }}>{order.table || order.room || "Unknown location"}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>{status}</span>
            <MoreVertical size={18} />
          </div>
        </div>
        <div style={{ marginTop: 8, color: "var(--text-tertiary)" }}>{(order.items || []).map(i => `${i.quantity || 1}x ${i.name || i}`).join(', ')}</div>
      </div>
      <div>
        <button onClick={() => onMarkServed && onMarkServed(order.id)} style={{ padding: "8px 12px", background: "#10B981", color: "white", border: "none", borderRadius: 8 }}>Mark Served</button>
      </div>
    </div>
  );
};

export default OrderCard;
