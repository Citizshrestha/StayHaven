import React, { useState, useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Check, X, Crown, Sparkles, AlertCircle, Inbox } from "lucide-react";
import { useContent } from "../../../../hooks/useContent";
import { getMemberships } from "../../../../core/api/services/content.service";
import "./MembershipPage.css";

gsap.registerPlugin(ScrollTrigger);

const SkeletonCard = () => (
  <div className="membership-skeleton-card">
    <div className="membership-skeleton-bar" />
    <div className="membership-skeleton-body">
      <div className="membership-skeleton-circle" />
      <div className="membership-skeleton-line w-1/2" />
      <div className="membership-skeleton-line w-1/3" />
    </div>
    <div className="membership-skeleton-features">
      {[1, 2, 3].map((n) => (
        <div key={n} className="membership-skeleton-line w-full" />
      ))}
    </div>
  </div>
);

const MembershipPage = () => {
  const [selectedMembership, setSelectedMembership] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    address: "",
  });

  const heroRef = useRef(null);
  const headerRef = useRef(null);
  const gridRef = useRef(null);

  const {
    data: rawMemberships,
    loading,
    error,
  } = useContent("memberships", getMemberships);

  const memberships = [...(rawMemberships || [])]
    .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
    .map((m) => ({
      id: m._id,
      name: m.tierName || "Membership",
      price: m.price != null ? `Rs ${Number(m.price).toLocaleString()}` : "Contact Us",
      rawPrice: m.price ?? 0,
      duration: m.billingCycle === "monthly" ? "per month" : "per year",
      color: m.color || "#0ea5a0",
      description: m.description || "",
      features: Array.isArray(m.features) ? m.features : [],
      highlightFeature: m.highlightFeature || "",
      isPopular: m.isPopular || false,
    }));

  const handleSelectMembership = (membership) => {
    setSelectedMembership(membership);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedMembership(null);
    setFormData({ fullName: "", email: "", phone: "", address: "" });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    alert(
      `Thank you for choosing ${selectedMembership.name}!\nWe will contact you shortly at ${formData.email}`
    );
    closeModal();
  };

  useEffect(() => {
    if (loading || !heroRef.current || !headerRef.current || !gridRef.current)
      return;

    const ctx = gsap.context(() => {
      if (headerRef.current) {
        gsap.fromTo(
          headerRef.current,
          { y: 20, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.6,
            ease: "power2.out",
            scrollTrigger: {
              trigger: heroRef.current,
              start: "top 80%",
              toggleActions: "play none none reverse",
            },
          }
        );
      }

      const cards = gridRef.current?.querySelectorAll(".membership-card");
      if (cards && cards.length > 0) {
        gsap.fromTo(
          cards,
          { y: 30, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.5,
            stagger: 0.1,
            ease: "power1.out",
            scrollTrigger: {
              trigger: gridRef.current,
              start: "top 80%",
              toggleActions: "play none none reverse",
            },
          }
        );
      }
    }, heroRef);

    return () => ctx.revert();
  }, [loading, memberships.length]);

  return (
    <div className="min-h-screen bg-white overflow-x-hidden flex flex-col">
      {/* Hero */}
      <section
        ref={heroRef}
        className="relative min-h-[50vh] w-full overflow-hidden z-10"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-teal-500 to-teal-700" />
        <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 xl:px-[6vw] min-h-[50vh] flex flex-col justify-center pt-[72px] pb-20">
          <div ref={headerRef} className="text-center max-w-3xl mx-auto">
            <h1 className="text-white font-extrabold text-[clamp(36px,4.5vw,64px)] leading-[1.1] mb-6">
              Membership Plans
            </h1>
            <p className="text-white/90 text-lg md:text-xl leading-relaxed">
              Join our membership program and enjoy exclusive benefits, special
              discounts, and premium services at all our partner hotels.
            </p>
          </div>
        </div>
      </section>

      <section
        ref={gridRef}
        className="py-16 md:py-24 bg-white relative z-20 -mt-16"
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 xl:px-[6vw]">
          {/* Loading */}
          {loading && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {[1, 2, 3].map((n) => (
                <SkeletonCard key={n} />
              ))}
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <AlertCircle className="w-14 h-14 text-red-400 mb-4" />
              <h3 className="text-xl font-bold text-gray-800 mb-2">
                Failed to load membership plans
              </h3>
              <p className="text-gray-500 max-w-sm">
                Please refresh the page to try again.
              </p>
            </div>
          )}

          {/* Empty */}
          {!loading && !error && memberships.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <Inbox className="w-14 h-14 text-gray-300 mb-4" />
              <h3 className="text-xl font-bold text-gray-700 mb-2">
                No membership plans available
              </h3>
              <p className="text-gray-400 max-w-sm">
                Membership plans are coming soon. Check back later.
              </p>
            </div>
          )}

          {/* Cards */}
          {!loading && !error && memberships.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {memberships.map((membership, idx) => (
                <div
                  key={membership.id}
                  className={`membership-card bg-white rounded-[28px] overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-1 relative flex flex-col ${
                    membership.isPopular ? "border-4 border-orange-400 scale-105" : ""
                  }`}
                >
                  {membership.isPopular && (
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
                      <Crown
                        className="w-8 h-8 mx-auto"
                        style={{ color: membership.color }}
                      />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">
                      {membership.name}
                    </h2>
                    {membership.description && (
                      <p className="text-sm text-gray-500 mb-3 leading-relaxed">
                        {membership.description}
                      </p>
                    )}
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-3xl font-bold text-teal-600">
                        {membership.price}
                      </span>
                      <span className="text-sm text-gray-600">
                        {membership.duration}
                      </span>
                    </div>
                    {membership.highlightFeature && (
                      <div className="mt-3 inline-flex items-center gap-1 bg-teal-50 text-teal-700 text-xs font-semibold px-3 py-1.5 rounded-full border border-teal-200">
                        <Sparkles className="w-3 h-3" />
                        {membership.highlightFeature}
                      </div>
                    )}
                  </div>

                  {/* Features */}
                  <div className="p-8 flex-grow">
                    <h3 className="text-lg font-semibold text-gray-900 mb-6">
                      Benefits Include:
                    </h3>
                    {membership.features.length > 0 ? (
                      <ul className="space-y-3">
                        {membership.features.map((feature, index) => (
                          <li key={index} className="flex items-start gap-3">
                            <div className="w-5 h-5 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <Check className="w-3 h-3 text-teal-600" />
                            </div>
                            <span className="text-sm text-gray-700 leading-relaxed">
                              {feature}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-400 italic">
                        Contact us for full details.
                      </p>
                    )}
                  </div>

                  {/* Button */}
                  <div className="p-8 pt-0">
                    <button
                      className={`w-full py-4 px-6 rounded-2xl font-semibold transition-all duration-300 shadow-lg hover:shadow-xl ${
                        membership.isPopular
                          ? "bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
                          : "bg-gradient-to-r from-teal-500 to-teal-700 hover:from-teal-600 hover:to-teal-800 text-white"
                      }`}
                      onClick={() => handleSelectMembership(membership)}
                    >
                      Choose Plan
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Modal */}
      {showModal && selectedMembership && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[1000] flex items-center justify-center p-4"
          onClick={closeModal}
        >
          <div
            className="bg-white rounded-[28px] max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-gray-900/70 hover:bg-gray-900 text-white flex items-center justify-center z-10 transition-all"
              onClick={closeModal}
            >
              <X className="w-5 h-5" />
            </button>
            <div className="p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Join {selectedMembership.name}
              </h2>
              <p className="text-xl font-semibold text-teal-600 mb-6">
                {selectedMembership.price}{" "}
                <span className="text-sm font-normal text-gray-500">
                  {selectedMembership.duration}
                </span>
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Full Name
                  </label>
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
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Email Address
                  </label>
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
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Phone Number
                  </label>
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
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Address
                  </label>
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

                {selectedMembership.features.length > 0 && (
                  <div className="bg-gray-50 rounded-2xl p-5 border-l-4 border-teal-600">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">
                      You&apos;ll get:
                    </h4>
                    <ul className="space-y-2">
                      {selectedMembership.features.slice(0, 3).map((f, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-sm text-gray-700"
                        >
                          <Check className="w-4 h-4 text-teal-600 flex-shrink-0 mt-0.5" />
                          <span>{f}</span>
                        </li>
                      ))}
                      {selectedMembership.features.length > 3 && (
                        <li className="text-sm font-semibold text-teal-600">
                          + {selectedMembership.features.length - 3} more
                          benefits
                        </li>
                      )}
                    </ul>
                  </div>
                )}

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
