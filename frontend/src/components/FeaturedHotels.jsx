import { useState, useEffect,  } from 'react';
import { getWishlist, toggleWishlist as toggleWishlistApi } from '../api/user';
import { toast } from 'react-toastify';
import {useNavigate} from "react-router-dom";
// Hotel data moved outside component to avoid dependency issues
const allHotels = [
    {
      id: 1,
      name: 'Azure Haven Resort',
      price: 8500,
      image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=2070&auto=format&fit=crop',
      badge: 'Most Popular',
      badgeColor: 'bg-blue-600',
      rooms: 3,
      bathrooms: 1,
      area: '8\'9 m2',
      rating: 5,
      reviews: 9,
      location: 'Thailand',
      category: 'Resort'
    },
    {
      id: 2,
      name: 'Serene Vista Hotel',
      price: 4500,
      image: 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?q=80&w=2070&auto=format&fit=crop',
      badge: 'New Launched',
      badgeColor: 'bg-red-600',
      rooms: 3,
      bathrooms: 1,
      area: '8\'9 m2',
      rating: 5,
      reviews: 9,
      location: 'Thailand',
      category: 'Hotel'
    },
    {
      id: 3,
      name: 'Velvet Nest Suites',
      price: 5200,
      image: 'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?q=80&w=2049&auto=format&fit=crop',
      badge: 'Most Popular',
      badgeColor: 'bg-blue-600',
      rooms: 3,
      bathrooms: 1,
      area: '8\'9 m2',
      rating: 5,
      reviews: 9,
      location: 'Thailand',
      category: 'Hotel'
    },
    {
      id: 4,
      name: 'Lush Bloom Villa',
      price: 12500,
      image: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?q=80&w=2071&auto=format&fit=crop',
      badge: 'New Launched',
      badgeColor: 'bg-red-600',
      rooms: 3,
      bathrooms: 1,
      area: '8\'9 m2',
      rating: 5,
      reviews: 9,
      location: 'Thailand',
      category: 'Villa'
    },
    {
      id: 5,
      name: 'Golden Sands Resort',
      price: 9800,
      image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=2070&auto=format&fit=crop',
      badge: 'Most Popular',
      badgeColor: 'bg-blue-600',
      rooms: 4,
      bathrooms: 2,
      area: '10\'5 m2',
      rating: 5,
      reviews: 12,
      location: 'Maldives',
      category: 'Resort'
    },
    {
      id: 6,
      name: 'Ocean Breeze Hotel',
      price: 3800,
      image: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?q=80&w=2080&auto=format&fit=crop',
      badge: 'New Launched',
      badgeColor: 'bg-red-600',
      rooms: 2,
      bathrooms: 1,
      area: '7\'2 m2',
      rating: 4,
      reviews: 7,
      location: 'Bali',
      category: 'Hotel'
    },
    {
      id: 7,
      name: 'Mountain View Cottage',
      price: 3200,
      image: 'https://images.unsplash.com/photo-1518780664697-55e3ad937233?q=80&w=2065&auto=format&fit=crop',
      badge: 'Most Popular',
      badgeColor: 'bg-blue-600',
      rooms: 2,
      bathrooms: 1,
      area: '6\'5 m2',
      rating: 5,
      reviews: 8,
      location: 'Switzerland',
      category: 'Cottage'
    },
    {
      id: 8,
      name: 'Sunset Bungalow',
      price: 4200,
      image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=2070&auto=format&fit=crop',
      badge: 'New Launched',
      badgeColor: 'bg-red-600',
      rooms: 3,
      bathrooms: 2,
      area: '9\'0 m2',
      rating: 4,
      reviews: 6,
      location: 'Fiji',
      category: 'Bungalow'
    },
    {
      id: 9,
      name: 'Urban Duplex Suite',
      price: 6500,
      image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=2075&auto=format&fit=crop',
      badge: 'Most Popular',
      badgeColor: 'bg-blue-600',
      rooms: 4,
      bathrooms: 2,
      area: '11\'2 m2',
      rating: 5,
      reviews: 10,
      location: 'Dubai',
      category: 'Duplex'
    },
    {
      id: 10,
      name: 'Paradise Resort & Spa',
      price: 11500,
      image: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?q=80&w=2070&auto=format&fit=crop',
      badge: 'New Launched',
      badgeColor: 'bg-red-600',
      rooms: 5,
      bathrooms: 3,
      area: '12\'8 m2',
      rating: 5,
      reviews: 15,
      location: 'Seychelles',
      category: 'Resort'
    },
    // Additional Hotels
    {
      id: 11,
      name: 'Grand Plaza Hotel',
      price: 5500,
      image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?q=80&w=2070&auto=format&fit=crop',
      badge: 'Most Popular',
      badgeColor: 'bg-blue-600',
      rooms: 2,
      bathrooms: 1,
      area: '7\'5 m2',
      rating: 4,
      reviews: 11,
      location: 'Singapore',
      category: 'Hotel'
    },
    {
      id: 12,
      name: 'Skyline Boutique Hotel',
      price: 4800,
      image: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?q=80&w=2070&auto=format&fit=crop',
      badge: 'New Launched',
      badgeColor: 'bg-red-600',
      rooms: 3,
      bathrooms: 2,
      area: '8\'2 m2',
      rating: 5,
      reviews: 8,
      location: 'Bangkok',
      category: 'Hotel'
    },
    {
      id: 13,
      name: 'Royal Heritage Hotel',
      price: 6200,
      image: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?q=80&w=2074&auto=format&fit=crop',
      badge: 'Most Popular',
      badgeColor: 'bg-blue-600',
      rooms: 4,
      bathrooms: 2,
      area: '9\'8 m2',
      rating: 5,
      reviews: 14,
      location: 'Kathmandu',
      category: 'Hotel'
    },
    {
      id: 14,
      name: 'Crystal Bay Hotel',
      price: 3900,
      image: 'https://images.unsplash.com/photo-1455587734955-081b22074882?q=80&w=2070&auto=format&fit=crop',
      badge: 'New Launched',
      badgeColor: 'bg-red-600',
      rooms: 2,
      bathrooms: 1,
      area: '6\'8 m2',
      rating: 4,
      reviews: 6,
      location: 'Phuket',
      category: 'Hotel'
    },
    // Additional Villas
    {
      id: 15,
      name: 'Emerald Garden Villa',
      price: 15500,
      image: 'https://images.unsplash.com/photo-1602343168117-bb8ffe3e2e9f?q=80&w=2075&auto=format&fit=crop',
      badge: 'Most Popular',
      badgeColor: 'bg-blue-600',
      rooms: 5,
      bathrooms: 3,
      area: '14\'2 m2',
      rating: 5,
      reviews: 18,
      location: 'Bali',
      category: 'Villa'
    },
    {
      id: 16,
      name: 'Sunset Paradise Villa',
      price: 13800,
      image: 'https://images.unsplash.com/photo-1613977257363-707ba9348227?q=80&w=2070&auto=format&fit=crop',
      badge: 'New Launched',
      badgeColor: 'bg-red-600',
      rooms: 4,
      bathrooms: 3,
      area: '12\'6 m2',
      rating: 5,
      reviews: 12,
      location: 'Phuket',
      category: 'Villa'
    },
    {
      id: 17,
      name: 'Oceanfront Luxury Villa',
      price: 18500,
      image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=2070&auto=format&fit=crop',
      badge: 'Most Popular',
      badgeColor: 'bg-blue-600',
      rooms: 6,
      bathrooms: 4,
      area: '16\'5 m2',
      rating: 5,
      reviews: 22,
      location: 'Maldives',
      category: 'Villa'
    },
    {
      id: 18,
      name: 'Mountain Peak Villa',
      price: 11200,
      image: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?q=80&w=2053&auto=format&fit=crop',
      badge: 'New Launched',
      badgeColor: 'bg-red-600',
      rooms: 3,
      bathrooms: 2,
      area: '10\'8 m2',
      rating: 4,
      reviews: 9,
      location: 'Pokhara',
      category: 'Villa'
    },
    // Additional Resorts
    {
      id: 19,
      name: 'Coral Reef Resort',
      price: 10500,
      image: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?q=80&w=2080&auto=format&fit=crop',
      badge: 'Most Popular',
      badgeColor: 'bg-blue-600',
      rooms: 4,
      bathrooms: 2,
      area: '11\'3 m2',
      rating: 5,
      reviews: 16,
      location: 'Mauritius',
      category: 'Resort'
    },
    {
      id: 20,
      name: 'Tranquil Waters Resort',
      price: 9200,
      image: 'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?q=80&w=2070&auto=format&fit=crop',
      badge: 'New Launched',
      badgeColor: 'bg-red-600',
      rooms: 3,
      bathrooms: 2,
      area: '9\'7 m2',
      rating: 4,
      reviews: 10,
      location: 'Krabi',
      category: 'Resort'
    },
    {
      id: 21,
      name: 'Tropical Breeze Resort',
      price: 12800,
      image: 'https://images.unsplash.com/photo-1540541338287-41700207dee6?q=80&w=2070&auto=format&fit=crop',
      badge: 'Most Popular',
      badgeColor: 'bg-blue-600',
      rooms: 5,
      bathrooms: 3,
      area: '13\'2 m2',
      rating: 5,
      reviews: 19,
      location: 'Fiji',
      category: 'Resort'
    },
    // Additional Cottages
    {
      id: 22,
      name: 'Riverside Cottage',
      price: 2800,
      image: 'https://images.unsplash.com/photo-1499696010180-025ef6e1a8f9?q=80&w=2070&auto=format&fit=crop',
      badge: 'Most Popular',
      badgeColor: 'bg-blue-600',
      rooms: 2,
      bathrooms: 1,
      area: '5\'8 m2',
      rating: 4,
      reviews: 7,
      location: 'Scotland',
      category: 'Cottage'
    },
    {
      id: 23,
      name: 'Forest Haven Cottage',
      price: 3500,
      image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=2070&auto=format&fit=crop',
      badge: 'New Launched',
      badgeColor: 'bg-red-600',
      rooms: 3,
      bathrooms: 1,
      area: '6\'9 m2',
      rating: 5,
      reviews: 5,
      location: 'Canada',
      category: 'Cottage'
    },
    {
      id: 24,
      name: 'Alpine Retreat Cottage',
      price: 4100,
      image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=2070&auto=format&fit=crop',
      badge: 'Most Popular',
      badgeColor: 'bg-blue-600',
      rooms: 2,
      bathrooms: 1,
      area: '6\'2 m2',
      rating: 5,
      reviews: 9,
      location: 'Austria',
      category: 'Cottage'
    },
    // Additional Bungalow
    {
      id: 25,
      name: 'Beach Paradise Bungalow',
      price: 3800,
      image: 'https://images.unsplash.com/photo-1439066615861-d1af74d74000?q=80&w=2073&auto=format&fit=crop',
      badge: 'New Launched',
      badgeColor: 'bg-red-600',
      rooms: 2,
      bathrooms: 1,
      area: '7\'8 m2',
      rating: 4,
      reviews: 8,
      location: 'Goa',
      category: 'Bungalow'
    },
    // Additional Duplexes
    {
      id: 26,
      name: 'Modern Loft Duplex',
      price: 7200,
      image: 'https://images.unsplash.com/photo-1484154218962-a197022b5858?q=80&w=2074&auto=format&fit=crop',
      badge: 'Most Popular',
      badgeColor: 'bg-blue-600',
      rooms: 4,
      bathrooms: 3,
      area: '12\'5 m2',
      rating: 5,
      reviews: 13,
      location: 'Tokyo',
      category: 'Duplex'
    },
    {
      id: 27,
      name: 'Executive Duplex Suite',
      price: 8500,
      image: 'https://images.unsplash.com/photo-1502672260066-6bc35f0a1f75?q=80&w=2080&auto=format&fit=crop',
      badge: 'New Launched',
      badgeColor: 'bg-red-600',
      rooms: 5,
      bathrooms: 3,
      area: '13\'8 m2',
      rating: 5,
      reviews: 11,
      location: 'Seoul',
      category: 'Duplex'
    },
    {
      id: 28,
      name: 'Skyview Duplex',
      price: 6800,
      image: 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?q=80&w=2070&auto=format&fit=crop',
      badge: 'Most Popular',
      badgeColor: 'bg-blue-600',
      rooms: 3,
      bathrooms: 2,
      area: '10\'2 m2',
      rating: 4,
      reviews: 9,
      location: 'Mumbai',
      category: 'Duplex'
    },
    {
      id: 29,
      name: 'Penthouse Duplex',
      price: 9800,
      image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?q=80&w=2070&auto=format&fit=crop',
      badge: 'New Launched',
      badgeColor: 'bg-red-600',
      rooms: 5,
      bathrooms: 4,
      area: '14\'5 m2',
      rating: 5,
      reviews: 15,
      location: 'New York',
      category: 'Duplex'
    },
    {
      id: 30,
      name: 'City Centre Duplex',
      price: 5900,
      image: 'https://images.unsplash.com/photo-1556912172-45b7abe8b7e1?q=80&w=2070&auto=format&fit=crop',
      badge: 'Most Popular',
      badgeColor: 'bg-blue-600',
      rooms: 3,
      bathrooms: 2,
      area: '9\'8 m2',
      rating: 4,
      reviews: 7,
      location: 'London',
      category: 'Duplex'
    }
];

