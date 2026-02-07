import React, { useState } from "react";
import { Menu, X } from "lucide-react";
import Sidebar from "./Sidebar";

const KitchenMobileHeader = ({ isDarkMode = false, onToggleDarkMode }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  // Theme colors
  const colors = {
    bg: isDarkMode ? "#1E293B" : "white",
    border: isDarkMode ? "#334155" : "#E5E7EB",
    text: isDarkMode ? "#F8FAFC" : "#374151",
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
        <div className="flex items-center justify-between">
          <h1 style={{ 
            fontSize: "18px", 
            fontWeight: "700", 
            color: colors.text 
          }}>
            🍳 Kitchen
          </h1>

          {/* Menu Toggle Button */}
          <button
            onClick={toggleMenu}
            style={{
              padding: "8px",
              backgroundColor: "transparent",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
            }}
          >
            {isMenuOpen ? (
              <X size={24} style={{ color: colors.text }} />
            ) : (
              <Menu size={24} style={{ color: colors.text }} />
            )}
          </button>
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
    </>
  );
};

export default KitchenMobileHeader;
