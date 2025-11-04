import { useEffect } from 'react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../axiosClient';
import { getWishlist, getCart } from '../api/user';

const Navbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [cartCount, setCartCount] = useState(0);
  const navigate = useNavigate();

  // Load wishlist and cart count from server when authenticated
  useEffect(() => {
    const init = async () => {
      const token = localStorage.getItem('accessToken');
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
      const token = localStorage.getItem('accessToken');
      if (!token) { setWishlistCount(0); return; }
      try {
        const { wishlist } = await getWishlist();
        setWishlistCount(wishlist.length);
      } catch {
        setWishlistCount(0);
      }
    };
    window.addEventListener('wishlistUpdated', handleWishlistUpdate);
    return () => window.removeEventListener('wishlistUpdated', handleWishlistUpdate);
  }, []);

  // Listen for cart updates
  useEffect(() => {
    const handleCartUpdate = async () => {
      const token = localStorage.getItem('accessToken');
      if (!token) { setCartCount(0); return; }
      try {
        const { cart } = await getCart();
        setCartCount(cart.length);
      } catch {
        setCartCount(0);
      }
    };
    window.addEventListener('cartUpdated', handleCartUpdate);
    return () => window.removeEventListener('cartUpdated', handleCartUpdate);
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

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);


  const handleLogin = () => {
    navigate('/login')
  }

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
          profilePicture: res.data.profilePicture
        });

        if (res.data.profilePicture) {
          localStorage.setItem("profilePicture", res.data.profilePicture);
        }
        if (res.data.username) {
          localStorage.setItem("username", res.data.username);
        }
      } catch (err) {
        console.error('Error fetching user data:', err);
        setUser(null);
      }
    };

    if (accessToken) {
      fetchUserData();
    }
  }, []);

  const handleLogout = async () => {
    try {
      await axiosClient.post('/api/auth/logout');
      localStorage.clear();
      setUser(null);
      window.location.href = '/';
    } catch (error) {
      console.error('Logout error:', error);
    }
  };
  

  return (
    <nav className="absolute top-2 left-20 right-0 z-50 w-full px-4 sm:px-6 lg:px-8 py-3 sm:py-4 bg-transparent transition-all duration-300">
      <div className="max-w-7xl mx-auto">
        {/* Top Bar - Contact Info */}
        <div className="hidden lg:flex items-center justify-between text-white text-sm mb-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span className='text-black'>booking.hotel@gmail.com</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <span className='text-black'>+01 2136 567 587</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button className="flex items-center gap-1 text-white hover:text-teal-300 transition">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-white">Eng</span>
            </button>
            {/* Wishlist/Favorites Icon with Counter */}
            <button className="relative flex items-center gap-1 text-white hover:text-red-400 transition">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              {wishlistCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {wishlistCount}
                </span>
              )}
            </button>
            {/* Cart Icon with Counter */}
            <button className="relative flex items-center gap-1 text-white hover:text-teal-400 transition">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-teal-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>
            {user ? (
              <>
                <div className="flex items-center gap-2">
                  {user.profilePicture ? (
                    <img 
                      src={user.profilePicture} 
                      alt={user.username}
                      className="w-8 h-8 rounded-full object-cover border-2 border-white"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center text-white font-semibold">
                      {user.username?.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="text-white font-medium">{user.username}</span>
                </div>
                <button 
                  onClick={handleLogout}
                  className="flex items-center gap-1 text-white hover:text-red-400 transition">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span className="text-white">Logout</span>
                </button>
              </>
            ) : (
              <button 
                onClick={handleLogin}
                className="flex items-center gap-1 text-white hover:text-teal-300 transition">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="text-white">Login</span>
              </button>
            )}
          </div>
        </div>

        {/* Main Navigation */}
        <div className="flex items-center justify-between w-full">
          {/* Logo */}
              <div 
            className="flex items-center justify-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <span className="text-gray-800 text-xl font-light tracking-wider" style={{fontFamily: 'Nunito'}}>
                Stay<span className="font-bold text-teal-500">Haven</span>
              </span>
            </div>
          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-8">
            <button
              onClick={() => navigate('/home')}
              className="text-white hover:text-teal-300 transition font-medium"
            >
              Home
            </button>
            <a
              href="#destination"
              className="text-white hover:text-teal-300 transition font-medium"
            >
              Destinations
            </a>
            <button
              onClick={() => navigate('/offers')}
              className="text-white hover:text-teal-300 transition font-medium"
            >
              Offers
            </button>
            <button
              onClick={() => navigate('/memberships')}
              className="text-white hover:text-teal-300 transition font-medium flex items-center gap-1"
            >
              Memberships
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div className="relative group">
              <button className="text-white hover:text-teal-300 transition font-medium flex items-center gap-1">
                More
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
            <button className="bg-teal-600 text-white px-6 py-2.5 rounded-md hover:bg-teal-700 transition font-medium shadow-md">
              Add Hotel
            </button>
          </div>

          {/* Mobile Navigation */}
          <div className="lg:hidden flex items-center gap-2">
            <button 
              className="text-gray-700 p-2 hover:text-teal-600 transition"
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
                <button
                  onClick={() => navigate('/home')}
                  className="block text-white text-lg font-medium hover:text-gray-300 transition py-2 w-full text-left bg-none border-none cursor-pointer"
                >
                  Home
                </button>
                <a
                  href="#destination"
                  className="block text-white text-lg font-medium hover:text-gray-300 transition py-2 text-left w-full"
                >
                  Destinations
                </a>
                <button
                  onClick={() => navigate('/offers')}
                  className="block text-white text-lg font-medium hover:text-gray-300 transition py-2 w-full text-left bg-none border-none cursor-pointer"
                >
                  Offers
                </button>
                <button
                  onClick={() => navigate('/memberships')}
                  className="block text-white text-lg font-medium hover:text-gray-300 transition py-2 w-full text-left bg-none border-none cursor-pointer"
                >
                  Memberships
                </button>
                <a href="#more" className="block text-white text-lg font-medium hover:text-gray-300 transition py-2">
                  More
                </a>
              </div>

              {/* Mobile Action Buttons */}
              <div className="space-y-3 pt-4 border-t border-white/20">
                {user ? (
                  <>
                    <div className="flex items-center gap-3 text-white">
                      {user.profilePicture ? (
                        <img 
                          src={user.profilePicture} 
                          alt={user.username}
                          className="w-10 h-10 rounded-full object-cover border-2 border-white"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-teal-500 flex items-center justify-center text-white font-semibold text-lg">
                          {user.username?.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="font-medium text-white text-lg">{user.username}</span>
                    </div>
                    <button 
                      onClick={handleLogout}
                      className="w-full flex items-center justify-center gap-2 text-white  transition py-2 border border-white/30 rounded-md">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      <span className='text-white'>Logout</span>
                    </button>
                  </>
                ) : (
                  <div className="flex items-center gap-4 text-white text-sm">
                    <button className="flex items-center gap-2 hover:text-gray-300 transition">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className='text-white'>English</span>
                    </button>
                    <button 
                      onClick={handleLogin}
                      className="flex items-center gap-2 hover:text-gray-300 transition">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span>Login</span>
                    </button>
                  </div>
                )}
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
