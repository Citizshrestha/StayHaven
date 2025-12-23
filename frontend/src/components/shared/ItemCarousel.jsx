import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * ItemCarousel - A beautiful horizontal carousel to display multiple order items
 * 
 * Features:
 * - Left/Right navigation arrows
 * - Dot indicators for current position
 * - Shows item name, quantity, and special notes
 * - Smooth slide transitions
 * 
 * @param {Array} items - Array of order items with { id, name, quantity, image, notes }
 * @param {number|string} width - Width of the carousel (default: 280, can be "100%" for responsive)
 * @param {number} height - Height of the carousel (default: 200)
 */
const ItemCarousel = ({ items = [], width = 280, height = 200 }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Handle width as number or "100%"
  const widthStyle = typeof width === 'number' ? `${width}px` : width;
  const isNarrow = widthStyle === "100%" || (typeof width === "number" && width <= 360);
  const arrowSize = isNarrow ? 28 : 32;
  const arrowInset = isNarrow ? 6 : 8;
  const arrowIconSize = isNarrow ? 16 : 18;

  // Handle empty or invalid items
  if (!items || items.length === 0) {
    return (
      <div
        style={{
          width: widthStyle,
          height: `${height}px`,
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

  // Single item - no navigation needed
  if (items.length === 1) {
    const item = items[0];
    return (
      <div style={{ width: widthStyle, maxWidth: "100%", flexShrink: 0 }}>
        <div style={{ position: "relative" }}>
          <img
            src={item.image}
            alt={item.name}
            style={{
              width: "100%",
              height: `${height}px`,
              objectFit: "cover",
              borderRadius: "16px",
            }}
          />
          {/* Item info overlay */}
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              padding: "12px",
              background: "linear-gradient(transparent, rgba(0,0,0,0.7))",
              borderBottomLeftRadius: "16px",
              borderBottomRightRadius: "16px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span
                style={{
                  color: "white",
                  fontSize: "14px",
                  fontWeight: "700",
                }}
              >
                {item.name}
              </span>
              <span
                style={{
                  backgroundColor: "#10B981",
                  color: "white",
                  padding: "2px 8px",
                  borderRadius: "9999px",
                  fontSize: "12px",
                  fontWeight: "700",
                }}
              >
                ×{item.quantity}
              </span>
            </div>
            {item.notes && (
              <p
                style={{
                  color: "#FCD34D",
                  fontSize: "11px",
                  marginTop: "4px",
                  fontStyle: "italic",
                }}
              >
                📝 {item.notes}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Multiple items - show carousel with navigation
  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? items.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === items.length - 1 ? 0 : prev + 1));
  };

  const goToSlide = (index) => {
    setCurrentIndex(index);
  };

  const currentItem = items[currentIndex];

  return (
    <div style={{ width: widthStyle, maxWidth: "100%", flexShrink: 0 }}>
      {/* Item counter badge */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "8px",
        }}
      >
        <span
          style={{
            fontSize: "12px",
            fontWeight: "700",
            color: "#6B7280",
          }}
        >
          {items.length} items in order
        </span>
        <span
          style={{
            fontSize: "12px",
            fontWeight: "600",
            color: "#10B981",
          }}
        >
          {currentIndex + 1} / {items.length}
        </span>
      </div>

      {/* Main carousel container */}
      <div style={{ position: "relative" }}>
        {/* Image */}
        <img
          src={currentItem.image}
          alt={currentItem.name}
          style={{
            width: "100%",
            height: `${height}px`,
            objectFit: "cover",
            borderRadius: "16px",
            transition: "opacity 0.3s ease",
          }}
        />

        {/* Left Arrow */}
        <button
          onClick={goToPrevious}
          style={{
            position: "absolute",
            left: `${arrowInset}px`,
            top: "50%",
            transform: "translateY(-50%)",
            backgroundColor: "rgba(255, 255, 255, 0.9)",
            border: "none",
            borderRadius: "50%",
            width: `${arrowSize}px`,
            height: `${arrowSize}px`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "white";
            e.currentTarget.style.transform = "translateY(-50%) scale(1.1)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.9)";
            e.currentTarget.style.transform = "translateY(-50%) scale(1)";
          }}
        >
          <ChevronLeft size={arrowIconSize} style={{ color: "#374151" }} />
        </button>

        {/* Right Arrow */}
        <button
          onClick={goToNext}
          style={{
            position: "absolute",
            right: `${arrowInset}px`,
            top: "50%",
            transform: "translateY(-50%)",
            backgroundColor: "rgba(255, 255, 255, 0.9)",
            border: "none",
            borderRadius: "50%",
            width: `${arrowSize}px`,
            height: `${arrowSize}px`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "white";
            e.currentTarget.style.transform = "translateY(-50%) scale(1.1)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.9)";
            e.currentTarget.style.transform = "translateY(-50%) scale(1)";
          }}
        >
          <ChevronRight size={arrowIconSize} style={{ color: "#374151" }} />
        </button>

        {/* Item info overlay */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            padding: "12px",
            background: "linear-gradient(transparent, rgba(0,0,0,0.8))",
            borderBottomLeftRadius: "16px",
            borderBottomRightRadius: "16px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "8px",
            }}
          >
            <span
              style={{
                color: "white",
                fontSize: "14px",
                fontWeight: "700",
                flex: 1,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {currentItem.name}
            </span>
            <span
              style={{
                backgroundColor: "#10B981",
                color: "white",
                padding: "2px 10px",
                borderRadius: "9999px",
                fontSize: "12px",
                fontWeight: "700",
                flexShrink: 0,
              }}
            >
              ×{currentItem.quantity}
            </span>
          </div>
          {currentItem.notes && (
            <p
              style={{
                color: "#FCD34D",
                fontSize: "11px",
                marginTop: "4px",
                fontStyle: "italic",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              📝 {currentItem.notes}
            </p>
          )}
        </div>

        {/* Dot indicators */}
        <div
          style={{
            position: "absolute",
            top: "8px",
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            gap: "6px",
            padding: "4px 8px",
            backgroundColor: "rgba(0,0,0,0.4)",
            borderRadius: "9999px",
          }}
        >
          {items.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              style={{
                width: index === currentIndex ? "16px" : "8px",
                height: "8px",
                borderRadius: "9999px",
                border: "none",
                cursor: "pointer",
                backgroundColor:
                  index === currentIndex ? "#10B981" : "rgba(255,255,255,0.5)",
                transition: "all 0.3s ease",
              }}
            />
          ))}
        </div>
      </div>

      {/* Quick item list below */}
      <div
        style={{
          marginTop: "12px",
          display: "flex",
          gap: "6px",
          flexWrap: "wrap",
        }}
      >
        {items.map((item, index) => (
          <button
            key={item.id}
            onClick={() => goToSlide(index)}
            style={{
              padding: "4px 10px",
              borderRadius: "8px",
              border: "none",
              fontSize: "11px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.2s",
              backgroundColor:
                index === currentIndex ? "#D1FAE5" : "#F3F4F6",
              color: index === currentIndex ? "#059669" : "#6B7280",
            }}
          >
            {item.quantity}× {item.name.length > 12 ? item.name.slice(0, 12) + "..." : item.name}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ItemCarousel;
