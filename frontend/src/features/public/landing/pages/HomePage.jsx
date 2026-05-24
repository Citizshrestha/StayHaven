import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { motion as Motion } from 'framer-motion';
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
import { getApiBaseUrl } from '../../../../utils/apiConfig';

gsap.registerPlugin(ScrollTrigger);

const HERO_BG_URL =
  'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1920&q=80';

const heroFieldShell =
  'hero-field-shell flex h-8 w-full min-w-0 items-center gap-1.5 rounded-md border border-[rgba(0,0,0,0.08)] bg-white px-2 pr-1';

const heroInputClass =
  'hero-panel-input !m-0 !h-full !min-h-0 !w-full min-w-0 !flex-1 !rounded-none !border-0 !bg-transparent !px-0 !py-0 !text-[13px] !leading-tight !font-medium !text-[#64748b] !shadow-none !ring-0 !outline-none placeholder:!text-[#94a3b8] focus-visible:!border-0 focus-visible:!ring-0 focus-visible:!ring-offset-0';

const heroSelectClass =
  'hero-panel-select !m-0 h-full min-h-0 w-full min-w-0 flex-1 cursor-pointer appearance-none border-0 bg-transparent py-0 text-[13px] font-medium leading-tight text-[#64748b] outline-none ring-0 focus:ring-0';

