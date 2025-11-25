import React, { useState } from "react";
import "./OffersPage.css";
import Navbar from "./Navbar";

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

  return (
    <div className="w-screen min-h-screen overflow-x-hidden">
      <Navbar />
      <div className="offers-page">
        <header className="offers-header">
        <h1>Exclusive Offers & Deals</h1>
        <p>
          Discover the best hotel deals, discounts, and special packages to make
          your next stay unforgettable.
        </p>
      </header>

      {/* Category Filter */}
      <div className="category-filter">
        {categories.map(category => (
          <button
            key={category.id}
            className={`filter-btn ${selectedCategory === category.id ? 'active' : ''}`}
            onClick={() => setSelectedCategory(category.id)}
          >
            {category.name}
          </button>
        ))}
      </div>

      {/* Offers Count */}
      <div className="offers-count">
        <p>Showing {filteredOffers.length} offers</p>
      </div>

      <section className="offers-container">
        {filteredOffers.map((offer) => (
          <div key={offer.id} className={`offer-card ${offer.featured ? 'featured' : ''}`}>
            {offer.featured && <div className="featured-badge">Popular</div>}
            <div className="offer-img">
              <img src={offer.image} alt={offer.title} />
              <span className="discount-badge">{offer.discount}</span>
            </div>
            <div className="offer-content">
              <h2>{offer.title}</h2>
              <p>{offer.description}</p>
              
              {/* Price Section */}
              <div className="price-section">
                <div className="price-original">{offer.originalPrice}</div>
                <div className="price-discounted">{offer.discountedPrice}</div>
                <div className="price-duration">{offer.duration}</div>
                <div className="price-info">
                  {offer.perNight} for {offer.category === 'business' ? '1 guest' : '2 guests'}
                  {offer.extraGuestCharge > 0 && ` • Rs ${offer.extraGuestCharge}/extra guest`}
                </div>
              </div>

              <button 
                className="book-btn"
                onClick={() => handleBookNow(offer)}
              >
                Book Now
              </button>
            </div>
          </div>
        ))}
      </section>

      {/* Booking Modal */}
      {showModal && selectedOffer && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="booking-modal" onClick={(e) => e.stopPropagation()}>
            <button className="close-modal" onClick={closeModal}>×</button>
            <div className="modal-content">
              <div className="modal-image">
                <img src={selectedOffer.image} alt={selectedOffer.title} />
                <span className="modal-discount">{selectedOffer.discount}</span>
              </div>
              <div className="modal-details">
                <h2>{selectedOffer.title}</h2>
                <p>{selectedOffer.description}</p>
                
                {/* Dynamic Price Section */}
                <div className="modal-price-section">
                  <div className="price-row">
                    <span className="price-label">Base Price:</span>
                    <span className="price-base">{selectedOffer.perNight} for {selectedOffer.category === 'business' ? '1 guest' : '2 guests'}</span>
                  </div>
                  {selectedOffer.extraGuestCharge > 0 && (
                    <div className="price-row">
                      <span className="price-label">Extra Guest Charge:</span>
                      <span className="price-extra">Rs {selectedOffer.extraGuestCharge}/night per guest</span>
                    </div>
                  )}
                  {totalPrice > 0 && (
                    <>
                      <div className="price-row total-price">
                        <span className="price-label">Total Amount:</span>
                        <span className="price-total">Rs {totalPrice.toLocaleString()}</span>
                      </div>
                      <div className="price-breakdown">
                        <small>
                          {calculateNights(bookingData.checkIn, bookingData.checkOut)} nights • 
                          {bookingData.guests} guest{parseInt(bookingData.guests) > 1 ? 's' : ''}
                        </small>
                      </div>
                    </>
                  )}
                </div>
                
                <form onSubmit={handleBookingSubmit} className="booking-form">
                  <div className="form-group">
                    <label>Check-in Date</label>
                    <input 
                      type="date" 
                      name="checkIn"
                      value={bookingData.checkIn}
                      onChange={handleInputChange}
                      min={new Date().toISOString().split('T')[0]}
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label>Check-out Date</label>
                    <input 
                      type="date" 
                      name="checkOut"
                      value={bookingData.checkOut}
                      onChange={handleInputChange}
                      min={bookingData.checkIn || new Date().toISOString().split('T')[0]}
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label>Number of Guests</label>
                    <select 
                      name="guests"
                      value={bookingData.guests}
                      onChange={handleInputChange}
                      required
                    >
                      {getGuestOptions(selectedOffer)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Email Address</label>
                    <input 
                      type="email" 
                      name="email"
                      value={bookingData.email}
                      onChange={handleInputChange}
                      placeholder="your@email.com" 
                      required 
                    />
                  </div>
                  <button type="submit" className="submit-btn">
                    {totalPrice > 0 ? `Book Now - Rs ${totalPrice.toLocaleString()}` : 'Book Now'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
     </div>
   </div>
 );
};

export default OffersPage;