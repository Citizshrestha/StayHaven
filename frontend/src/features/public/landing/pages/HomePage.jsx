import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Navbar from '../../../../shared/layout/Navbar';
import Footer from '../../../../shared/layout/Footer';
import {
  Search, MapPin, Calendar, Users, ChevronRight,
  Building, Shield, Clock, BadgeCheck, ArrowRight,
  Star, Quote, BadgeDollarSign, CalendarX2,
  HeadphonesIcon, TrendingDown, Leaf, ConciergeBell,
  BarChart3, MessageSquare, BadgePercent
} from 'lucide-react';
import { Input } from '../../../../shared/ui/input';
import { Button } from '../../../../shared/ui/button';

gsap.registerPlugin(ScrollTrigger);

const Home = () => {
  const navigate = useNavigate();
  const heroRef = useRef(null);
  const headlineRef = useRef(null);
  const subheadlineRef = useRef(null);
  const searchCardRef = useRef(null);
  const overlayRef = useRef(null);

  // Initialize GSAP animations
  useEffect(() => {
    const ctx = gsap.context(() => {
      // Entrance animation (on page load)
      const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });

      // Headline animation - split by words
      if (headlineRef.current) {
        const words = headlineRef.current.querySelectorAll('.word');
        tl.fromTo(
          words,
          { y: 28, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.8, stagger: 0.08 },
          0.2
        );
      }

      // Subheadline
      tl.fromTo(
        subheadlineRef.current,
        { y: 18, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6 },
        0.5
      );

      // Search card
      tl.fromTo(
        searchCardRef.current,
        { y: 40, opacity: 0, scale: 0.985 },
        { y: 0, opacity: 1, scale: 1, duration: 0.7 },
        0.6
      );

      // Scroll-driven exit animation
      const scrollTl = gsap.timeline({
        scrollTrigger: {
          trigger: heroRef.current,
          start: 'top top',
          end: '+=130%',
          scrub: 0.6,
          pin: false,
        },
      });

      // Phase 1 (0-70%): hold - elements stay visible
      // Phase 2 (70-100%): exit
      scrollTl.fromTo(
        headlineRef.current,
        { y: 0, opacity: 1 },
        { y: '-18vh', opacity: 0, ease: 'power2.in' },
        0.7
      );

      scrollTl.fromTo(
        subheadlineRef.current,
        { y: 0, opacity: 1 },
        { y: '-14vh', opacity: 0, ease: 'power2.in' },
        0.72
      );

      scrollTl.fromTo(
        searchCardRef.current,
        { y: 0, opacity: 1 },
        { y: '-10vh', opacity: 0, ease: 'power2.in' },
        0.75
      );

      scrollTl.fromTo(
        overlayRef.current,
        { scale: 1, y: 0 },
        { scale: 1.06, y: '-4vh' },
        0.7
      );
    }, heroRef);

    return () => ctx.revert();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden flex flex-col">
      <Navbar />
      {/* Hero Section */}
      <section
        ref={heroRef}
        className="relative min-h-screen w-full overflow-hidden z-10"
      >
        {/* Background Image */}
        <div
          ref={overlayRef}
          className="absolute inset-0 w-full h-full"
          style={{ willChange: 'transform' }}
        >
          <img
            src="/images/hero-resort.jpg"
            alt="Luxury resort aerial view"
            className="w-full h-full object-cover"
            style={{ objectPosition: 'center 35%' }}
          />
          {/* Gradient Overlay */}
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(180deg, rgba(11,15,28,0.35) 0%, rgba(11,15,28,0.55) 100%)',
            }}
          />
        </div>

        {/* Content */}
        <div
          className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 xl:px-[6vw] min-h-screen flex flex-col justify-center pt-[72px] pb-20"
          style={{ marginTop: '60px' }}
        >
          {/* Headline */}
          <h1
            ref={headlineRef}
            className="text-white font-extrabold text-[clamp(40px,5vw,72px)] leading-[1.05] max-w-[52vw] mb-6 text-left"
            style={{ paddingTop: '4rem', marginLeft: '0px' }}
          >
            <span className="word inline-block">Book</span>{' '}
            <span className="word inline-block">smarter.</span>
            <br />
            <span className="word inline-block">Stay</span>{' '}
            <span className="word inline-block">better.</span>
          </h1>

          {/* Subheadline */}
          <p
            ref={subheadlineRef}
            className="text-white/90 text-lg md:text-xl max-w-[44vw] mb-12 leading-relaxed"
            style={{ marginTop: '10px', marginLeft: '0px' }}
          >
            Discover Nepal's finest hotels, manage stays, and enjoy seamless in-hotel services —
            all in one platform.
          </p>

          {/* Search Card */}
          <div className="flex-1 flex items-end pb-8 mb-8" style={{ marginBottom: '4rem' }}>
            <div
              ref={searchCardRef}
              className="bg-white/95 backdrop-blur-sm rounded-[28px] p-4 md:p-5 card-shadow max-w-[900px] w-full shadow-2xl"
              style={{ border: '1px solid rgba(11,15,28,0.08)' }}
            >
              <div className="flex flex-col lg:flex-row gap-3 lg:gap-4">
                {/* Location */}
                <div className="flex-1">
                  <label className="text-[13px] font-medium text-[#6B7280] uppercase tracking-wide mb-1.5 block">
                    Where to?
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-teal-600 pointer-events-none z-10" />
                    <Input
                      placeholder="Search destinations in Nepal"
                      className="pl-10 pr-3 h-11 rounded-2xl border-[#e5e7eb] focus:ring-2 focus:ring-[#2F5AF6]/20 focus:border-[#2F5AF6] text-[13px]"
                    />
                  </div>
                </div>

                {/* Check-in */}
                <div className="flex-1">
                  <label className="text-[13px] font-medium text-[#6B7280] uppercase tracking-wide mb-1.5 block">
                    Check-in
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-teal-600 pointer-events-none z-10" />
                    <Input
                      type="date"
                      className="pl-10 pr-3 h-11 rounded-2xl border-[#e5e7eb] focus:ring-2 focus:ring-[#2F5AF6]/20 focus:border-[#2F5AF6] text-[13px]"
                    />
                  </div>
                </div>

                {/* Check-out */}
                <div className="flex-1">
                  <label className="text-[13px] font-medium text-[#6B7280] uppercase tracking-wide mb-1.5 block">
                    Check-out
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-teal-600 pointer-events-none z-10" />
                    <Input
                      type="date"
                      className="pl-10 pr-3 h-11 rounded-2xl border-[#e5e7eb] focus:ring-2 focus:ring-[#2F5AF6]/20 focus:border-[#2F5AF6] text-[13px]"
                    />
                  </div>
                </div>

                {/* Guests */}
                <div className="w-full lg:w-44">
                  <label className="text-[11px] font-medium text-[#6B7280] uppercase tracking-wide mb-1.5 block">
                    Guests
                  </label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-teal-600 pointer-events-none z-10" />
                    <select className="w-full h-11 pl-10 pr-8 rounded-2xl border border-[#e5e7eb] bg-white text-[#0B0F1C] text-[13px] focus:ring-2 focus:ring-[#2F5AF6]/20 focus:border-[#2F5AF6] appearance-none">
                      <option>1 Guest</option>
                      <option>2 Guests</option>
                      <option>3 Guests</option>
                      <option>4+ Guests</option>
                    </select>
                  </div>
                </div>

                {/* Search Button */}
                <div className="flex items-end">
                  <Button
                    onClick={() => navigate('/hotels')}
                    className="bg-gradient-to-r from-teal-500 to-teal-700 h-11 px-8 rounded-2xl text-white font-semibold hover:from-teal-600 hover:to-teal-800 active:from-teal-700 active:to-teal-900 transition-all w-full lg:w-auto">
                    <Search className="w-[18px] h-[18px] mr-2" />
                    Search
                  </Button>
                </div>
              </div>

              {/* Secondary Link */}
              <div className="mt-4 flex items-center">
                <a
                  href="#"
                  onClick={(e) => { e.preventDefault(); navigate('/hotels'); }}
                  className="text-sm text-teal-600 font-medium flex items-center no-underline hover:text-teal-700 transition-colors"
                >
                  Explore last-minute deals
                  <ChevronRight className="w-4 h-4 ml-1" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Strip */}
      <TrustStrip />

      {/* Destinations */}
      <Destinations />

      {/* Featured Hotels */}
      <FeaturedHotelsSection />

      {/* How It Works */}
      <HowItWorks />

      {/* For Everyone */}
      <ForEveryone />

      {/* Why Choose */}
      <WhyChoose />

      {/* Testimonials */}
      <Testimonials />

      {/* Inspiration */}
      <Inspiration />

      {/* Final CTA */}
      <FinalCTA navigate={navigate} />

      {/* Footer */}
      <Footer />
    </div>
  );
};

