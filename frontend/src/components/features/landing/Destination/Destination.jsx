import React, { useState, useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Star, Hotel, Filter, MapPin, Calendar, Thermometer, Bed, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Link } from "react-router-dom";
import "./Destination.css";

gsap.registerPlugin(ScrollTrigger);

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
  
  const heroRef = useRef(null);
  const headerRef = useRef(null);
  const filterRef = useRef(null);
  const gridRef = useRef(null);

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

  // GSAP Animations
  useEffect(() => {
    const ctx = gsap.context(() => {
      // Header animation
      gsap.fromTo(
        headerRef.current,
        { y: 20, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: heroRef.current,
            start: 'top 80%',
            toggleActions: 'play none none reverse',
          },
        }
      );

      // Filter animation
      gsap.fromTo(
        filterRef.current,
        { y: 15, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.5,
          delay: 0.2,
          ease: 'power1.out',
          scrollTrigger: {
            trigger: filterRef.current,
            start: 'top 85%',
            toggleActions: 'play none none reverse',
          },
        }
      );

      // Cards animation
      const cards = gridRef.current?.querySelectorAll('.destination-card');
      if (cards) {
        gsap.fromTo(
          cards,
          { y: 30, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.5,
            stagger: 0.08,
            ease: 'power1.out',
            scrollTrigger: {
              trigger: gridRef.current,
              start: 'top 80%',
              toggleActions: 'play none none reverse',
            },
          }
        );
      }
    }, heroRef);

    return () => ctx.revert();
  }, [filteredDestinations]);

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden flex flex-col">
      {/* Hero Section */}
      <section
        ref={heroRef}
        className="relative min-h-[60vh] w-full overflow-hidden z-10"
      >
        {/* Background Image */}
        <div className="absolute inset-0 w-full h-full">
          <img
            src="https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1400&q=80"
            alt="Nepal landscape"
            className="w-full h-full object-cover"
            style={{ objectPosition: 'center 50%' }}
          />
          {/* Gradient Overlay */}
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(180deg, rgba(11,15,28,0.4) 0%, rgba(11,15,28,0.6) 100%)',
            }}
          />
        </div>

        {/* Content */}
        <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 xl:px-[6vw] min-h-[60vh] flex flex-col justify-center pt-[72px] pb-20">
          <div ref={headerRef} className="text-center max-w-3xl mx-auto">
            <h1 className="text-white font-extrabold text-[clamp(36px,4.5vw,64px)] leading-[1.1] mb-6">
              Discover Nepal
            </h1>
            <p className="text-white/90 text-lg md:text-xl leading-relaxed">
              Click on any destination image to explore and find hotels
            </p>
          </div>
        </div>
      </section>

      {/* Filter Buttons Section */}
      <div ref={filterRef} className="relative z-20 bg-white py-8 -mt-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 xl:px-[6vw]">
          <div className="bg-white/95 backdrop-blur-sm rounded-[28px] p-6 shadow-xl border border-gray-100">
            <div className="flex items-center gap-2 text-gray-700 font-semibold mb-4">
              <Filter className="w-5 h-5 text-teal-600" />
              <span>Filter by:</span>
            </div>
            <div className="flex flex-wrap gap-3">
              {filterButtons.map((filter) => (
                <button
                  key={filter.id}
                  className={`px-6 py-2.5 rounded-full font-medium transition-all ${
                    selectedFilter === filter.id
                      ? 'bg-teal-600 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  onClick={() => setSelectedFilter(filter.id)}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Destinations Grid */}
      <section ref={gridRef} className="py-16 md:py-24 bg-gray-50 relative z-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 xl:px-[6vw]">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredDestinations.map((dest) => (
              <div
                key={dest.id}
                className="destination-card relative rounded-[28px] overflow-hidden h-[320px] cursor-pointer group shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-1"
                onClick={() => handleCardClick(dest)}
              >
                {/* Popular Badge */}
                {dest.popular && (
                  <div className="absolute top-4 right-4 bg-orange-500 text-white px-4 py-1.5 rounded-full text-xs font-semibold z-10 flex items-center gap-1 shadow-lg">
                    <Star className="w-3 h-3 fill-white" />
                    Popular
                  </div>
                )}
                
                {/* Image */}
                <div className="relative w-full h-full">
                  <img
                    src={dest.image}
                    alt={dest.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    onError={(e) => {
                      e.target.src = "https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=800&q=80";
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                  
                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <span className="text-white font-semibold text-sm bg-teal-600/90 px-4 py-2 rounded-full">
                      Click to view details
                    </span>
                  </div>
                  
                  {/* Name Overlay */}
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <h3 className="text-white text-xl font-bold">{dest.name}</h3>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Detailed Modal */}
      {showModal && selectedDestination && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[1000] flex items-center justify-center p-4" onClick={closeModal}>
          <div className="bg-white rounded-[28px] max-w-6xl w-full max-h-[90vh] overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <button
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-gray-900/70 hover:bg-gray-900 text-white flex items-center justify-center z-10 transition-all"
              onClick={closeModal}
            >
              <X className="w-5 h-5" />
            </button>

            <div className="grid md:grid-cols-2 gap-0">
              {/* Left Side: Image Gallery */}
              <div className="relative h-[400px] md:h-auto bg-gray-100">
                <img
                  src={selectedDestination.images[currentImageIndex]}
                  alt={`${selectedDestination.name} - Image ${currentImageIndex + 1}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.src = "https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=800&q=80";
                    e.target.onerror = null;
                  }}
                />
                
                {/* Navigation Arrows */}
                <button
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center z-20 transition-all"
                  onClick={(e) => {
                    e.stopPropagation();
                    prevImage();
                  }}
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                
                <button
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center z-20 transition-all"
                  onClick={(e) => {
                    e.stopPropagation();
                    nextImage();
                  }}
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
                
                {/* Image Counter */}
                <div className="absolute top-4 left-4 bg-black/60 text-white px-3 py-1.5 rounded-full text-xs font-semibold z-20">
                  {currentImageIndex + 1} / {selectedDestination.images.length}
                </div>
                
                {/* Image Dots */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
                  {selectedDestination.images.map((_, index) => (
                    <button
                      key={index}
                      className={`w-2 h-2 rounded-full transition-all ${
                        index === currentImageIndex
                          ? 'bg-white w-6'
                          : 'bg-white/50 hover:bg-white/75'
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentImageIndex(index);
                      }}
                    />
                  ))}
                </div>
                
                {selectedDestination.popular && (
                  <div className="absolute top-4 right-4 bg-orange-500 text-white px-4 py-1.5 rounded-full text-xs font-semibold z-20 flex items-center gap-1 shadow-lg">
                    <Star className="w-3 h-3 fill-white" />
                    Popular Destination
                  </div>
                )}
              </div>

              
              {/* Right Side: Details */}
              <div className="p-8 overflow-y-auto max-h-[90vh]">
                <h2 className="text-3xl font-bold text-gray-900 mb-3">{selectedDestination.name}</h2>
                
                <div className="mb-4">
                  <span className={`inline-block px-4 py-1.5 rounded-full text-xs font-semibold capitalize ${
                    selectedDestination.category === 'cultural' ? 'bg-teal-50 text-teal-700 border border-teal-200' :
                    selectedDestination.category === 'adventure' ? 'bg-red-50 text-red-700 border border-red-200' :
                    selectedDestination.category === 'nature' ? 'bg-green-50 text-green-700 border border-green-200' :
                    'bg-purple-50 text-purple-700 border border-purple-200'
                  }`}>
                    {selectedDestination.category}
                  </span>
                </div>
                
                <p className="text-gray-600 mb-6 leading-relaxed">
                  {selectedDestination.description}
                </p>
                
                {/* Key Info Grid */}
                <div className="grid grid-cols-2 gap-4 mb-6 bg-gray-50 rounded-2xl p-5">
                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-gray-500 mb-1">Location</h4>
                      <p className="text-sm font-semibold text-gray-900">{selectedDestination.location}</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-gray-500 mb-1">Best Time</h4>
                      <p className="text-sm font-semibold text-gray-900">{selectedDestination.bestTime}</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center flex-shrink-0">
                      <Thermometer className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-gray-500 mb-1">Weather</h4>
                      <p className="text-sm font-semibold text-gray-900">{selectedDestination.weather}</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center flex-shrink-0">
                      <Bed className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-gray-500 mb-1">Hotels</h4>
                      <p className="text-sm font-semibold text-gray-900">{selectedDestination.hotelsCount} available</p>
                    </div>
                  </div>
                </div>
                
                {/* Activities */}
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Popular Activities</h3>
                  <div className="space-y-2">
                    {selectedDestination.activities.map((activity, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                        <div className="w-2 h-2 rounded-full bg-teal-600 flex-shrink-0"></div>
                        <span className="text-sm text-gray-700">{activity}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex gap-3">
                  <Link
                    to={selectedDestination.hotelsLink}
                    className="flex-1 bg-gradient-to-r from-teal-500 to-teal-700 hover:from-teal-600 hover:to-teal-800 text-white font-semibold py-3 px-6 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                  >
                    <Hotel className="w-5 h-5" />
                    View & Book Hotels
                  </Link>
                  <button
                    className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-2xl transition-all"
                    onClick={closeModal}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Destination;