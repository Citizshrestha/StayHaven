import { useEffect, useRef } from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosClient from "../axiosClient";
import { getWishlist, getCart } from "../api/user";

const Navbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [isScrolled, setIsScrolled] = useState(false);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [cartCount, setCartCount] = useState(0);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const navigate = useNavigate();
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

  // Handle scroll to change navbar background
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
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

  return (
    <nav
      style={{ padding: "14px" }}
      className="absolute top-0 left-0 right-0 z-50 w-full px-4 sm:px-6 lg:px-8 py-4 bg-[#fff6f6] shadow-sm"
    >
      <div className="max-w-8xl mx-auto">
        {/* Main Navigation */}
        <div className="flex items-center justify-between w-full relative">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div
              style={{ marginLeft: "6rem" }}
              className="w-10 h-10 bg-linear-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg"
            >
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
            </div>
            <span
              className="text-gray-800 text-xl font-light tracking-wider"
              style={{ fontFamily: "Nunito" }}
            >
              Stay<span className="font-bold text-teal-500">Haven</span>
            </span>
          </div>

          {/* Desktop Navigation - Absolutely Centered */}
          <div
            style={{
              position: "absolute",
              left: "46%",
              transform: "translateX(-50%)",
            }}
            className="hidden lg:flex items-center gap-6"
          >
            <button
              onClick={() => navigate("/")}
              className="text-gray-800 hover:text-teal-600 transition font-medium"
            >
              HOME
            </button>
            <button
              onClick={() => navigate("/about")}
              className="text-gray-800 hover:text-teal-600 transition font-medium"
            >
              ABOUT US
            </button>
            <button
              onClick={() => navigate("/destinations")}
              className="text-gray-800 hover:text-teal-600 transition font-medium"
            >
              DESTINATIONS
            </button>
            <button
              onClick={() => navigate("/offers")}
              className="text-gray-800 hover:text-teal-600 transition font-medium"
            >
              OFFERS
            </button>
            <button
              onClick={() => navigate("/memberships")}
              className="text-gray-800 hover:text-teal-600 transition font-medium"
            >
              MEMBERSHIP
            </button>
          </div>

          {/* Right Side - Search and Book Button */}
          <div
            style={{ marginRight: "30px" }}
            className="hidden lg:flex items-center justify-around gap-4 ml-auto"
          >
            <div className="relative" style={{marginRight: "1rem"}}>
              <input
                type="text"
                placeholder="Search here.."
                style={{
                  paddingTop: "8px",
                  paddingBottom: "8px",
                  width: "105%",
                  marginRight: "3rem",
                }}
                className="px-4 py-2 pr-10  border border-gray-500 rounded-md focus:outline-none focus:border-teal-800 text-sm"
              />
              <svg
                className="w-4 h-4 absolute right-0 top-1/2 transform -translate-y-1/2 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            {user ? (
              <>
                <button className="relative text-gray-800 hover:text-red-500 transition">
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                    />
                  </svg>
                  {wishlistCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                      {wishlistCount}
                    </span>
                  )}
                </button>
                <button className="relative text-gray-800 hover:text-teal-600 transition">
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
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
                        className="w-8 h-8 rounded-full object-cover border-2 border-teal-500 cursor-pointer hover:border-teal-600 transition"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center text-white font-semibold cursor-pointer hover:bg-teal-600 transition">
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
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition flex items-center gap-2"
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
              <button
                onClick={handleLogin}
                className="text-gray-800 hover:text-teal-600 transition text-sm font-medium"
              >
                Login
              </button>
            )}
            <button 
            style={{paddingTop: "5px"}}
            className="bg-[#00A797] h-8 w-16 text-white px-6 py-4 rounded-full hover:bg-gray-800 transition font-medium shadow-md">
              Book now
            </button>
          </div>

          {/* Mobile Navigation */}
          <div className="lg:hidden flex items-center gap-2">
            <button
              className="text-gray-700 p-2 hover:text-teal-600 transition"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {isMobileMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div 
            className="lg:hidden fixed top-0 left-0 right-0 bottom-0 z-50"
            style={{ 
              backgroundColor: '#ffffff',
              overflowY: 'auto'
            }}
          >
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              minHeight: '100vh',
              padding: '24px'
            }}>
              {/* Header with Logo and Close Button */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                marginBottom: '32px'
              }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-linear-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
                    <svg
                      className="w-6 h-6 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                      />
                    </svg>
                  </div>
                  <span
                    className="text-gray-800 text-xl font-light tracking-wider"
                    style={{ fontFamily: "Nunito" }}
                  >
                    Stay<span className="font-bold text-teal-500">Haven</span>
                  </span>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  style={{
                    padding: '8px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <svg
                    style={{ width: '24px', height: '24px', color: '#374151' }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {/* Search Bar */}
              <div style={{ 
                position: 'relative',
                marginBottom: '32px'
              }}>
                <input
                  type="text"
                  placeholder="Search destinations..."
                  style={{
                    width: '100%',
                    padding: '14px 50px 14px 16px',
                    border: '1px solid #E5E7EB',
                    borderRadius: '12px',
                    fontSize: '0.875rem',
                    outline: 'none',
                    backgroundColor: '#F9FAFB'
                  }}
                />
                <button
                  style={{
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    backgroundColor: '#10A394',
                    border: 'none',
                    borderRadius: '50%',
                    width: '36px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                >
                  <svg
                    style={{ width: '18px', height: '18px', color: '#ffffff' }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </button>
              </div>

              {/* Navigation Links */}
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '0',
                flex: '1'
              }}>
                <button
                  onClick={() => {
                    navigate("/");
                    setIsMobileMenuOpen(false);
                  }}
                  style={{
                    padding: '16px 20px',
                    backgroundColor: '#CCFBF1',
                    border: 'none',
                    textAlign: 'left',
                    fontSize: '1rem',
                    fontWeight: '600',
                    color: '#111827',
                    cursor: 'pointer',
                    borderRadius: '12px',
                    marginBottom: '8px',
                    fontFamily: 'Nunito'
                  }}
                >
                  HOME
                </button>
                <button
                  onClick={() => {
                    navigate("/about");
                    setIsMobileMenuOpen(false);
                  }}
                  style={{
                    padding: '16px 20px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    textAlign: 'left',
                    fontSize: '1rem',
                    fontWeight: '500',
                    color: '#374151',
                    cursor: 'pointer',
                    fontFamily: 'Nunito'
                  }}
                >
                  ABOUT US
                </button>
                <button
                  onClick={() => {
                    navigate("/destinations");
                    setIsMobileMenuOpen(false);
                  }}
                  style={{
                    padding: '16px 20px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    textAlign: 'left',
                    fontSize: '1rem',
                    fontWeight: '500',
                    color: '#374151',
                    cursor: 'pointer',
                    fontFamily: 'Nunito'
                  }}
                >
                  DESTINATIONS
                </button>
                <button
                  onClick={() => {
                    navigate("/offers");
                    setIsMobileMenuOpen(false);
                  }}
                  style={{
                    padding: '16px 20px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    textAlign: 'left',
                    fontSize: '1rem',
                    fontWeight: '500',
                    color: '#374151',
                    cursor: 'pointer',
                    fontFamily: 'Nunito'
                  }}
                >
                  SPECIAL OFFERS
                </button>
                <button
                  onClick={() => {
                    navigate("/memberships");
                    setIsMobileMenuOpen(false);
                  }}
                  style={{
                    padding: '16px 20px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    textAlign: 'left',
                    fontSize: '1rem',
                    fontWeight: '500',
                    color: '#374151',
                    cursor: 'pointer',
                    fontFamily: 'Nunito'
                  }}
                >
                  MEMBERSHIP
                </button>
                {!user && (
                  <button
                    onClick={() => {
                      handleLogin();
                      setIsMobileMenuOpen(false);
                    }}
                    style={{
                      padding: '16px 20px',
                      backgroundColor: 'transparent',
                      border: 'none',
                      textAlign: 'left',
                      fontSize: '1rem',
                      fontWeight: '500',
                      color: '#374151',
                      cursor: 'pointer',
                      fontFamily: 'Nunito'
                    }}
                  >
                    LOGIN
                  </button>
                )}
                {user && (
                  <button
                    onClick={() => {
                      handleLogout();
                      setIsMobileMenuOpen(false);
                    }}
                    style={{
                      padding: '16px 20px',
                      backgroundColor: 'transparent',
                      border: 'none',
                      textAlign: 'left',
                      fontSize: '1rem',
                      fontWeight: '500',
                      color: '#374151',
                      cursor: 'pointer',
                      fontFamily: 'Nunito'
                    }}
                  >
                    LOGOUT
                  </button>
                )}
              </div>

              {/* Book Now Button at Bottom */}
              <button
                style={{
                  marginTop: 'auto',
                  padding: '16px',
                  backgroundColor: '#10A394',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '1rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  fontFamily: 'Nunito',
                  boxShadow: '0 4px 14px rgba(16, 163, 148, 0.4)'
                }}
                onClick={() => {
                  navigate("/");
                  setIsMobileMenuOpen(false);
                }}
              >
                BOOK NOW
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
