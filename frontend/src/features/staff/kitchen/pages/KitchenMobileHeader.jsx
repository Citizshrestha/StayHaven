import React, { useState } from "react";
import { Menu, X, Flame, RefreshCw } from "lucide-react";
import Sidebar from "./Sidebar";

const KitchenMobileHeader = ({
  isDarkMode = false,
  onToggleDarkMode,
  activeOrderCount = 0,
  onRefresh,
  isRefreshing = false,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showRefreshTooltip, setShowRefreshTooltip] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleRefresh = () => {
    if (onRefresh && !isRefreshing) {
      onRefresh();
      setShowRefreshTooltip(true);
      setTimeout(() => setShowRefreshTooltip(false), 2000);
    }
  };

  // Theme colors
  const colors = {
    bg: isDarkMode ? "#1a1a2e" : "white",
    border: isDarkMode ? "#334155" : "#E5E7EB",
    text: isDarkMode ? "#F8FAFC" : "#1F2937",
    textMuted: isDarkMode ? "#94A3B8" : "#6B7280",
  };

  return (
    <>
      <div
        style={{
          backgroundColor: colors.bg,
          borderBottom: `1px solid ${colors.border}`,
          padding: "16px",
        }}
      >
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
        }}>
          {/* Left: Hamburger Menu */}
          <button
            onClick={toggleMenu}
            style={{
              width: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "transparent",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            {isMenuOpen ? (
              <X size={20} style={{ color: colors.text }} />
            ) : (
              <Menu size={20} style={{ color: colors.text }} />
            )}
          </button>

          {/* Center: Title & Subtitle */}
          <div style={{
            flex: 1,
            textAlign: "center",
            minWidth: 0,
          }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              marginBottom: "2px",
            }}>
              <Flame size={18} color="#f97316" style={{ flexShrink: 0 }} />
              <h1 style={{
                fontSize: "18px",
                fontWeight: "700",
                color: colors.text,
                margin: 0,
                lineHeight: 1,
              }}>
                Kitchen
              </h1>
            </div>
            <p style={{
              fontSize: "12px",
              color: colors.textMuted,
              margin: 0,
              lineHeight: 1,
            }}>
              Live Orders · {activeOrderCount} active
            </p>
          </div>

          {/* Right: Refresh Button */}
          <div style={{ position: "relative" }}>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              style={{
                width: "32px",
                height: "32px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "transparent",
                border: "none",
                borderRadius: "50%",
                cursor: isRefreshing ? "not-allowed" : "pointer",
                flexShrink: 0,
                opacity: isRefreshing ? 0.6 : 1,
              }}
            >
              <RefreshCw
                size={18}
                style={{
                  color: colors.text,
                  animation: isRefreshing ? "spin 1s linear infinite" : "none",
                }}
              />
            </button>

            {/* Tooltip */}
            {showRefreshTooltip && (
              <div style={{
                position: "absolute",
                top: "100%",
                right: 0,
                marginTop: "4px",
                padding: "4px 8px",
                backgroundColor: isDarkMode ? "#334155" : "#1F2937",
                color: "white",
                fontSize: "11px",
                borderRadius: "6px",
                whiteSpace: "nowrap",
                zIndex: 10,
                boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
              }}>
                Updated just now
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Background Overlay */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: "rgba(0, 0, 0, 0.5)",
            }}
            onClick={toggleMenu}
          />

          {/* Sidebar Drawer */}
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: "280px",
              backgroundColor: colors.bg,
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
            }}
          >
            <Sidebar
              isDarkMode={isDarkMode}
              onToggleDarkMode={onToggleDarkMode}
              onViewChange={() => setIsMenuOpen(false)}
            />
          </div>
        </div>
      )}

      {/* CSS for spin animation */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
};

export default KitchenMobileHeader;
