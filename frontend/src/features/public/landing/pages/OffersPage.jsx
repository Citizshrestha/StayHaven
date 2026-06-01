import React, { useState, useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Tag, Calendar, Clock, AlertCircle, Inbox } from "lucide-react";
import { useContent } from "../../../../hooks/useContent";
import { getOffers } from "../../../../core/api/services/content.service";
import "./OffersPage.css";

gsap.registerPlugin(ScrollTrigger);

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80";

const isExpired = (validUntil) =>
  validUntil && new Date(validUntil) < new Date();

const isActive = (validFrom, validUntil) => {
  const now = new Date();
  if (validFrom && new Date(validFrom) > now) return false;
  if (validUntil && new Date(validUntil) < now) return false;
  return true;
};

const formatDiscount = (offer) => {
  if (offer.discountPercent) return `${offer.discountPercent}% OFF`;
  if (offer.discountFlat) return `Rs ${offer.discountFlat.toLocaleString()} OFF`;
  return "SPECIAL OFFER";
};

const useCountdown = (targetDate) => {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    if (!targetDate) return;
    const target = new Date(targetDate);

    const tick = () => {
      const diff = target - new Date();
      if (diff <= 0) {
        setTimeLeft("Expired");
        return;
      }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      if (d > 0) setTimeLeft(`${d}d ${h}h ${m}m`);
      else setTimeLeft(`${h}h ${m}m ${s}s`);
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetDate]);

  return timeLeft;
};

const OfferCountdown = ({ validUntil }) => {
  const timeLeft = useCountdown(validUntil);
  if (!validUntil || isExpired(validUntil)) return null;
  return (
    <div className="offer-countdown">
      <Clock className="w-3 h-3" />
      <span>Ends in {timeLeft}</span>
    </div>
  );
};

const SkeletonCard = () => (
  <div className="offer-skeleton-card">
    <div className="offer-skeleton-img" />
    <div className="offer-skeleton-body">
      <div className="offer-skeleton-line w-3/4" />
      <div className="offer-skeleton-line w-full" />
      <div className="offer-skeleton-line w-1/2" />
    </div>
  </div>
);

