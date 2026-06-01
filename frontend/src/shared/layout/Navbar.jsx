import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Menu, X, Heart, ShoppingCart, Building2, Search } from 'lucide-react';
import axiosClient from "../../core/api/client";
import { getWishlist, getCart } from "../../core/api/services/user.service";
import { Button } from "../ui/button";
import NoBookingsModal from "../components/NoBookingsModal";
import './Navbar.css';

const Navbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [cartCount, setCartCount] = useState(0);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [showNoBookingsModal, setShowNoBookingsModal] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsProfileDropdownOpen(false);
      }
    };

    if (isProfileDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isProfileDropdownOpen]);

  // Load wishlist and cart count from server when authenticated
  useEffect(() => {
    const init = async () => {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        setWishlistCount(0);
        setCartCount(0);
        return;
      }
      try {
        const { wishlist } = await getWishlist();
        setWishlistCount(wishlist.length);

        const { cart } = await getCart();
        setCartCount(cart.length);
      } catch {
        setWishlistCount(0);
        setCartCount(0);
      }
    };
    init();
  }, []);

  // Listen for wishlist updates
  useEffect(() => {
    const handleWishlistUpdate = async () => {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        setWishlistCount(0);
        return;
      }
      try {
        const { wishlist } = await getWishlist();
        setWishlistCount(wishlist.length);
      } catch {
        setWishlistCount(0);
      }
    };
    window.addEventListener("wishlistUpdated", handleWishlistUpdate);
    return () =>
      window.removeEventListener("wishlistUpdated", handleWishlistUpdate);
  }, []);

  // Listen for cart updates
  useEffect(() => {
    const handleCartUpdate = async () => {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        setCartCount(0);
        return;
      }
      try {
        const { cart } = await getCart();
        setCartCount(cart.length);
      } catch {
        setCartCount(0);
      }
    };
    window.addEventListener("cartUpdated", handleCartUpdate);
    return () => window.removeEventListener("cartUpdated", handleCartUpdate);
  }, []);

  const handleLogin = () => {
    navigate("/login");
  };

  useEffect(() => {
    const accessToken = localStorage.getItem("accessToken");
    const userId = localStorage.getItem("userId");
    const username = localStorage.getItem("username");
    const profilePicture = localStorage.getItem("profilePicture");
    const userRole = localStorage.getItem("userRole");

    if (accessToken && userId && username) {
      setUser({ id: userId, username, profilePicture, role: userRole });
    } else {
      setUser(null);
    }

    const fetchUserData = async () => {
      // Don't fetch if this is a staff session (staff uses different auth)
      const isStaffSession = !!(sessionStorage.getItem('staffAccessToken') || localStorage.getItem('staffAccessToken'));
      if (isStaffSession) {
        return;
      }

      try {
        const res = await axiosClient.get("/api/v1/auth/me");
        const role = res.data.role?.name || res.data.companyRole || 'guest';

        setUser({
          id: res.data._id || res.data.id,
          username: res.data.username,
          profilePicture: res.data.profilePicture,
          role: role,
        });

        if (res.data.profilePicture) {
          localStorage.setItem("profilePicture", res.data.profilePicture);
        }
        if (res.data.username) {
          localStorage.setItem("username", res.data.username);
        }
        if (role) {
          localStorage.setItem("userRole", role);
        }
      } catch (err) {
        // Silently handle 401 errors (user not authenticated)
        if (err.response?.status !== 401) {
          console.error("Error fetching user data:", err);
        }
        setUser(null);
      }
    };

    if (accessToken) {
      fetchUserData();
    }
  }, []);

  const handleLogout = async () => {
    try {
      await axiosClient.post("/api/v1/auth/logout");
      localStorage.clear();
      setUser(null);
      window.location.href = "/";
    } catch (error) {
      console.error("Logout error:", error);
      // Clear localStorage even if logout request fails
      localStorage.clear();
      setUser(null);
      window.location.href = "/";
    }
  };

  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = () => {
    const query = searchQuery.trim();
    navigate(query ? `/hotels?search=${encodeURIComponent(query)}` : '/hotels');
    setSearchQuery('');
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') handleSearch();
  };

  const handleDashboardClick = async () => {
    try {
      // Get user role from state or localStorage
      const userRole = user?.role || localStorage.getItem("userRole") || 'guest';

      // Route based on user role
      if (userRole === 'admin' || userRole === 'superadmin') {
        // Superadmin dashboard
        navigate('/superadmindashboard');
        return;
      }

      if (userRole === 'owner') {
        // Hotel owner dashboard
        navigate('/hoteladmin-dashboard');
        return;
      }

      if (userRole === 'waiter') {
        // Waiter dashboard
        navigate('/waiter-dashboard');
        return;
      }

      if (userRole === 'chief' || userRole === 'kitchen') {
        // Kitchen dashboard
        navigate('/kitchen-dashboard');
        return;
      }

      if (['manager', 'receptionist', 'housekeeping', 'maintenance'].includes(userRole)) {
        // Reception/Staff dashboard
        navigate('/reception-dashboard');
        return;
      }

      // For guests, check if they have bookings
      const response = await axiosClient.get('/api/v1/guest/portal/dashboard');
      const overview = response.data?.data;

      const hasNoBookings =
        !overview?.activeBooking &&
        (!overview?.upcomingBookings || overview.upcomingBookings.length === 0) &&
        (overview?.pastBookingsCount === 0 || !overview?.pastBookingsCount);

      if (hasNoBookings) {
        // Show modal on current page
        setShowNoBookingsModal(true);
      } else {
        // Navigate to guest dashboard
        navigate('/guest-dashboard');
      }
    } catch (error) {
      console.error('Error navigating to dashboard:', error);
      // Default fallback to guest dashboard
      navigate('/guest-dashboard');
    }
  };

  const navLinks = [
    { label: 'HOME', path: '/' },
    { label: 'ABOUT US', path: '/about' },
    { label: 'DESTINATIONS', path: '/destinations' },
    { label: 'OFFERS', path: '/offers' },
    { label: 'MEMBERSHIP', path: '/memberships' },
  ];

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300 bg-white shadow-sm"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-[72px]">
          {/* Logo */}
          <a href="#" onClick={(e) => { e.preventDefault(); navigate('/'); }} className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="StayHaven Logo"
              className="w-16 h-16 object-contain mix-blend-multiply"
            />
            <span
              className="text-xl font-bold transition-colors text-black"
              style={{ fontFamily: "Nunito" }}
            >
              Stay<span className="text-teal-500">Haven</span>
            </span>
          </a>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-8 ml-20">
            {navLinks.map((link) => (
              <button
                key={link.label}
                onClick={() => navigate(link.path)}
                className={`text-sm font-semibold tracking-wide transition-all duration-300 relative group whitespace-nowrap ${location.pathname === link.path ? 'text-teal-600' : 'text-gray-700 hover:text-teal-600'}`}
              >
                {link.label}
                <span className={`absolute -bottom-1 left-0 h-0.5 bg-teal-500 transition-all duration-300 ${location.pathname === link.path ? 'w-full' : 'w-0 group-hover:w-full'
                  }`}></span>
              </button>
            ))}
          </div>

          {/* Desktop Actions */}
          <div className="hidden lg:flex items-center gap-4 ml-8">
            {/* Search Bar */}
            <div className="search-bar relative">
              <input
                type="text"
                placeholder="Search hotels..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                className="pl-4 pr-12 py-2.5 w-56 rounded-full border border-gray-200 bg-white text-gray-700 placeholder-gray-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 text-sm font-medium shadow-sm focus:outline-none focus:w-64 focus:shadow-md transition-all duration-300"
              />
              <button
                onClick={handleSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full transition-colors bg-teal-500 hover:bg-teal-600 text-white shadow-sm"
                aria-label="Search hotels"
              >
                <Search className="w-3.5 h-3.5" />
              </button>
            </div>

            {user ? (
              <>
                <button
                  className="relative transition-colors duration-300 hover:text-red-500 text-gray-700"
                  aria-label="View wishlist"
                >
                  <Heart className="w-6 h-6" />
                  {wishlistCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                      {wishlistCount}
                    </span>
                  )}
                </button>
                <button
                  className="relative transition-colors duration-300 hover:text-teal-600 text-gray-700"
                  aria-label="View cart"
                >
                  <ShoppingCart className="w-6 h-6" />
                  {cartCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-teal-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                      {cartCount}
                    </span>
                  )}
                </button>
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                    className="flex flex-col items-center gap-1.5 focus:outline-none group"
                  >
                    {user.profilePicture ? (
                      <img
                        src={user.profilePicture}
                        alt={user.username}
                        className="w-10 h-10 rounded-full object-cover border-2 border-teal-500 cursor-pointer group-hover:border-teal-600 transition"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-teal-500 flex items-center justify-center text-white font-semibold cursor-pointer group-hover:bg-teal-600 transition">
                        {user.username?.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="text-xs font-medium text-gray-700 group-hover:text-teal-600 transition">
                      {user.username}
                    </span>
                  </button>

                  {/* Dropdown Menu */}
                  {isProfileDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                      <div className="px-4 py-2 border-b border-gray-200">
                        <p className="text-sm font-semibold text-gray-800">{user.username}</p>
                      </div>
                      <button
                        onClick={() => {
                          setIsProfileDropdownOpen(false);
                          handleDashboardClick();
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                          />
                        </svg>
                        My Dashboard
                      </button>
                      <button
                        onClick={() => {
                          setIsProfileDropdownOpen(false);
                          handleLogout();
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                          />
                        </svg>
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Button
                  onClick={handleLogin}
                  variant="outline"
                  className="rounded-2xl px-5 transition-all border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Sign in
                </Button>
              </>
            )}
            <Button
              onClick={() => navigate('/hotels')}
              className="bg-gradient-to-r from-teal-500 to-teal-700 hover:from-teal-600 hover:to-teal-800 rounded-2xl px-6 text-white"
              aria-label="Book your stay now"
            >
              Book now
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="lg:hidden p-2 transition-colors text-gray-900"
            aria-label="Open menu"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Mobile Drawer Overlay */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-[100] flex justify-end">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          
          {/* Sidebar Drawer */}
          <div className="relative w-[85vw] max-w-sm bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <a href="#" onClick={(e) => { e.preventDefault(); navigate('/'); setIsMobileMenuOpen(false); }} className="flex items-center gap-2">
                <img
                  src="/logo.png"
                  alt="StayHaven Logo"
                  className="w-10 h-10 object-contain"
                />
                <span
                  className="text-lg font-bold text-gray-900"
                  style={{ fontFamily: "Nunito" }}
                >
                  Stay<span className="text-teal-500">Haven</span>
                </span>
              </a>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 text-gray-500 hover:text-gray-900 transition-colors rounded-full hover:bg-gray-100"
                aria-label="Close menu"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto w-full">
              <div className="px-5 py-6 flex flex-col gap-6">
                {/* Mobile Search */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search hotels..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSearch();
                        setIsMobileMenuOpen(false);
                      }
                    }}
                    className="w-full pl-4 pr-12 py-3.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-800 text-sm focus:outline-none focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-500/20 transition-all"
                  />
                  <button
                    onClick={() => {
                      handleSearch();
                      setIsMobileMenuOpen(false);
                    }}
                    className="absolute right-1.5 top-1.5 bottom-1.5 bg-teal-500 hover:bg-teal-600 text-white rounded-lg px-3 transition-colors shadow-sm flex items-center justify-center"
                  >
                    <Search className="w-4 h-4" />
                  </button>
                </div>

                {/* Nav Links */}
                <div className="flex flex-col gap-1 -mx-2">
                  {navLinks.map((link) => (
                    <button
                      key={link.label}
                      onClick={() => {
                        navigate(link.path);
                        setIsMobileMenuOpen(false);
                      }}
                      className={`text-left font-semibold py-3.5 px-4 rounded-xl transition-all ${
                        location.pathname === link.path 
                          ? 'text-teal-600 bg-teal-50/80' 
                          : 'text-gray-700 hover:bg-gray-50 hover:text-teal-600'
                      }`}
                    >
                      {link.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Actions Fixed Footer */}
            <div className="px-5 py-5 border-t border-gray-100 bg-gray-50/50 mt-auto flex-none flex flex-col gap-4">
                {/* User Info & Actions */}
                {user ? (
                  <div className="flex flex-col gap-4">
                    {/* User Profile Badge */}
                    <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                      {user.profilePicture ? (
                        <img
                          src={user.profilePicture}
                          alt={user.username}
                          className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-teal-500 flex items-center justify-center text-white font-bold shadow-sm">
                          {user.username?.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="overflow-hidden">
                        <p className="font-semibold text-gray-900 truncate">Hello, {user.username}</p>
                        <p className="text-xs text-gray-500 truncate">Welcome back</p>
                      </div>
                    </div>

                    <div className="flex bg-white border border-gray-100 shadow-sm rounded-xl p-1">
                       <button className="flex-1 flex flex-col items-center justify-center gap-1.5 py-2.5 text-gray-600 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50/50">
                          <div className="relative">
                            <Heart className="w-5 h-5" />
                            {wishlistCount > 0 && <span className="absolute -top-1.5 -right-2.5 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">{wishlistCount}</span>}
                          </div>
                          <span className="text-[11px] font-bold tracking-wide">Wishlist</span>
                       </button>
                       <div className="w-px bg-gray-100 mx-1 my-2"></div>
                       <button className="flex-1 flex flex-col items-center justify-center gap-1.5 py-2.5 text-gray-600 hover:text-teal-600 transition-colors rounded-lg hover:bg-teal-50/50">
                          <div className="relative">
                            <ShoppingCart className="w-5 h-5" />
                            {cartCount > 0 && <span className="absolute -top-1.5 -right-2.5 bg-teal-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">{cartCount}</span>}
                          </div>
                          <span className="text-[11px] font-bold tracking-wide">Cart</span>
                       </button>
                    </div>

                    <Button
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        handleDashboardClick();
                      }}
                      variant="outline"
                      className="w-full rounded-xl py-6 font-semibold border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-teal-600 bg-white flex items-center justify-center gap-2"
                    >
                      <Building2 className="w-4 h-4" />
                      My Dashboard
                    </Button>

                    <Button
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        handleLogout();
                      }}
                      variant="outline"
                      className="w-full rounded-xl py-6 font-semibold border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900 bg-white"
                    >
                      Sign out
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      handleLogin();
                    }}
                    variant="outline"
                    className="w-full rounded-xl py-6 border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 hover:text-gray-900 shadow-sm bg-white"
                  >
                    Sign in
                  </Button>
                )}

                <Button
                  onClick={() => {
                    navigate('/hotels');
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full rounded-xl py-6 text-white font-semibold text-base shadow-lg shadow-teal-500/25 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 border-none"
                >
                  Book your stay
                </Button>
            </div>
          </div>
        </div>
      )}

      {/* No Bookings Modal */}
      <NoBookingsModal
        isOpen={showNoBookingsModal}
        onClose={() => setShowNoBookingsModal(false)}
      />
    </nav>
  );
};

export default Navbar;

