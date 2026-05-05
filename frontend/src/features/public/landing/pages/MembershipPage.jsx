import React, { useState, useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Check, X, Crown, Sparkles } from "lucide-react";
import "./MembershipPage.css";

gsap.registerPlugin(ScrollTrigger);


const memberships = [
  {
    id: 1,
    name: "Silver Member",
    price: "Rs 2,999",
    duration: "per year",
    color: "#C0C0C0",
    benefits: [
      "5% discount on all bookings",
      "Free room upgrade (subject to availability)",
      "Priority customer support",
      "Birthday special offer",
      "Exclusive member-only deals",
      "Free WiFi at all partner hotels"
    ],
    featured: false
  },
  {
    id: 2,
    name: "Gold Member",
    price: "Rs 5,999",
    duration: "per year",
    color: "#FFD700",
    benefits: [
      "10% discount on all bookings",
      "Guaranteed room upgrade",
      "24/7 priority customer support",
      "Birthday special offer + anniversary bonus",
      "Exclusive member-only deals",
      "Free WiFi at all partner hotels",
      "Free breakfast on weekends",
      "Complimentary spa treatment (once per year)"
    ],
    featured: true
  },
  {
    id: 3,
    name: "Platinum Member",
    price: "Rs 9,999",
    duration: "per year",
    color: "#E5E4E2",
    benefits: [
      "15% discount on all bookings",
      "Guaranteed suite upgrade",
      "24/7 dedicated concierge service",
      "Birthday special offer + anniversary bonus + quarterly rewards",
      "Exclusive member-only deals",
      "Free WiFi at all partner hotels",
      "Complimentary breakfast daily",
      "Complimentary spa treatment (4 times per year)",
      "Free airport transfers",
      "Priority booking guarantee"
    ],
    featured: false
  }
];

const MembershipPage = () => {
  const [selectedMembership, setSelectedMembership] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    address: ""
  });
  
  const heroRef = useRef(null);
  const headerRef = useRef(null);
  const gridRef = useRef(null);

  const handleSelectMembership = (membership) => {
    setSelectedMembership(membership);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedMembership(null);
    setFormData({
      fullName: "",
      email: "",
      phone: "",
      address: ""
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    alert(`Thank you for choosing ${selectedMembership.name}!\nWe will contact you shortly at ${formData.email}`);
    closeModal();
  };

  // GSAP Animations
  useEffect(() => {
    if (!heroRef.current || !headerRef.current || !gridRef.current) return;

    const ctx = gsap.context(() => {
      // Header animation
      if (headerRef.current) {
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
      }

      // Cards animation
      const cards = gridRef.current?.querySelectorAll('.membership-card');
      if (cards && cards.length > 0) {
        gsap.fromTo(
          cards,
          { y: 30, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.5,
            stagger: 0.1,
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
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden flex flex-col">
      {/* Hero Section */}
      <section
        ref={heroRef}
        className="relative min-h-[50vh] w-full overflow-hidden z-10"
      >
        {/* Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-teal-500 to-teal-700" />
        
        {/* Content */}
        <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 xl:px-[6vw] min-h-[50vh] flex flex-col justify-center pt-[72px] pb-20">
          <div ref={headerRef} className="text-center max-w-3xl mx-auto">
            <h1 className="text-white font-extrabold text-[clamp(36px,4.5vw,64px)] leading-[1.1] mb-6">
              Membership Plans
            </h1>
            <p className="text-white/90 text-lg md:text-xl leading-relaxed">
              Join our membership program and enjoy exclusive benefits, special discounts,
              and premium services at all our partner hotels.
            </p>
          </div>
        </div>
      </section>

      <section ref={gridRef} className="py-16 md:py-24 bg-gray-50 relative z-20 -mt-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 xl:px-[6vw]">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {memberships.map((membership) => (
              <div
                key={membership.id}
                className={`membership-card bg-white rounded-[28px] overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-1 relative ${
                  membership.featured ? 'border-4 border-orange-400 scale-105' : ''
                }`}
              >
                {membership.featured && (
                  <div className="absolute top-4 right-4 bg-orange-500 text-white px-4 py-1.5 rounded-full text-xs font-semibold z-10 flex items-center gap-1 shadow-lg">
                    <Sparkles className="w-3 h-3" />
                    Most Popular
                  </div>
                )}
                
                {/* Color Bar */}
                <div
                  className="h-2 w-full"
                  style={{ backgroundColor: membership.color }}
                />
                
                {/* Header */}
                <div className="p-8 text-center border-b border-gray-100">
                  <div className="mb-4">
                    {membership.id === 1 && <Crown className="w-8 h-8 text-gray-400 mx-auto" />}
                    {membership.id === 2 && <Crown className="w-8 h-8 text-yellow-500 mx-auto fill-yellow-500" />}
                    {membership.id === 3 && <Crown className="w-8 h-8 text-gray-300 mx-auto fill-gray-300" />}
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">{membership.name}</h2>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-3xl font-bold text-teal-600">{membership.price}</span>
                    <span className="text-sm text-gray-600">{membership.duration}</span>
                  </div>
                </div>

                {/* Benefits */}
                <div className="p-8 flex-grow">
                  <h3 className="text-lg font-semibold text-gray-900 mb-6">Benefits Include:</h3>
                  <ul className="space-y-3">
                    {membership.benefits.map((benefit, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Check className="w-3 h-3 text-teal-600" />
                        </div>
                        <span className="text-sm text-gray-700 leading-relaxed">{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Button */}
                <div className="p-8 pt-0">
                  <button
                    className={`w-full py-4 px-6 rounded-2xl font-semibold transition-all duration-300 shadow-lg hover:shadow-xl ${
                      membership.featured
                        ? 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white'
                        : 'bg-gradient-to-r from-teal-500 to-teal-700 hover:from-teal-600 hover:to-teal-800 text-white'
                    }`}
                    onClick={() => handleSelectMembership(membership)}
                  >
                    Choose Plan
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Membership Modal */}
      {showModal && selectedMembership && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[1000] flex items-center justify-center p-4" onClick={closeModal}>
          <div className="bg-white rounded-[28px] max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <button
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-gray-900/70 hover:bg-gray-900 text-white flex items-center justify-center z-10 transition-all"
              onClick={closeModal}
            >
              <X className="w-5 h-5" />
            </button>
            <div className="p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Join {selectedMembership.name}</h2>
              <p className="text-xl font-semibold text-teal-600 mb-6">{selectedMembership.price} {selectedMembership.duration}</p>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name</label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    placeholder="Enter your full name"
                    className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="your@email.com"
                    className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="+977 XXXXXXXXXX"
                    className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Address</label>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    placeholder="Enter your address"
                    rows="3"
                    className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all resize-none"
                    required
                  />
                </div>

                <div className="bg-gray-50 rounded-2xl p-5 border-l-4 border-teal-600">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">You'll get:</h4>
                  <ul className="space-y-2">
                    {selectedMembership.benefits.slice(0, 3).map((benefit, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                        <Check className="w-4 h-4 text-teal-600 flex-shrink-0 mt-0.5" />
                        <span>{benefit}</span>
                      </li>
                    ))}
                    {selectedMembership.benefits.length > 3 && (
                      <li className="text-sm font-semibold text-teal-600">
                        + {selectedMembership.benefits.length - 3} more benefits
                      </li>
                    )}
                  </ul>
                </div>

                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-teal-500 to-teal-700 hover:from-teal-600 hover:to-teal-800 text-white font-semibold py-4 px-6 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl mt-4"
                >
                  Complete Registration
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MembershipPage;
