import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getWishlist, toggleWishlist as toggleWishlistApi } from '../api/user';
import { getAllHotels } from '../../../../api/hotel';
import { toast } from 'react-toastify';

const FeaturedHotels = () => {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState('Hotel');
  const [wishlist, setWishlist] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  // Load hotels from backend
  useEffect(() => {
    const fetchHotels = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await getAllHotels({ category: selectedCategory, limit: 20 });
        setHotels(response.hotels || []);
      } catch (err) {
        console.error('Failed to load hotels:', err);
        setError('Failed to load hotels. Please try again later.');
        setHotels([]);
      } finally {
        setLoading(false);
      }
    };
    fetchHotels();
  }, [selectedCategory]);

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

  // Transform backend hotel data to match the component's expected format
  const displayedProperties = hotels.map(hotel => ({
    id: hotel._id,
    name: hotel.name,
    price: hotel.priceRange?.min || 0,
    image: hotel.images?.[0] || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&q=80',
    badge: hotel.featured ? 'Featured' : 'Available',
    badgeColor: hotel.featured ? '#2563EB' : '#10B981',
    rooms: hotel.totalRooms || 1,
    bathrooms: 1,
    area: '45',
    rating: hotel.rating || 0,
    location: `${hotel.location?.address || ''}, ${hotel.location?.city || ''}`.trim().replace(/^,\s*/, '')
  }));

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

          {/* Loading State */}
          {loading && (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#6B7280' }}>
              <div style={{ fontSize: '1.125rem', marginBottom: '12px' }}>Loading hotels...</div>
              <div style={{ fontSize: '0.875rem' }}>Please wait while we fetch the latest properties</div>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              backgroundColor: '#FEF2F2',
              borderRadius: '12px',
              border: '1px solid #FCA5A5'
            }}>
              <div style={{ fontSize: '1.125rem', color: '#DC2626', marginBottom: '8px', fontWeight: '600' }}>
                {error}
              </div>
              <button
                onClick={() => window.location.reload()}
                style={{
                  marginTop: '16px',
                  padding: '10px 24px',
                  backgroundColor: '#DC2626',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '600'
                }}
              >
                Retry
              </button>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && displayedProperties.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#6B7280' }}>
              <div style={{ fontSize: '1.125rem', marginBottom: '8px' }}>No hotels found</div>
              <div style={{ fontSize: '0.875rem' }}>Try selecting a different category</div>
            </div>
          )}

          {/* Properties Grid */}
          {!loading && !error && displayedProperties.length > 0 && (
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
          )}
        </div>
      </div>
    </div>
  );
};

export default FeaturedHotels;