const FeaturedHotels = ({ selectedCategory = 'Hotel' }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [filteredHotels, setFilteredHotels] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [isScrolled, setIsScrolled] = useState(false);
  const navigate = useNavigate();

  // Track scroll position for navbar effects
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset;
      setIsScrolled(scrollTop > 100);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Load wishlist for authenticated users
  useEffect(() => {
    const init = async () => {
      const token = localStorage.getItem('accessToken');
      if (!token) return; // leave empty for guests
      try {
        const { wishlist } = await getWishlist();
        setWishlist(wishlist);
        window.dispatchEvent(new Event('wishlistUpdated'));
      } catch (err) {
        console.error('Failed to load wishlist:', err);
        toast.error(`Failed to load data: ${err.message}`);
      }
    };
    init();
  }, []);

  // Toggle wishlist
  const toggleWishlist = async (hotelId) => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      toast.error('🔒 You must be logged in to like this', {
        position: "top-center",
        autoClose: 3000,
      });
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
      return;
    }

    try {
      const { wishlist: updated, message } = await toggleWishlistApi(hotelId);
      setWishlist(updated);
      window.dispatchEvent(new Event('wishlistUpdated'));
      
      // Show success message based on whether item was added or removed
      const wasAdded = updated.includes(String(hotelId));
      toast.success(message || (wasAdded ? '❤️ Added to wishlist!' : 'Removed from wishlist'), {
        position: "top-right",
        autoClose: 2000,
      });
    } catch (err) {
      console.error('Failed to toggle wishlist:', err);
      toast.error(`Failed to update wishlist: ${err.message || 'Something went wrong'}`);
    }
  };

  // Filter hotels based on selected category
  useEffect(() => {
    const filtered = allHotels.filter(hotel => hotel.category === selectedCategory);
    setFilteredHotels(filtered);
    setCurrentIndex(0); // Reset to first slide when category changes
  }, [selectedCategory]);

  const hotels = filteredHotels.length > 0 ? filteredHotels : allHotels;

  // Responsive items per view
  const getItemsPerView = () => {
    if (typeof window !== 'undefined') {
      if (window.innerWidth < 640) return 1; // mobile
      if (window.innerWidth < 1024) return 2; // tablet
      if (window.innerWidth < 1280) return 3; // small desktop
      return 4; // big desktop
    }
    return 4;
  };

  const [itemsPerView, setItemsPerView] = useState(getItemsPerView());
  const maxIndex = Math.max(0, hotels.length - itemsPerView);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setItemsPerView(getItemsPerView());
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handlePrev = () => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => Math.min(maxIndex, prev + 1));
  };

  return (
    <div 
    className="w-full bg-gray-10 pb-20 px-4 sm:px-6 lg:px-8" style={{minHeight: "70vh", marginTop: "0px", paddingTop: "0px"}}>
      <div className="w-full max-w-[1600px] mx-auto">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-16 ml-0 lg:ml-20">
          <div>
            {/* <div className="inline-block mb-3">
              <span
              style={{padding: "5px"}}
              className={`bg-gray-800 text-white rounded-full text-sm font-semibold tracking-wide shadow-lg transition-all duration-300 ${
                isScrolled ? 'shadow-xl' : ''
              }`}>
                Featured Hotels
              </span>
            </div> */}
            <h2 className={`text-4xl font-bold text-[#17A998] transition-all duration-300 ${
              isScrolled ? 'text-3xl' : ''
            }`}>
              Check Out Premium Stays
            </h2>
            <p className="text-gray-600 text-lg font-light mt-2">Discover our handpicked selection of luxury accommodations</p>
          </div>

          {/* Navigation Arrows */}
          <div className="flex gap-3" style={{marginRight: "2rem"}}>
            <button
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                currentIndex === 0
                  ? 'border-gray-300 text-gray-400 cursor-not-allowed'
                  : 'border-gray-400 text-gray-700 hover:border-gray-800 hover:text-gray-900 hover:shadow-lg'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={handleNext}
              disabled={currentIndex >= maxIndex}
              className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                currentIndex >= maxIndex
                  ? 'border-gray-300 text-gray-400 cursor-not-allowed'
                  : 'border-gray-400 text-gray-700 hover:border-gray-800 hover:text-gray-900 hover:shadow-lg'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Hotels Slider */}
        <div className="overflow-hidden rounded-xl ml-0 lg:ml-20 mr-0 lg:mr-8">
          <div
            className="flex gap-6 transition-transform duration-500 ease-in-out px-1 pr-8"
            style={{ transform: `translateX(-${currentIndex * (100 / itemsPerView)}%)` }}
          >
            {hotels.map((hotel) => (
              <div
                key={hotel.id}
                className="flex-shrink-0 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden group border border-gray-200 bg-white"
                style={{
                  width: `calc(${100 / itemsPerView}% - ${24 * (itemsPerView - 1) / itemsPerView}px)`,
                  minWidth: '280px'
                }}
              >
                {/* Image Container */}
                <div className="relative h-64 overflow-hidden">
                  <img
                    src={hotel.image}
                    alt={hotel.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  
                  {/* Badge */}
                  <div className={`absolute top-4 left-4 ${hotel.badgeColor} text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg`}>
                    {hotel.badge}
                  </div>

                  {/* Favorite Icon */}
                  <button
                    onClick={() => toggleWishlist(hotel.id)}
                    className={`absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 transform hover:scale-110 ${
                      wishlist.includes(String(hotel.id))
                        ? 'bg-red-500 shadow-lg'
                        : 'bg-white/90 backdrop-blur-sm hover:bg-white shadow-md'
                    }`}
                    title={wishlist.includes(String(hotel.id)) ? 'Remove from wishlist' : 'Add to wishlist'}
                  >
                    <svg
                      className={`w-5 h-5 transition-all duration-300 ${
                        wishlist.includes(String(hotel.id))
                          ? 'text-white fill-white'
                          : 'text-gray-600 hover:text-red-500'
                      }`}
                      fill={wishlist.includes(String(hotel.id)) ? 'currentColor' : 'none'}
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </button>
                </div>

                {/* Content */}
                <div className="p-5">
                  {/* Price */}
                  <div className="flex items-baseline gap-2 mb-3">
                    <span className="text-2xl font-bold text-gray-900">NPR {hotel.price.toLocaleString()}</span>
                    <span className="text-sm text-gray-500">Start from</span>
                  </div>

                  {/* Hotel Name */}
                  <h3 className="text-xl font-bold text-gray-900 mb-4 group-hover:text-gray-700 transition-colors">
                    {hotel.name}
                  </h3>

                  {/* Features */}
                  <div className="flex items-center gap-4 mb-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                      </svg>
                      <span>{hotel.rooms} Room</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>{hotel.bathrooms} Bathroom</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                      </svg>
                      <span>{hotel.area}</span>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="pt-4 border-t border-gray-200 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="text-sm text-gray-600">{hotel.location}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <svg
                            key={i}
                            className={`w-4 h-4 ${i < hotel.rating ? 'text-yellow-500' : 'text-gray-300'}`}
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                      </div>
                    </div>
                    
                    {/* View Hotel Info Button */}
                    <div className="flex justify-center pt-2">
                      <button
                        onClick={() => navigate('/hotelInfo')}
                        className="py-2.5 px-6 rounded-lg font-semibold text-sm transition-all duration-300 flex items-center justify-center gap-2 shadow-md bg-[#00AB9A] text-white hover:bg-gray-900 hover:shadow-lg transform hover:scale-105 active:scale-95"
                        style={{
                          letterSpacing: '0.3px'
                        }}
                        title="View hotel information"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>View Hotel Info</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Scroll Indicator and Item Counter */}
        <div className="flex items-center justify-between mt-8 ml-0 lg:ml-20 px-2">
          <div className="text-sm text-gray-600 font-medium">
            Showing {currentIndex + 1} - {Math.min(currentIndex + itemsPerView, hotels.length)} of {hotels.length} {selectedCategory}{hotels.length > 1 ? 's' : ''}
          </div>
          
          {/* Pagination Dots */}
          <div className="flex items-center gap-2">
            {Array.from({ length: maxIndex + 1 }).map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === currentIndex
                    ? 'w-8 bg-gray-800'
                    : 'w-2 bg-gray-300 hover:bg-gray-500'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeaturedHotels;
