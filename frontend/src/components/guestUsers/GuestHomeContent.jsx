import React, { useState, useEffect } from 'react';
import './GuestDashboard.css';
import { getAllHotels } from '../../api/hotel';
import { useNavigate } from 'react-router-dom';

export default function GuestHomeContent({ onNavigate }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('Kathmandu');
  const [category, setCategory] = useState('Resort');
  const [rating, setRating] = useState('5 Star');
  const demoHotels = [
    { id: 1, name: 'The Grand Elysian', price: 250, place: 'Thamel, Kathmandu', img: 'https://images.unsplash.com/photo-1505691723518-36a2c6be6f2a?auto=format&fit=crop&w=1200&q=60' },
    { id: 2, name: 'Himalayan Oasis', price: 320, place: 'Lazimpat, Kathmandu', img: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=60' },
    { id: 3, name: 'Boudha Boutique Hotel', price: 180, place: 'Boudha, Kathmandu', img: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=60' },
    { id: 4, name: 'Durbar Square Inn', price: 150, place: 'Basantapur, Kathmandu', img: 'https://images.unsplash.com/photo-1542317854-40a6f88b3b1d?auto=format&fit=crop&w=1200&q=60' }
  ];

  const [priceRange, setPriceRange] = useState('Any');
  const [minPrice, setMinPrice] = useState(500);
  const [maxPrice, setMaxPrice] = useState(100000);
  const [hotels, setHotels] = useState(demoHotels);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      // Build filters for API
      const filters = {};
      if (query) filters.q = query;
      if (location) filters.location = location;
      if (category) filters.category = category;
      if (rating) filters.rating = rating;
      if (minPrice) filters.priceMin = minPrice;
      if (maxPrice) filters.priceMax = maxPrice;

      const res = await getAllHotels(filters);
      // getAllHotels returns { hotels, total, ... } or similar - attempt to read hotels
      const list = res?.hotels || res?.data || res || [];
      if (Array.isArray(list) && list.length > 0) {
        setHotels(list);
      } else {
        // fallback: client-side filter demoHotels
        const filtered = demoHotels.filter((h) => h.price >= minPrice && h.price <= maxPrice);
        setHotels(filtered);
      }
      if (onNavigate) onNavigate('bookings');
    } catch (err) {
      console.error('Search failed, using demo data', err);
      setError('Search failed, showing demo results');
      const filtered = demoHotels.filter((h) => h.price >= minPrice && h.price <= maxPrice);
      setHotels(filtered);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // ensure demo shown initially filtered by min/max
    setHotels(demoHotels.filter((h) => h.price >= minPrice && h.price <= maxPrice));
  }, []);

  return (
    <div className="guest-home-root">
      <section className="home-search">
        <form className="search-form" onSubmit={handleSearch}>
          <div className="search-field">
            <label>Find Hotel</label>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Enter hotel name" />
          </div>

          <div className="search-field">
            <label>Select Location</label>
            <select value={location} onChange={(e) => setLocation(e.target.value)}>
              <option>Kathmandu</option>
              <option>Pokhara</option>
              <option>Lalitpur</option>
            </select>
          </div>

          <div className="search-field">
            <label>Select Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option>Resort</option>
              <option>Hotel</option>
              <option>Villa</option>
            </select>
          </div>

          <div className="search-field">
            <label>Select Price Range</label>
            <select value={priceRange} onChange={(e) => setPriceRange(e.target.value)}>
              <option>Any</option>
              <option>500 - 1,999</option>
              <option>2,000 - 4,999</option>
              <option>5,000 - 9,999</option>
              <option>10,000 - 49,999</option>
              <option>50,000 - 100,000</option>
            </select>
          </div>

          <div className="search-field">
            <label>Select Rating</label>
            <select value={rating} onChange={(e) => setRating(e.target.value)}>
              <option>5 Star</option>
              <option>4 Star</option>
              <option>3 Star</option>
            </select>
          </div>

          <div className="search-field price-range-field">
            <label>Price Range</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="number" min={0} value={minPrice} onChange={(e) => setMinPrice(Number(e.target.value || 0))} style={{ width: 110, padding: 8, borderRadius: 6, border: '1px solid #e4efed' }} />
              <span style={{ padding: '0 6px' }}>—</span>
              <input type="number" min={0} value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value || 0))} style={{ width: 130, padding: 8, borderRadius: 6, border: '1px solid #e4efed' }} />
            </div>
            <div style={{ marginTop: 8 }}>
              <input type="range" min={500} max={100000} step={100} value={minPrice} onChange={(e) => {
                const v = Number(e.target.value);
                if (v <= maxPrice) setMinPrice(v);
              }} />
              <input type="range" min={500} max={100000} step={100} value={maxPrice} onChange={(e) => {
                const v = Number(e.target.value);
                if (v >= minPrice) setMaxPrice(v);
              }} />
            </div>
          </div>

          <div className="search-action">
            <button className="primary" type="submit">🔍 Search Now</button>
          </div>
        </form>
      </section>

      <section className="home-categories">
        <h2>Luxury & Comfort Choices</h2>
        <div className="category-chips">
          {['Villa','Hotel','Resort','Cottage','Bungalow','Duplex'].map((c) => (
            <button key={c} className={`chip ${c === 'Hotel' ? 'active' : ''}`}>{c}</button>
          ))}
        </div>
      </section>

      <section className="hotel-cards">
        <h3>Check Out Premium Stays</h3>
        {loading && <div>Loading results…</div>}
        {error && <div className="status error">{error}</div>}
        <div className="hotel-grid">
          {hotels.map((h) => (
            <article className="hotel-card" key={h._id || h.id}>
              <div className="hotel-media">
                <img src={h.images?.[0] || h.img} alt={h.name || h.title} />
              </div>
              <div className="hotel-body">
                <div className="hotel-price">NPR {h.price || h.roomPrice || h.priceStarting || '—'}</div>
                <div className="hotel-name">{h.name || h.title || h.hotelName}</div>
                <div className="hotel-place">{h.location?.name || h.place || (h.address && h.address.city) || 'Location'}</div>
                <div style={{ marginTop: 10 }}>
                  <button className="primary" onClick={() => {
                    // navigate to hotel details page if id available
                    const id = h._id || h.id;
                    if (id) {
                      navigate(`/hotel/${id}`);
                      return;
                    }
                    if (onNavigate) onNavigate('bookings');
                  }}>View Hotel Info</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
