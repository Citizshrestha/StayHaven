import React, { useState } from "react";
import { Menu, X } from "lucide-react";
import Sidebar from "./Sidebar";
import { useTheme } from "../../hooks/useTheme";

const MobileHeader = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { isDark } = useTheme();

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  // Theme-aware styles
  const headerStyle = {
    backgroundColor: 'var(--bg-primary)',
    borderBottom: '1px solid var(--border-color)',
    padding: '16px',
  };

  const buttonStyle = {
    padding: '8px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  };

  const iconColor = isDark ? '#F8FAFC' : '#374151';

  return (
    <>
      <div style={headerStyle}>
        <div className="flex items-center justify-between">
          {/* Menu Toggle Button */}
          <button
            onClick={toggleMenu}
            style={buttonStyle}
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
          >
            {isMenuOpen ? (
              <X size={24} style={{ color: iconColor }} />
            ) : (
              <Menu size={24} style={{ color: iconColor }} />
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
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
            }}
            onClick={toggleMenu}
          />

          {/* Sidebar Drawer */}
          <div 
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: '280px',
              backgroundColor: 'var(--bg-primary)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            }}
          >
            <Sidebar onViewChange={() => setIsMenuOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
};

export default MobileHeader;
