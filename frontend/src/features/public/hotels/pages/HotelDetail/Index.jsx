import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Check, ExternalLink, Home, MapPin, Star, X, Clock, ShieldCheck, PawPrint } from 'lucide-react';
import { toast } from 'react-toastify';
import HotelImageGallery from './HotelImageGallery';
import HotelHeader from './HotelHeader';
import TabNavigation from './TabNavigation';
import BookingSidebar from './BookingSidebar';
import AmenityCard from './AmenityCard';
import { getHotelById } from '../../../../../core/api/services/hotel.service';
import { getWishlist, toggleWishlist } from '../../../../../core/api/services/user.service';
import { fetchHotelReviews, fetchRoomAvailability } from '../../lib/publicHotelApi';
import { formatRs } from '../../lib/money';
import { usePageMeta } from '../../lib/pageMeta';

const AMENITY_LABELS = {
  wifi: 'Free Wi-Fi',
  pool: 'Swimming Pool',
  gym: 'Gym',
  restaurant: 'Restaurant',
  parking: 'Free Parking',
  spa: 'Spa',
  'room-service': 'Room Service',
  'pet-friendly': 'Pet Friendly',
};

const REVIEWS_PAGE = 5;

const formatReviewDate = (value) => {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
};

const HotelDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [mobileBookingOpen, setMobileBookingOpen] = useState(false);
  const [expandedReviews, setExpandedReviews] = useState({});
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [hotel, setHotel] = useState(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [dates, setDates] = useState(null);
  const [availability, setAvailability] = useState(null); // { [roomId]: boolean } for the chosen dates
  const [reviews, setReviews] = useState({ items: [], total: 0, distribution: null, page: 0, loading: true, error: false });

  const sectionOrder = useMemo(() => ['overview', 'rooms', 'amenities', 'reviews', 'location'], []);

  usePageMeta({
    title: hotel ? `${hotel.name}, ${hotel.location?.city || 'Nepal'}` : notFound ? 'Hotel not found' : 'Hotel',
    description: hotel?.description,
    image: hotel?.images?.[0],
  });

  useEffect(() => {
    const sections = sectionOrder.map((s) => document.getElementById(`section-${s}`)).filter(Boolean);
    if (!sections.length) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) setActiveTab(visible[0].target.id.replace('section-', ''));
      },
      { rootMargin: '-35% 0px -50% 0px', threshold: [0.2, 0.4, 0.6] },
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [sectionOrder, hotel]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      setNotFound(false);
      try {
        const data = await getHotelById(id);
        if (cancelled) return;
        setHotel(data?.hotel || null);
        if (!data?.hotel) setNotFound(true);
      } catch (e) {
        if (cancelled) return;
        const message = e?.message || 'Failed to load hotel details';
        setHotel(null);
        if (/not found/i.test(message)) setNotFound(true);
        else setError(message);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    if (id) load();
    return () => { cancelled = true; };
  }, [id, reloadKey]);

  // Real, approved reviews (and the real star distribution) instead of placeholder bars.
  const loadReviews = useCallback(async (page, replace) => {
    setReviews((prev) => ({ ...prev, loading: true, error: false }));
    try {
      const data = await fetchHotelReviews(id, { page, limit: REVIEWS_PAGE });
      setReviews((prev) => ({
        items: replace ? data.reviews : [...prev.items, ...data.reviews],
        total: data.total, distribution: data.distribution, page, loading: false, error: false,
      }));
    } catch {
      setReviews((prev) => ({ ...prev, loading: false, error: true }));
    }
  }, [id]);
  useEffect(() => { if (id && hotel) loadReviews(1, true); }, [id, hotel, loadReviews]);

  // Availability for the chosen dates, per room.
  useEffect(() => {
    if (!dates || !id) { setAvailability(null); return undefined; }
    const controller = new AbortController();
    fetchRoomAvailability(id, dates, { signal: controller.signal })
      .then((rows) => { if (!controller.signal.aborted) setAvailability(Object.fromEntries(rows.map((r) => [r.roomId, r.available]))); })
      .catch(() => { if (!controller.signal.aborted) setAvailability(null); });
    return () => controller.abort();
  }, [id, dates]);

  useEffect(() => {
    const loadFavorite = async () => {
      if (!localStorage.getItem('accessToken')) return;
      try {
        const { wishlist } = await getWishlist();
        setIsFavorite((wishlist || []).includes(String(id)));
      } catch {
        setIsFavorite(false);
      }
    };
    loadFavorite();
  }, [id]);

  const handleToggleFavorite = async () => {
    if (!localStorage.getItem('accessToken')) {
      toast.info('Please sign in to save hotels');
      navigate('/login', { state: { from: window.location.pathname } });
      return;
    }
    try {
      const { wishlist, message } = await toggleWishlist(id);
      setIsFavorite((wishlist || []).includes(String(id)));
      window.dispatchEvent(new Event('wishlistUpdated'));
      toast.success(message);
    } catch (e) {
      toast.error(e?.message || 'Could not update saved hotels');
    }
  };

  const handleShare = useCallback(async () => {
    try {
      if (navigator.share) await navigator.share({ title: document.title, url: window.location.href });
      else {
        await navigator.clipboard.writeText(window.location.href);
        toast.success('Hotel link copied');
      }
    } catch (e) {
      if (e?.name !== 'AbortError') toast.info('Copy the address from your browser to share this hotel.');
    }
  }, []);

  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }, [id]);

  // Phone booking sheet: lock the page behind it and let Esc close it.
  useEffect(() => {
    if (!mobileBookingOpen) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') setMobileBookingOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = previous; document.removeEventListener('keydown', onKey); };
  }, [mobileBookingOpen]);

  const rooms = useMemo(() => hotel?.rooms || [], [hotel]);
  const roomKey = (room) => String(room._id || room.id);
  const isSoldOut = (room) => availability?.[roomKey(room)] === false;

  // The room actually being booked. Every price the guest sees comes from THIS room.
  const selectedRoom = useMemo(() => {
    if (!rooms.length) return null;
    const picked = rooms.find((r) => roomKey(r) === selectedRoomId);
    if (picked) return picked;
    return rooms.find((r) => availability?.[roomKey(r)] !== false) || rooms[0];
  }, [rooms, selectedRoomId, availability]);

  const pricePerNight = selectedRoom?.price ?? hotel?.priceRange?.min ?? 0;
  const reviewAverage = Number(hotel?.rating ?? 0).toFixed(1);
  const mapsHref = hotel
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      hotel.location?.coordinates?.latitude != null && hotel.location?.coordinates?.longitude != null
        ? `${hotel.location.coordinates.latitude},${hotel.location.coordinates.longitude}`
        : [hotel.name, hotel.location?.address, hotel.location?.city].filter(Boolean).join(', '),
    )}`
    : '#';
  const distribution = reviews.distribution;
  const totalForBars = distribution ? Object.values(distribution).reduce((a, b) => a + b, 0) : 0;

  const sidebar = hotel && selectedRoom && (
    <BookingSidebar
      key={hotel._id}
      pricePerNight={Number(pricePerNight) || 0}
      hotelName={hotel.name}
      hotelAddress={[hotel.location?.address, hotel.location?.city].filter(Boolean).join(', ')}
      hotelImage={hotel.images?.[0]}
      hotelId={hotel._id}
      roomId={roomKey(selectedRoom)}
      roomName={selectedRoom.roomName || selectedRoom.title}
      maxGuests={selectedRoom.maxGuests || 2}
      soldOut={isSoldOut(selectedRoom)}
      onDatesChange={setDates}
    />
  );

  return (
    <div className="min-h-screen pt-24 pb-28 lg:pb-12" style={{ background: '#F8FAFB' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-5">
        <nav className="mb-4" aria-label="Breadcrumb">
          <ol className="flex items-center gap-2 text-sm">
            <li className="inline-flex items-center gap-1 text-[#546E7A]">
              <Home className="w-4 h-4" aria-hidden="true" />
              <Link to="/" className="hover:text-[#00BFA6] transition-colors">Home</Link>
            </li>
            <li className="text-[rgba(0,191,166,0.45)]" aria-hidden="true">&rsaquo;</li>
            <li><Link to="/hotels" className="text-[#546E7A] hover:text-[#00BFA6] transition-colors">Hotels</Link></li>
            <li className="text-[rgba(0,191,166,0.45)]" aria-hidden="true">&rsaquo;</li>
            <li className="text-[#00A896] font-semibold truncate max-w-[10.5rem] sm:max-w-full" aria-current="page">{hotel?.name || 'Hotel'}</li>
          </ol>
        </nav>
      </div>

      <main className="w-full">
        {isLoading && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4" role="status" aria-label="Loading hotel details">
            <div className="h-[260px] sm:h-[400px] rounded-2xl bg-gray-200 animate-pulse" />
            <div className="h-24 rounded-2xl bg-gray-200 animate-pulse" />
            <div className="h-48 rounded-2xl bg-gray-200 animate-pulse" />
          </div>
        )}

        {!isLoading && notFound && (
          <div className="max-w-xl mx-auto px-4 py-16 text-center">
            <h1 className="text-2xl font-bold text-[#263238] mb-2">We couldn&apos;t find that hotel</h1>
            <p className="text-[#546E7A] mb-6">It may have been removed or is not available for booking right now.</p>
            <Link to="/hotels" className="inline-flex items-center justify-center min-h-[48px] px-6 rounded-xl bg-gradient-to-r from-[#00BFA6] to-[#00E5CC] text-white font-bold">Browse hotels</Link>
          </div>
        )}

        {!isLoading && error && (
          <div role="alert" className="max-w-xl mx-auto px-4 py-16 text-center">
            <h1 className="text-xl font-bold text-[#263238] mb-2">Something went wrong</h1>
            <p className="text-red-700 mb-6">{error}</p>
            <button type="button" onClick={() => setReloadKey((k) => k + 1)} className="inline-flex items-center justify-center min-h-[48px] px-6 rounded-xl border-2 border-[#00BFA6] text-[#00A896] font-bold">Try again</button>
          </div>
        )}

        {!isLoading && !error && hotel && (
          <>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <HotelImageGallery images={hotel.images} hotelName={hotel.name} isFavorite={isFavorite} onToggleFavorite={handleToggleFavorite} onShare={handleShare} />
            </div>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-7">
              <HotelHeader
                name={hotel.name}
                location={hotel?.location?.address || hotel?.location?.city || '-'}
                rating={Number(hotel.rating) || 0}
                reviewCount={hotel.reviewCount || 0}
                highlights={(hotel.amenities || []).slice(0, 3).map((k) => AMENITY_LABELS[k] || k)}
                badges={[hotel.featured ? 'Featured' : null, hotel.starRating ? `${hotel.starRating}-Star` : null].filter(Boolean)}
                pricePerNight={pricePerNight}
                onBookNow={() => setMobileBookingOpen(true)}
                isFavorite={isFavorite}
                onToggleFavorite={handleToggleFavorite}
                onShare={handleShare}
              />
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="flex flex-col lg:flex-row gap-8">
                <div className="w-full lg:w-[66%] space-y-10 min-w-0">
                  <section id="section-overview" className="rounded-3xl bg-gradient-to-br from-white to-[#F0FDFB] p-5 sm:p-8 md:p-10 border-2 border-[#00BFA6]/20 shadow-[0_8px_32px_rgba(0,191,166,0.12)] relative overflow-hidden scroll-mt-32">
                    <div className="flex items-center gap-3 mb-5 relative z-10">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00BFA6] to-[#00E5CC] flex items-center justify-center shadow-lg"><Home className="w-5 h-5 text-white" aria-hidden="true" /></div>
                      <h2 className="text-2xl md:text-3xl font-extrabold text-[#263238]">Overview</h2>
                    </div>
                    <p className="text-base md:text-lg leading-relaxed text-[#546E7A] relative z-10 whitespace-pre-line break-words">{hotel.description}</p>

                    <dl className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 relative z-10">
                      {[
                        { icon: Clock, label: 'Check-in', value: hotel.policies?.checkIn },
                        { icon: Clock, label: 'Check-out', value: hotel.policies?.checkOut },
                        { icon: ShieldCheck, label: 'Cancellation', value: 'Free up to 48h before check-in; 50% refund 24-48h before; none inside 24h' },
                        { icon: PawPrint, label: 'Pets', value: hotel.policies?.petPolicy },
                      ].filter((row) => row.value).map((row) => (
                        <div key={row.label} className="flex items-start gap-3 p-3 bg-white/80 rounded-2xl border border-[#00BFA6]/20">
                          <span className="w-8 h-8 rounded-lg bg-[#00BFA6]/10 flex items-center justify-center shrink-0"><row.icon className="w-4 h-4 text-[#00BFA6]" aria-hidden="true" /></span>
                          <div className="min-w-0">
                            <dt className="text-xs font-bold uppercase tracking-wider text-[#546E7A]">{row.label}</dt>
                            <dd className="text-sm font-semibold text-[#263238] break-words">{row.value}</dd>
                          </div>
                        </div>
                      ))}
                    </dl>
                  </section>

                  <section id="section-rooms" className="space-y-5 scroll-mt-32">
                    <h2 className="text-2xl font-bold text-[#263238]">Choose your room</h2>
                    {dates && <p className="text-sm text-[#546E7A]">Availability shown for {dates.checkIn} to {dates.checkOut}.</p>}
                    {rooms.length === 0 && <p className="text-[#546E7A]">This hotel has no rooms open for online booking right now.</p>}
                    {rooms.map((room) => {
                      const key = roomKey(room);
                      const isSelected = roomKey(selectedRoom || {}) === key && !!selectedRoom;
                      const soldOut = isSoldOut(room);
                      return (
                        <article
                          key={key}
                          className={`rounded-2xl border bg-white overflow-hidden transition-shadow ${soldOut ? 'opacity-75' : ''}`}
                          style={{ borderColor: isSelected ? '#00BFA6' : 'rgba(0,191,166,0.15)', boxShadow: isSelected ? '0 8px 32px rgba(0,191,166,0.15)' : '0 4px 16px rgba(0,0,0,0.06)' }}
                        >
                          <div className="grid grid-cols-1 md:grid-cols-[45%_55%]">
                            <div className="relative overflow-hidden aspect-[16/10] md:aspect-auto md:min-h-[240px] bg-gray-100">
                              <img
                                src={room.images?.[0] || hotel.images?.[0]}
                                alt={`${room.roomName || room.title || 'Room'} at ${hotel.name}`}
                                loading="lazy" decoding="async"
                                className="w-full h-full object-cover"
                              />
                              <span className="absolute left-3 top-3 px-3 py-1 text-xs font-bold text-white rounded-full bg-gradient-to-r from-[#00BFA6] to-[#00E5CC] capitalize">{String(room.type || 'Room')}</span>
                              {soldOut && <span className="absolute right-3 top-3 px-3 py-1 text-xs font-bold text-white rounded-full bg-red-600">Not available for your dates</span>}
                            </div>
                            <div className="p-4 sm:p-6 flex flex-col">
                              <h3 className="text-xl font-bold text-[#263238]">{room.roomName || room.title || 'Room'}</h3>
                              <p className="text-sm text-[#546E7A] mt-1">{room.bedType ? `${room.bedType} bed` : 'Bed'} &bull; sleeps up to {room.maxGuests || 2}</p>
                              {room.description && <p className="text-sm text-[#546E7A] mt-2 line-clamp-3 break-words">{room.description}</p>}
                              {(room.amenities || []).length > 0 && (
                                <ul className="mt-3 flex flex-wrap gap-2">
                                  {room.amenities.slice(0, 4).map((feature) => <li key={feature} className="px-2.5 py-1 rounded-full bg-[#00BFA6]/10 text-xs font-semibold text-[#00A896]">{feature}</li>)}
                                </ul>
                              )}
                              <div className="mt-auto pt-4 flex items-center justify-between gap-3">
                                <div>
                                  <p className="text-xl font-bold text-[#263238] tabular-nums">{formatRs(room.price)}</p>
                                  <p className="text-xs text-[#546E7A]">per night, before taxes &amp; fees</p>
                                </div>
                                <button
                                  type="button"
                                  disabled={soldOut}
                                  aria-pressed={isSelected}
                                  onClick={() => { setSelectedRoomId(key); if (window.matchMedia('(max-width: 1023px)').matches) setMobileBookingOpen(true); }}
                                  className={`min-h-[44px] px-5 rounded-xl text-sm font-bold transition disabled:opacity-50 disabled:cursor-not-allowed ${isSelected ? 'bg-[#00BFA6] text-white' : 'border-2 border-[#00BFA6] text-[#00A896] hover:bg-[#00BFA6]/10'}`}
                                >
                                  {soldOut ? 'Unavailable' : isSelected ? (<span className="inline-flex items-center gap-1.5"><Check className="w-4 h-4" aria-hidden="true" /> Selected &middot; Reserve</span>) : 'Select & reserve'}
                                </button>
                              </div>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </section>

                  <section id="section-amenities" className="rounded-2xl sm:rounded-3xl bg-gradient-to-br from-white to-[#F0FDFB] p-5 sm:p-8 md:p-10 border-2 border-[#00BFA6]/20 shadow-[0_8px_32px_rgba(0,191,166,0.12)] scroll-mt-32">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00BFA6] to-[#00E5CC] flex items-center justify-center shadow-lg shrink-0"><Star className="w-5 h-5 text-white fill-white" aria-hidden="true" /></div>
                      <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-[#263238]">Amenities</h2>
                    </div>
                    {(hotel.amenities || []).length ? (
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                        {hotel.amenities.map((key) => <AmenityCard key={key} icon={key} label={AMENITY_LABELS[key] || key} />)}
                      </div>
                    ) : <p className="text-[#546E7A]">This hotel has not listed its amenities yet.</p>}
                  </section>

                  <section id="section-reviews" className="space-y-6 scroll-mt-32">
                    <div className="rounded-3xl bg-gradient-to-br from-white to-[#FFF9E6] p-5 sm:p-8 border-2 border-[#FFB84D]/30 shadow-[0_8px_32px_rgba(255,184,77,0.15)]">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FFB84D] to-[#FFA726] flex items-center justify-center shadow-lg shrink-0"><Star className="w-5 h-5 text-white fill-white" aria-hidden="true" /></div>
                        <h2 className="text-2xl md:text-3xl font-extrabold text-[#263238]">Guest reviews</h2>
                      </div>
                      {reviews.total > 0 && distribution ? (
                        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6">
                          <div className="text-center md:text-left">
                            <div className="inline-flex items-baseline gap-2 mb-2">
                              <p className="text-5xl md:text-6xl font-extrabold text-[#263238] tabular-nums">{reviewAverage}</p>
                              <span className="text-3xl text-[#FFB84D]" aria-hidden="true">&#9733;</span>
                            </div>
                            <p className="font-bold text-[#263238] text-lg">{reviews.total.toLocaleString()} review{reviews.total === 1 ? '' : 's'}</p>
                          </div>
                          <div className="space-y-3">
                            {[5, 4, 3, 2, 1].map((stars) => {
                              const count = distribution[stars] || 0;
                              const percent = totalForBars ? Math.round((count / totalForBars) * 100) : 0;
                              return (
                                <div key={stars} className="grid grid-cols-[44px_1fr_44px] items-center gap-3">
                                  <span className="font-bold text-[#263238] text-sm">{stars} &#9733;</span>
                                  <div className="h-3 rounded-full bg-[#F5F5F5] overflow-hidden" role="img" aria-label={`${percent}% of reviews are ${stars} stars`}>
                                    <div className="h-full rounded-full bg-gradient-to-r from-[#FFB84D] to-[#FFA726]" style={{ width: `${percent}%` }} />
                                  </div>
                                  <span className="text-[#546E7A] font-semibold text-sm text-right tabular-nums">{percent}%</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : reviews.loading ? (
                        <div className="h-24 rounded-xl bg-gray-100 animate-pulse" role="status" aria-label="Loading reviews" />
                      ) : reviews.error ? (
                        <p className="text-[#546E7A]">Reviews could not be loaded. <button type="button" className="underline font-semibold min-h-[44px]" onClick={() => loadReviews(1, true)}>Retry</button></p>
                      ) : (
                        <p className="text-[#546E7A]">No guest reviews yet. Reviews appear here after guests complete a stay.</p>
                      )}
                    </div>

                    <div className="space-y-4">
                      {reviews.items.map((review) => {
                        const expanded = !!expandedReviews[review.id];
                        const long = review.text.length > 180;
                        const visibleText = expanded || !long ? review.text : `${review.text.slice(0, 180)}…`;
                        return (
                          <article key={review.id} className="rounded-2xl bg-white p-4 sm:p-6 border-2 border-[#00BFA6]/10 shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
                            <div className="flex items-start justify-between gap-3 mb-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="h-11 w-11 shrink-0 rounded-full bg-gradient-to-br from-[#00BFA6] to-[#00E5CC] text-white flex items-center justify-center font-bold" aria-hidden="true">
                                  {review.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-bold text-[#263238] truncate">{review.name}</p>
                                  <p className="text-xs text-[#546E7A]">{formatReviewDate(review.date)}{review.verified ? ' \u2022 Verified stay' : ''}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 bg-[#FFF9E6] px-2.5 py-1 rounded-lg shrink-0">
                                <span className="font-bold text-[#263238] text-sm">{review.rating}</span>
                                <Star className="w-4 h-4 text-[#FFB84D] fill-[#FFB84D]" aria-label="stars" />
                              </div>
                            </div>
                            {review.title && <h3 className="font-semibold text-[#263238] mb-1 break-words">{review.title}</h3>}
                            <p className="text-sm md:text-base leading-relaxed text-[#546E7A] whitespace-pre-line break-words">{visibleText}</p>
                            {long && (
                              <button type="button" aria-expanded={expanded} className="text-sm font-bold text-[#00A896] mt-1 min-h-[44px]" onClick={() => setExpandedReviews((prev) => ({ ...prev, [review.id]: !expanded }))}>
                                {expanded ? 'Read less' : 'Read more'}
                              </button>
                            )}
                            {review.reply && (
                              <div className="mt-3 rounded-xl bg-[#F0FDFB] border border-[#00BFA6]/20 p-3">
                                <p className="text-xs font-bold uppercase tracking-wider text-[#00A896] mb-1">Reply from the hotel</p>
                                <p className="text-sm text-[#546E7A] break-words">{review.reply}</p>
                              </div>
                            )}
                          </article>
                        );
                      })}
                      {reviews.items.length < reviews.total && (
                        <button type="button" disabled={reviews.loading} onClick={() => loadReviews(reviews.page + 1, false)} className="w-full min-h-[48px] rounded-xl border border-[#00BFA6] text-[#00A896] font-semibold hover:bg-[#00BFA6]/10 transition disabled:opacity-50">
                          {reviews.loading ? 'Loading…' : `Load more reviews (${reviews.total - reviews.items.length} remaining)`}
                        </button>
                      )}
                    </div>
                  </section>

                  <section id="section-location" className="rounded-3xl bg-gradient-to-br from-white to-[#F0FDFB] p-5 sm:p-8 md:p-10 border-2 border-[#00BFA6]/20 shadow-[0_8px_32px_rgba(0,191,166,0.12)] scroll-mt-32">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00BFA6] to-[#00E5CC] flex items-center justify-center shadow-lg shrink-0"><MapPin className="w-5 h-5 text-white" aria-hidden="true" /></div>
                      <h2 className="text-2xl md:text-3xl font-extrabold text-[#263238]">Location</h2>
                    </div>
                    <div className="p-4 sm:p-5 bg-white/80 rounded-2xl border-2 border-[#00BFA6]/20">
                      <p className="font-bold text-[#263238] mb-1">Address</p>
                      <p className="text-sm md:text-base text-[#546E7A] leading-relaxed break-words">{[hotel.location?.address, hotel.location?.city, hotel.location?.country].filter(Boolean).join(', ')}</p>
                      <a href={mapsHref} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center justify-center gap-2 min-h-[48px] px-5 rounded-xl border-2 border-[#00BFA6] text-[#00A896] font-bold hover:bg-[#00BFA6]/10">
                        <ExternalLink className="w-4 h-4" aria-hidden="true" /> Open in Google Maps
                      </a>
                    </div>
                  </section>
                </div>

                {/* One BookingSidebar instance: the sticky card on desktop, a bottom sheet on phones/tablets. */}
                <div className="w-full lg:w-[34%] lg:flex lg:justify-end">
                  <div
                    className={mobileBookingOpen ? 'fixed inset-0 z-[130] flex items-end bg-black/45 lg:static lg:z-auto lg:block lg:bg-transparent lg:w-full' : 'hidden lg:block lg:w-full'}
                    onMouseDown={(e) => { if (e.target === e.currentTarget) setMobileBookingOpen(false); }}
                  >
                    <div
                      role={mobileBookingOpen ? 'dialog' : undefined}
                      aria-modal={mobileBookingOpen ? 'true' : undefined}
                      aria-label={mobileBookingOpen ? 'Book this room' : undefined}
                      className="w-full max-h-[calc(100vh-16px)] max-h-[calc(100dvh-16px)] overflow-y-auto overscroll-contain rounded-t-3xl bg-[#F8FAFB] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] lg:max-h-none lg:overflow-visible lg:rounded-none lg:bg-transparent lg:p-0 lg:h-full"
                    >
                      <button
                        type="button"
                        onClick={() => setMobileBookingOpen(false)}
                        className="lg:hidden ml-auto mb-2 h-11 w-11 rounded-full bg-white border border-gray-200 flex items-center justify-center"
                        aria-label="Close booking panel"
                      >
                        <X className="w-5 h-5 text-gray-700" />
                      </button>
                      {sidebar}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sticky reserve bar for phones/tablets */}
            {!mobileBookingOpen && selectedRoom && (
              <div className="lg:hidden fixed bottom-0 inset-x-0 z-[90] bg-white/95 backdrop-blur border-t border-[rgba(0,191,166,0.25)] shadow-[0_-8px_24px_rgba(0,0,0,0.08)] px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs text-[#546E7A] truncate">{selectedRoom.roomName || selectedRoom.title || 'Room'}</p>
                    <p className="text-lg font-extrabold text-[#263238] tabular-nums">{formatRs(pricePerNight)}<span className="text-sm font-medium text-[#546E7A]"> / night</span></p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMobileBookingOpen(true)}
                    className="min-h-[48px] px-6 rounded-xl text-white font-bold shadow-lg shadow-[#00BFA6]/30 whitespace-nowrap"
                    style={{ background: 'linear-gradient(135deg, #00BFA6, #00E5CC)' }}
                  >
                    {isSoldOut(selectedRoom) ? 'Change dates' : 'Reserve'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default HotelDetail;
