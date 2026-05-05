import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getWishlist, toggleWishlist as toggleWishlistApi } from '../../../api/user';
import { toast } from 'react-toastify';

// Property data organized by category
const propertyData = {
  Villa: [
    {
      id: 'villa-1',
      name: 'Sunset Villa Paradise',
      price: 450,
      image: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?q=80&w=2071&auto=format&fit=crop',
      badge: 'Most Popular',
      badgeColor: '#2563EB',
      rooms: 5,
      bathrooms: 4,
      area: '350',
      rating: 4.9,
      location: 'Bali, Indonesia'
    },
    {
      id: 'villa-2',
      name: 'Ocean View Villa',
      price: 380,
      image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=2070&auto=format&fit=crop',
      badge: 'New Launched',
      badgeColor: '#DC2626',
      rooms: 4,
      bathrooms: 3,
      area: '280',
      rating: 4.8,
      location: 'Maldives'
    },
    {
      id: 'villa-3',
      name: 'Mountain Retreat Villa',
      price: 420,
      image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=2075&auto=format&fit=crop',
      badge: 'Most Popular',
      badgeColor: '#2563EB',
      rooms: 6,
      bathrooms: 5,
      area: '400',
      rating: 5.0,
      location: 'Swiss Alps'
    }
  ],
  Hotel: [
    {
      id: 'hotel-1',
      name: 'The Grand Elysian',
      price: 250,
      image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=2070&auto=format&fit=crop',
      badge: 'Most Popular',
      badgeColor: '#2563EB',
      rooms: 1,
      bathrooms: 1,
      area: '45',
      rating: 4.8,
      location: 'Thamel, Kathmandu'
    },
    {
      id: 'hotel-2',
      name: 'Himalayan Oasis',
      price: 320,
      image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=2070&auto=format&fit=crop',
      badge: 'New Launched',
      badgeColor: '#DC2626',
      rooms: 1,
      bathrooms: 1,
      area: '55',
      rating: 4.9,
      location: 'Lazimpat, Kathmandu'
    },
    {
      id: 'hotel-3',
      name: 'Boudha Boutique Hotel',
      price: 180,
      image: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?q=80&w=2080&auto=format&fit=crop',
      badge: 'Most Popular',
      badgeColor: '#2563EB',
      rooms: 1,
      bathrooms: 1,
      area: '40',
      rating: 4.7,
      location: 'Boudha, Kathmandu'
    },
    {
      id: 'hotel-4',
      name: 'Durbar Square Inn',
      price: 150,
      image: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?q=80&w=2070&auto=format&fit=crop',
      badge: 'New Launched',
      badgeColor: '#DC2626',
      rooms: 1,
      bathrooms: 1,
      area: '35',
      rating: 4.5,
      location: 'Basantapur, Kathmandu'
    }
  ],
  Resort: [
    {
      id: 'resort-1',
      name: 'Azure Haven Resort',
      price: 520,
      image: 'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?q=80&w=2049&auto=format&fit=crop',
      badge: 'Most Popular',
      badgeColor: '#2563EB',
      rooms: 2,
      bathrooms: 2,
      area: '120',
      rating: 5.0,
      location: 'Phuket, Thailand'
    },
    {
      id: 'resort-2',
      name: 'Tropical Paradise Resort',
      price: 480,
      image: 'https://images.unsplash.com/photo-1596436889106-be35e843f974?q=80&w=2070&auto=format&fit=crop',
      badge: 'New Launched',
      badgeColor: '#DC2626',
      rooms: 2,
      bathrooms: 2,
      area: '110',
      rating: 4.9,
      location: 'Bali, Indonesia'
    },
    {
      id: 'resort-3',
      name: 'Seaside Luxury Resort',
      price: 550,
      image: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?q=80&w=2070&auto=format&fit=crop',
      badge: 'Most Popular',
      badgeColor: '#2563EB',
      rooms: 3,
      bathrooms: 2,
      area: '150',
      rating: 4.8,
      location: 'Maldives'
    }
  ],
  Cottage: [
    {
      id: 'cottage-1',
      name: 'Cozy Mountain Cottage',
      price: 180,
      image: 'https://images.unsplash.com/photo-1518780664697-55e3ad937233?q=80&w=2065&auto=format&fit=crop',
      badge: 'Most Popular',
      badgeColor: '#2563EB',
      rooms: 2,
      bathrooms: 1,
      area: '75',
      rating: 4.7,
      location: 'Scottish Highlands'
    },
    {
      id: 'cottage-2',
      name: 'Lakeside Cottage',
      price: 160,
      image: 'https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8?q=80&w=2070&auto=format&fit=crop',
      badge: 'New Launched',
      badgeColor: '#DC2626',
      rooms: 2,
      bathrooms: 1,
      area: '65',
      rating: 4.6,
      location: 'Lake District, UK'
    }
  ],
  Bungalow: [
    {
      id: 'bungalow-1',
      name: 'Beach Front Bungalow',
      price: 220,
      image: 'https://images.unsplash.com/photo-1602002418082-a4443e081dd1?q=80&w=2074&auto=format&fit=crop',
      badge: 'Most Popular',
      badgeColor: '#2563EB',
      rooms: 2,
      bathrooms: 1,
      area: '80',
      rating: 4.8,
      location: 'Goa, India'
    },
    {
      id: 'bungalow-2',
      name: 'Garden Bungalow',
      price: 200,
      image: 'https://images.unsplash.com/photo-1439066615861-d1af74d74000?q=80&w=2073&auto=format&fit=crop',
      badge: 'New Launched',
      badgeColor: '#DC2626',
      rooms: 2,
      bathrooms: 1,
      area: '70',
      rating: 4.5,
      location: 'Kerala, India'
    }
  ],
  Duplex: [
    {
      id: 'duplex-1',
      name: 'Modern Loft Duplex',
      price: 350,
      image: 'https://images.unsplash.com/photo-1484154218962-a197022b5858?q=80&w=2074&auto=format&fit=crop',
      badge: 'Most Popular',
      badgeColor: '#2563EB',
      rooms: 3,
      bathrooms: 2,
      area: '180',
      rating: 4.9,
      location: 'Tokyo, Japan'
    },
    {
      id: 'duplex-2',
      name: 'Executive Duplex Suite',
      price: 380,
      image: 'https://images.unsplash.com/photo-1502672260066-6bc35f0a1f75?q=80&w=2080&auto=format&fit=crop',
      badge: 'New Launched',
      badgeColor: '#DC2626',
      rooms: 4,
      bathrooms: 3,
      area: '200',
      rating: 5.0,
      location: 'Seoul, Korea'
    },
    {
      id: 'duplex-3',
      name: 'City Centre Duplex',
      price: 320,
      image: 'https://images.unsplash.com/photo-1556912172-45b7abe8b7e1?q=80&w=2070&auto=format&fit=crop',
      badge: 'Most Popular',
      badgeColor: '#2563EB',
      rooms: 3,
      bathrooms: 2,
      area: '160',
      rating: 4.7,
      location: 'London, UK'
    }
  ]
};

