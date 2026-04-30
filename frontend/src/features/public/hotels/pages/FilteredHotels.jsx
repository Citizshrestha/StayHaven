import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Heart, MapPin, Star, ChevronDown } from 'lucide-react';
import { getAllHotels } from '../../../../core/api/services/hotel.service';

const FilteredHotels = () => {
  const navigate = useNavigate();
  const [selectedRating, setSelectedRating] = useState(null);
  const [priceRange, setPriceRange] = useState(45000);
  const [selectedCity, setSelectedCity] = useState('Kathmandu');
  const [amenities, setAmenities] = useState({
    wifi: false,
    pool: false,
    parking: false,
    gym: false,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;
  const [hotels, setHotels] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const amenitiesList = [
    { id: 'wifi', label: 'Free Wi-Fi' },
    { id: 'pool', label: 'Swimming Pool' },
    { id: 'parking', label: 'Parking' },
    { id: 'gym', label: 'Gym' },
  ];

  const handleAmenityChange = (id) => {
    setAmenities((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const selectedAmenityIds = useMemo(
    () => Object.entries(amenities).filter(([, v]) => v).map(([k]) => k),
    [amenities]
  );

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const filters = {
          city: selectedCity,
          limit: itemsPerPage,
          page: currentPage,
          sort: '-rating',
          maxPrice: priceRange,
        };
        if (selectedRating) filters.minRating = selectedRating;
        if (selectedAmenityIds.length) filters.amenities = selectedAmenityIds.join(',');

        const data = await getAllHotels(filters);
        if (cancelled) return;

        setHotels(data?.hotels || []);
        setTotalPages(data?.totalPages || 1);
      } catch (e) {
        if (cancelled) return;
        setError(e?.message || 'Failed to load hotels');
        setHotels([]);
        setTotalPages(1);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [selectedCity, selectedRating, priceRange, selectedAmenityIds, currentPage]);

  return (
    <div style={{ backgroundColor: '#F9FAFB', minHeight: '100vh' }}>

      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '32px 16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginTop: '80px' }}>
          <div className="lg:flex lg:gap-8">
            {/* Left Sidebar - Filters */}
            <aside style={{ width: '100%', maxWidth: '280px', flexShrink: 0 }} className="hidden lg:block">
              <div style={{ position: 'sticky', top: '96px', backgroundColor: '#ffffff', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#111827', marginBottom: '24px' }}>Filters</h2>

                {/* City Filter */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>City</label>
                  <div style={{ position: 'relative' }}>
                    <select
                      value={selectedCity}
                      onChange={(e) => {
                        setSelectedCity(e.target.value);
                        setCurrentPage(1);
                      }}
                      style={{ width: '100%', padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: '8px', appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none', backgroundColor: '#ffffff', backgroundImage: 'none', color: '#374151', fontSize: '0.875rem', outline: 'none' }}
                    >
                      <option>Kathmandu</option>
                      <option>Pokhara</option>
                      <option>Lalitpur</option>
                      <option>Bhaktapur</option>
                    </select>
                    <ChevronDown style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: '#6B7280', pointerEvents: 'none' }} />
                  </div>
                </div>

                {/* Rating Filter - Minimum Rating */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>Rating</label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {[5, 4, 3, 2, 1].map((rating) => (
                      <button
                        key={rating}
                        onClick={() => setSelectedRating(selectedRating === rating ? null : rating)}
                        style={{
                          padding: '6px',
                          border: selectedRating === rating ? '2px solid #FCD34D' : '2px solid #D1D5DB',
                          borderRadius: '6px',
                          backgroundColor: selectedRating === rating ? '#FEF3C7' : '#ffffff',
                          color: selectedRating === rating ? '#FCD34D' : '#D1D5DB',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        <Star style={{ width: '16px', height: '16px' }} fill="currentColor" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Price Range Filter */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>Price Range</label>
                  <div style={{ position: 'relative', marginBottom: '8px' }}>
                    <div style={{ width: '100%', height: '6px', backgroundColor: '#E5E7EB', borderRadius: '3px', position: 'relative' }}>
                      <div style={{ position: 'absolute', left: '0', width: `${(priceRange / 45000) * 100}%`, height: '100%', backgroundColor: '#14B8A6', borderRadius: '3px' }}></div>
                    </div>
                    <input
                      type="range"
                      min="900"
                      max="45000"
                      value={priceRange}
                      onChange={(e) => setPriceRange(e.target.value)}
                      style={{ position: 'absolute', top: '0', left: '0', width: '100%', height: '6px', opacity: '0', cursor: 'pointer' }}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#6B7280' }}>
                    <span>NPR 900</span>
                    <span>NPR {Number(priceRange).toLocaleString()}</span>
                  </div>
                </div>

                {/* Amenities Filter */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '12px' }}>Amenities</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {amenitiesList.map((item) => (
                      <div key={item.id} style={{ display: 'flex', alignItems: 'center' }}>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '16px', height: '16px' }}>
                          <input
                            type="checkbox"
                            id={item.id}
                            checked={amenities[item.id]}
                            onChange={() => handleAmenityChange(item.id)}
                            style={{
                              width: '16px',
                              height: '16px',
                              margin: 0,
                              padding: 0,
                              boxSizing: 'border-box',
                              borderRadius: '4px',
                              border: '2px solid #D1D5DB',
                              cursor: 'pointer',
                              appearance: 'none',
                              WebkitAppearance: 'none',
                              MozAppearance: 'none',
                              backgroundColor: amenities[item.id] ? '#14B8A6' : '#ffffff',
                              borderColor: amenities[item.id] ? '#14B8A6' : '#D1D5DB',
                              outline: 'none'
                            }}
                          />
                          {amenities[item.id] && (
                            <svg
                              style={{ position: 'absolute', width: '12px', height: '12px', color: '#ffffff', pointerEvents: 'none' }}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <label htmlFor={item.id} style={{ marginLeft: '10px', fontSize: '0.875rem', color: '#374151', cursor: 'pointer' }}>
                          {item.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </aside>

            {/* Main Content */}
            <section style={{ flex: '1' }}>
              {/* Header with Title and Sort */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
                <h1 style={{ fontSize: '1.875rem', fontWeight: '700', color: '#111827', fontFamily: 'Nunito, sans-serif' }}>Hotels in {selectedCity}</h1>
                <div style={{ position: 'relative', width: '200px' }}>
                  <select style={{ width: '100%', padding: '10px 12px', paddingRight: '36px', border: '1px solid #D1D5DB', borderRadius: '8px', appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none', backgroundColor: '#ffffff', backgroundImage: 'none', color: '#374151', fontSize: '0.875rem', outline: 'none' }}>
                    <option>Sort by Price</option>
                    <option>Sort by Rating</option>
                    <option>Sort by Newest</option>
                  </select>
                  <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', gap: '4px', pointerEvents: 'none' }}>
                    <ChevronDown style={{ width: '16px', height: '16px', color: '#6B7280' }} />
                  </div>
                </div>
              </div>

              {/* Hotel Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px', marginBottom: '32px' }}>
                {isLoading && (
                  <div style={{ gridColumn: '1 / -1', padding: '18px', color: '#6B7280' }}>
                    Loading hotels…
                  </div>
                )}
                {!isLoading && error && (
                  <div style={{ gridColumn: '1 / -1', padding: '18px', color: '#B91C1C' }}>
                    {error}
                  </div>
                )}
                {!isLoading && !error && hotels.map((hotel) => {
                  const heroImage = hotel?.images?.[0] || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&q=80';
                  const id = hotel?._id || hotel?.id;
                  const locationText = [hotel?.location?.address, hotel?.location?.city].filter(Boolean).join(', ');
                  const price = hotel?.priceRange?.min ?? hotel?.pricePerNight ?? 0;

                  return (<div
                    key={id}
                    style={{
                      backgroundColor: '#ffffff',
                      borderRadius: '16px',
                      overflow: 'hidden',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                      border: '1px solid #F3F4F6',
                      transition: 'box-shadow 0.3s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 10px 25px rgba(0,0,0,0.15)'}
                    onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'}
                  >
                    {/* Image Container */}
                    <div style={{ position: 'relative', height: '200px', overflow: 'hidden', backgroundColor: '#E5E7EB' }}>
                      <img
                        src={heroImage}
                        alt={hotel.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s' }}
                        onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
                        onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                      />
                      {/* Heart Icon */}
                      <button style={{ position: 'absolute', top: '12px', right: '12px', backgroundColor: '#ffffff', borderRadius: '50%', padding: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', border: 'none', cursor: 'pointer', transition: 'background-color 0.2s' }}>
                        <Heart style={{ width: '20px', height: '20px', color: '#D1D5DB' }} />
                      </button>
                    </div>

                    {/* Content */}
                    <div style={{ padding: '20px' }}>
                      {/* Title and Rating */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                        <h3 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#111827', lineHeight: '1.3', flex: '1', fontFamily: 'Nunito, sans-serif' }}>{hotel.name}</h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '8px', flexShrink: 0 }}>
                          <Star style={{ width: '16px', height: '16px', color: '#FCD34D', fill: '#FCD34D' }} />
                          <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>{hotel.rating}</span>
                        </div>
                      </div>

                      {/* Location */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#6B7280', fontSize: '0.875rem', marginBottom: '16px' }}>
                        <MapPin style={{ width: '14px', height: '14px', flexShrink: 0 }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{locationText || '-'}</span>
                      </div>

                      {/* Price and Button */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                          <span style={{ fontSize: '1.5rem', fontWeight: '700', color: '#111827' }}>Nrs {price}</span>
                          <span style={{ fontSize: '0.875rem', color: '#6B7280' }}>/night</span>
                        </div>
                        <button
                          onClick={() => navigate(`/hotel/${id}`)}
                          style={{
                            padding: '10px 20px',
                            backgroundColor: '#14B8A6',
                            color: '#ffffff',
                            borderRadius: '8px',
                            fontSize: '0.875rem',
                            fontWeight: '600',
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            whiteSpace: 'nowrap'
                          }}
                          onMouseEnter={(e) => e.target.style.backgroundColor = '#0D9488'}
                          onMouseLeave={(e) => e.target.style.backgroundColor = '#14B8A6'}
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  </div>);
                })}
                {!isLoading && !error && hotels.length === 0 && (
                  <div style={{ gridColumn: '1 / -1', padding: '18px', color: '#6B7280' }}>
                    No hotels found for these filters. Try turning off amenities filters or switching city.
                  </div>
                )}
              </div>

              {/* Pagination */}
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  style={{ padding: '10px 16px', border: '1px solid #D1D5DB', borderRadius: '8px', color: '#374151', backgroundColor: '#ffffff', cursor: currentPage <= 1 ? 'not-allowed' : 'pointer', fontSize: '0.875rem', fontWeight: '500', transition: 'background-color 0.2s', opacity: currentPage <= 1 ? 0.6 : 1 }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#F9FAFB'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = '#ffffff'}
                >
                  Previous
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .slice(0, 10)
                  .map((p) => (
                    <button
                      key={`page-${p}`}
                      type="button"
                      onClick={() => setCurrentPage(p)}
                      style={{
                        padding: '10px 16px',
                        borderRadius: '8px',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        backgroundColor: currentPage === p ? '#14B8A6' : '#ffffff',
                        color: currentPage === p ? '#ffffff' : '#374151',
                        border: currentPage === p ? 'none' : '1px solid #D1D5DB'
                      }}
                      onMouseEnter={(e) => { if (currentPage !== p) e.target.style.backgroundColor = '#F9FAFB' }}
                      onMouseLeave={(e) => { if (currentPage !== p) e.target.style.backgroundColor = '#ffffff' }}
                    >
                      {p}
                    </button>
                  ))}
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  style={{ padding: '10px 16px', border: '1px solid #D1D5DB', borderRadius: '8px', color: '#374151', backgroundColor: '#ffffff', cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer', fontSize: '0.875rem', fontWeight: '500', transition: 'background-color 0.2s', opacity: currentPage >= totalPages ? 0.6 : 1 }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#F9FAFB'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = '#ffffff'}
                >
                  Next
                </button>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
};

export default FilteredHotels;