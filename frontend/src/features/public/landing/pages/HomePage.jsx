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
import { useContent } from '../../../../hooks/useContent';
import {
  getHeroBanners,
  getSiteSettings,
  getDestinations as getDestinationsApi,
  getFeaturedHotels,
  getTestimonials,
} from '../../../../core/api/services/content.service';
import { adToBS } from '../../../../utils/dateConverter';

gsap.registerPlugin(ScrollTrigger);

const sectionReveal = {
  hidden: { opacity: 0, y: 34 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
  },
};

const staggerReveal = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08, delayChildren: 0.08 },
  },
};

const cardReveal = {
  hidden: { opacity: 0, y: 28, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.62, ease: [0.22, 1, 0.36, 1] },
  },
};

const viewportReveal = { once: true, amount: 0.22, margin: '0px 0px -90px 0px' };

const HERO_BG_URL =
  'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1920&q=80';

const heroFieldShell =
  'hero-field-shell flex h-11 w-full min-w-0 items-center gap-2 rounded-lg border border-[rgba(0,0,0,0.08)] bg-white px-3 pr-2 sm:h-9 sm:gap-1.5 sm:rounded-md sm:px-2 sm:pr-1 lg:h-8';

const heroInputClass =
  'hero-panel-input !m-0 !h-full !min-h-0 !w-full min-w-0 !flex-1 !rounded-none !border-0 !bg-transparent !px-0 !py-0 !text-[15px] sm:!text-[13px] !leading-tight !font-medium !text-[#64748b] !shadow-none !ring-0 !outline-none placeholder:!text-[#94a3b8] focus-visible:!border-0 focus-visible:!ring-0 focus-visible:!ring-offset-0';

const heroSelectClass =
  'hero-panel-select !m-0 h-full min-h-0 w-full min-w-0 flex-1 cursor-pointer appearance-none border-0 bg-transparent py-0 text-[15px] sm:text-[13px] font-medium leading-tight text-[#64748b] outline-none ring-0 focus:ring-0';

const toISODate = (date) => date.toISOString().split('T')[0];

const addDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const HeroSearch = ({ ripples, onSearchRipple }) => {
  const navigate = useNavigate();
  const today = toISODate(new Date());
  const tomorrow = toISODate(addDays(new Date(), 1));
  const [destination, setDestination] = useState('');
  const [checkIn, setCheckIn] = useState(today);
  const [checkOut, setCheckOut] = useState(tomorrow);
  const [guests, setGuests] = useState('2');

  const displayDate = (value) => {
    if (!value) return '';
    return calendarSystem === 'BS' ? `${adToBS(value)} BS` : `${value} AD`;
  };

  const openPicker = (event) => {
    event.currentTarget.querySelector('input')?.showPicker?.();
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSearchRipple(event);

    const trimmedDestination = destination.trim();
    if (!trimmedDestination || !checkIn || !checkOut || new Date(checkOut) <= new Date(checkIn)) return;

    const params = new URLSearchParams({
      destination: trimmedDestination,
      checkIn,
      checkOut,
      guests,
    });

    navigate(`/hotels?${params.toString()}`);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="sh-hero-search-grid">
        <div className="flex min-h-0 min-w-0 flex-col border-b border-[rgba(0,0,0,0.08)] px-1 py-2.5 text-left sm:px-3 sm:py-1.5 lg:border-b-0 lg:[border-right:1px_solid_rgba(0,0,0,0.08)] lg:px-4 lg:py-1.5">
          <label className="mb-1.5 block text-[11px] font-bold uppercase leading-none tracking-widest text-[#64748b] sm:mb-1 sm:text-[10px]" htmlFor="hero-where">Where to?</label>
          <div className={heroFieldShell}>
            <MapPin className="size-4 shrink-0 text-[#0ea5a0] sm:size-3.5" aria-hidden />
            <input id="hero-where" value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Search destinations in Nepal" className={heroInputClass} />
          </div>
        </div>

        <div onClick={openPicker} className="flex min-h-0 min-w-0 cursor-pointer flex-col border-b border-[rgba(0,0,0,0.08)] px-1 py-2.5 text-left sm:px-3 sm:py-1.5 lg:border-b-0 lg:[border-right:1px_solid_rgba(0,0,0,0.08)] lg:px-4 lg:py-1.5">
          <label className="mb-1.5 block text-[11px] font-bold uppercase leading-none tracking-widest text-[#64748b] sm:mb-1 sm:text-[10px]" htmlFor="hero-checkin">Check-in</label>
          <div className={heroFieldShell}>
            <Calendar className="size-4 shrink-0 text-[#0ea5a0] sm:size-3.5" aria-hidden />
            <input id="hero-checkin" type="date" value={checkIn} min={today} onChange={(e) => setCheckIn(e.target.value)} className={`hero-date-input ${heroInputClass}`} />
          </div>
        </div>

        <div onClick={openPicker} className="flex min-h-0 min-w-0 cursor-pointer flex-col border-b border-[rgba(0,0,0,0.08)] px-1 py-2.5 text-left sm:px-3 sm:py-1.5 lg:border-b-0 lg:[border-right:1px_solid_rgba(0,0,0,0.08)] lg:px-4 lg:py-1.5">
          <label className="mb-1.5 block text-[11px] font-bold uppercase leading-none tracking-widest text-[#64748b] sm:mb-1 sm:text-[10px]" htmlFor="hero-checkout">Check-out</label>
          <div className={heroFieldShell}>
            <Calendar className="size-4 shrink-0 text-[#0ea5a0] sm:size-3.5" aria-hidden />
            <input id="hero-checkout" type="date" value={checkOut} min={checkIn || today} onChange={(e) => setCheckOut(e.target.value)} className={`hero-date-input ${heroInputClass}`} />
          </div>
        </div>

        <div className="flex min-h-0 min-w-0 flex-col border-b border-[rgba(0,0,0,0.08)] px-1 py-2.5 text-left sm:px-3 sm:py-1.5 lg:border-b-0 lg:[border-right:1px_solid_rgba(0,0,0,0.08)] lg:px-4 lg:py-1.5">
          <span className="mb-1.5 block text-[11px] font-bold uppercase leading-none tracking-widest text-[#64748b] sm:mb-1 sm:text-[10px]">Guests</span>
          <div className={heroFieldShell}>
            <Users className="size-4 shrink-0 text-[#0ea5a0] sm:size-3.5" aria-hidden />
            <select value={guests} onChange={(e) => setGuests(e.target.value)} className={heroSelectClass} style={{ colorScheme: 'light' }} aria-label="Number of guests">
              <option value="1">1 Guest</option>
              <option value="2">2 Guests</option>
              <option value="3">3 Guests</option>
              <option value="4">4+ Guests</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col justify-end px-1 pt-3 sm:border-t sm:border-[rgba(0,0,0,0.08)] sm:px-3 sm:py-2 lg:border-t-0 lg:border-0 lg:px-2 lg:pb-1.5 lg:pt-0">
          <button type="submit" className="relative inline-flex h-12 w-full cursor-pointer items-center justify-center overflow-hidden whitespace-nowrap rounded-xl border-0 bg-[#0ea5a0] px-6 text-[15px] font-bold text-white transition-colors hover:bg-[#0d9489] sm:h-9 sm:rounded-[10px] sm:px-5 sm:text-[13px] lg:h-8 lg:w-auto lg:self-center">
            {ripples.map((r) => <span key={r.id} className="pointer-events-none absolute size-3 rounded-full bg-white/40" style={{ left: r.x, top: r.y, transform: 'translate(-50%, -50%) scale(0)', animation: 'hero-ripple 0.6s ease-out forwards' }} />)}
            <Search className="mr-2 size-4 shrink-0 sm:mr-1.5 sm:size-3.5" strokeWidth={2.5} />
            Search
          </button>
        </div>
      </div>
    </form>
  );
};

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

  // Dynamic content from API
  const { data: banners, loading: heroLoading } = useContent('hero-banners', getHeroBanners);
  const { data: siteSettings, loading: settingsLoading } = useContent('site-settings', getSiteSettings);
  const { data: testimonials, loading: testimonialsLoading } = useContent('testimonials', () => getTestimonials(2));
  const hero = banners?.[0] || null;
  const settings = siteSettings?.[0] || null;
  const heroReady = !heroLoading;

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
        @keyframes hero-pulse {
          0%, 100% {
            opacity: 0.4;
          }
          50% {
            opacity: 0.6;
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
        @media (max-width: 380px) {
          .sh-trust-badge {
            padding: 6px 12px;
            font-size: 11px;
          }
        }
      `}</style>
      <Navbar />
      {/* Hero Section */}
      {heroLoading ? (
        <section className="relative z-10 w-full overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
          <div className="relative z-2 mx-auto flex w-full max-w-[1100px] flex-col items-center px-4 pt-[150px] pb-[130px] text-center sm:px-6">
            <div className="w-full max-w-[540px] space-y-6">
              <div className="h-7 w-48 mx-auto bg-slate-700/50 rounded-full animate-pulse" style={{ animation: 'hero-pulse 2s ease-in-out infinite' }} />
              <div className="h-16 w-full bg-slate-700/50 rounded-2xl animate-pulse" style={{ animation: 'hero-pulse 2s ease-in-out infinite', animationDelay: '0.2s' }} />
              <div className="h-6 w-4/5 mx-auto bg-slate-700/50 rounded-xl animate-pulse" style={{ animation: 'hero-pulse 2s ease-in-out infinite', animationDelay: '0.4s' }} />
              <div className="h-14 w-full max-w-[860px] mx-auto bg-slate-700/50 rounded-2xl animate-pulse" style={{ animation: 'hero-pulse 2s ease-in-out infinite', animationDelay: '0.6s' }} />
            </div>
          </div>
        </section>
      ) : (
        <section ref={heroRef} className="relative z-10 w-full overflow-hidden">
        <div
          ref={overlayRef}
          className="absolute inset-0 z-0 w-full min-h-full overflow-hidden"
          style={{
            willChange: 'transform',
            background: '#0a1923',
          }}
        >
          {heroReady && hero?.backgroundImage && (
            <Motion.div
              ref={imageParallaxRef}
              className="absolute inset-0 z-0 scale-110"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              style={{
                backgroundImage: `url('${hero.backgroundImage}')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
              }}
            />
          )}
          <div
            className="pointer-events-none absolute inset-0 z-1"
            style={{
              background:
                'linear-gradient(180deg, rgba(10, 25, 35, 0.70) 0%, rgba(10, 25, 35, 0.40) 40%, rgba(10, 25, 35, 0.75) 100%)',
            }}
          />
        </div>

        <div className="relative z-2 mx-auto flex w-full max-w-[1100px] flex-col items-center px-5 pt-28 pb-16 text-center sm:px-6 sm:pt-36 sm:pb-24 lg:pt-[150px] lg:pb-[130px]">
          <div ref={headlineRef} className="flex w-full flex-col items-center antialiased">
            <div className="sh-eyebrow">
              <span className="sh-eyebrow-dot" aria-hidden />
              <span>{hero?.eyebrowText || "NEPAL'S #1 HOTEL BOOKING PLATFORM"}</span>
            </div>
            <div className="mb-[14px] flex flex-col items-center gap-0 sm:mb-[18px]">
              <Motion.span
                className="block text-white"
                style={{
                  fontSize: 'clamp(1.85rem, 8vw, 72px)',
                  fontWeight: 800,
                  lineHeight: 1.15,
                  textShadow: '0 2px 20px rgba(0,0,0,0.3)',
                }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, ease: 'easeOut' }}
              >
                {hero?.title || 'Book smarter.'}
              </Motion.span>
            </div>
          </div>

          <Motion.p
            ref={subheadlineRef}
            className="mx-auto mb-7 w-full max-w-[540px] text-center text-[15px] leading-[1.6] sm:mb-9 sm:text-[17px] sm:leading-[1.65]"
            style={{ color: 'rgba(255,255,255,0.78)' }}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.95, duration: 0.5, ease: 'easeOut' }}
          >
            {hero?.subtitle || "Discover Nepal's finest hotels, manage your stay, and enjoy seamless in-hotel services — all in one place."}
          </Motion.p>

          <Motion.div
            ref={searchCardRef}
            className="mb-4 w-full max-w-[860px] rounded-[20px] px-4 py-4 shadow-[0_16px_40px_rgba(0,0,0,0.24)] sm:mb-5 sm:rounded-2xl sm:px-[18px] sm:py-3"
            style={{ background: 'rgba(255,255,255,0.97)' }}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.15, duration: 0.55, ease: 'easeOut' }}
          >
            <HeroSearch ripples={ripples} onSearchRipple={onSearchRipple} />
          </Motion.div>

          <div
            ref={badgesRef}
            className="mb-0 mt-1 flex w-full max-w-[860px] flex-wrap items-center justify-center gap-2 sm:mt-0 sm:gap-2.5"
          >
            {settings?.trustBadges?.length > 0 ? (
              settings.trustBadges.sort((a, b) => (a.order || 0) - (b.order || 0)).map((badge, i) => (
                <div key={i} className="sh-trust-badge inline-flex items-center gap-2">
                  <span aria-hidden>{badge.icon}</span>
                  <span>{badge.text}</span>
                </div>
              ))
            ) : (
              <>
                <div className="sh-trust-badge inline-flex items-center gap-2">
                  <span aria-hidden>🏨</span>
                  <span>{settings?.totalTravelers || '50,000+'} Happy Travelers</span>
                </div>
                <div className="sh-trust-badge inline-flex items-center gap-2">
                  <span aria-hidden>⭐</span>
                  <span>{settings?.avgRating || '4.8'}/5.0 Verified Reviews</span>
                </div>
                <div className="sh-trust-badge inline-flex items-center gap-2">
                  <span className="sh-trust-dot" aria-hidden />
                  <span>{settings?.liveViewers || 23} viewing now · Secure booking</span>
                </div>
              </>
            )}
          </div>
        </div>
      </section>
      )}

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
      <Testimonials testimonials={testimonials} loading={testimonialsLoading} />

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
      <div className="pointer-events-none absolute left-0 top-0 h-full w-24 z-10 bg-linear-to-r from-white to-transparent" />
      <div className="pointer-events-none absolute right-0 top-0 h-full w-24 z-10 bg-linear-to-l from-white to-transparent" />

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
            <div className={`w-12 h-12 rounded-xl bg-linear-to-br ${item.gradient} flex items-center justify-center shrink-0 shadow-md ${item.glow} group-hover:scale-105 transition-all duration-300`}>
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
  const scrollContainerRef = useRef(null);

  const { data: dynamicDestinations, loading, error } = useContent('destinations', getDestinationsApi);

  const items = (dynamicDestinations || []).map((destination) => ({
    id: destination._id,
    name: destination.name,
    image: destination.images?.[0] || '',
    properties: `${destination.hotelsCount || 0}+ stays`,
  }));

  return (
    <Motion.section
      id="destinations"
      className="py-24 md:py-32 lg:py-36 relative z-20 bg-white"
      initial="hidden"
      whileInView="visible"
      viewport={viewportReveal}
      variants={sectionReveal}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 xl:px-[6vw]">
        <div
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

        <Motion.div
          ref={scrollContainerRef}
          className="flex gap-8 overflow-x-auto pb-6 scrollbar-hide"
          variants={staggerReveal}
        >
          {loading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="dest-card flex-shrink-0 w-[300px] md:w-[340px]">
                <div className="h-[400px] rounded-[28px] bg-gray-200 animate-pulse" />
              </div>
            ))
          ) : error ? (
            <div className="w-full min-w-full rounded-3xl border border-red-100 bg-red-50 p-8 text-center text-red-600">
              Destinations could not be loaded right now.
            </div>
          ) : items.length === 0 ? (
            <div className="w-full min-w-full rounded-3xl border border-gray-200 bg-white p-10 text-center text-gray-500 shadow-sm">
              No destinations have been published yet.
            </div>
          ) : items.map((dest) => (
            <Motion.button
              type="button"
              key={dest.id}
              onClick={() => window.location.assign('/destinations')}
              className="dest-card flex-shrink-0 w-[300px] md:w-[340px] group cursor-pointer text-left focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-200 rounded-[28px]"
              variants={cardReveal}
            >
              <div className="relative rounded-[28px] overflow-hidden h-[400px] shadow-xl hover:shadow-2xl transition-all duration-500 group-hover:-translate-y-1.5 group-hover:shadow-teal-900/20 bg-gray-100">
                {dest.image ? (
                  <img
                    src={dest.image}
                    alt={dest.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000 ease-out"
                  />
                ) : null}
                <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent transition-opacity duration-500 group-hover:opacity-90" />
                <div className="absolute bottom-8 left-8 right-8 transition-transform duration-500 group-hover:-translate-y-1">
                  <h3 className="text-white text-xl font-bold mb-2">
                    {dest.name}
                  </h3>
                  <p className="text-white/90 text-sm">{dest.properties}</p>
                </div>
              </div>
            </Motion.button>
          ))}
        </Motion.div>
      </div>
    </Motion.section>
  );
};