// Trust Strip Component
const TrustStrip = () => {
  const trustItems = [
    {
      icon: Building,
      title: 'Trusted across Nepal',
      description: '500+ properties nationwide',
      gradient: 'from-teal-400 to-teal-600',
      glow: 'group-hover:shadow-teal-200',
    },
    {
      icon: BadgeDollarSign,
      title: 'Secure Payments',
      description: 'eSewa, Khalti & card support',
      gradient: 'from-emerald-400 to-emerald-600',
      glow: 'group-hover:shadow-emerald-200',
    },
    {
      icon: Clock,
      title: 'Real-time Service',
      description: 'Instant booking confirmation',
      gradient: 'from-cyan-400 to-cyan-600',
      glow: 'group-hover:shadow-cyan-200',
    },
    {
      icon: BadgeCheck,
      title: 'Verified Properties',
      description: 'Quality assured stays',
      gradient: 'from-teal-500 to-teal-700',
      glow: 'group-hover:shadow-teal-200',
    },
    {
      icon: CalendarX2,
      title: 'Easy Cancellation',
      description: 'Hassle-free refund policy',
      gradient: 'from-sky-400 to-sky-600',
      glow: 'group-hover:shadow-sky-200',
    },
    {
      icon: HeadphonesIcon,
      title: '24/7 Support',
      description: 'Always here to help you',
      gradient: 'from-indigo-400 to-indigo-600',
      glow: 'group-hover:shadow-indigo-200',
    },
  ];

  // Triplicate for seamless infinite loop
  const marqueeItems = [...trustItems, ...trustItems, ...trustItems];

  return (
    <section className="relative z-20 bg-white py-10 -mt-2 overflow-hidden border-y border-gray-100">
      {/* Fade edges */}
      <div className="pointer-events-none absolute left-0 top-0 h-full w-24 z-10 bg-gradient-to-r from-white to-transparent" />
      <div className="pointer-events-none absolute right-0 top-0 h-full w-24 z-10 bg-gradient-to-l from-white to-transparent" />

      <style>{`
        @keyframes trust-marquee {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-33.333%); }
        }
        .trust-marquee-track {
          display: flex;
          width: max-content;
          animation: trust-marquee 28s linear infinite;
        }
        .trust-marquee-track:hover {
          animation-play-state: paused;
        }
      `}</style>

      <div className="trust-marquee-track">
        {marqueeItems.map((item, index) => (
          <div
            key={index}
            className="flex items-center gap-4 mx-6 px-6 py-4 rounded-2xl bg-gray-50 hover:bg-white border border-gray-100 hover:border-teal-200 hover:shadow-lg transition-all duration-300 group cursor-default select-none"
            style={{ minWidth: '260px' }}
          >
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.gradient} flex items-center justify-center flex-shrink-0 shadow-md ${item.glow} group-hover:scale-105 transition-all duration-300`}>
              <item.icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-sm whitespace-nowrap group-hover:text-teal-700 transition-colors duration-200">
                {item.title}
              </h3>
              <p className="text-xs text-gray-500 whitespace-nowrap">
                {item.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

// Destinations Component
const Destinations = () => {
  const sectionRef = useRef(null);
  const headerRef = useRef(null);
  const scrollContainerRef = useRef(null);

  const destinations = [
    {
      name: 'Kathmandu Valley',
      image: 'https://images.unsplash.com/photo-1558799401-1dcba79834c2?q=80&w=2070&auto=format&fit=crop',
      properties: '180+ stays',
    },
    {
      name: 'Pokhara, Kaski',
      image: 'https://images.unsplash.com/photo-1605640840605-14ac1855827b?q=80&w=2070&auto=format&fit=crop',
      properties: '120+ stays',
    },
    {
      name: 'Chitwan, Narayani',
      image: 'https://images.unsplash.com/photo-1574755393849-623942496936?q=80&w=2070&auto=format&fit=crop',
      properties: '60+ stays',
    },
    {
      name: 'Nagarkot, Bhaktapur',
      image: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?q=80&w=2070&auto=format&fit=crop',
      properties: '45+ stays',
    },
    {
      name: 'Lumbini, Rupandehi',
      image: 'https://images.unsplash.com/photo-1603959395883-4066c8b05e64?q=80&w=2070&auto=format&fit=crop',
      properties: '35+ stays',
    },
  ];

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        headerRef.current,
        { y: 15, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.5,
          ease: 'power1.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 80%',
            toggleActions: 'play none none reverse',
          },
        }
      );

      const cards = scrollContainerRef.current?.querySelectorAll('.dest-card');
      if (cards) {
        gsap.fromTo(
          cards,
          { x: 30, opacity: 0 },
          {
            x: 0,
            opacity: 1,
            duration: 0.4,
            stagger: 0.08,
            ease: 'power1.out',
            scrollTrigger: {
              trigger: sectionRef.current,
              start: 'top 70%',
              toggleActions: 'play none none reverse',
            },
          }
        );
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      id="destinations"
      ref={sectionRef}
      className="py-24 md:py-32 lg:py-36 bg-gray-50 relative z-20"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 xl:px-[6vw]">
        <div
          ref={headerRef}
          className="flex flex-col md:flex-row md:items-end md:justify-between mb-10"
        >
          <div>
            <h2 className="text-[clamp(28px,3.2vw,44px)] font-bold text-gray-900 mb-3">
              Explore top destinations
            </h2>
            <p className="text-gray-600 text-base">
              Discover the most loved places by travelers across Nepal
            </p>
          </div>
          <a
            href="#"
            className="text-teal-600 font-medium flex items-center hover:underline mt-4 md:mt-0"
          >
            View all
            <ArrowRight className="w-5 h-5 ml-2" />
          </a>
        </div>

        <div
          ref={scrollContainerRef}
          className="flex gap-8 overflow-x-auto pb-6 scrollbar-hide"
        >
          {destinations.map((dest, index) => (
            <div
              key={index}
              className="dest-card flex-shrink-0 w-[300px] md:w-[340px] group cursor-pointer"
            >
              <div className="relative rounded-[28px] overflow-hidden h-[400px] shadow-xl hover:shadow-2xl transition-all duration-500 group-hover:-translate-y-1">
                <img
                  src={dest.image}
                  alt={dest.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                <div className="absolute bottom-8 left-8 right-8">
                  <h3 className="text-white text-xl font-bold mb-2">
                    {dest.name}
                  </h3>
                  <p className="text-white/90 text-sm">{dest.properties}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// Featured Hotels Component
const FeaturedHotelsSection = () => {
  const [activeFilter, setActiveFilter] = useState('All stays');
  const sectionRef = useRef(null);
  const headerRef = useRef(null);
  const gridRef = useRef(null);

  const filters = ['All stays', 'Hotels', 'Resorts', 'Villas', 'Apartments'];

  const hotels = [
    {
      name: 'Hotel Yak & Yeti',
      location: 'Durbar Marg, Kathmandu',
      price: 12500,
      rating: 4.8,
      reviews: 1284,
      image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=2070&auto=format&fit=crop',
      type: 'Hotels',
    },
    {
      name: 'Temple Tree Resort & Spa',
      location: 'Lakeside, Pokhara',
      price: 9800,
      rating: 4.9,
      reviews: 512,
      image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=2070&auto=format&fit=crop',
      type: 'Resorts',
    },
    {
      name: 'Dwarika\'s Hotel',
      location: 'Battisputali, Kathmandu',
      price: 18500,
      rating: 4.9,
      reviews: 891,
      image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80',
      type: 'Hotels',
    },
    {
      name: 'Pavilions Himalayas',
      location: 'Sarangkot, Pokhara',
      price: 22000,
      rating: 4.7,
      reviews: 267,
      image: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?q=80&w=2080&auto=format&fit=crop',
      type: 'Villas',
    },
    {
      name: 'Barahi Jungle Lodge',
      location: 'Meghauli, Chitwan',
      price: 15000,
      rating: 4.8,
      reviews: 156,
      image: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?q=80&w=2070&auto=format&fit=crop',
      type: 'Resorts',
    },
    {
      name: 'Hotel Shanker',
      location: 'Lazimpat, Kathmandu',
      price: 8500,
      rating: 4.6,
      reviews: 423,
      image: 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?q=80&w=2070&auto=format&fit=crop',
      type: 'Hotels',
    },
  ];

  const filteredHotels =
    activeFilter === 'All stays'
      ? hotels
      : hotels.filter((h) => h.type === activeFilter);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        headerRef.current,
        { y: 15, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.5,
          ease: 'power1.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 75%',
            toggleActions: 'play none none reverse',
          },
        }
      );

      const cards = gridRef.current?.querySelectorAll('.hotel-card');
      if (cards) {
        gsap.fromTo(
          cards,
          { y: 20, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.4,
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
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      id="featured"
      ref={sectionRef}
      className="py-24 md:py-32 lg:py-36 bg-white relative z-20"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 xl:px-[6vw]">
        <div ref={headerRef} className="text-center mb-12">
          <h2 className="text-[clamp(28px,3.2vw,44px)] font-bold text-gray-900 mb-4">
            Featured hotels & stays
          </h2>
          <p className="text-gray-600 text-base mb-8">
            Handpicked properties with the best guest ratings
          </p>

          {/* Filters */}
          <div className="flex flex-wrap justify-center gap-3">
            {filters.map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-6 py-2.5 rounded-full font-medium transition-all ${activeFilter === filter
                    ? 'bg-teal-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        <div
          ref={gridRef}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10"
        >
          {filteredHotels.map((hotel, index) => (
            <div
              key={index}
              className="hotel-card bg-white rounded-[28px] overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-1 cursor-pointer"
            >
              <div className="relative h-[260px] overflow-hidden">
                <img
                  src={hotel.image}
                  alt={hotel.name}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                />
              </div>
              <div className="p-7">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-xl text-gray-900 mb-1">
                      {hotel.name}
                    </h3>
                    <div className="flex items-center text-gray-600 text-sm">
                      <MapPin className="w-4 h-4 mr-1" />
                      {hotel.location}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-1">
                    <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                    <span className="font-bold text-gray-900">{hotel.rating}</span>
                    <span className="text-sm text-gray-600">
                      ({hotel.reviews} reviews)
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-teal-600">
                      NRs {hotel.price.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-600">per night</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// How It Works Component
const HowItWorks = () => {
  const sectionRef = useRef(null);
  const headerRef = useRef(null);
  const cardsRef = useRef(null);

  const steps = [
    {
      icon: Search,
      title: 'Search & compare',
      description:
        'Filter by price, amenities, and guest reviews to find your perfect stay.',
    },
    {
      icon: CalendarX2,
      title: 'Book instantly',
      description:
        'Secure your room with flexible cancellation options and instant confirmation.',
    },
    {
      icon: ConciergeBell,
      title: 'Manage your stay',
      description:
        'Modify dates, request services, and message the front desk anytime.',
    },
  ];

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        headerRef.current,
        { y: 15, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.5,
          ease: 'power1.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 78%',
            toggleActions: 'play none none reverse',
          },
        }
      );

      const cards = cardsRef.current?.querySelectorAll('.step-card');
      if (cards) {
        gsap.fromTo(
          cards,
          { y: 20, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.4,
            stagger: 0.1,
            ease: 'power1.out',
            scrollTrigger: {
              trigger: cardsRef.current,
              start: 'top 80%',
              toggleActions: 'play none none reverse',
            },
          }
        );
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      id="how-it-works"
      ref={sectionRef}
      className="py-24 md:py-32 lg:py-36 bg-gray-50 relative z-20"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 xl:px-[6vw]">
        <div ref={headerRef} className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="text-[clamp(28px,3.2vw,44px)] font-bold text-gray-900 mb-4">
            How StayHaven works
          </h2>
          <p className="text-gray-600 text-base">
            Search, book, and manage your stay in minutes.
          </p>
        </div>

        <div
          ref={cardsRef}
          className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-10 max-w-6xl mx-auto"
        >
          {steps.map((step, index) => (
            <div
              key={index}
              className="step-card bg-white rounded-[28px] p-10 shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-1"
            >
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-r from-teal-500 to-teal-700 flex items-center justify-center mb-6">
                <step.icon className="w-7 h-7 text-white" />
              </div>
              <div className="text-teal-600 font-bold text-sm mb-3">
                Step {index + 1}
              </div>
              <h3 className="font-bold text-lg text-gray-900 mb-3">
                {step.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// For Everyone Component
const ForEveryone = () => {
  const sectionRef = useRef(null);
  const leftPanelRef = useRef(null);
  const rightPanelRef = useRef(null);

  const travelerFeatures = [
    { icon: BadgePercent, text: 'Best-price guarantee' },
    { icon: Users, text: 'Real guest reviews' },
    { icon: HeadphonesIcon, text: 'In-hotel service requests' },
  ];

  const managerFeatures = [
    { icon: BarChart3, text: 'Channel manager' },
    { icon: MessageSquare, text: 'Automated messaging' },
    { icon: Shield, text: 'Analytics dashboard' },
  ];

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        leftPanelRef.current,
        { x: '-30px', opacity: 0 },
        {
          x: 0,
          opacity: 1,
          duration: 0.5,
          ease: 'power1.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 70%',
            toggleActions: 'play none none reverse',
          },
        }
      );

      gsap.fromTo(
        rightPanelRef.current,
        { x: '30px', opacity: 0 },
        {
          x: 0,
          opacity: 1,
          duration: 0.5,
          ease: 'power1.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 70%',
            toggleActions: 'play none none reverse',
          },
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      id="for-managers"
      ref={sectionRef}
      className="py-24 md:py-32 lg:py-36 bg-gray-50 relative z-20"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 xl:px-[6vw]">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10">
          {/* Travelers Panel */}
          <div
            ref={leftPanelRef}
            className="relative rounded-[28px] overflow-hidden h-[540px] lg:h-[600px] group cursor-pointer"
          >
            <img
              src="/images/panel-travelers.jpg"
              alt="For travelers"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
            <div className="absolute bottom-10 left-10 right-10 panel-text">
              <h3 className="text-white text-2xl md:text-3xl font-bold mb-4">
                For travelers
              </h3>
              <p className="text-white/90 mb-6 text-base">
                Book smarter, stay longer, and enjoy exclusive benefits.
              </p>
              <div className="space-y-3 mb-6">
                {travelerFeatures.map((feature, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <feature.icon className="w-5 h-5 text-teal-400" />
                    <span className="text-white">{feature.text}</span>
                  </div>
                ))}
              </div>
              <button className="bg-white text-gray-900 px-6 py-3 rounded-2xl font-semibold hover:bg-gray-100 transition-colors inline-flex items-center">
                Explore more
                <ArrowRight className="w-5 h-5 ml-2" />
              </button>
            </div>
          </div>

          {/* Managers Panel */}
          <div
            ref={rightPanelRef}
            className="relative rounded-[28px] overflow-hidden h-[500px] lg:h-[560px] group cursor-pointer"
          >
            <img
              src="/images/panel-managers.jpg"
              alt="For managers"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
            <div className="absolute bottom-8 left-8 right-8 panel-text">
              <h3 className="text-white text-2xl md:text-3xl font-bold mb-4">
                For hotel managers
              </h3>
              <p className="text-white/90 mb-6 text-base">
                Manage bookings, automate workflows, and boost revenue.
              </p>
              <div className="space-y-3 mb-6">
                {managerFeatures.map((feature, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <feature.icon className="w-5 h-5 text-teal-400" />
                    <span className="text-white">{feature.text}</span>
                  </div>
                ))}
              </div>
              <button className="bg-white text-gray-900 px-6 py-3 rounded-2xl font-semibold hover:bg-gray-100 transition-colors inline-flex items-center">
                Learn more
                <ArrowRight className="w-5 h-5 ml-2" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

// Why Choose Component
const WhyChoose = () => {
  const sectionRef = useRef(null);
  const headerRef = useRef(null);
  const gridRef = useRef(null);

  const benefits = [
    {
      icon: BadgeDollarSign,
      title: 'No hidden fees',
      description: 'Transparent pricing with no surprises at checkout.',
    },
    {
      icon: CalendarX2,
      title: 'Flexible cancellation',
      description: 'Free cancellation on most bookings up to 24 hours before.',
    },
    {
      icon: BadgeCheck,
      title: 'Verified reviews',
      description: 'Only guests who stayed can leave reviews.',
    },
    {
      icon: HeadphonesIcon,
      title: '24/7 support',
      description: 'Our team is here to help anytime, anywhere.',
    },
    {
      icon: TrendingDown,
      title: 'Price match promise',
      description: 'Find a lower price? We will match it.',
    },
    {
      icon: Leaf,
      title: 'Eco-friendly stays',
      description: 'Support sustainable properties worldwide.',
    },
  ];

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        headerRef.current,
        { y: 15, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.5,
          ease: 'power1.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 80%',
            toggleActions: 'play none none reverse',
          },
        }
      );

      const cards = gridRef.current?.querySelectorAll('.benefit-card');
      if (cards) {
        gsap.fromTo(
          cards,
          { y: 20, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.4,
            stagger: 0.06,
            ease: 'power1.out',
            scrollTrigger: {
              trigger: gridRef.current,
              start: 'top 80%',
              toggleActions: 'play none none reverse',
            },
          }
        );
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="py-24 md:py-32 lg:py-36 bg-gray-50 relative z-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 xl:px-[6vw]">
        <div ref={headerRef} className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="text-[clamp(28px,3.2vw,44px)] font-bold text-gray-900 mb-4">
            Why choose StayHaven?
          </h2>
          <p className="text-gray-600 text-base">
            We go the extra mile to ensure your stay is perfect
          </p>
        </div>

        <div
          ref={gridRef}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto"
        >
          {benefits.map((benefit, index) => (
            <div
              key={index}
              className="benefit-card bg-white rounded-[28px] p-10 shadow-xl hover:shadow-2xl transition-all duration-500"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-teal-500 to-teal-700 flex items-center justify-center mb-5">
                <benefit.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-bold text-lg text-gray-900 mb-3">
                {benefit.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {benefit.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// Testimonials Component
const Testimonials = () => {
  const sectionRef = useRef(null);
  const statsRef = useRef(null);
  const cardsRef = useRef(null);

  const stats = [
    { value: '50K+', label: 'Guests hosted' },
    { value: '500+', label: 'Properties in Nepal' },
    { value: '4.8', label: 'Average rating' },
  ];

  const testimonials = [
    {
      quote:
        'The best booking experience I have had — clean app, great support, and amazing properties across Nepal. StayHaven makes travel planning effortless.',
      author: 'Aayush S.',
      role: 'Frequent traveler',
      avatar: 'AS',
      rating: 5,
    },
    {
      quote:
        'We listed our boutique hotel in Pokhara and saw a 30% uplift in direct bookings within the first quarter. The dashboard is incredibly intuitive.',
      author: 'Priya T.',
      role: 'Hotel owner, Pokhara',
      avatar: 'PT',
      rating: 5,
    },
  ];

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        statsRef.current,
        { x: '-30px', opacity: 0 },
        {
          x: 0,
          opacity: 1,
          duration: 0.5,
          ease: 'power1.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 75%',
            toggleActions: 'play none none reverse',
          },
        }
      );

      const cards = cardsRef.current?.querySelectorAll('.testimonial-card');
      if (cards) {
        gsap.fromTo(
          cards,
          { x: '30px', opacity: 0 },
          {
            x: 0,
            opacity: 1,
            duration: 0.5,
            stagger: 0.1,
            ease: 'power1.out',
            scrollTrigger: {
              trigger: cardsRef.current,
              start: 'top 80%',
              toggleActions: 'play none none reverse',
            },
          }
        );
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="py-24 md:py-32 lg:py-36 bg-gray-50 relative z-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 xl:px-[6vw]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16">
          <div ref={statsRef} className="lg:col-span-4">
            <h2 className="text-[clamp(28px,3.2vw,44px)] font-bold text-gray-900 mb-8">
              Trusted by millions
            </h2>
            <div className="space-y-8">
              {stats.map((stat, index) => (
                <div key={index}>
                  <div className="text-3xl md:text-4xl font-extrabold text-teal-600 mb-1">
                    {stat.value}
                  </div>
                  <div className="text-gray-600 text-base">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div ref={cardsRef} className="lg:col-span-8 space-y-8">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="testimonial-card bg-white rounded-[28px] p-10 shadow-xl"
              >
                <Quote className="w-10 h-10 text-teal-600/20 mb-4" />
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star
                      key={i}
                      className="w-5 h-5 fill-yellow-400 text-yellow-400"
                    />
                  ))}
                </div>
                <p className="text-gray-900 text-base leading-relaxed mb-6">
                  "{testimonial.quote}"
                </p>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-r from-teal-500 to-teal-700 flex items-center justify-center text-white font-bold">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <div className="font-bold text-gray-900">
                      {testimonial.author}
                    </div>
                    <div className="text-sm text-gray-600">
                      {testimonial.role}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

// Inspiration Component
const Inspiration = () => {
  const sectionRef = useRef(null);
  const headerRef = useRef(null);
  const gridRef = useRef(null);

  const inspirations = [
    {
      name: 'Lakeside retreats',
      image: 'https://images.unsplash.com/photo-1605640840605-14ac1855827b?q=80&w=2070&auto=format&fit=crop',
      size: 'large',
    },
    {
      name: 'Heritage stays',
      image: 'https://images.unsplash.com/photo-1558799401-1dcba79834c2?q=80&w=2070&auto=format&fit=crop',
      size: 'small',
    },
    {
      name: 'Mountain lodges',
      image: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?q=80&w=2070&auto=format&fit=crop',
      size: 'small',
    },
  ];

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        headerRef.current,
        { y: 15, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.5,
          ease: 'power1.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 80%',
            toggleActions: 'play none none reverse',
          },
        }
      );

      const images = gridRef.current?.querySelectorAll('.insp-image');
      if (images) {
        gsap.fromTo(
          images,
          { y: 20, opacity: 0 },
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
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="py-24 md:py-32 lg:py-36 bg-gray-50 relative z-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 xl:px-[6vw]">
        <div ref={headerRef} className="mb-10">
          <h2 className="text-[clamp(28px,3.2vw,44px)] font-bold text-gray-900 mb-3">
            Get inspired
          </h2>
          <p className="text-gray-600 text-base">
            Discover unique stays for every occasion
          </p>
        </div>

        <div ref={gridRef} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {inspirations.map((insp, index) => (
            <div
              key={index}
              className={`insp-image relative rounded-[28px] overflow-hidden cursor-pointer group ${insp.size === 'large' ? 'lg:row-span-2 h-[540px]' : 'h-[260px]'
                }`}
            >
              <img
                src={insp.image}
                alt={insp.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
              <div className="insp-label absolute bottom-8 left-8">
                <h3 className="text-white text-xl font-bold">{insp.name}</h3>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// Final CTA Component
const FinalCTA = ({ navigate }) => {
  const sectionRef = useRef(null);
  const contentRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const headline = contentRef.current?.querySelector('.cta-headline');
      const subheadline = contentRef.current?.querySelector('.cta-subheadline');
      const buttons = contentRef.current?.querySelectorAll('.cta-button');

      if (headline) {
        gsap.fromTo(
          headline,
          { y: 15, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.5,
            ease: 'power1.out',
            scrollTrigger: {
              trigger: sectionRef.current,
              start: 'top 80%',
              toggleActions: 'play none none reverse',
            },
          }
        );
      }

      if (subheadline) {
        gsap.fromTo(
          subheadline,
          { y: 10, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.5,
            delay: 0.1,
            ease: 'power1.out',
            scrollTrigger: {
              trigger: sectionRef.current,
              start: 'top 80%',
              toggleActions: 'play none none reverse',
            },
          }
        );
      }

      if (buttons) {
        gsap.fromTo(
          buttons,
          { y: 10, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.4,
            stagger: 0.1,
            ease: 'power1.out',
            scrollTrigger: {
              trigger: sectionRef.current,
              start: 'top 75%',
              toggleActions: 'play none none reverse',
            },
          }
        );
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  const stats = [
    { value: '500+', label: 'Properties', icon: Building },
    { value: '50K+', label: 'Happy Guests', icon: Star },
    { value: '25+', label: 'Cities', icon: MapPin },
    { value: '4.9', label: 'Avg Rating', isStar: true, icon: Star },
  ];

  return (
    <section
      ref={sectionRef}
      className="relative bg-gray-50 z-20 py-20 md:py-28 overflow-hidden"
    >
      {/* Subtle background decoration */}
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, #0d9488 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-teal-100/40 rounded-full blur-3xl -translate-y-1/2" />

      <div ref={contentRef} className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 xl:px-[6vw]">
        {/* Stats row */}
        <div className="cta-button grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 max-w-3xl mx-auto mb-14">
          {stats.map((stat, i) => (
            <div key={i} className="bg-white rounded-2xl p-5 text-center shadow-sm border border-gray-100 hover:shadow-md hover:border-teal-100 transition-all duration-300">
              <div className="text-2xl md:text-3xl font-extrabold text-gray-900 flex items-center justify-center gap-1">
                {stat.value}
                {stat.isStar && <Star className="w-5 h-5 text-amber-400 fill-amber-400" />}
              </div>
              <div className="text-xs text-gray-500 mt-1 font-semibold tracking-wider uppercase">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Main CTA card */}
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-10 md:p-14 text-center">
            <div className="cta-button inline-flex items-center gap-2 bg-teal-50 border border-teal-200 rounded-full px-5 py-2 text-teal-700 text-sm font-semibold mb-7">
              <span className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-pulse" />
              Nepal's #1 Hotel Booking Platform
            </div>
            <h2 className="cta-headline text-gray-900 font-extrabold text-[clamp(26px,4vw,44px)] leading-[1.2] mb-5">
              Your Next Adventure<br />
              Starts <span className="bg-gradient-to-r from-teal-500 to-emerald-500 bg-clip-text text-transparent">Right Here</span>
            </h2>
            <p className="cta-subheadline text-gray-500 text-base md:text-lg mb-9 max-w-xl mx-auto leading-relaxed">
              Join thousands of travelers who book smarter with StayHaven. Best prices, verified hotels, instant confirmation.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
              <button
                onClick={() => navigate('/hotels')}
                className="cta-button group bg-gradient-to-r from-teal-500 to-emerald-500 text-white px-8 py-3.5 rounded-xl font-bold text-sm hover:from-teal-600 hover:to-emerald-600 transition-all shadow-lg shadow-teal-500/20 hover:shadow-teal-500/30 hover:-translate-y-0.5 inline-flex items-center justify-center gap-2"
              >
                <Search className="w-4 h-4" />
                Find Your Stay
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <button className="cta-button group border-2 border-gray-200 text-gray-700 px-8 py-3.5 rounded-xl font-bold text-sm hover:border-teal-300 hover:text-teal-700 hover:bg-teal-50 transition-all inline-flex items-center justify-center gap-2">
                <Building className="w-4 h-4" />
                List Your Property
              </button>
            </div>

            <div className="flex items-center justify-center gap-4 text-xs text-gray-400">
              <span className="flex items-center gap-1"><Shield className="w-3.5 h-3.5 text-teal-500" /> Secure checkout</span>
              <span className="w-1 h-1 bg-gray-300 rounded-full" />
              <span>Free cancellation</span>
              <span className="w-1 h-1 bg-gray-300 rounded-full" />
              <span>No hidden fees</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Home;
