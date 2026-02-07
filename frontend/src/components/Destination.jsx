import React, { useState } from "react";
import "./Destination.css";
import Navbar from "./Navbar";
import { FaStar, FaHotel, FaFilter, FaMapMarkerAlt, FaCalendarAlt, FaTemperatureHigh, FaBed, FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { Link } from "react-router-dom";

//for images inside the info in detail
const boudha = "source/Kathmandu/BoudhanathStupa.jpg";
const ktmDurbar = "source/Kathmandu/KathmanduDurbarSquare.jpg";
const pashupati = "source/Kathmandu/Pashupatinath.jpg";

const deviFall = "source/Pokhara/Devi'sFall.jpg";
const phewa = "source/Pokhara/PhewaLake.jpg";
const sarangkot = "source/Pokhara/Sarangkot.jpg";
const peacePagoda = "source/Pokhara/WorldPeacePagoda.jpg";

const chitwanPark = "source/Chitwan/Chitwannationalpark.jpg";
const elephant = "source/Chitwan/ElephantBreeding.jpg";
const raptiRiver = "source/Chitwan/RaptiRiver.jpg";
const tharuDance = "source/Chitwan/TharuCulturalDance.jpg";

const ashoka = "source/Lumbini/AshokaPillar.jpg";
const sacredGarden = "source/Lumbini/LumbiniSacredGarden.jpg";
const mayaTemple = "source/Lumbini/MayaDeviTemple.jpg";

const destinations = [
  {
    id: 1,
    name: "Kathmandu",
    description: "Explore the rich culture...",
    images: [boudha, ktmDurbar, pashupati],
    popular: true,
    category: "cultural",
    activities: ["Visit Pashupatinath Temple", "Explore Durbar Square", "Try Local Cuisine", "Shop at Asan Market", "See Boudhanath Stupa"],
    bestTime: "September to November",
    weather: "15°C - 25°C",
    hotelsCount: 45,
    location: "Bagmati Province",
    hotelsLink: "/hotels/kathmandu"
  },
  {
    id: 2,
    name: "Pokhara",
    description: "Experience serene lakes...",
    images: [deviFall, phewa, sarangkot, peacePagoda],
    popular: true,
    category: "adventure",
    activities: ["Paragliding over Sarangkot", "Boating on Phewa Lake", "Hiking to Peace Pagoda", "Exploring Caves", "Sunrise at Sarangkot"],
    bestTime: "October to November",
    weather: "10°C - 20°C",
    hotelsCount: 38,
    location: "Gandaki Province",
    hotelsLink: "/hotels/pokhara"
  },
  {
    id: 3,
    name: "Chitwan",
    description: "Wildlife safaris...",
    images: [chitwanPark, elephant, raptiRiver, tharuDance],
    popular: false,
    category: "nature",
    activities: ["Jungle Safari", "Elephant Bathing", "Bird Watching", "Nature Walks", "Canoe Ride"],
    bestTime: "October to February",
    weather: "20°C - 30°C",
    hotelsCount: 28,
    location: "Bagmati Province",
    hotelsLink: "/hotels/chitwan"
  },
  {
    id: 4,
    name: "Lumbini",
    description: "The birthplace of Lord Buddha...",
    images: [ashoka, sacredGarden, mayaTemple],
    popular: false,
    category: "spiritual",
    activities: ["Visit Maya Devi Temple", "See International Monasteries", "Meditation", "Archaeological Museum", "Peace Stupa"],
    bestTime: "October to March",
    weather: "18°C - 28°C",
    hotelsCount: 22,
    location: "Lumbini Province",
    hotelsLink: "/hotels/lumbini"
  },
  {
    id: 5,
    name: "Nagarkot",
    description: "Breathtaking sunrise and sunset views of the Himalayas. A hill station offering panoramic views of Mount Everest, Langtang, and other majestic peaks from the comfort of your hotel.",
    images: [
      "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1578662996442-48f60103fc96?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&w=800&q=60"
    ],
    popular: true,
    category: "nature",
    activities: ["Sunrise Viewpoint", "Hiking Trails", "Nature Photography", "Mountain Biking", "Village Tours"],
    bestTime: "October to December",
    weather: "5°C - 15°C",
    hotelsCount: 18,
    location: "Bagmati Province",
    hotelsLink: "/hotels/nagarkot"
  },
  {
    id: 6,
    name: "Bhaktapur",
    description: "Ancient city with medieval architecture and traditional pottery. Known as the 'City of Devotees' with well-preserved palaces, temples, and traditional Newari culture.",
    images: [
      "https://images.unsplash.com/photo-1564507004663-b6dfb3e2ede5?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1554072675-66db59fba849?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&w=800&q=60"
    ],
    popular: false,
    category: "cultural",
    activities: ["Explore Durbar Square", "Pottery Square", "Nyatapola Temple", "Traditional Arts", "Local Festivals"],
    bestTime: "September to November",
    weather: "15°C - 25°C",
    hotelsCount: 15,
    location: "Bagmati Province",
    hotelsLink: "/hotels/bhaktapur"
  },
];

const Destination = () => {
  const [showModal, setShowModal] = useState(false);
  const [selectedDestination, setSelectedDestination] = useState(null);
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const handleCardClick = (destination) => {
    setSelectedDestination(destination);
    setCurrentImageIndex(0); // Reset to first image
    setShowModal(true);
  };

  const closeModal = () => {
    setSelectedDestination(null);
    setCurrentImageIndex(0);
    setShowModal(false);
  };

  const nextImage = () => {
    if (selectedDestination) {
      setCurrentImageIndex((prevIndex) => 
        prevIndex === selectedDestination.images.length - 1 ? 0 : prevIndex + 1
      );
    }
  };

  const prevImage = () => {
    if (selectedDestination) {
      setCurrentImageIndex((prevIndex) => 
        prevIndex === 0 ? selectedDestination.images.length - 1 : prevIndex - 1
      );
    }
  };

  // Filter destinations based on selected filter
  const filteredDestinations = destinations.map(dest => ({
    ...dest,
    image: dest.images[0] // Use first image for grid display
  })).filter((dest) => {
    if (selectedFilter === "all") return true;
    if (selectedFilter === "popular") return dest.popular;
    return dest.category === selectedFilter;
  });

  const filterButtons = [
    { id: "all", label: "All Destinations" },
    { id: "popular", label: "Popular" },
    { id: "cultural", label: "Cultural" },
    { id: "adventure", label: "Adventure" },
    { id: "nature", label: "Nature" },
    { id: "spiritual", label: "Spiritual" },
  ];

  return (
    <div className="w-screen min-h-screen overflow-x-hidden">
      <Navbar />
      <div className="destination-page">
        {/* Header */}
        <header className="destination-header">
          <div className="header-content">
            <h1>Discover Nepal</h1>
            <p>
              Click on any destination image to explore and find hotels
            </p>
          </div>
        </header>

        {/* Filter Buttons Section */}
        <div className="filter-section">
          <div className="filter-container">
            <div className="filter-label">
              <FaFilter /> Filter by:
            </div>
            <div className="filter-buttons">
              {filterButtons.map((filter) => (
                <button
                  key={filter.id}
                  className={`filter-btn ${selectedFilter === filter.id ? "active" : ""}`}
                  onClick={() => setSelectedFilter(filter.id)}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Destinations Grid - ONLY IMAGES */}
        <section className="destinations-container">
          {filteredDestinations.map((dest) => (
            <div 
              key={dest.id} 
              className="destination-card"
              onClick={() => handleCardClick(dest)}
            >
              {/* Popular Badge - Only shows if popular */}
              {dest.popular && (
                <div className="popular-badge">
                  <FaStar /> Popular
                </div>
              )}
              
              {/* Clickable Image Only - No text underneath */}
              <div className="destination-image-wrapper">
                <img 
                  src={dest.image} 
                  alt={dest.name} 
                  className="destination-image"
                  onError={(e) => {
                    e.target.src = "https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=800&q=80";
                  }}
                />
                <div className="image-hover-overlay">
                  <span className="hover-text">Click to view details</span>
                </div>
              </div>
              
              {/* Name appears on hover only */}
              <div className="destination-name-overlay">
                <h3>{dest.name}</h3>
              </div>
            </div>
          ))}
        </section>

        {/* Detailed Modal - Shows ALL information */}
        {showModal && selectedDestination && (
          <div className="modal-overlay" onClick={closeModal}>
            <div className="destination-modal" onClick={(e) => e.stopPropagation()}>
              <button className="close-modal" onClick={closeModal}>
                ×
              </button>
              
              <div className="modal-content">
                {/* Left Side: Image Gallery - UPDATED */}
                <div className="modal-image-container">
                  <div className="modal-image-wrapper">
                    {/* Main Image */}
                    <img 
                      src={selectedDestination.images[currentImageIndex]} 
                      alt={`${selectedDestination.name} - Image ${currentImageIndex + 1}`} 
                      className="modal-main-image"
                      onError={(e) => {
                        e.target.src = "https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=800&q=80";
                        e.target.onerror = null;
                      }}
                    />
                    
                    {/* Navigation Arrows */}
                    <button 
                      className="image-nav-btn prev-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        prevImage();
                      }}
                    >
                      <FaChevronLeft />
                    </button>
                    
                    <button 
                      className="image-nav-btn next-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        nextImage();
                      }}
                    >
                      <FaChevronRight />
                    </button>
                    
                    {/* Image Counter */}
                    <div className="image-counter">
                      {currentImageIndex + 1} / {selectedDestination.images.length}
                    </div>
                    
                    {/* Image Dots Indicator */}
                    <div className="image-dots">
                      {selectedDestination.images.map((_, index) => (
                        <button
                          key={index}
                          className={`image-dot ${index === currentImageIndex ? 'active' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setCurrentImageIndex(index);
                          }}
                        />
                      ))}
                    </div>
                    
                    {selectedDestination.popular && (
                      <div className="modal-popular-badge">
                        <FaStar /> Popular Destination
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Right Side: All Details */}
                <div className="modal-details-container">
                  <h2>{selectedDestination.name}</h2>
                  
                  <div className="destination-category">
                    <span className={`category-badge ${selectedDestination.category}`}>
                      {selectedDestination.category}
                    </span>
                  </div>
                  
                  <p className="destination-description">
                    {selectedDestination.description}
                  </p>
                  
                  {/* Key Info Grid */}
                  <div className="info-grid">
                    <div className="info-item">
                      <div className="info-icon">
                        <FaMapMarkerAlt />
                      </div>
                      <div>
                        <h4>Location</h4>
                        <p>{selectedDestination.location}</p>
                      </div>
                    </div>
                    <div className="info-item">
                      <div className="info-icon">
                        <FaCalendarAlt />
                      </div>
                      <div>
                        <h4>Best Time</h4>
                        <p>{selectedDestination.bestTime}</p>
                      </div>
                    </div>
                    <div className="info-item">
                      <div className="info-icon">
                        <FaTemperatureHigh />
                      </div>
                      <div>
                        <h4>Weather</h4>
                        <p>{selectedDestination.weather}</p>
                      </div>
                    </div>
                    <div className="info-item">
                      <div className="info-icon">
                        <FaBed />
                      </div>
                      <div>
                        <h4>Hotels</h4>
                        <p>{selectedDestination.hotelsCount} available</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Activities */}
                  <div className="activities-section">
                    <h3>Popular Activities</h3>
                    <div className="activities-">
                      {selectedDestination.activities.map((activity, index) => (
                        <div key={index} className="activity-item">
                          <div className="activity-bullet"></div>
                          <span>{activity}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="action-buttons">
                    <Link 
                      to={selectedDestination.hotelsLink}
                      className="hotels-link-btn"
                    >
                      <FaHotel /> View & Book Hotels
                    </Link>
                    <button className="close-modal-btn" onClick={closeModal}>
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Simple Footer */}
        <div className="page-footer">
          <p>Click on any image above to see destination details</p>
          <p className="filter-info">
            Showing {filteredDestinations.length} of {destinations.length} destinations
            {selectedFilter !== "all" && ` (Filtered by: ${selectedFilter})`}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Destination;