// Featured Hotels Component
const FeaturedHotelsSection = () => {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState('All stays');
  const { data: featuredHotels, loading: isLoading, error } = useContent('featured-hotels', getFeaturedHotels);

  const hotels = (featuredHotels || []).map((item) => {
    const hotel = item.hotelId || {};
    return {
      _id: hotel._id || item.hotelId,
      name: hotel.name || 'Featured stay',
      location: hotel.location?.address || hotel.location?.city || 'Nepal',
      price: hotel.priceRange?.min || 0,
      rating: Number(hotel.rating || 0),
      reviews: hotel.reviewCount || 0,
      image: hotel.images?.[0] || '',
      type: hotel.category || 'Hotel',
      badge: item.badge,
    };
  }).filter((hotel) => hotel._id);

  const filters = ['All stays', ...Array.from(new Set(hotels.map((hotel) => hotel.type).filter(Boolean)))];

  const filteredHotels = activeFilter === 'All stays'
    ? hotels
    : hotels.filter((h) => h.type === activeFilter);

  const handleHotelClick = (hotelId) => {
    navigate(`/hotels/${hotelId}`);
  };

  return (
    <Motion.section
      id="featured"
      className="py-24 md:py-32 lg:py-36 bg-white relative z-20"
      initial="hidden"
      whileInView="visible"
      viewport={viewportReveal}
      variants={sectionReveal}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 xl:px-[6vw]">
        <div className="text-center mb-12">
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

        <Motion.div
          className="flex md:grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-10 overflow-x-auto md:overflow-visible snap-x snap-mandatory md:snap-none scroll-pl-4 -mx-4 px-4 md:mx-0 md:px-0 pb-4 md:pb-0 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          variants={staggerReveal}
        >
          {isLoading ? (
            // Loading skeleton
            Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="featured-hotel-card bg-white rounded-[28px] overflow-hidden shadow-xl animate-pulse border border-slate-100 flex-shrink-0 w-[82vw] sm:w-[340px] md:w-auto snap-center"
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
            <div className="w-full md:col-span-full rounded-3xl border border-red-100 bg-red-50 p-10 text-center flex-shrink-0">
              <p className="text-red-600">Featured hotels could not be loaded right now.</p>
            </div>
          ) : filteredHotels.length === 0 ? (
            // No hotels found
            <div className="w-full md:col-span-full rounded-3xl border border-gray-200 bg-white p-10 text-center shadow-sm flex-shrink-0">
              <p className="text-gray-500">No hotels found for this category.</p>
            </div>
          ) : (
            // Hotel cards
            filteredHotels.map((hotel) => (
              <Motion.div
                key={hotel._id}
                onClick={() => handleHotelClick(hotel._id)}
                variants={cardReveal}
                whileHover={{ y: -8, scale: 1.015 }}
                whileTap={{ scale: 0.99 }}
                className="featured-hotel-card group bg-white rounded-[28px] overflow-hidden shadow-[0_18px_45px_rgba(15,23,42,0.10)] hover:shadow-[0_26px_64px_rgba(15,23,42,0.16)] transition-shadow duration-500 cursor-pointer border border-slate-100 focus:outline-none flex-shrink-0 w-[82vw] sm:w-[340px] md:w-auto snap-center"
              >
                <div className="relative h-[260px] overflow-hidden bg-gray-100">
                  {hotel.image ? (
                    <img
                      src={hotel.image}
                      alt={hotel.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000 ease-out"
                    />
                  ) : null}
                  {hotel.badge ? (
                    <span className="absolute left-4 top-4 rounded-full bg-teal-600 px-3 py-1 text-xs font-bold text-white shadow-lg">
                      {hotel.badge}
                    </span>
                  ) : null}
                </div>
                <div className="bg-gradient-to-b from-white to-teal-50/35 p-7">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-xl text-slate-900 mb-1 group-hover:text-teal-700 transition-colors">
                        {hotel.name}
                      </h3>
                      <div className="flex items-center text-slate-600 text-sm font-medium">
                        <MapPin className="w-4 h-4 mr-1 text-teal-500" />
                        {hotel.location}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                    <div className="flex items-center gap-1.5 text-slate-700">
                      <Star className="w-5 h-5 fill-yellow-400 text-yellow-400 drop-shadow-sm" />
                      <span className="font-bold text-slate-900">{hotel.rating.toFixed(1)}</span>
                      <span className="text-sm text-slate-500">
                        ({hotel.reviews} reviews)
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-extrabold text-teal-700">
                        NRs {hotel.price.toLocaleString()}
                      </div>
                      <div className="text-xs font-medium text-slate-500">per night</div>
                    </div>
                  </div>
                </div>
              </Motion.div>
            ))
          )}
        </Motion.div>
      </div>
    </Motion.section>
  );
};

// How It Works Component
const HowItWorks = () => {
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

  return (
    <Motion.section
      id="how-it-works"
      className="py-24 md:py-32 lg:py-36 relative z-20 bg-white"
      initial="hidden"
      whileInView="visible"
      viewport={viewportReveal}
      variants={sectionReveal}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 xl:px-[6vw]">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="text-[clamp(28px,3.2vw,44px)] font-bold text-gray-900 mb-4">
            How StayHaven works
          </h2>
          <p className="text-gray-600 text-base">
            Search, book, and manage your stay in minutes.
          </p>
        </div>

        <Motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-10 max-w-6xl mx-auto"
          variants={staggerReveal}
        >
          {steps.map((step, index) => (
            <Motion.div
              key={index}
              variants={cardReveal}
              whileHover={{ y: -7, scale: 1.012 }}
              className="step-card group bg-white rounded-[28px] p-10 shadow-xl hover:shadow-2xl hover:shadow-slate-900/10 transition-shadow duration-500 border border-slate-100"
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
            </Motion.div>
          ))}
        </Motion.div>
      </div>
    </Motion.section>
  );
};

// For Everyone Component
const ForEveryone = () => {
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

  return (
    <Motion.section
      id="for-managers"
      className="py-24 md:py-32 lg:py-36 relative z-20 bg-white"
      initial="hidden"
      whileInView="visible"
      viewport={viewportReveal}
      variants={sectionReveal}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 xl:px-[6vw]">
        <Motion.div
          className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10"
          variants={staggerReveal}
        >
          {/* Travelers Panel */}
          <Motion.div
            variants={cardReveal}
            whileHover={{ y: -8, scale: 1.01 }}
            className="relative rounded-[28px] overflow-hidden h-[540px] lg:h-[600px] group cursor-pointer shadow-xl hover:shadow-2xl hover:shadow-teal-900/20 transition-shadow duration-500"
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
          </Motion.div>

          {/* Managers Panel */}
          <Motion.div
            variants={cardReveal}
            whileHover={{ y: -8, scale: 1.01 }}
            className="relative rounded-[28px] overflow-hidden h-[500px] lg:h-[560px] group cursor-pointer shadow-xl hover:shadow-2xl hover:shadow-teal-900/20 transition-shadow duration-500"
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
          </Motion.div>
        </Motion.div>
      </div>
    </Motion.section>
  );
};

// Why Choose Component
const WhyChoose = () => {
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

  return (
    <Motion.section
      className="py-24 md:py-32 lg:py-36 relative z-20"
      initial="hidden"
      whileInView="visible"
      viewport={viewportReveal}
      variants={sectionReveal}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 xl:px-[6vw]">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="text-[clamp(28px,3.2vw,44px)] font-bold text-gray-900 mb-4">
            Why choose StayHaven?
          </h2>
          <p className="text-gray-600 text-base">
            We go the extra mile to ensure your stay is perfect
          </p>
        </div>

        <Motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto"
          variants={staggerReveal}
        >
          {benefits.map((benefit, index) => (
            <Motion.div
              key={index}
              variants={cardReveal}
              whileHover={{ y: -7, scale: 1.012 }}
              className="benefit-card group bg-white rounded-[28px] p-10 shadow-xl hover:shadow-2xl hover:shadow-slate-900/10 transition-shadow duration-500 border border-slate-100"
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
            </Motion.div>
          ))}
        </Motion.div>
      </div>
    </Motion.section>
  );
};

// Testimonials Component
const Testimonials = ({ testimonials: dynamicTestimonials = [], loading }) => {
  const stats = [
    { value: '500+', label: 'Properties', icon: Building, color: 'teal' },
    { value: '50K+', label: 'Happy Guests', icon: Users, color: 'indigo' },
    { value: '25+', label: 'Cities', icon: MapPin, color: 'purple' },
    { value: '4.9', label: 'Avg Rating', icon: Star, color: 'amber', isStar: true },
  ];

  // Fallback testimonials if no dynamic data is available
  const fallbackTestimonials = [
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

  // Use dynamic testimonials if available, otherwise fallback
  const testimonials = dynamicTestimonials.length > 0
    ? dynamicTestimonials.map(t => ({
        quote: t.quote,
        author: t.author,
        role: t.role,
        image: `https://ui-avatars.com/api/?name=${encodeURIComponent(t.author)}&size=200&background=0ea5a0&color=fff`,
        imageAlt: `Portrait of ${t.author}`,
        rating: t.rating || 5,
      }))
    : fallbackTestimonials;

  return (
    <Motion.section
      className="py-24 md:py-32 lg:py-40 relative z-20 bg-white"
      initial="hidden"
      whileInView="visible"
      viewport={viewportReveal}
      variants={sectionReveal}
    >
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
        <Motion.div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-16 md:mb-24 max-w-5xl mx-auto" variants={staggerReveal}>
          {stats.map((stat, index) => {
            const IconComponent = stat.icon;
            const themes = {
              teal: {
                bg: 'bg-teal-50/40 hover:bg-teal-50/70 border-teal-100/50',
                iconBg: 'bg-teal-100 text-teal-600 ring-teal-50',
                text: 'text-teal-900',
                numColor: 'text-teal-600',
              },
              indigo: {
                bg: 'bg-indigo-50/40 hover:bg-indigo-50/70 border-indigo-100/50',
                iconBg: 'bg-indigo-100 text-indigo-600 ring-indigo-50',
                text: 'text-indigo-900',
                numColor: 'text-indigo-600',
              },
              purple: {
                bg: 'bg-purple-50/40 hover:bg-purple-50/70 border-purple-100/50',
                iconBg: 'bg-purple-100 text-purple-600 ring-purple-50',
                text: 'text-purple-900',
                numColor: 'text-purple-600',
              },
              amber: {
                bg: 'bg-amber-50/40 hover:bg-amber-50/70 border-amber-100/50',
                iconBg: 'bg-amber-100 text-amber-600 ring-amber-50',
                text: 'text-amber-900',
                numColor: 'text-amber-600',
              },
            };
            const theme = themes[stat.color] || themes.teal;

            return (
              <Motion.div
                key={index}
                variants={cardReveal}
                whileHover={{ y: -6, scale: 1.015 }}
                className={`group relative rounded-3xl p-6 md:p-8 transition-colors duration-300 hover:shadow-2xl border ${theme.bg}`}
              >
                <div className="relative z-10 flex flex-col items-center">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-transform duration-500 group-hover:scale-110 ring-4 ${theme.iconBg}`}>
                    <IconComponent className="w-5 h-5" />
                  </div>
                  
                  <div className={`flex items-center justify-center gap-1 text-3xl md:text-4xl font-extrabold tracking-tight ${theme.numColor} mb-1.5`}>
                    {stat.value}
                    {stat.isStar && (
                      <Star className="w-6 h-6 fill-amber-500 text-amber-500 animate-pulse" />
                    )}
                  </div>

                  <div className="text-sm md:text-base font-semibold text-gray-600 group-hover:text-gray-900 transition-colors duration-200">
                    {stat.label}
                  </div>
                </div>
              </Motion.div>
            );
          })}
        </Motion.div>

        {/* Testimonials Grid */}
        <Motion.div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 max-w-6xl mx-auto" variants={staggerReveal}>
          {testimonials.map((testimonial, index) => (
            <Motion.div
              key={index}
              variants={cardReveal}
              whileHover={{ y: -7, scale: 1.01 }}
              className="group relative bg-white rounded-[32px] p-8 md:p-10 transition-shadow duration-500 hover:shadow-[0_20px_50px_rgba(13,148,136,0.08)] border border-gray-100 hover:border-teal-100/50 flex flex-col justify-between overflow-hidden"
            >
              {/* Decorative background glow inside card on hover */}
              <div className="absolute top-0 right-0 w-40 h-40 bg-teal-50/30 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

              {/* Floating Quote icon */}
              <div className="absolute top-8 right-8 text-gray-100/80 group-hover:text-teal-100/60 transition-colors duration-500 pointer-events-none">
                <Quote className="h-16 w-16 rotate-180" />
              </div>

              <div className="relative z-10">
                {/* Rating Stars */}
                <div className="flex gap-1 mb-6">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star
                      key={i}
                      className="w-5 h-5 fill-amber-400 text-amber-400 filter drop-shadow-[0_2px_4px_rgba(245,158,11,0.2)]"
                    />
                  ))}
                </div>

                {/* Quote Text */}
                <blockquote className="text-gray-800 text-lg md:text-xl font-medium leading-relaxed italic mb-8 relative">
                  "{testimonial.quote}"
                </blockquote>
              </div>

              {/* Author & Footer */}
              <div className="relative z-10 flex items-center gap-4 pt-6 border-t border-gray-100 group-hover:border-teal-50 transition-colors duration-300">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-tr from-teal-500 to-amber-400 rounded-full blur-[2px] opacity-0 group-hover:opacity-70 transition-opacity duration-300" />
                  <img
                    src={testimonial.image}
                    alt={testimonial.imageAlt}
                    className="relative h-14 w-14 rounded-full object-cover ring-2 ring-gray-100 group-hover:ring-teal-200 transition-all duration-300"
                    width={56}
                    height={56}
                    loading="lazy"
                    onError={(e) => {
                      e.target.src = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=faces&q=80';
                    }}
                  />
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-teal-500 rounded-full flex items-center justify-center ring-2 ring-white">
                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.5} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <div>
                  <div className="font-extrabold text-gray-900 text-lg tracking-tight">
                    {testimonial.author}
                  </div>
                  <div className="text-sm font-semibold text-teal-600/80 group-hover:text-teal-600 transition-colors duration-300">
                    {testimonial.role}
                  </div>
                </div>
              </div>
            </Motion.div>
          ))}
        </Motion.div>
      </div>
    </Motion.section>
  );
};

// Inspiration Component
const Inspiration = () => {
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

  return (
    <Motion.section
      className="py-24 md:py-32 lg:py-36 relative z-20"
      initial="hidden"
      whileInView="visible"
      viewport={viewportReveal}
      variants={sectionReveal}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 xl:px-[6vw]">
        <div className="mb-10">
          <h2 className="text-[clamp(28px,3.2vw,44px)] font-bold text-gray-900 mb-3">
            Get inspired
          </h2>
          <p className="text-gray-600 text-base">
            Discover unique stays for every occasion
          </p>
        </div>

        <Motion.div className="grid grid-cols-1 lg:grid-cols-2 gap-8" variants={staggerReveal}>
          {inspirations.map((insp, index) => (
            <Motion.div
              key={index}
              variants={cardReveal}
              whileHover={{ y: -7, scale: 1.01 }}
              className={`insp-image relative rounded-[28px] overflow-hidden cursor-pointer group shadow-xl hover:shadow-2xl hover:shadow-teal-900/20 transition-shadow duration-500 ${insp.size === 'large' ? 'lg:row-span-2 h-[540px]' : 'h-[260px]'
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
            </Motion.div>
          ))}
        </Motion.div>
      </div>
    </Motion.section>
  );
};

// Final CTA Component
const FinalCTA = ({ navigate }) => {
  return (
    <Motion.section
      className="relative z-20 py-8 md:py-12 overflow-hidden"
      initial="hidden"
      whileInView="visible"
      viewport={viewportReveal}
      variants={sectionReveal}
    >
      {/* Subtle background decoration (neutral, no teal wash) */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: 'radial-gradient(circle, #94a3b8 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 xl:px-[6vw]">
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
    </Motion.section>
  );
};

export default Home;

