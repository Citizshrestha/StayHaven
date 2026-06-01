import React, { useState, useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Star, Hotel, Filter, MapPin, Calendar, Thermometer, Bed, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useContent } from "../../../../hooks/useContent";
import { getDestinations as getDestinationsApi } from "../../../../core/api/services/content.service";
import "./Destination.css";

gsap.registerPlugin(ScrollTrigger);

const Destination = () => {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [selectedDestination, setSelectedDestination] = useState(null);
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const heroRef = useRef(null);
  const headerRef = useRef(null);
  const filterRef = useRef(null);
  const gridRef = useRef(null);

  const { data: dynamicDestinations, loading, error } = useContent('destinations', getDestinationsApi);

  const mergedDestinations = (dynamicDestinations || []).map(d => ({
    id: d._id,
    name: d.name,
    description: d.description || '',
    images: d.images?.length > 0 ? d.images : [],
    popular: d.isPopular || false,
    category: d.type || 'cultural',
    activities: d.activities || [],
    bestTime: d.bestTime || '',
    weather: d.weather || '',
    hotelsCount: d.hotelsCount || 0,
    location: d.province || '',
  }));

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

  const handleViewHotels = () => {
    if (!selectedDestination) return;
    const params = new URLSearchParams({
      destinationId: selectedDestination.id,
      destination: selectedDestination.name,
      province: selectedDestination.location,
      type: selectedDestination.category,
    });
    navigate(`/hotels?${params.toString()}`);
    closeModal();
    window.scrollTo(0, 0);
  };

  // Filter destinations based on selected filter
  const filteredDestinations = mergedDestinations.map(dest => ({
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
    if (!heroRef.current) return;

    const ctx = gsap.context(() => {
      // Header animation — hero header fades in (it's in the hero, above the fold)
      if (headerRef.current) {
        gsap.fromTo(
          headerRef.current,
          { y: 20, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.6,
            ease: 'power2.out',
            // No ScrollTrigger — animate immediately on page load
          }
        );
      }

      // Cards animation — only animate when scrolled into view
      if (gridRef.current) {
        const cards = gridRef.current.querySelectorAll('.destination-card');
        if (cards && cards.length > 0) {
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
                start: 'top 85%',
                toggleActions: 'play none none none',
              },
            }
          );
        }
      }
    }, heroRef);

    return () => ctx.revert();
  }, [filteredDestinations]);

  return (
    <div className="min-h-screen bg-white overflow-x-hidden flex flex-col">
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
              Discover cultural heritage, adventure, nature, and spiritual sites
              across Nepal&apos;s most loved destinations.
            </p>
          </div>
        </div>
      </section>

      {/* Destination Filter */}
      <div ref={filterRef} className="relative z-20 bg-white py-8 -mt-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 xl:px-[6vw]">
          <div className="bg-white/95 backdrop-blur-sm rounded-[28px] p-6 shadow-xl border border-gray-100">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
              <div className="flex items-center gap-2 text-gray-700 font-semibold">
                <Filter className="w-5 h-5 text-teal-600" />
                <span>Filter destinations</span>
              </div>
              <p className="text-sm text-gray-600">
                Showing {filteredDestinations.length} destination
                {filteredDestinations.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {filterButtons.map((filter) => (
                <button
                  key={filter.id}
                  type="button"
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
      <section ref={gridRef} className="py-16 md:py-24 bg-white relative z-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 xl:px-[6vw]">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {loading ? (
              Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="h-[320px] rounded-[28px] bg-gray-200 animate-pulse" />
              ))
            ) : error ? (
              <div className="col-span-full rounded-3xl border border-red-100 bg-red-50 p-10 text-center text-red-600">
                Destinations could not be loaded right now.
              </div>
            ) : filteredDestinations.length === 0 ? (
              <div className="col-span-full rounded-3xl border border-gray-100 bg-gray-50 p-10 text-center text-gray-600">
                No destinations have been published for this filter yet.
              </div>
            ) : filteredDestinations.map((dest) => (
              <div
                key={dest.id}
                className="destination-card relative rounded-[28px] overflow-hidden h-[320px] cursor-pointer group shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-1 bg-gray-100"
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
                  {dest.image ? (
                    <img
                      src={dest.image}
                      alt={dest.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                  ) : null}
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
                  <button
                    onClick={handleViewHotels}
                    className="flex-1 bg-gradient-to-r from-teal-500 to-teal-700 hover:from-teal-600 hover:to-teal-800 text-white font-semibold py-3 px-6 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                  >
                    <Hotel className="w-5 h-5" />
                    View & Book Hotels
                  </button>
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