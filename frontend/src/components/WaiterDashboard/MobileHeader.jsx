import React, { useState } from "react";
import { Menu, X } from "lucide-react";
import Sidebar from "./Sidebar";

const MobileHeader = () => {
  // 🎯 TODO: Add useState for isMenuOpen (boolean)
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // 🎯 TODO: Add toggle function for menu
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <>
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-200 rounded-full flex items-center justify-center">
              <span className="text-sm font-semibold text-orange-800">AM</span>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Alex Miller</h3>
              <p className="text-xs text-gray-500">Waiter</p>
            </div>
          </div>

          {/* Menu Toggle Button */}
          <button
            onClick={toggleMenu}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {/* Conditionally render X or Menu icon based on isMenuOpen */}
            {isMenuOpen ? (
              <X className="w-6 h-6 text-gray-700" />
            ) : (
              <Menu className="w-6 h-6 text-gray-700" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {/* Conditionally render this based on isMenuOpen state */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Background Overlay */}
          <div
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={toggleMenu}
          />

          {/* Sidebar Drawer */}
          <div className="absolute left-0 top-0 bottom-0 w-64 bg-white shadow-xl">
            <Sidebar />
          </div>
        </div>
      )}
    </>
  );
};

export default MobileHeader;