const OffersPage = () => {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const heroRef = useRef(null);
  const headerRef = useRef(null);
  const filterRef = useRef(null);
  const gridRef = useRef(null);

  const { data: rawOffers, loading, error } = useContent("offers", getOffers);

  const offers = (rawOffers || []).map((o) => ({
    id: o._id,
    title: o.title || "Untitled Offer",
    description: o.description || "",
    image: o.image || FALLBACK_IMAGE,
    discount: formatDiscount(o),
    code: o.code || null,
    applicableTo: o.applicableTo || "all",
    validFrom: o.validFrom || null,
    validUntil: o.validUntil || null,
    expired: isExpired(o.validUntil),
    active: isActive(o.validFrom, o.validUntil),
  }));

  const categories = [
    { id: "all", name: "All Offers" },
    { id: "rooms", name: "Rooms" },
    { id: "food", name: "Food & Dining" },
  ];

  const filteredOffers =
    selectedCategory === "all"
      ? offers
      : offers.filter((o) => o.applicableTo === selectedCategory || o.applicableTo === "all");

  useEffect(() => {
    if (loading || !heroRef.current) return;
    const ctx = gsap.context(() => {
      // Animate header immediately (above the fold, in hero)
      if (headerRef.current) {
        gsap.fromTo(
          headerRef.current,
          { y: 24, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.7, ease: "power2.out" }
        );
      }
      // Animate cards only when scrolled into view — do NOT animate the filter card
      // (it overlaps the hero with -mt-16 and opacity:0 exposes the dark hero background)
      if (gridRef.current) {
        const cards = gridRef.current.querySelectorAll(".offer-card");
        if (cards && cards.length > 0) {
          gsap.fromTo(
            cards,
            { y: 30, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: 0.5,
              stagger: 0.08,
              ease: "power1.out",
              scrollTrigger: {
                trigger: gridRef.current,
                start: "top 85%",
                toggleActions: "play none none none",
              },
            }
          );
        }
      }
    }, heroRef);
    return () => ctx.revert();
  }, [loading, filteredOffers.length]);

  return (
    <div className="min-h-screen bg-white overflow-x-hidden flex flex-col">
      {/* Hero Section */}
      <section
        ref={heroRef}
        className="relative min-h-[60vh] w-full overflow-hidden z-10"
      >
        <div className="absolute inset-0 w-full h-full">
          <img
            src="https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1400&q=80"
            alt="Luxury hotel"
            className="w-full h-full object-cover"
            style={{ objectPosition: "center 50%" }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(11,15,28,0.4) 0%, rgba(11,15,28,0.6) 100%)",
            }}
          />
        </div>
        <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 xl:px-[6vw] min-h-[60vh] flex flex-col justify-center pt-[72px] pb-20">
          <div ref={headerRef} className="text-center max-w-3xl mx-auto">
            <h1 className="text-white font-extrabold text-[clamp(36px,4.5vw,64px)] leading-[1.1] mb-6">
              Exclusive Offers & Deals
            </h1>
            <p className="text-white/90 text-lg md:text-xl leading-relaxed">
              Discover the best hotel deals, discounts, and special packages to
              make your next stay unforgettable.
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
                Showing {filteredOffers.length} offer
                {filteredOffers.length !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {categories.map((category) => (
                <button
                  key={category.id}
                  className={`px-6 py-2.5 rounded-full font-medium transition-all ${
                    selectedCategory === category.id
                      ? "bg-teal-600 text-white shadow-lg"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
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

      {/* Content Section */}
      <section ref={gridRef} className="py-16 md:py-24 bg-white relative z-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 xl:px-[6vw]">
          {/* Loading */}
          {loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <SkeletonCard key={n} />
              ))}
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <AlertCircle className="w-14 h-14 text-red-400 mb-4" />
              <h3 className="text-xl font-bold text-gray-800 mb-2">
                Failed to load offers
              </h3>
              <p className="text-gray-500 max-w-sm">
                We couldn&apos;t fetch offers right now. Please try refreshing
                the page.
              </p>
            </div>
          )}

          {/* Empty */}
          {!loading && !error && filteredOffers.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <Inbox className="w-14 h-14 text-gray-300 mb-4" />
              <h3 className="text-xl font-bold text-gray-700 mb-2">
                No offers available
              </h3>
              <p className="text-gray-400 max-w-sm">
                Check back soon for exclusive deals and special packages.
              </p>
            </div>
          )}

          {/* Cards */}
          {!loading && !error && filteredOffers.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredOffers.map((offer) => (
                <div
                  key={offer.id}
                  className={`offer-card bg-white rounded-[28px] overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-1 relative ${
                    offer.expired ? "opacity-70" : ""
                  }`}
                >
                  {/* Expired badge */}
                  {offer.expired && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-gray-700 text-white px-4 py-1.5 rounded-full text-xs font-semibold z-20">
                      Expired
                    </div>
                  )}

                  <div className="relative h-[240px] overflow-hidden">
                    <img
                      src={offer.image}
                      alt={offer.title}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                      onError={(e) => {
                        e.currentTarget.src = FALLBACK_IMAGE;
                      }}
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

                    {/* Promo code */}
                    {offer.code && (
                      <div className="flex items-center gap-2 mb-4 bg-teal-50 border border-teal-200 rounded-xl px-4 py-2">
                        <Tag className="w-4 h-4 text-teal-600 flex-shrink-0" />
                        <span className="text-xs text-gray-600 font-medium">
                          Code:
                        </span>
                        <span className="text-sm font-bold text-teal-700 tracking-wider">
                          {offer.code}
                        </span>
                      </div>
                    )}

                    {/* Validity */}
                    {(offer.validFrom || offer.validUntil) && (
                      <div className="flex items-center gap-2 mb-4 text-xs text-gray-500">
                        <Calendar className="w-3.5 h-3.5" />
                        {offer.validFrom && (
                          <span>
                            From{" "}
                            {new Date(offer.validFrom).toLocaleDateString()}
                          </span>
                        )}
                        {offer.validFrom && offer.validUntil && (
                          <span>&mdash;</span>
                        )}
                        {offer.validUntil && (
                          <span>
                            Until{" "}
                            {new Date(offer.validUntil).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Countdown */}
                    <OfferCountdown validUntil={offer.validUntil} />

                    {/* Applicable to */}
                    {offer.applicableTo && offer.applicableTo !== "all" && (
                      <div className="mt-3">
                        <span className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full font-medium capitalize">
                          {offer.applicableTo === "rooms"
                            ? "Hotel Rooms"
                            : "Food & Dining"}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default OffersPage;
