import React, { useState } from 'react';
import Navbar from './Navbar';
import { Heart, MapPin, Star, ChevronDown } from 'lucide-react';

const hotels = [
  {
    id: 1,
    title: 'The Grand Elysian',
    rating: 4.8,
    location: 'Thamel, Kathmandu',
    price: 250,
    image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&h=600&fit=crop',
  },
  {
    id: 2,
    title: 'Himalayan Oasis',
    rating: 4.9,
    location: 'Lazimpat, Kathmandu',
    price: 320,
    image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&h=600&fit=crop',
  },
  {
    id: 3,
    title: 'Boudha Boutique Hotel',
    rating: 4.7,
    location: 'Boudha, Kathmandu',
    price: 180,
    image: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&h=600&fit=crop',
  },
  {
    id: 4,
    title: 'Durbar Square Inn',
    rating: 4.5,
    location: 'Basantapur, Kathmandu',
    price: 150,
    image: 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800&h=600&fit=crop',
  },
  {
    id: 5,
    title: 'The Modernist Hub',
    rating: 4.6,
    location: 'Durbarmarg, Kathmandu',
    price: 280,
    image: 'https://images.unsplash.com/photo-1563911302283-d2bc129e7570?w=800&h=600&fit=crop',
  },
  {
    id: 6,
    title: 'Patan Heritage Hotel',
    rating: 4.8,
    location: 'Patan, Lalitpur',
    price: 210,
    image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800&h=600&fit=crop',
  },
];

const FilteredHotels = () => {
  const [selectedRating, setSelectedRating] = useState(null);
  const [priceRange, setPriceRange] = useState(500);
  const [amenities, setAmenities] = useState({
    wifi: false,
    pool: true,
    parking: false,
    gym: false,
  });
  const [currentPage, setCurrentPage] = useState(1);

  const amenitiesList = [
    { id: 'wifi', label: 'Free Wi-Fi' },
    { id: 'pool', label: 'Swimming Pool' },
    { id: 'parking', label: 'Parking' },
    { id: 'gym', label: 'Gym' },
  ];

  const handleAmenityChange = (id) => {
    setAmenities((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      <Navbar />

      <main className="max-w-[1400px] mx-auto px-6 py-8">
        <div className="flex gap-8" style={{ marginTop: '5rem' }}>
          {/* Left Sidebar - Filters */}
          <aside className="w-[240px] flex-shrink-0" style={{marginLeft: "2rem"}}>
            <div className="sticky top-24 bg-white rounded-xl shadow-sm p-6" style={{padding: "10px"}}>
              <h2 className="text-xl font-bold text-gray-900 mb-6">Filters</h2>

              {/* City Filter */}
              <div className="mb-6" style={{ marginTop: '1rem' }}>
                <label className="block text-sm font-semibold text-gray-700 mb-3">City</label>
                <div className="relative">
                  <select className="w-full px-4 py-2 border border-gray-300 rounded-lg appearance-none bg-white text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                    <option>Kathmandu</option>
                    <option>Pokhara</option>
                    <option>Lalitpur</option>
                    <option>Bhaktapur</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                </div>
              </div>

              {/* Rating Filter */}
              <div className="mb-6" style={{ marginTop: '1rem' }}>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Rating</label>
                <div className="flex gap-2">
                  {[...Array(5)].map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedRating(selectedRating === i + 1 ? null : i + 1)}
                      className={`p-2 border rounded-lg transition ${
                        selectedRating === i + 1
                          ? 'border-yellow-400 text-yellow-400'
                          : 'border-gray-300 text-gray-400 hover:border-yellow-400 hover:text-yellow-400'
                      }`}
                    >
                      <Star className="w-4 h-4 fill-current" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Price Range Filter */}
              <div className="mb-6" style={{ marginTop: '1rem' }}>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Price Range</label>
                <input
                  type="range"
                  min="50"
                  max="1000"
                  value={priceRange}
                  onChange={(e) => setPriceRange(e.target.value)}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-teal-500"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-2">
                  <span>$50</span>
                  <span>$1000+</span>
                </div>
              </div>

              {/* Amenities Filter */}
              <div style={{ marginTop: '1rem' }}>
                <label className="block text-sm font-semibold text-gray-700 mb-4">Amenities</label>
                <div className="space-y-3">
                  {amenitiesList.map((item) => (
                    <div key={item.id} className="flex items-center">
                      <div className="relative">
                        <input
                          type="checkbox"
                          id={item.id}
                          checked={amenities[item.id]}
                          onChange={() => handleAmenityChange(item.id)}
                          className="w-5 h-5 rounded border-2 border-gray-300 cursor-pointer appearance-none checked:bg-teal-500 checked:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
                        />
                        {amenities[item.id] && (
                          <svg
                            className="absolute top-1 left-1 w-3 h-3 text-white pointer-events-none"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <label htmlFor={item.id} className="ml-3 text-sm text-gray-700 cursor-pointer">
                        {item.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <section className="flex-1">
            {/* Header with Title and Sort */}
            <div className="flex justify-between items-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900">Hotels in Kathmandu</h1>
              <div className="relative w-48">
                <select className="w-full px-4 py-2 border border-gray-300 rounded-lg appearance-none bg-white text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                  <option>Sort by Price</option>
                  <option>Sort by Rating</option>
                  <option>Sort by Newest</option>
                </select>
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1 pointer-events-none">
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                </div>
              </div>
            </div>

            {/* Hotel Grid */}
            <div className="grid grid-cols-3 gap-6 mb-8">
              {hotels.map((hotel) => (
                <div
                  key={hotel.id}
                  className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-300"
                >
                  {/* Image Container */}
                  <div className="relative h-56 overflow-hidden bg-gray-200">
                    <img
                      src={hotel.image}
                      alt={hotel.title}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    />
                    {/* Heart Icon */}
                    <button className="absolute top-3 right-3 bg-white rounded-full p-2 shadow-md hover:bg-gray-100 transition">
                      <Heart className="w-4 h-4 text-red-500" />
                    </button>
                  </div>

                  {/* Content */}
                  <div className="p-5">
                    {/* Title and Rating */}
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="text-base font-bold text-gray-900 flex-1">{hotel.title}</h3>
                      <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm font-semibold text-gray-700">{hotel.rating}</span>
                      </div>
                    </div>

                    {/* Location */}
                    <div className="flex items-center gap-2 text-gray-600 text-sm mb-4">
                      <MapPin className="w-4 h-4 text-gray-500" />
                      <span>{hotel.location}</span>
                    </div>

                    {/* Price and Button */}
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-xl font-bold text-gray-900">${hotel.price}</p>
                        <p className="text-xs text-gray-500">/night</p>
                      </div>
                      <button className="px-4 py-2 bg-teal-500 text-white rounded-lg text-sm font-semibold hover:bg-teal-600 transition">
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="flex justify-center items-center gap-2">
              <button className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition text-sm">
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(1)}
                className={`px-4 py-2 rounded-lg transition text-sm ${
                  currentPage === 1
                    ? 'bg-teal-500 text-white'
                    : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                1
              </button>
              <button
                onClick={() => setCurrentPage(2)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition text-sm"
              >
                2
              </button>
              <button
                onClick={() => setCurrentPage(3)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition text-sm"
              >
                3
              </button>
              <span className="px-2 text-gray-500">...</span>
              <button className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition text-sm">
                10
              </button>
              <button className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition text-sm">
                Next
              </button>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default FilteredHotels;