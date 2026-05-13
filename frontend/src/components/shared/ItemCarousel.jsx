import React, { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

// Simple, robust ItemCarousel implementation
const ItemCarousel = ({ items = [], width = 280, height = 200 }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const widthStyle = typeof width === "number" ? `${width}px` : width;
  const heightStyle = typeof height === "number" ? `${height}px` : height;

  if (!items || items.length === 0) {
    return (
      <div
        style={{
          width: widthStyle,
          height: heightStyle,
          backgroundColor: "#F3F4F6",
          borderRadius: "16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#9CA3AF",
          fontSize: "14px",
        }}
      >
        No items
      </div>
    );
  }

  const goToPrevious = () => setCurrentIndex((p) => (p === 0 ? items.length - 1 : p - 1));
  const goToNext = () => setCurrentIndex((p) => (p === items.length - 1 ? 0 : p + 1));
  const currentItem = items[currentIndex];

  return (
    <div style={{ width: widthStyle, maxWidth: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#6B7280" }}>{items.length} items</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: "#10B981" }}>{currentIndex + 1} / {items.length}</span>
      </div>

      <div style={{ position: "relative", width: "100%", height: heightStyle, borderRadius: 16, overflow: "hidden" }}>
        <img
          src={currentItem.image}
          alt={currentItem.name}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />

        <button
          onClick={goToPrevious}
          aria-label="Previous"
          style={{
            position: "absolute",
            left: 8,
            top: "50%",
            transform: "translateY(-50%)",
            backgroundColor: "rgba(255,255,255,0.9)",
            border: "none",
            borderRadius: "50%",
            width: 36,
            height: 36,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <ChevronLeft size={18} />
        </button>

        <button
          onClick={goToNext}
          aria-label="Next"
          style={{
            position: "absolute",
            right: 8,
            top: "50%",
            transform: "translateY(-50%)",
            backgroundColor: "rgba(255,255,255,0.9)",
            border: "none",
            borderRadius: "50%",
            width: 36,
            height: 36,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <ChevronRight size={18} />
        </button>

        <div style={{ position: "absolute", bottom: 8, left: 8, right: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ color: "white", fontWeight: 700 }}>{currentItem.name}</div>
          <div style={{ backgroundColor: "#10B981", color: "white", padding: "2px 8px", borderRadius: 9999, fontSize: 12 }}>×{currentItem.quantity}</div>
        </div>
      </div>
    </div>
  );
};

export default ItemCarousel;