const FeaturedHotels = () => {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState('Hotel');
  const [wishlist, setWishlist] = useState([]);

  const categories = [
    {
      name: 'Villa',
      icon: (
        <svg style={{ width: '32px', height: '32px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      )
    },
    {
      name: 'Hotel',
      icon: (
        <svg style={{ width: '32px', height: '32px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      )
    },
    {
      name: 'Resort',
      icon: (
        <svg style={{ width: '32px', height: '32px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 21h18M4 18h16M6 18V9l6-6 6 6v9M9 21v-7a1 1 0 011-1h4a1 1 0 011 1v7" />
        </svg>
      )
    },
    {
      name: 'Cottage',
      icon: (
        <svg style={{ width: '32px', height: '32px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l9-9 9 9M5 10v10a1 1 0 001 1h3a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1h3a1 1 0 001-1V10" />
        </svg>
      )
    },
    {
      name: 'Bungalow',
      icon: (
        <svg style={{ width: '32px', height: '32px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
        </svg>
      )
    },
    {
      name: 'Duplex',
      icon: (
        <svg style={{ width: '32px', height: '32px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      )
    }
  ];

  // Load wishlist
  useEffect(() => {
    const init = async () => {
      const token = localStorage.getItem('accessToken');
      if (!token) return;
      try {
        const { wishlist } = await getWishlist();
        setWishlist(wishlist);
      } catch (err) {
        console.error('Failed to load wishlist:', err);
      }
    };
    init();
  }, []);

  // Toggle wishlist
  const toggleWishlist = async (propertyId, e) => {
    e.stopPropagation();
    const token = localStorage.getItem("accessToken");
    if (!token) {
      toast.error('🔒 You must be logged in to like this');
      setTimeout(() => navigate('/login'), 2000);
      return;
    }

    try {
      const { wishlist: updated, message } = await toggleWishlistApi(propertyId);
      setWishlist(updated);
      window.dispatchEvent(new Event('wishlistUpdated'));
      toast.success(message || '❤️ Wishlist updated!');
    } catch (err) {
      toast.error(`Failed to update wishlist: ${err.message}`);
    }
  };

  // Get displayed properties based on selected category
  const displayedProperties = propertyData[selectedCategory] || [];

  return (
    <div style={{ backgroundColor: '#ffffff', paddingTop: '14px', paddingBottom: '16px' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 24px' }}>

        {/* Categories Section */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '2.25rem', fontWeight: '700', color: '#111827', marginBottom: '5px' }}>
            Luxury & Comfort Choices
          </h2>
          <p style={{ fontSize: '1rem', color: '#6B7280', marginBottom: '48px' }}>
            Explore our premium collection of accommodations
          </p>

          {/* Categories Grid - Single Row on Desktop */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: '16px',
            maxWidth: '100%',
            margin: '0 auto'
          }}>
            {categories.map((category) => (
              <div
                key={category.name}
                onClick={() => setSelectedCategory(category.name)}
                style={{
                  padding: '24px 20px',
                  border: selectedCategory === category.name ? '2px solid #14B8A6' : '2px solid #E5E7EB',
                  borderRadius: '16px',
                  cursor: 'pointer',
                  backgroundColor: selectedCategory === category.name ? '#F0FDFA' : '#ffffff',
                  transition: 'all 0.3s',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                  minWidth: '140px',
                  flex: '0 1 auto'
                }}
                onMouseEnter={(e) => {
                  if (selectedCategory !== category.name) {
                    e.currentTarget.style.borderColor = '#14B8A6';
                    e.currentTarget.style.backgroundColor = '#F9FAFB';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedCategory !== category.name) {
                    e.currentTarget.style.borderColor = '#E5E7EB';
                    e.currentTarget.style.backgroundColor = '#ffffff';
                  }
                }}
              >
                <div style={{ color: selectedCategory === category.name ? '#14B8A6' : '#6B7280' }}>
                  {category.icon}
                </div>
                <span style={{
                  fontSize: '0.875rem',
                  fontWeight: selectedCategory === category.name ? '600' : '500',
                  color: selectedCategory === category.name ? '#111827' : '#374151'
                }}>
                  {category.name}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Featured Properties Section */}
        <div >
          {/* Section Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h2 style={{ fontSize: '1.875rem', fontWeight: '700', color: '#111827', marginBottom: '4px' }}>
                Check Out Premium Stays
              </h2>
              <p style={{ fontSize: '0.875rem', color: '#6B7280' }}>
                Discover our handpicked selection of luxury accommodations
              </p>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  border: '2px solid #D1D5DB',
                  backgroundColor: '#ffffff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#374151'
                }}
              >
                <svg style={{ width: '20px', height: '20px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  border: '2px solid #D1D5DB',
                  backgroundColor: '#ffffff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#374151'
                }}
              >
                <svg style={{ width: '20px', height: '20px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Properties Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '24px'
          }}>
            {displayedProperties.map((property) => (
              <div
                key={property.id}
                onClick={() => navigate(`/hotels/${property.id}`)}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  border: '1px solid #E5E7EB',
                  cursor: 'pointer',
                  transition: 'all 0.3s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 10px 25px rgba(0,0,0,0.15)'}
                onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'}
              >
                {/* Image */}
                <div style={{ position: 'relative', height: '200px', overflow: 'hidden' }}>
                  <img
                    src={property.image}
                    alt={property.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />

                  {/* Badges */}
                  <div style={{ position: 'absolute', top: '12px', left: '12px' }}>
                    <span style={{
                      padding: '6px 12px',
                      backgroundColor: property.badgeColor,
                      color: '#ffffff',
                      borderRadius: '20px',
                      fontSize: '0.75rem',
                      fontWeight: '600'
                    }}>
                      {property.badge}
                    </span>
                  </div>

                  {/* Wishlist Heart */}
                  <button
                    onClick={(e) => toggleWishlist(property.id, e)}
                    style={{
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      backgroundColor: wishlist.includes(String(property.id)) ? '#EF4444' : '#ffffff',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                    }}
                  >
                    <svg
                      style={{ width: '18px', height: '18px', color: wishlist.includes(String(property.id)) ? '#ffffff' : '#9CA3AF' }}
                      fill={wishlist.includes(String(property.id)) ? 'currentColor' : 'none'}
                      stroke="currentColor"
                      strokeWidth={2}
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </button>
                </div>

                {/* Content */}
                <div style={{ padding: '20px' }}>
                  {/* Rating and Start Date */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.75rem', color: '#9CA3AF', textTransform: 'uppercase', fontWeight: '600' }}>
                      Start Date
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {[...Array(5)].map((_, i) => (
                        <svg
                          key={i}
                          style={{ width: '14px', height: '14px', color: i < Math.floor(property.rating) ? '#FCD34D' : '#D1D5DB' }}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                  </div>

                  {/* Price */}
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                      <span style={{ fontSize: '1.5rem', fontWeight: '700', color: '#111827' }}>NPR {property.price}</span>
                    </div>
                  </div>

                  {/* Property Name */}
                  <h3 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#111827', marginBottom: '8px' }}>
                    {property.name}
                  </h3>

                  {/* Location */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#6B7280', fontSize: '0.875rem', marginBottom: '16px' }}>
                    <svg style={{ width: '14px', height: '14px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>{property.location}</span>
                  </div>

                  {/* Amenities - Improved Layout */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: '16px',
                    fontSize: '0.75rem',
                    color: '#6B7280',
                    flexWrap: 'wrap'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <svg style={{ width: '14px', height: '14px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                      </svg>
                      <span style={{ fontSize: '0.875rem' }}>{property.rooms}</span>
                      <span style={{ fontSize: '0.875rem' }}>Room</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <svg style={{ width: '14px', height: '14px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                      </svg>
                      <span style={{ fontSize: '0.875rem' }}>{property.bathrooms}</span>
                      <span style={{ fontSize: '0.875rem' }}>Bathroom</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <svg style={{ width: '14px', height: '14px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                      </svg>
                      <span style={{ fontSize: '0.875rem' }}>{property.area}</span>
                      <span style={{ fontSize: '0.875rem' }}>m2</span>
                    </div>
                  </div>

                  {/* View Hotel Info Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/hotels/${property.id}`);
                    }}
                    style={{
                      width: '100%',
                      padding: '12px',
                      backgroundColor: '#14B8A6',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#0D9488'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = '#14B8A6'}
                  >
                    View Hotel Info
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeaturedHotels;
