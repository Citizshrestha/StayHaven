import React, { useState, useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Tag, Calendar, Users, X } from "lucide-react";
import "./OffersPage.css";

gsap.registerPlugin(ScrollTrigger);


const offers = [
  {
    id: 1,
    title: "Weekend Getaway Offer",
    description:
      "Enjoy up to 40% off on weekend stays at our premium resorts. Perfect for quick escapes!",
    image:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80",
    discount: "40% OFF",
    category: "weekend",
    featured: true,
    basePrice: 3600, // per night for 2 guests
    originalPrice: "Rs 12,000",
    discountedPrice: "Rs 7,200",
    duration: "2 nights",
    perNight: "Rs 3,600/night",
    maxGuests: 4,
    extraGuestCharge: 800 // per night per extra guest
  },
  {
    id: 2,
    title: "Honeymoon Special",
    description:
      "Celebrate love with exclusive couple packages including spa, candlelight dinner, and more.",
    image:
      "https://images.unsplash.com/photo-1501117716987-c8e1ecb2107b?auto=format&fit=crop&w=800&q=80",
    discount: "30% OFF",
    category: "romance",
    featured: true,
    basePrice: 4200, // per night for 2 guests
    originalPrice: "Rs 18,000",
    discountedPrice: "Rs 12,600",
    duration: "3 nights",
    perNight: "Rs 4,200/night",
    maxGuests: 2,
    extraGuestCharge: 0 // No extra guests for honeymoon
  },
  {
    id: 3,
    title: "Family Fun Deal",
    description:
      "Book family suites and get complimentary breakfast and kids' activities.",
    image:
      "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80",
    discount: "25% OFF",
    category: "family",
    featured: false,
    basePrice: 5625, // per night for 4 guests
    originalPrice: "Rs 15,000",
    discountedPrice: "Rs 11,250",
    duration: "2 nights",
    perNight: "Rs 5,625/night",
    maxGuests: 6,
    extraGuestCharge: 700 // per night per extra guest
  },
  {
    id: 4,
    title: "Early Bird Offer",
    description:
      "Book your stay 30 days in advance and enjoy exclusive discounts on top destinations.",
    image:
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80",
    discount: "35% OFF",
    category: "advance",
    featured: false,
    basePrice: 3467, // per night for 2 guests
    originalPrice: "Rs 16,000",
    discountedPrice: "Rs 10,400",
    duration: "3 nights",
    perNight: "Rs 3,467/night",
    maxGuests: 3,
    extraGuestCharge: 900
  },
  {
    id: 5,
    title: "Business Traveler Package",
    description:
      "Special rates for corporate travelers with complimentary WiFi, workspace, and late checkout.",
    image:
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80",
    discount: "20% OFF",
    category: "business",
    featured: false,
    basePrice: 6400, // per night for 1 guest
    originalPrice: "Rs 8,000",
    discountedPrice: "Rs 6,400",
    duration: "1 night",
    perNight: "Rs 6,400/night",
    maxGuests: 2,
    extraGuestCharge: 1200
  },
  {
    id: 6,
    title: "Last Minute Deal",
    description:
      "Spontaneous plans? Book within 48 hours of check-in and save big on your stay!",
    image:
      "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=800&q=80",
    discount: "50% OFF",
    category: "lastminute",
    featured: true,
    basePrice: 2500, // per night for 2 guests
    originalPrice: "Rs 10,000",
    discountedPrice: "Rs 5,000",
    duration: "2 nights",
    perNight: "Rs 2,500/night",
    maxGuests: 4,
    extraGuestCharge: 600
  },
  {
    id: 7,
    title: "Long Stay Discount",
    description:
      "Stay 7 nights or more and receive additional discounts with complimentary services.",
    image:
      "https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=800&q=80",
    discount: "15% OFF",
    category: "longstay",
    featured: false,
    basePrice: 5100, // per night for 2 guests
    originalPrice: "Rs 42,000",
    discountedPrice: "Rs 35,700",
    duration: "7 nights",
    perNight: "Rs 5,100/night",
    maxGuests: 4,
    extraGuestCharge: 800
  },
  {
    id: 8,
    title: "Seasonal Special",
    description:
      "Enjoy special seasonal rates with complimentary activities and dining credits.",
    image:
      "https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=800&q=80",
    discount: "30% OFF",
    category: "seasonal",
    featured: false,
    basePrice: 4900, // per night for 2 guests
    originalPrice: "Rs 14,000",
    discountedPrice: "Rs 9,800",
    duration: "2 nights",
    perNight: "Rs 4,900/night",
    maxGuests: 4,
    extraGuestCharge: 750
  },
  {
    id: 9,
    title: "Group Booking Offer",
    description:
      "Traveling with friends or colleagues? Get special group rates and complimentary upgrades.",
    image:
      "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=800&q=80",
    discount: "25% OFF",
    category: "group",
    featured: false,
    basePrice: 7500, // per night for 4 guests
    originalPrice: "Rs 30,000",
    discountedPrice: "Rs 22,500",
    duration: "3 nights",
    perNight: "Rs 7,500/night",
    maxGuests: 8,
    extraGuestCharge: 600
  },
  {
    id: 10,
    title: "Luxury Suite Package",
    description:
      "Indulge in our premium suites with private pool, butler service, and gourmet dining.",
    image:
      "https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=800&q=80",
    discount: "30% OFF",
    category: "luxury",
    featured: true,
    basePrice: 10500, // per night for 2 guests
    originalPrice: "Rs 45,000",
    discountedPrice: "Rs 31,500",
    duration: "3 nights",
    perNight: "Rs 10,500/night",
    maxGuests: 3,
    extraGuestCharge: 1500
  },
  {
    id: 11,
    title: "Monsoon Magic Deal",
    description:
      "Special monsoon rates with indoor activities and spa treatments included.",
    image:
      "https://images.unsplash.com/photo-1439066615861-d1af74d74000?auto=format&fit=crop&w=800&q=80",
    discount: "40% OFF",
    category: "seasonal",
    featured: false,
    basePrice: 2700, // per night for 2 guests
    originalPrice: "Rs 9,000",
    discountedPrice: "Rs 5,400",
    duration: "2 nights",
    perNight: "Rs 2,700/night",
    maxGuests: 4,
    extraGuestCharge: 500
  },
  {
    id: 12,
    title: "Festival Special",
    description:
      "Celebrate festivals with us! Traditional meals and cultural programs included.",
    image:
      "https://images.unsplash.com/photo-1545569341-9eb8b30979d9?auto=format&fit=crop&w=800&q=80",
    discount: "20% OFF",
    category: "seasonal",
    featured: false,
    basePrice: 4800, // per night for 2 guests
    originalPrice: "Rs 12,000",
    discountedPrice: "Rs 9,600",
    duration: "2 nights",
    perNight: "Rs 4,800/night",
    maxGuests: 4,
    extraGuestCharge: 800
  }
];

