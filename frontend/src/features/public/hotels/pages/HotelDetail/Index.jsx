import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Check, Home, MapPin, Star, ThumbsUp, X } from 'lucide-react';

import HotelImageGallery from './HotelImageGallery';
import HotelHeader from './HotelHeader';
import TabNavigation from './TabNavigation';
import BookingSidebar from './BookingSidebar';
import AmenityCard from './AmenityCard';
import { getHotelById } from '../../../../../core/api/services/hotel.service';

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

const HotelDetail = () => {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('overview');
  const [mobileBookingOpen, setMobileBookingOpen] = useState(false);
  const [expandedReviews, setExpandedReviews] = useState({});
  const [selectedRoomByType, setSelectedRoomByType] = useState({});
  const [hotel, setHotel] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [visibleReviewsCount, setVisibleReviewsCount] = useState(3);

  const sectionOrder = useMemo(() => ['overview', 'rooms', 'amenities', 'reviews', 'location'], []);

  useEffect(() => {
    const sections = sectionOrder
      .map((id) => document.getElementById(`section-${id}`))
      .filter(Boolean);
    if (!sections.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) {
          setActiveTab(visible[0].target.id.replace('section-', ''));
        }
      },
      {
        rootMargin: '-35% 0px -50% 0px',
        threshold: [0.2, 0.4, 0.6],
      }
    );

    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [sectionOrder]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getHotelById(id);
        if (cancelled) return;
        setHotel(data?.hotel || null);
      } catch (e) {
        if (cancelled) return;
        setError(e?.message || 'Failed to load hotel details');
        setHotel(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    if (id) load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Scroll to top when component mounts or hotel ID changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [id]);

  const booking = useMemo(() => {
    const pricePerNight = hotel?.priceRange?.min ?? 0;
    const nights = 3;
    const taxesAndFees = Math.round(pricePerNight * nights * 0.12);
    return {
      pricePerNight,
      nights,
      taxesAndFees,
      guests: '2 Adults, 1 Child',
      freeCancellationDate: 'Apr 4, 2026',
    };
  }, [hotel?.priceRange?.min]);

  const reviewAverage = (hotel?.rating ?? 0).toFixed(1);

  const handleLoadMoreReviews = () => {
    setVisibleReviewsCount((prev) => prev + 3);
  };

  const visibleReviews = (hotel?.reviews || []).slice(0, visibleReviewsCount);
  const hasMoreReviews = (hotel?.reviews || []).length > visibleReviewsCount;
  const remainingReviewsCount = (hotel?.reviews || []).length - visibleReviewsCount;

  return (
    <div className="min-h-screen pt-24 pb-24 md:pb-12" style={{ background: '#F8FAFB' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-5 animate-[fadeIn_0.5s_ease]">
          <nav className="mb-4" aria-label="Breadcrumb">
            <ol className="flex items-center gap-2 text-sm">
              <li className="inline-flex items-center gap-1 text-[#546E7A]">
                <Home className="w-4 h-4" />
                <a href="/" className="hover:text-[#00BFA6] transition-colors">Home</a>
              </li>
              <li className="text-[rgba(0,191,166,0.45)]">›</li>
              <li>
                <a href="/destinations" className="text-[#546E7A] hover:text-[#00BFA6] transition-colors">Destinations</a>
              </li>
              <li className="text-[rgba(0,191,166,0.45)]">›</li>
              <li className="text-[#00BFA6] font-semibold truncate max-w-42.5 sm:max-w-full" aria-current="page">
                {hotel?.name || 'Hotel'}
              </li>
            </ol>
          </nav>
      </div>

      <main className="w-full">
        {isLoading && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 text-[#546E7A]">
            Loading hotel details…
          </div>
        )}
        {!isLoading && error && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 text-red-700">
            {error}
          </div>
        )}
        {!isLoading && !error && hotel && (
          <>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 animate-[fadeIn_0.6s_ease]">
              <HotelImageGallery images={hotel.images} />
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-7 animate-[fadeInUp_0.7s_ease]">
              <HotelHeader
                name={hotel.name}
                location={[hotel?.location?.address, hotel?.location?.city].filter(Boolean).join(', ')}
                rating={hotel.rating}
                reviewCount={hotel.reviewCount}
                highlights={(hotel.amenities || []).slice(0, 3).map((k) => AMENITY_LABELS[k] || k)}
                badges={[
                  hotel.featured ? 'Featured' : null,
                  hotel.starRating ? `${hotel.starRating}-Star` : null,
                ].filter(Boolean)}
                pricePerNight={booking.pricePerNight}
                onBookNow={() => setMobileBookingOpen(true)}
              />
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="flex flex-col lg:flex-row gap-8">
                <div className="w-full lg:w-[66%] space-y-10">
                  {/* Overview Section - Premium Mobile Design */}
                  <section
                    id="section-overview"
                    className="rounded-3xl bg-gradient-to-br from-white to-[#F0FDFB] p-6 sm:p-8 md:p-10 border-2 border-[#00BFA6]/20 shadow-[0_8px_32px_rgba(0,191,166,0.12)] animate-[fadeInUp_0.7s_ease] relative overflow-hidden"
                  >
                    {/* Decorative Element */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#00BFA6]/10 to-transparent rounded-bl-full"></div>

                    <div className="flex items-center gap-3 mb-5 relative z-10">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00BFA6] to-[#00E5CC] flex items-center justify-center shadow-lg">
                        <Home className="w-5 h-5 text-white" />
                      </div>
                      <h3 className="text-2xl md:text-3xl font-extrabold text-[#263238]">Overview</h3>
                    </div>

                    <p className="text-base md:text-lg leading-relaxed text-[#546E7A] relative z-10">
                      {hotel.description}
                    </p>

                    {/* Highlight Box */}
                    <div className="mt-6 p-4 bg-white/80 backdrop-blur-sm rounded-2xl border border-[#00BFA6]/20 relative z-10">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#00BFA6]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Check className="w-4 h-4 text-[#00BFA6]" />
                        </div>
                        <div>
                          <p className="font-semibold text-[#263238] mb-1">Why choose this property?</p>
                          <p className="text-sm text-[#546E7A] leading-relaxed">
                            Highly rated for cleanliness, location, and exceptional service. Perfect for both leisure and business travelers.
                          </p>
                        </div>
                      </div>
                    </div>
                  </section>

              <section id="section-rooms" className="space-y-5 animate-[fadeInUp_0.8s_ease]">
                <h3 className="text-2xl font-bold text-[#263238]">Choose your room</h3>
                {(hotel.rooms || []).map((room) => {
                  const selectedRoomNumber = selectedRoomByType[room.id];
                  return (
                    <article
                      key={room._id || room.id}
                      className="group rounded-2xl border bg-white overflow-hidden transition-all duration-300 hover:-translate-y-1"
                      style={{
                        borderColor: selectedRoomNumber ? '#00BFA6' : 'rgba(0,191,166,0.15)',
                        boxShadow: selectedRoomNumber
                          ? '0 8px 32px rgba(0,191,166,0.15)'
                          : '0 4px 16px rgba(0,0,0,0.06)',
                      }}
                    >
                      <div className="grid grid-cols-1 md:grid-cols-[55%_45%]">
                        <div className="relative overflow-hidden min-h-65">
                          <img
                            src={room.images?.[0] || 'https://images.unsplash.com/photo-1598928636135-d146006ff4be?w=1200&q=80'}
                            alt={room.title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                          <span className="absolute left-4 top-4 px-3 py-1 text-xs font-bold text-white rounded-full bg-linear-to-r from-[#00BFA6] to-[#00E5CC]">
                            {String(room.type || 'Room')}
                          </span>
                        </div>
                        <div className="p-5 md:p-6 flex flex-col">
                          <h4 className="text-xl font-bold text-[#263238]">{room.roomName || room.title || 'Room'}</h4>
                          <p className="text-sm text-[#546E7A] mt-1">
                            {room.bedType ? `${room.bedType} Bed` : 'Bed'} • {room.maxGuests ? `${room.maxGuests} guests` : 'Guests'}
                          </p>
                          <div className="h-px bg-[rgba(0,191,166,0.15)] my-4" />
                          <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm text-[#546E7A]">
                            <span className="capitalize">{String(room.type || 'standard')}</span>
                            {(room.amenities || []).slice(0, 3).map((feature) => <span key={feature}>{feature}</span>)}
                          </div>
                          <div className="h-px bg-[rgba(0,191,166,0.15)] my-4" />
                          <p className="text-lg font-bold text-[#263238]">NPR {room.price}/night</p>
                          <button className="mt-5 w-full rounded-xl py-3 text-sm font-bold text-white bg-linear-to-r from-[#00BFA6] to-[#00E5CC] hover:shadow-[0_8px_24px_rgba(0,191,166,0.3)] transition">
                            Select Room →
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </section>

              {/* Amenities Section - Premium Mobile Design */}
              <section id="section-amenities" className="rounded-2xl sm:rounded-3xl bg-gradient-to-br from-white to-[#F0FDFB] p-5 sm:p-6 md:p-8 lg:p-10 border-2 border-[#00BFA6]/20 shadow-[0_8px_32px_rgba(0,191,166,0.12)] animate-[fadeInUp_0.9s_ease] relative overflow-hidden">
                {/* Decorative Element */}
                <div className="absolute bottom-0 left-0 w-32 h-32 sm:w-40 sm:h-40 bg-gradient-to-tr from-[#00BFA6]/10 to-transparent rounded-tr-full"></div>

                <div className="flex items-center gap-2.5 sm:gap-3 mb-5 sm:mb-6 relative z-10">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-[#00BFA6] to-[#00E5CC] flex items-center justify-center shadow-lg flex-shrink-0">
                    <Star className="w-4 h-4 sm:w-5 sm:h-5 text-white fill-white" />
                  </div>
                  <h3 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-[#263238]">Amenities</h3>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 relative z-10">
                  {(hotel.amenities || []).map((amenityKey) => (
                    <AmenityCard key={amenityKey} icon={amenityKey} label={AMENITY_LABELS[amenityKey] || amenityKey} />
                  ))}
                </div>

                {/* Premium Badge */}
                <div className="mt-5 sm:mt-6 p-3 sm:p-4 bg-gradient-to-r from-[#00BFA6]/10 to-[#00E5CC]/10 rounded-xl sm:rounded-2xl border border-[#00BFA6]/20 relative z-10">
                  <p className="text-xs sm:text-sm font-semibold text-[#00A896] text-center flex items-center justify-center gap-1.5">
                    <span className="text-base sm:text-lg">✨</span>
                    <span>All amenities included in your stay</span>
                  </p>
                </div>
              </section>

              {/* Reviews Section - Premium Mobile Design */}
              <section id="section-reviews" className="space-y-6 animate-[fadeInUp_1s_ease]">
                {/* Rating Summary Card */}
                <div className="rounded-3xl bg-gradient-to-br from-white to-[#FFF9E6] p-6 sm:p-8 border-2 border-[#FFB84D]/30 shadow-[0_8px_32px_rgba(255,184,77,0.15)] relative overflow-hidden">
                  {/* Decorative Element */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[#FFB84D]/20 to-transparent rounded-bl-full"></div>

                  <div className="flex items-center gap-3 mb-6 relative z-10">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FFB84D] to-[#FFA726] flex items-center justify-center shadow-lg">
                      <Star className="w-5 h-5 text-white fill-white" />
                    </div>
                    <h3 className="text-2xl md:text-3xl font-extrabold text-[#263238]">Guest Reviews</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6 relative z-10">
                    {/* Rating Score */}
                    <div className="text-center md:text-left">
                      <div className="inline-flex items-baseline gap-2 mb-2">
                        <p className="text-5xl md:text-6xl font-extrabold text-[#263238]">{reviewAverage}</p>
                        <span className="text-3xl text-[#FFB84D]">★</span>
                      </div>
                      <p className="font-bold text-[#263238] text-lg">{(hotel.reviewCount || 0).toLocaleString()} reviews</p>
                      <div className="inline-block mt-2 px-4 py-1.5 bg-gradient-to-r from-[#00BFA6] to-[#00E5CC] text-white text-sm font-bold rounded-full">
                        {hotel.rating >= 4.6 ? 'Excellent' : hotel.rating >= 4.0 ? 'Very Good' : 'Good'}
                      </div>
                    </div>

                    {/* Rating Bars */}
                    <div className="space-y-3">
                      {[
                        { stars: 5, percent: 60 },
                        { stars: 4, percent: 25 },
                        { stars: 3, percent: 10 },
                        { stars: 2, percent: 3 },
                        { stars: 1, percent: 2 },
                      ].map((row) => (
                        <div key={row.stars} className="grid grid-cols-[50px_1fr_50px] items-center gap-3">
                          <span className="font-bold text-[#263238] text-sm">{row.stars} ★</span>
                          <div className="h-3 rounded-full bg-[#F5F5F5] overflow-hidden shadow-inner">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-[#FFB84D] to-[#FFA726] transition-all duration-500"
                              style={{ width: `${row.percent}%` }}
                            />
                          </div>
                          <span className="text-[#546E7A] font-semibold text-sm text-right">{row.percent}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Individual Reviews */}
                <div className="space-y-4">
                  {visibleReviews.map((review) => {
                    const expanded = expandedReviews[review.id];
                    const visibleText = expanded ? review.text : `${review.text.slice(0, 150)}${review.text.length > 150 ? '...' : ''}`;
                    return (
                      <article key={review.id} className="rounded-2xl bg-white p-5 sm:p-6 border-2 border-[#00BFA6]/10 shadow-[0_4px_20px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_32px_rgba(0,191,166,0.15)] transition-all duration-300">
                        <div className="flex items-start justify-between gap-3 mb-4">
                          <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-[#00BFA6] to-[#00E5CC] text-white flex items-center justify-center font-bold text-lg shadow-lg">
                              {review.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                            </div>
                            <div>
                              <p className="font-bold text-[#263238]">{review.name}</p>
                              <p className="text-xs text-[#546E7A] flex items-center gap-1.5">
                                <MapPin className="w-3 h-3" />
                                {review.country} • {review.date}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 bg-[#FFF9E6] px-2.5 py-1 rounded-lg">
                            <span className="font-bold text-[#263238] text-sm">{review.rating}</span>
                            <Star className="w-4 h-4 text-[#FFB84D] fill-[#FFB84D]" />
                          </div>
                        </div>

                        <p className="text-sm md:text-base leading-relaxed text-[#546E7A]">{visibleText}</p>

                        {review.text.length > 150 && (
                          <button
                            type="button"
                            className="text-sm font-bold text-[#00BFA6] mt-2 hover:text-[#00A896] transition-colors"
                            onClick={() => setExpandedReviews((prev) => ({ ...prev, [review.id]: !expanded }))}
                          >
                            {expanded ? '← Read less' : 'Read more →'}
                          </button>
                        )}

                        <div className="flex items-center gap-3 mt-4 pt-4 border-t border-[#00BFA6]/10">
                          <button className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#00A896] hover:text-[#00BFA6] transition-colors">
                            <ThumbsUp className="w-3.5 h-3.5" /> Helpful
                          </button>
                        </div>
                      </article>
                    );
                  })}
                  {hasMoreReviews && (
                    <button
                      onClick={handleLoadMoreReviews}
                      className="w-full py-3 rounded-xl border border-[#00BFA6] text-[#00A896] font-semibold hover:bg-[#00BFA6]/10 transition"
                    >
                      Load more reviews ({remainingReviewsCount} remaining)
                    </button>
                  )}
                </div>
              </section>

              {/* Location Section - Premium Mobile Design */}
              <section id="section-location" className="rounded-3xl bg-gradient-to-br from-white to-[#F0FDFB] p-6 sm:p-8 md:p-10 border-2 border-[#00BFA6]/20 shadow-[0_8px_32px_rgba(0,191,166,0.12)] animate-[fadeInUp_1.1s_ease] relative overflow-hidden">
                {/* Decorative Element */}
                <div className="absolute top-0 left-0 w-40 h-40 bg-gradient-to-br from-[#00BFA6]/10 to-transparent rounded-br-full"></div>

                <div className="flex items-center gap-3 mb-6 relative z-10">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00BFA6] to-[#00E5CC] flex items-center justify-center shadow-lg">
                    <MapPin className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-2xl md:text-3xl font-extrabold text-[#263238]">Location</h3>
                </div>

                <div className="rounded-2xl overflow-hidden relative h-64 md:h-80 shadow-xl mb-5 relative z-10">
                  <img src={hotel.images?.[0]} alt={`${hotel.name} location`} className="w-full h-full object-cover" />
                  <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/40 to-transparent" />
                  <div className="absolute left-4 top-4 px-4 py-2.5 rounded-xl bg-white/90 backdrop-blur-md text-sm font-bold text-[#263238] inline-flex items-center gap-2 shadow-lg">
                    <MapPin className="w-4 h-4 text-[#00BFA6]" /> {hotel.name}
                  </div>
                </div>

                {/* Address Card */}
                <div className="p-5 bg-white/80 backdrop-blur-sm rounded-2xl border-2 border-[#00BFA6]/20 relative z-10">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#00BFA6]/10 flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-5 h-5 text-[#00BFA6]" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-[#263238] mb-1">Address</p>
                      <p className="text-sm md:text-base text-[#546E7A] leading-relaxed">
                        {hotel.location?.address}, {hotel.location?.city}
                      </p>
                    </div>
                  </div>
                </div>
              </section>
                </div>

                <div className="hidden lg:flex w-full lg:w-[34%] justify-end animate-[slideInRight_0.8s_ease]">
                  <BookingSidebar
                    pricePerNight={booking.pricePerNight}
                    nights={booking.nights}
                    taxesAndFees={booking.taxesAndFees}
                    guests={booking.guests}
                    freeCancellationDate={booking.freeCancellationDate}
                    hotelName={hotel.name}
                    hotelAddress={[hotel?.location?.address, hotel?.location?.city].filter(Boolean).join(', ')}
                    hotelImage={hotel.images?.[0]}
                    hotelId={hotel._id}
                    roomId={hotel.rooms?.[0]?._id || hotel.rooms?.[0]?.id}
                  />
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      {mobileBookingOpen && hotel && (
        <div className="lg:hidden fixed inset-0 z-130 bg-black/45 flex items-end">
          <div className="w-full max-h-[86vh] overflow-y-auto rounded-t-3xl bg-white p-4">
            <button
              type="button"
              onClick={() => setMobileBookingOpen(false)}
              className="ml-auto h-9 w-9 rounded-full bg-gray-100 flex items-center justify-center"
              aria-label="Close booking panel"
            >
              <X className="w-5 h-5 text-gray-700" />
            </button>
            <BookingSidebar
              pricePerNight={booking.pricePerNight}
              nights={booking.nights}
              taxesAndFees={booking.taxesAndFees}
              guests={booking.guests}
              freeCancellationDate={booking.freeCancellationDate}
              hotelName={hotel.name}
              hotelAddress={[hotel?.location?.address, hotel?.location?.city].filter(Boolean).join(', ')}
              hotelImage={hotel.images?.[0]}
              hotelId={hotel._id}
              roomId={hotel.rooms?.[0]?._id || hotel.rooms?.[0]?.id}
            />
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(18px);} to { opacity:1; transform: translateY(0);} }
        @keyframes slideInRight { from { opacity:0; transform: translateX(20px);} to { opacity:1; transform: translateX(0);} }
      `}</style>
    </div>
  );
};

export default HotelDetail;