const Home = () => {
  const navigate = useNavigate();
  const heroRef = useRef(null);
  const headlineRef = useRef(null);
  const subheadlineRef = useRef(null);
  const searchCardRef = useRef(null);
  const overlayRef = useRef(null);
  const imageParallaxRef = useRef(null);
  const badgesRef = useRef(null);
  const [ripples, setRipples] = useState([]);

  // GSAP: scroll parallax + hero exit (entrance handled by Framer Motion)
  useEffect(() => {
    const ctx = gsap.context(() => {
      if (imageParallaxRef.current && heroRef.current) {
        gsap.fromTo(
          imageParallaxRef.current,
          { yPercent: -5 },
          {
            yPercent: 5,
            ease: 'none',
            scrollTrigger: {
              trigger: heroRef.current,
              start: 'top top',
              end: 'bottom top',
              scrub: 0.85,
            },
          }
        );
      }

      if (heroRef.current && headlineRef.current && subheadlineRef.current && searchCardRef.current) {
        const scrollTl = gsap.timeline({
          scrollTrigger: {
            trigger: heroRef.current,
            start: 'top top',
            end: '+=130%',
            scrub: 0.6,
            pin: false,
          },
        });

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

        if (badgesRef.current) {
          scrollTl.fromTo(
            badgesRef.current,
            { y: 0, opacity: 1 },
            { y: '-8vh', opacity: 0, ease: 'power2.in' },
            0.74
          );
        }

        if (overlayRef.current) {
          scrollTl.fromTo(
            overlayRef.current,
            { scale: 1, y: 0 },
            { scale: 1.045, y: '-3vh' },
            0.7
          );
        }
      }
    }, heroRef);

    return () => ctx.revert();
  }, []);

  const onSearchRipple = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const id = `${Date.now()}-${Math.random()}`;
    setRipples((prev) => [...prev, { id, x: e.clientX - r.left, y: e.clientY - r.top }]);
    window.setTimeout(() => {
      setRipples((prev) => prev.filter((x) => x.id !== id));
    }, 650);
  };

  return (
    <div className="min-h-screen bg-white overflow-x-hidden flex flex-col">
      <style>{`
        @keyframes hero-ripple {
          to {
            transform: scale(24);
            opacity: 0;
          }
        }
        .sh-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(14, 165, 160, 0.15);
          border: 1px solid rgba(14, 165, 160, 0.4);
          border-radius: 20px;
          padding: 5px 14px;
          margin-bottom: 20px;
        }
        .sh-eyebrow-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #0ea5a0;
          flex-shrink: 0;
        }
        .sh-eyebrow span:last-child {
          font-size: 11px;
          font-weight: 700;
          color: #5ee8e3;
          letter-spacing: 0.08em;
        }
        .sh-trust-badge {
          background: rgba(255, 255, 255, 0.12);
          border: 1px solid rgba(255, 255, 255, 0.22);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          border-radius: 20px;
          padding: 7px 16px;
          font-size: 12px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.9);
        }
        .sh-trust-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #f97316;
          flex-shrink: 0;
        }
        .hero-date-input::-webkit-calendar-picker-indicator {
          display: none;
          -webkit-appearance: none;
        }
        .hero-date-input::-webkit-datetime-edit-fields-wrapper {
          padding: 0;
        }
        .hero-field-shell .hero-panel-input,
        .hero-field-shell .hero-date-input {
          min-height: 0;
        }
        .hero-date-input::-webkit-datetime-edit {
          padding: 0;
          line-height: 1.25;
        }
        .sh-hero-search-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 0;
          align-items: stretch;
        }
        @media (min-width: 1024px) {
          .sh-hero-search-grid {
            grid-template-columns: 1.4fr 1fr 1fr 1fr auto;
          }
        }
      `}</style>
      <Navbar />
      {/* Hero Section */}
      <section ref={heroRef} className="relative z-10 w-full overflow-hidden">
        <div
          ref={overlayRef}
          className="absolute inset-0 z-0 w-full min-h-full overflow-hidden"
          style={{ willChange: 'transform' }}
        >
          <Motion.div
            ref={imageParallaxRef}
            className="absolute inset-0 z-0 scale-110"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            style={{
              backgroundImage: `url('${HERO_BG_URL}')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
            }}
          />
          <div
            className="pointer-events-none absolute inset-0 z-[1]"
            style={{
              background:
                'linear-gradient(180deg, rgba(10, 25, 35, 0.70) 0%, rgba(10, 25, 35, 0.40) 40%, rgba(10, 25, 35, 0.75) 100%)',
            }}
          />
        </div>

        <div className="relative z-[2] mx-auto flex w-full max-w-[1100px] flex-col items-center px-4 pt-[100px] pb-[80px] text-center sm:px-6">
          <div ref={headlineRef} className="flex w-full flex-col items-center antialiased">
            <div className="sh-eyebrow">
              <span className="sh-eyebrow-dot" aria-hidden />
              <span>NEPAL&apos;S #1 HOTEL BOOKING PLATFORM</span>
            </div>
            <div className="mb-[18px] flex flex-col items-center gap-0">
              <Motion.span
                className="block text-white"
                style={{
                  fontSize: 'clamp(2.25rem, 6vw, 72px)',
                  fontWeight: 800,
                  lineHeight: 1.1,
                  textShadow: '0 2px 20px rgba(0,0,0,0.3)',
                }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, ease: 'easeOut' }}
              >
                Book smarter.
              </Motion.span>
              <Motion.span
                className="block"
                style={{
                  fontSize: 'clamp(2.25rem, 6vw, 72px)',
                  fontWeight: 800,
                  lineHeight: 1.1,
                  color: '#0ea5a0',
                  textShadow: '0 2px 20px rgba(0,0,0,0.3)',
                }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.55, ease: 'easeOut' }}
              >
                Stay better.
              </Motion.span>
            </div>
          </div>

          <Motion.p
            ref={subheadlineRef}
            className="mx-auto mb-9 w-full max-w-[540px] text-center text-[17px] leading-[1.65]"
            style={{ color: 'rgba(255,255,255,0.78)' }}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.95, duration: 0.5, ease: 'easeOut' }}
          >
            Discover Nepal&apos;s finest hotels, manage your stay, and enjoy seamless
            in-hotel services — all in one place.
          </Motion.p>

          <Motion.div
            ref={searchCardRef}
            className="mb-5 w-full max-w-[860px] rounded-2xl px-4 py-3 shadow-[0_20px_60px_rgba(0,0,0,0.22)] sm:px-[18px]"
            style={{ background: 'rgba(255,255,255,0.97)' }}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.15, duration: 0.55, ease: 'easeOut' }}
          >
            <div className="sh-hero-search-grid">
              <div className="flex min-h-0 min-w-0 flex-col border-b border-[rgba(0,0,0,0.08)] px-3 py-1.5 text-left lg:border-b-0 lg:[border-right:1px_solid_rgba(0,0,0,0.08)] lg:px-4 lg:py-1.5">
                <label
                  className="mb-1 block text-[10px] font-bold uppercase leading-none tracking-[0.1em] text-[#64748b]"
                  htmlFor="hero-where"
                >
                  Where to?
                </label>
                <div className={heroFieldShell}>
                  <MapPin className="size-3.5 shrink-0 text-[#0ea5a0]" aria-hidden />
                  <Input
                    id="hero-where"
                    placeholder="Search destinations in Nepal"
                    className={heroInputClass}
                  />
                </div>
              </div>

              <div className="flex min-h-0 min-w-0 flex-col border-b border-[rgba(0,0,0,0.08)] px-3 py-1.5 text-left lg:border-b-0 lg:[border-right:1px_solid_rgba(0,0,0,0.08)] lg:px-4 lg:py-1.5">
                <label
                  className="mb-1 block text-[10px] font-bold uppercase leading-none tracking-[0.1em] text-[#64748b]"
                  htmlFor="hero-checkin"
                >
                  Check-in
                </label>
                <div className={heroFieldShell}>
                  <Calendar className="size-3.5 shrink-0 text-[#0ea5a0]" aria-hidden />
                  <Input
                    id="hero-checkin"
                    type="date"
                    className={`hero-date-input ${heroInputClass}`}
                  />
                </div>
              </div>

              <div className="flex min-h-0 min-w-0 flex-col border-b border-[rgba(0,0,0,0.08)] px-3 py-1.5 text-left lg:border-b-0 lg:[border-right:1px_solid_rgba(0,0,0,0.08)] lg:px-4 lg:py-1.5">
                <label
                  className="mb-1 block text-[10px] font-bold uppercase leading-none tracking-[0.1em] text-[#64748b]"
                  htmlFor="hero-checkout"
                >
                  Check-out
                </label>
                <div className={heroFieldShell}>
                  <Calendar className="size-3.5 shrink-0 text-[#0ea5a0]" aria-hidden />
                  <Input
                    id="hero-checkout"
                    type="date"
                    className={`hero-date-input ${heroInputClass}`}
                  />
                </div>
              </div>

              <div className="flex min-h-0 min-w-0 flex-col border-b border-[rgba(0,0,0,0.08)] px-3 py-1.5 text-left lg:border-b-0 lg:[border-right:1px_solid_rgba(0,0,0,0.08)] lg:px-4 lg:py-1.5">
                <span className="mb-1 block text-[10px] font-bold uppercase leading-none tracking-[0.1em] text-[#64748b]">
                  Guests
                </span>
                <div className={heroFieldShell}>
                  <Users className="size-3.5 shrink-0 text-[#0ea5a0]" aria-hidden />
                  <select
                    className={heroSelectClass}
                    style={{ colorScheme: 'light' }}
                    aria-label="Number of guests"
                  >
                    <option>1 Guest</option>
                    <option>2 Guests</option>
                    <option>3 Guests</option>
                    <option>4+ Guests</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col justify-end border-t border-[rgba(0,0,0,0.08)] px-3 py-2 lg:border-t-0 lg:border-0 lg:px-2 lg:pb-1.5 lg:pt-0">
                <span
                  className="mb-1 hidden text-[10px] font-bold uppercase leading-none tracking-[0.1em] lg:invisible lg:block"
                  aria-hidden
                >
                  Guests
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    onSearchRipple(e);
                    navigate('/hotels');
                  }}
                  className="relative inline-flex h-8 w-full cursor-pointer items-center justify-center overflow-hidden whitespace-nowrap rounded-[10px] border-0 bg-[#0ea5a0] px-5 text-[13px] font-bold text-white transition-colors hover:bg-[#0d9489] lg:w-auto lg:self-center"
                >
                  {ripples.map((r) => (
                    <span
                      key={r.id}
                      className="pointer-events-none absolute size-3 rounded-full bg-white/40"
                      style={{
                        left: r.x,
                        top: r.y,
                        transform: 'translate(-50%, -50%) scale(0)',
                        animation: 'hero-ripple 0.6s ease-out forwards',
                      }}
                    />
                  ))}
                  <Search className="mr-1.5 size-3.5 shrink-0" strokeWidth={2.5} />
                  Search
                </button>
              </div>
            </div>

          </Motion.div>

          <div
            ref={badgesRef}
            className="mb-0 flex w-full max-w-[860px] flex-wrap items-center justify-center gap-[10px]"
          >
            <div className="sh-trust-badge inline-flex items-center gap-2">
              <span aria-hidden>🏨</span>
              <span>50,000+ Happy Travelers</span>
            </div>
            <div className="sh-trust-badge inline-flex items-center gap-2">
              <span aria-hidden>⭐</span>
              <span>4.8/5.0 Verified Reviews</span>
            </div>
            <div className="sh-trust-badge inline-flex items-center gap-2">
              <span className="sh-trust-dot" aria-hidden />
              <span>23 viewing now · Secure booking</span>
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
    <Motion.section
      className="relative z-20 bg-white py-10 -mt-2 overflow-hidden border-y border-gray-100"
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
    >
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
            className="flex items-center gap-4 mx-6 px-6 py-4 rounded-2xl hover:bg-white border border-gray-100 hover:border-teal-200 hover:shadow-lg transition-all duration-300 group cursor-default select-none"
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
    </Motion.section>
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
      image: 'https://upload.wikimedia.org/wikipedia/commons/f/fd/Basantapurpalace.JPG',
      properties: '180+ stays',
    },
    {
      name: 'Pokhara, Kaski',
      image: 'https://upload.wikimedia.org/wikipedia/commons/8/8b/Fewa_lake%2CPokhara.jpg',
      properties: '120+ stays',
    },
    {
      name: 'Chitwan, Narayani',
      image: 'https://upload.wikimedia.org/wikipedia/commons/0/02/Tiger_in_chitwan.jpg',
      properties: '60+ stays',
    },
    {
      name: 'Nagarkot, Bhaktapur',
      image: 'https://upload.wikimedia.org/wikipedia/commons/c/c7/Sunrise_at_Nagarkot%2C_Nepal_2.jpg',
      properties: '45+ stays',
    },
    {
      name: 'Lumbini, Rupandehi',
      image: 'https://upload.wikimedia.org/wikipedia/commons/2/24/Lumbini_Buddhist_pilgrimage_IMG_0678_18.jpg',
      properties: '35+ stays',
    },
  ];

  useEffect(() => {
    if (!sectionRef.current || !headerRef.current || !scrollContainerRef.current) return;

    const ctx = gsap.context(() => {
      if (headerRef.current) {
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
      }

      const cards = scrollContainerRef.current?.querySelectorAll('.dest-card');
      if (cards && cards.length > 0) {
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
      className="py-24 md:py-32 lg:py-36 relative z-20"
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
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState('All stays');
  const sectionRef = useRef(null);
  const headerRef = useRef(null);
  const gridRef = useRef(null);
  const [hotels, setHotels] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const filters = ['All stays', 'Hotels', 'Resorts', 'Villas', 'Apartments'];

  // Fetch hotels from API
  useEffect(() => {
    const fetchHotels = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`${getApiBaseUrl()}/api/v1/hotels`);
        if (!response.ok) throw new Error('Failed to fetch hotels');
        const data = await response.json();

        // Transform API data to match component structure
        const transformedHotels = (data.hotels || []).map(hotel => ({
          _id: hotel._id,
          name: hotel.name,
          location: `${hotel.location?.address || hotel.location?.city || 'Nepal'}`,
          price: hotel.priceRange?.min || 0,
          rating: hotel.rating || 0,
          reviews: hotel.reviewCount || 0,
          image: hotel.images?.[0] || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80',
          type: hotel.category || 'Hotels',
        }));

        setHotels(transformedHotels);
      } catch (err) {
        console.error('Error fetching hotels:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHotels();
  }, []);

  const filteredHotels =
    activeFilter === 'All stays'
      ? hotels
      : hotels.filter((h) => h.type === activeFilter);

  const handleHotelClick = (hotelId) => {
    navigate(`/hotels/${hotelId}`);
  };

  useEffect(() => {
    if (!sectionRef.current || !headerRef.current || !gridRef.current) return;

    const ctx = gsap.context(() => {
      if (headerRef.current) {
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
      }

      const cards = gridRef.current?.querySelectorAll('.hotel-card');
      if (cards && cards.length > 0) {
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
          {isLoading ? (
            // Loading skeleton
            Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="hotel-card bg-white rounded-[28px] overflow-hidden shadow-xl animate-pulse"
              >
                <div className="relative h-[260px] bg-gray-200" />
                <div className="p-7">
                  <div className="h-6 bg-gray-200 rounded mb-2 w-3/4" />
                  <div className="h-4 bg-gray-200 rounded mb-4 w-1/2" />
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div className="h-4 bg-gray-200 rounded w-1/3" />
                    <div className="h-6 bg-gray-200 rounded w-1/4" />
                  </div>
                </div>
              </div>
            ))
          ) : error ? (
            // Error state
            <div className="col-span-full text-center py-12">
              <p className="text-red-600 mb-4">Failed to load hotels: {error}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-2 bg-teal-600 text-white rounded-full hover:bg-teal-700 transition-colors"
              >
                Retry
              </button>
            </div>
          ) : filteredHotels.length === 0 ? (
            // No hotels found
            <div className="col-span-full text-center py-12">
              <p className="text-gray-600">No hotels found for this category.</p>
            </div>
          ) : (
            // Hotel cards
            filteredHotels.map((hotel) => (
              <div
                key={hotel._id}
                onClick={() => handleHotelClick(hotel._id)}
                className="hotel-card bg-white rounded-[28px] overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-1 cursor-pointer"
              >
                <div className="relative h-[260px] overflow-hidden">
                  <img
                    src={hotel.image}
                    alt={hotel.name}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                    onError={(e) => {
                      e.target.src = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80';
                    }}
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
                      <span className="font-bold text-gray-900">{hotel.rating.toFixed(1)}</span>
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
            ))
          )}
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
      bgColor: '#6366F1', // Indigo for search/discovery
    },
    {
      icon: CalendarX2,
      title: 'Book instantly',
      description:
        'Secure your room with flexible cancellation options and instant confirmation.',
      bgColor: '#10B981', // Emerald for booking/success
    },
    {
      icon: ConciergeBell,
      title: 'Manage your stay',
      description:
        'Modify dates, request services, and message the front desk anytime.',
      bgColor: '#F59E0B', // Amber for service/support
    },
  ];

  useEffect(() => {
    if (!sectionRef.current || !headerRef.current || !cardsRef.current) return;

    const ctx = gsap.context(() => {
      if (headerRef.current) {
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
      }

      const cards = cardsRef.current?.querySelectorAll('.step-card');
      if (cards && cards.length > 0) {
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
      className="py-24 md:py-32 lg:py-36 relative z-20"
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
              <div 
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6"
                style={{ backgroundColor: step.bgColor }}
              >
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
    if (!sectionRef.current || !leftPanelRef.current || !rightPanelRef.current) return;

    const ctx = gsap.context(() => {
      if (leftPanelRef.current) {
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
      }

      if (rightPanelRef.current) {
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
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      id="for-managers"
      ref={sectionRef}
      className="py-24 md:py-32 lg:py-36 relative z-20"
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
      bgColor: '#10B981', // Emerald green for money/pricing
    },
    {
      icon: CalendarX2,
      title: 'Flexible cancellation',
      description: 'Free cancellation on most bookings up to 24 hours before.',
      bgColor: '#3B82F6', // Blue for calendar/trust
    },
    {
      icon: BadgeCheck,
      title: 'Verified reviews',
      description: 'Only guests who stayed can leave reviews.',
      bgColor: '#8B5CF6', // Purple for verified/authentic
    },
    {
      icon: HeadphonesIcon,
      title: '24/7 support',
      description: 'Our team is here to help anytime, anywhere.',
      bgColor: '#F59E0B', // Amber/orange for support/warmth
    },
    {
      icon: TrendingDown,
      title: 'Price match promise',
      description: 'Find a lower price? We will match it.',
      bgColor: '#EF4444', // Red for price/offers
    },
    {
      icon: Leaf,
      title: 'Eco-friendly stays',
      description: 'Support sustainable properties worldwide.',
      bgColor: '#22C55E', // Green for eco/nature
    },
  ];

  useEffect(() => {
    if (!sectionRef.current || !headerRef.current || !gridRef.current) return;

    const ctx = gsap.context(() => {
      if (headerRef.current) {
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
      }

      const cards = gridRef.current?.querySelectorAll('.benefit-card');
      if (cards && cards.length > 0) {
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
    <section ref={sectionRef} className="py-24 md:py-32 lg:py-36 relative z-20">
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
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
                style={{ backgroundColor: benefit.bgColor }}
              >
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
    { value: '500+', label: 'Properties', icon: 'building' },
    { value: '50K+', label: 'Happy Guests', icon: 'users' },
    { value: '25+', label: 'Cities', icon: 'map' },
    { value: '4.9', label: 'Avg Rating', isStar: true },
  ];

  const testimonials = [
    {
      quote:
        'The best booking experience I have had — clean app, great support, and amazing properties across Nepal. StayHaven makes travel planning effortless.',
      author: 'Aayush S.',
      role: 'Frequent traveler',
      image:
        'https://images.unsplash.com/photo-1557862921-37829c790f19?w=200&h=200&fit=crop&crop=faces&q=80',
      imageAlt: 'Portrait of Aayush, frequent traveler',
      rating: 5,
    },
    {
      quote:
        'We listed our boutique hotel in Pokhara and saw a 30% uplift in direct bookings within the first quarter. The dashboard is incredibly intuitive.',
      author: 'Priya T.',
      role: 'Hotel owner, Pokhara',
      image:
        'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&h=200&fit=crop&crop=faces&q=80',
      imageAlt: 'Portrait of Priya, hotel owner in Pokhara',
      rating: 5,
    },
  ];

  useEffect(() => {
    if (!sectionRef.current || !statsRef.current || !cardsRef.current) return;

    const ctx = gsap.context(() => {
      if (statsRef.current) {
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
      }

      const cards = cardsRef.current?.querySelectorAll('.testimonial-card');
      if (cards && cards.length > 0) {
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
    <section ref={sectionRef} className="py-24 md:py-32 lg:py-40 relative z-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 xl:px-[6vw]">
        {/* Section Header */}
        <div className="text-center mb-16 md:mb-20">
          <h2 className="text-[clamp(32px,4vw,56px)] font-bold text-gray-900 mb-4 tracking-tight">
            Trusted by thousands
          </h2>
          <p className="text-gray-500 text-lg md:text-xl max-w-2xl mx-auto">
            See what our guests and hotel partners say about their StayHaven experience
          </p>
        </div>

        {/* Stats Row */}
        <div ref={statsRef} className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-16 md:mb-24 max-w-5xl mx-auto">
          {stats.map((stat, index) => (
            <div 
              key={index} 
              className="group relative bg-white rounded-2xl p-6 md:p-8 text-center transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border border-gray-100/50"
            >
              {/* Subtle gradient border on hover */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-amber-100 via-transparent to-emerald-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
              
              <div className="relative z-10">
                <div className="flex items-center justify-center gap-1.5 text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                  {stat.value}
                  {stat.isStar && (
                    <Star className="w-6 h-6 fill-amber-400 text-amber-400" />
                  )}
                </div>
                <div className="text-sm md:text-base font-medium text-gray-500">
                  {stat.label}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Testimonials Grid */}
        <div ref={cardsRef} className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 max-w-6xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="group relative bg-white rounded-3xl p-8 md:p-10 transition-all duration-300 hover:shadow-2xl border border-gray-100/80 hover:border-gray-200"
            >
              {/* Quote Icon */}
              <Quote className="mb-6 h-12 w-12 text-gray-100 group-hover:text-amber-100 transition-colors duration-300" aria-hidden />
              
              {/* Rating Stars */}
              <div className="flex gap-1 mb-5">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star
                    key={i}
                    className="w-5 h-5 fill-amber-400 text-amber-400"
                  />
                ))}
              </div>
              
              {/* Quote Text */}
              <p className="text-gray-700 text-lg leading-relaxed mb-8 font-medium">
                "{testimonial.quote}"
              </p>
              
              {/* Author */}
              <div className="flex items-center gap-4">
                <div className="relative">
                  <img
                    src={testimonial.image}
                    alt={testimonial.imageAlt}
                    className="h-14 w-14 rounded-full object-cover ring-2 ring-gray-100 group-hover:ring-amber-200 transition-all duration-300"
                    width={56}
                    height={56}
                    loading="lazy"
                    onError={(e) => {
                      e.target.src = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=faces&q=80';
                    }}
                  />
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <div>
                  <div className="font-bold text-gray-900 text-lg">
                    {testimonial.author}
                  </div>
                  <div className="text-sm text-gray-500">
                    {testimonial.role}
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
    if (!sectionRef.current || !headerRef.current || !gridRef.current) return;

    const ctx = gsap.context(() => {
      if (headerRef.current) {
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
      }

      const images = gridRef.current?.querySelectorAll('.insp-image');
      if (images && images.length > 0) {
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
    <section ref={sectionRef} className="py-24 md:py-32 lg:py-36 relative z-20">
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
    if (!sectionRef.current || !contentRef.current) return;

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

      if (buttons && buttons.length > 0) {
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
      className="relative z-20 py-8 md:py-12 overflow-hidden"
    >
      {/* Subtle background decoration (neutral, no teal wash) */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: 'radial-gradient(circle, #94a3b8 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      <div ref={contentRef} className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 xl:px-[6vw]">
        {/* Main CTA card */}
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6 md:p-10 lg:p-14 text-center">
            <div className="cta-button inline-flex items-center gap-2 bg-teal-500 rounded-full px-4 md:px-5 py-2 text-white text-xs md:text-sm font-semibold mb-5 md:mb-7 shadow-sm">
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
              Nepal's #1 Hotel Booking Platform
            </div>
            <h2 className="cta-headline text-gray-900 font-extrabold text-[clamp(24px,5vw,44px)] leading-[1.2] mb-4 md:mb-5 px-2">
              Your Next Adventure<br />
              Starts <span className="bg-gradient-to-r from-teal-500 to-emerald-500 bg-clip-text text-transparent">Right Here</span>
            </h2>
            <p className="cta-subheadline text-gray-600 text-sm md:text-base lg:text-lg mb-6 md:mb-9 max-w-xl mx-auto leading-relaxed px-2">
              Join thousands of travelers who book smarter with StayHaven. Best prices, verified hotels, instant confirmation.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-5 md:mb-6 px-2">
              <button
                onClick={() => navigate('/hotels')}
                className="cta-button group bg-gradient-to-r from-teal-500 to-emerald-500 text-white px-6 md:px-8 py-3 md:py-3.5 rounded-xl font-bold text-sm hover:from-teal-600 hover:to-emerald-600 transition-all shadow-lg shadow-teal-500/20 hover:shadow-teal-500/30 hover:-translate-y-0.5 inline-flex items-center justify-center gap-2"
              >
                <Search className="w-4 h-4" />
                Find Your Stay
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <button className="cta-button group border-2 border-gray-200 text-gray-700 bg-white px-6 md:px-8 py-3 md:py-3.5 rounded-xl font-bold text-sm hover:border-teal-300 hover:text-teal-700 hover:bg-teal-50 transition-all inline-flex items-center justify-center gap-2">
                <Building className="w-4 h-4" />
                List Your Property
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 md:gap-4 text-[10px] md:text-xs text-gray-500 px-2">
              <span className="flex items-center gap-1"><Shield className="w-3 md:w-3.5 h-3 md:h-3.5 text-teal-500" /> Secure checkout</span>
              <span className="w-1 h-1 bg-gray-300 rounded-full hidden sm:block" />
              <span>Free cancellation</span>
              <span className="w-1 h-1 bg-gray-300 rounded-full hidden sm:block" />
              <span>No hidden fees</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Home;

