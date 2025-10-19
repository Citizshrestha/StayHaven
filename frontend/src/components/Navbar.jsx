import { useState } from 'react';

const Navbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <nav className="absolute top-2 left-30 right-0 z-50 w-full px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
      <div className="max-w-7xl mx-auto">
        {/* Top Bar - Contact Info */}
        <div className="hidden lg:flex items-center justify-between text-white text-sm mb-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span>booking.hotel@gmail.com</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <span>+01 2136 567 587</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button className="flex items-center gap-1 hover:text-gray-300 transition">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Eng</span>
            </button>
            <button className="flex items-center gap-1 hover:text-gray-300 transition">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>Login</span>
            </button>
          </div>
        </div>

        {/* Main Navigation */}
        <div className="flex items-center justify-between w-full">
          {/* Logo */}
          <div className="text-white text-2xl sm:text-3xl font-light tracking-wider" style={{fontFamily: 'Nunito'}}>
            Stay<span className="font-semibold">Haven</span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-8">
            <a href="#home" className="text-white hover:text-gray-300 transition font-medium">
              Home
            </a>
            <a href="#destinations" className="text-white hover:text-gray-300 transition font-medium">
              Destinations
            </a>
            <a href="#offers" className="text-white hover:text-gray-300 transition font-medium">
              Offers
            </a>
            <div className="relative group">
              <button className="text-white hover:text-gray-300 transition font-medium flex items-center gap-1">
                Memberships
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
            <div className="relative group">
              <button className="text-white hover:text-gray-300 transition font-medium flex items-center gap-1">
                More
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
            <button className="bg-white text-gray-900 px-6 py-2.5 rounded-md hover:bg-gray-100 transition font-medium">
              Add Hotel
            </button>
          </div>

          {/* Mobile Navigation */}
          <div className="lg:hidden flex items-center gap-2">
            <button 
              className="text-white p-2 hover:text-gray-300 transition"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isMobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden absolute top-full left-0 right-0 bg-black/95 backdrop-blur-md border-t border-white/20">
            <div className="px-4 py-6 space-y-4">
              {/* Mobile Contact Info */}
              <div className="flex flex-col space-y-3 text-white text-sm border-b border-white/20 pb-4">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span>booking.hotel@gmail.com</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <span>+01 2136 567 587</span>
                </div>
              </div>

              {/* Mobile Navigation Links */}
              <div className="space-y-4">
                <a href="#home" className="block text-white text-lg font-medium hover:text-gray-300 transition py-2">
                  Home
                </a>
                <a href="#destinations" className="block text-white text-lg font-medium hover:text-gray-300 transition py-2">
                  Destinations
                </a>
                <a href="#offers" className="block text-white text-lg font-medium hover:text-gray-300 transition py-2">
                  Offers
                </a>
                <a href="#memberships" className="block text-white text-lg font-medium hover:text-gray-300 transition py-2">
                  Memberships
                </a>
                <a href="#more" className="block text-white text-lg font-medium hover:text-gray-300 transition py-2">
                  More
                </a>
              </div>

              {/* Mobile Action Buttons */}
              <div className="space-y-3 pt-4 border-t border-white/20">
                <div className="flex items-center gap-4 text-white text-sm">
                  <button className="flex items-center gap-2 hover:text-gray-300 transition">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>English</span>
                  </button>
                  <button className="flex items-center gap-2 hover:text-gray-300 transition">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span>Login</span>
                  </button>
                </div>
                <button className="w-full bg-white text-gray-900 px-6 py-3 rounded-md font-medium hover:bg-gray-100 transition">
                  Add Hotel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
