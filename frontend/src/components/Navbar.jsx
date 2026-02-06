import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Menu, X, Heart, ShoppingCart, Building2, Search } from 'lucide-react';
import axiosClient from "../axiosClient";
import { getWishlist, getCart } from "../api/user";
import { Button } from "./ui/button";
import './Navbar.css';

const Navbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [cartCount, setCartCount] = useState(0);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const dropdownRef = useRef(null);
  const sentinelRef = useRef(null);

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

  // Handle scroll to change navbar background using Intersection Observer
  useEffect(() => {
    const sentinel = document.createElement('div');
    sentinel.style.position = 'absolute';
    sentinel.style.top = '0';
    sentinel.style.height = '100px';
    sentinel.style.width = '1px';
    sentinel.style.pointerEvents = 'none';
    document.body.prepend(sentinel);
    sentinelRef.current = sentinel;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // When sentinel is NOT intersecting (out of view), we've scrolled
        setIsScrolled(!entry.isIntersecting);
      },
      {
        threshold: 0,
        rootMargin: '-1px 0px 0px 0px'
      }
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
      sentinel.remove();
    };
  }, []);

  const handleLogin = () => {
    navigate("/login");
  };

  useEffect(() => {
    const accessToken = localStorage.getItem("accessToken");
    const userId = localStorage.getItem("userId");
    const username = localStorage.getItem("username");
    const profilePicture = localStorage.getItem("profilePicture");

    if (accessToken && userId && username) {
      setUser({ id: userId, username, profilePicture });
    } else {
      setUser(null);
    }

    const fetchUserData = async () => {
      try {
        const res = await axiosClient.get("/api/auth/me");
        setUser({
          id: res.data._id || res.data.id,
          username: res.data.username,
          profilePicture: res.data.profilePicture,
        });

        if (res.data.profilePicture) {
          localStorage.setItem("profilePicture", res.data.profilePicture);
        }
        if (res.data.username) {
          localStorage.setItem("username", res.data.username);
        }
      } catch (err) {
        console.error("Error fetching user data:", err);
        setUser(null);
      }
    };

    if (accessToken) {
      fetchUserData();
    }
  }, []);

  const handleLogout = async () => {
    try {
      await axiosClient.post("/api/auth/logout");
      localStorage.clear();
      setUser(null);
      window.location.href = "/";
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = () => {
    navigate('/hotels', searchQuery ? { state: { query: searchQuery } } : undefined);
    setSearchQuery('');
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') handleSearch();
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
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-white/95 backdrop-blur-md shadow-sm'
          : 'bg-transparent'
      }`}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-[72px]">
          {/* Logo */}
          <a href="#" onClick={(e) => { e.preventDefault(); navigate('/'); }} className="flex items-center gap-3">
            <img 
              src="/logo.png" 
              alt="StayHaven Logo" 
              className="w-16 h-16 object-contain"
            />
            <span
              className="text-xl font-bold text-black transition-colors"
              style={{ fontFamily: "Nunito" }}
            >
              Stay<span className="text-teal-500">Haven</span>
            </span>
          </a>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <button
                key={link.label}
                onClick={() => navigate(link.path)}
                className={`text-sm font-semibold tracking-wide transition-all duration-300 relative group ${
                  location.pathname === link.path
                    ? 'text-teal-600'
                    : 'text-gray-700 hover:text-teal-600'
                }`}
              >
                {link.label}
                <span className={`absolute -bottom-1 left-0 h-0.5 bg-teal-500 transition-all duration-300 ${
                  location.pathname === link.path ? 'w-full' : 'w-0 group-hover:w-full'
                }`}></span>
              </button>
            ))}
          </div>

          {/* Desktop Actions */}
          <div className="hidden lg:flex items-center gap-4">
            {/* Search Bar */}
            <div className="search-bar relative">
              <input
                type="text"
                placeholder="Search hotels..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                className="pl-4 pr-12 py-2.5 w-56 text-black rounded-full border border-gray-200 bg-white text-gray-700 placeholder-gray-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 text-sm font-medium shadow-sm focus:outline-none focus:w-64 focus:shadow-md transition-all duration-300"
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
                    className="flex items-center gap-2 focus:outline-none"
                  >
                    {user.profilePicture ? (
                      <img
                        src={user.profilePicture}
                        alt={user.username}
                        className="w-9 h-9 rounded-full object-cover border-2 border-teal-500 cursor-pointer hover:border-teal-600 transition"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-teal-500 flex items-center justify-center text-white font-semibold cursor-pointer hover:bg-teal-600 transition">
                        {user.username?.charAt(0).toUpperCase()}
                      </div>
                    )}
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
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 transition-colors text-gray-900"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden bg-white border-t shadow-lg">
          <div className="container mx-auto px-4 sm:px-6 py-6 flex flex-col gap-4">
            {/* Mobile Search */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
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
                className="w-full pl-12 pr-14 py-3.5 rounded-2xl border border-gray-200 bg-gray-50/80 backdrop-blur-sm text-gray-800 text-sm font-medium focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:bg-white transition-all duration-200"
              />
              <button
                onClick={() => {
                  handleSearch();
                  setIsMobileMenuOpen(false);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-teal-500 hover:bg-teal-600 text-white p-2.5 rounded-xl shadow-sm transition-colors duration-200"
              >
                <Search className="w-4 h-4" />
              </button>
            </div>

            {navLinks.map((link) => (
              <button
                key={link.label}
                onClick={() => {
                  navigate(link.path);
                  setIsMobileMenuOpen(false);
                }}
                className={`text-left font-medium py-2 ${
                  location.pathname === link.path ? 'text-teal-600' : 'text-gray-900'
                }`}
              >
                {link.label}
              </button>
            ))}
            <hr className="my-2" />
            {user ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-4">
                  <button className="flex items-center gap-2 text-gray-700">
                    <Heart className="w-5 h-5" />
                    <span>Wishlist ({wishlistCount})</span>
                  </button>
                  <button className="flex items-center gap-2 text-gray-700">
                    <ShoppingCart className="w-5 h-5" />
                    <span>Cart ({cartCount})</span>
                  </button>
                </div>
                <Button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    handleLogout();
                  }}
                  variant="outline"
                  className="w-full rounded-2xl"
                >
                  Logout
                </Button>
              </div>
            ) : (
              <div className="flex gap-3 mt-2">
                <Button 
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    handleLogin();
                  }}
                  variant="outline" 
                  className="flex-1 rounded-2xl"
                >
                  Sign in
                </Button>
              </div>
            )}
            <Button 
              onClick={() => {
                navigate('/hotels');
                setIsMobileMenuOpen(false);
              }}
              className="bg-gradient-to-r from-teal-500 to-teal-700 w-full rounded-2xl text-white">
              Book now
            </Button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