const OffersPage = () => {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [bookingData, setBookingData] = useState({
    checkIn: "",
    checkOut: "",
    guests: "2",
    email: ""
  });
  const [totalPrice, setTotalPrice] = useState(0);
  
  const heroRef = useRef(null);
  const headerRef = useRef(null);
  const filterRef = useRef(null);
  const gridRef = useRef(null);

  const categories = [
    { id: "all", name: "All Offers" },
    { id: "weekend", name: "Weekend Getaways" },
    { id: "romance", name: "Romance" },
    { id: "family", name: "Family" },
    { id: "business", name: "Business" },
    { id: "lastminute", name: "Last Minute" },
    { id: "luxury", name: "Luxury" },
    { id: "longstay", name: "Long Stay" },
    { id: "group", name: "Group" },
    { id: "seasonal", name: "Seasonal" }
  ];

  const filteredOffers = selectedCategory === "all"
    ? offers
    : offers.filter(offer => offer.category === selectedCategory);

  const calculatePrice = (offer, guests, nights) => {
    const baseGuests = offer.category === 'business' ? 1 : 2;
    let total = offer.basePrice * nights;

    // Add extra guest charges if applicable
    if (guests > baseGuests && offer.extraGuestCharge > 0) {
      const extraGuests = guests - baseGuests;
      total += (offer.extraGuestCharge * extraGuests * nights);
    }

    return total;
  };

  const calculateNights = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return 0;
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const timeDiff = end.getTime() - start.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  };

  const handleBookNow = (offer) => {
    setSelectedOffer(offer);
    // Set default guests based on offer type
    const defaultGuests = offer.category === 'business' ? "1" : "2";
    setBookingData({
      checkIn: "",
      checkOut: "",
      guests: defaultGuests,
      email: ""
    });
    setTotalPrice(0);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedOffer(null);
    setTotalPrice(0);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const updatedData = {
      ...bookingData,
      [name]: value
    };

    setBookingData(updatedData);

    // Recalculate price when dates or guests change
    if (selectedOffer && (name === 'checkIn' || name === 'checkOut' || name === 'guests')) {
      const nights = calculateNights(updatedData.checkIn, updatedData.checkOut);
      if (nights > 0 && updatedData.guests) {
        const calculatedPrice = calculatePrice(
          selectedOffer,
          parseInt(updatedData.guests),
          nights
        );
        setTotalPrice(calculatedPrice);
      } else {
        setTotalPrice(0);
      }
    }
  };

  const handleBookingSubmit = (e) => {
    e.preventDefault();
    if (totalPrice === 0) {
      alert("Please select check-in and check-out dates");
      return;
    }
    alert(`Thank you for booking ${selectedOffer.title}!\nTotal Amount: Rs ${totalPrice.toLocaleString()}\nOur team will contact you shortly.`);
    closeModal();
  };

  const getGuestOptions = (offer) => {
    const options = [];
    const maxGuests = offer.maxGuests || 4;
    const baseGuests = offer.category === 'business' ? 1 : 2;

    for (let i = baseGuests; i <= maxGuests; i++) {
      options.push(
        <option key={i} value={i}>
          {i} Guest{i > 1 ? 's' : ''}
          {i > baseGuests && offer.extraGuestCharge > 0 && ` (+Rs ${offer.extraGuestCharge * calculateNights(bookingData.checkIn, bookingData.checkOut) * (i - baseGuests)})`}
        </option>
      );
    }
    return options;
  };

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
      const cards = gridRef.current?.querySelectorAll('.offer-card');
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
  }, [filteredOffers]);

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
            src="https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1400&q=80"
            alt="Luxury hotel"
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
              Exclusive Offers & Deals
            </h1>
            <p className="text-white/90 text-lg md:text-xl leading-relaxed">
              Discover the best hotel deals, discounts, and special packages to make
              your next stay unforgettable.
            </p>
          </div>
        </div>
      </section>

      {/* Category Filter */}
      <div ref={filterRef} className="relative z-20 bg-white py-8 -mt-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 xl:px-[6vw]">
          <div className="bg-white/95 backdrop-blur-sm rounded-[28px] p-6 shadow-xl border border-gray-100">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
              <div className="flex items-center gap-2 text-gray-700 font-semibold">
                <Tag className="w-5 h-5 text-teal-600" />
                <span>Filter by category</span>
              </div>
              <p className="text-sm text-gray-600">
                Showing {filteredOffers.length} offer{filteredOffers.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {categories.map(category => (
                <button
                  key={category.id}
                  className={`px-6 py-2.5 rounded-full font-medium transition-all ${
                    selectedCategory === category.id
                      ? 'bg-teal-600 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  onClick={() => setSelectedCategory(category.id)}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <section ref={gridRef} className="py-16 md:py-24 bg-gray-50 relative z-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 xl:px-[6vw]">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredOffers.map((offer) => (
              <div
                key={offer.id}
                className="offer-card bg-white rounded-[28px] overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-1 cursor-pointer"
              >
                {offer.featured && (
                  <div className="absolute top-4 right-4 bg-orange-500 text-white px-4 py-1.5 rounded-full text-xs font-semibold z-10 flex items-center gap-1">
                    <Tag className="w-3 h-3" />
                    Popular
                  </div>
                )}
                <div className="relative h-[240px] overflow-hidden">
                  <img
                    src={offer.image}
                    alt={offer.title}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute top-4 left-4 bg-teal-600 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-lg">
                    {offer.discount}
                  </div>
                </div>
                <div className="p-6">
                  <h2 className="font-bold text-xl text-gray-900 mb-2">
                    {offer.title}
                  </h2>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {offer.description}
                  </p>
                  
                  {/* Price Section */}
                  <div className="bg-gray-50 rounded-2xl p-4 mb-4 border-l-4 border-teal-600">
                    <div className="text-xs text-gray-500 line-through mb-1">
                      {offer.originalPrice}
                    </div>
                    <div className="text-2xl font-bold text-teal-600 mb-1">
                      {offer.discountedPrice}
                    </div>
                    <div className="text-xs text-gray-600 font-medium mb-1">
                      {offer.duration}
                    </div>
                    <div className="text-xs text-gray-500">
                      {offer.perNight} for {offer.category === 'business' ? '1 guest' : '2 guests'}
                      {offer.extraGuestCharge > 0 && ` • Rs ${offer.extraGuestCharge}/extra guest`}
                    </div>
                  </div>

                  <button
                    className="w-full bg-gradient-to-r from-teal-500 to-teal-700 hover:from-teal-600 hover:to-teal-800 text-white font-semibold py-3 px-6 rounded-2xl transition-all duration-300 shadow-md hover:shadow-lg"
                    onClick={() => handleBookNow(offer)}
                  >
                    Book Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Booking Modal */}
      {showModal && selectedOffer && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[1000] flex items-center justify-center p-4" onClick={closeModal}>
          <div className="bg-white rounded-[28px] max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <button
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-gray-900/70 hover:bg-gray-900 text-white flex items-center justify-center z-10 transition-all"
              onClick={closeModal}
            >
              <X className="w-5 h-5" />
            </button>
            <div className="grid md:grid-cols-2 gap-0">
              <div className="relative h-[300px] md:h-auto">
                <img
                  src={selectedOffer.image}
                  alt={selectedOffer.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-4 left-4 bg-teal-600 text-white px-4 py-2 rounded-xl font-bold shadow-lg">
                  {selectedOffer.discount}
                </div>
              </div>
              <div className="p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-3">{selectedOffer.title}</h2>
                <p className="text-gray-600 mb-6">{selectedOffer.description}</p>

                
                {/* Dynamic Price Section */}
                <div className="bg-gray-50 rounded-2xl p-5 mb-6 border-l-4 border-teal-600">
                  <div className="flex justify-between items-center mb-3 pb-3 border-b border-gray-200">
                    <span className="text-sm font-medium text-gray-700">Base Price:</span>
                    <span className="text-sm font-semibold text-gray-900">{selectedOffer.perNight} for {selectedOffer.category === 'business' ? '1 guest' : '2 guests'}</span>
                  </div>
                  {selectedOffer.extraGuestCharge > 0 && (
                    <div className="flex justify-between items-center mb-3 pb-3 border-b border-gray-200">
                      <span className="text-sm font-medium text-gray-700">Extra Guest Charge:</span>
                      <span className="text-sm font-semibold text-orange-600">Rs {selectedOffer.extraGuestCharge}/night per guest</span>
                    </div>
                  )}
                  {totalPrice > 0 && (
                    <>
                      <div className="bg-teal-50 rounded-xl p-4 mt-3 border-2 border-teal-600">
                        <div className="flex justify-between items-center">
                          <span className="text-base font-semibold text-gray-900">Total Amount:</span>
                          <span className="text-2xl font-bold text-teal-600">Rs {totalPrice.toLocaleString()}</span>
                        </div>
                        <div className="text-xs text-gray-600 mt-2 text-center">
                          {calculateNights(bookingData.checkIn, bookingData.checkOut)} nights • 
                          {bookingData.guests} guest{parseInt(bookingData.guests) > 1 ? 's' : ''}
                        </div>
                      </div>
                    </>
                  )}
                </div>
                
                <form onSubmit={handleBookingSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <Calendar className="w-4 h-4 inline mr-1" />
                      Check-in Date
                    </label>
                    <input
                      type="date"
                      name="checkIn"
                      value={bookingData.checkIn}
                      onChange={handleInputChange}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <Calendar className="w-4 h-4 inline mr-1" />
                      Check-out Date
                    </label>
                    <input
                      type="date"
                      name="checkOut"
                      value={bookingData.checkOut}
                      onChange={handleInputChange}
                      min={bookingData.checkIn || new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <Users className="w-4 h-4 inline mr-1" />
                      Number of Guests
                    </label>
                    <select
                      name="guests"
                      value={bookingData.guests}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                      required
                    >
                      {getGuestOptions(selectedOffer)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={bookingData.email}
                      onChange={handleInputChange}
                      placeholder="your@email.com"
                      className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-teal-500 to-teal-700 hover:from-teal-600 hover:to-teal-800 text-white font-semibold py-4 px-6 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl mt-4"
                  >
                    {totalPrice > 0 ? `Book Now - Rs ${totalPrice.toLocaleString()}` : 'Book Now'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OffersPage;