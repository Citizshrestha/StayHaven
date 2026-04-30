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
              />
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="flex flex-col lg:flex-row gap-8">
                <div className="w-full lg:w-[66%] space-y-10">
                  <section
                    id="section-overview"
                    className="rounded-2xl bg-white p-4 sm:p-6 md:p-8 border border-[rgba(0,191,166,0.15)] shadow-[0_4px_16px_rgba(0,0,0,0.06)] animate-[fadeInUp_0.7s_ease]"
                  >
                    <h3 className="text-2xl font-bold mb-4 text-[#263238]">Overview</h3>
                    <p className="text-[15px] leading-8 text-[#546E7A]">
                      {hotel.description}
                    </p>
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

              <section id="section-amenities" className="rounded-2xl bg-white p-4 sm:p-6 md:p-8 border border-[rgba(0,191,166,0.15)] shadow-[0_4px_16px_rgba(0,0,0,0.06)] animate-[fadeInUp_0.9s_ease]">
                <h3 className="text-2xl font-bold mb-6 text-[#263238]">Amenities</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {(hotel.amenities || []).map((amenityKey) => (
                    <AmenityCard key={amenityKey} icon={amenityKey} label={AMENITY_LABELS[amenityKey] || amenityKey} />
                  ))}
                </div>
              </section>

              <section id="section-reviews" className="space-y-5 animate-[fadeInUp_1s_ease]">
                <div className="rounded-2xl bg-white p-4 sm:p-6 md:p-8 border border-[rgba(0,191,166,0.15)] shadow-[0_4px_16px_rgba(0,0,0,0.06)] grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6">
                  <div>
                    <p className="text-4xl font-extrabold text-[#263238]">{reviewAverage} <span className="text-[#FFB84D]">★</span></p>
                    <p className="font-semibold text-[#263238] mt-2">{(hotel.reviewCount || 0).toLocaleString()} reviews</p>
                    <p className="text-[#546E7A] mt-1">{hotel.rating >= 4.6 ? 'Excellent' : hotel.rating >= 4.0 ? 'Very good' : 'Good'}</p>
                  </div>
                  <div className="space-y-2">
                    {[
                      { stars: 5, percent: 60 },
                      { stars: 4, percent: 25 },
                      { stars: 3, percent: 10 },
                      { stars: 2, percent: 3 },
                      { stars: 1, percent: 2 },
                    ].map((row) => (
                      <div key={row.stars} className="grid grid-cols-[38px_1fr_38px] items-center gap-3 text-sm">
                        <span className="font-semibold text-[#546E7A]">{row.stars}★</span>
                        <div className="h-2.5 rounded-full bg-[#E5F5F2] overflow-hidden">
                          <div className="h-full rounded-full bg-linear-to-r from-[#00BFA6] to-[#00E5CC]" style={{ width: `${row.percent}%` }} />
                        </div>
                        <span className="text-[#546E7A]">{row.percent}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  {(hotel.reviews || []).map((review) => {
                    const expanded = expandedReviews[review.id];
                    const visibleText = expanded ? review.text : `${review.text.slice(0, 150)}${review.text.length > 150 ? '...' : ''}`;
                    return (
                      <article key={review.id} className="rounded-2xl bg-white p-5 border border-[rgba(0,191,166,0.15)] shadow-[0_4px_16px_rgba(0,0,0,0.06)]">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-linear-to-br from-[#00BFA6] to-[#00E5CC] text-white flex items-center justify-center font-bold">
                              {review.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                            </div>
                            <div>
                              <p className="font-semibold text-[#263238]">{review.name} {review.country}</p>
                              <p className="text-xs text-[#546E7A]">{review.date}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 text-[#FFB84D]">
                            {Array.from({ length: review.rating }).map((_, idx) => (
                              <Star key={`${review.id}-star-${idx}`} className="w-4 h-4 fill-current" />
                            ))}
                          </div>
                        </div>
                        <p className="text-sm leading-7 text-[#546E7A] mt-3">{visibleText}</p>
                        {review.text.length > 150 && (
                          <button
                            type="button"
                            className="text-sm font-semibold text-[#00A896] mt-1 hover:underline"
                            onClick={() => setExpandedReviews((prev) => ({ ...prev, [review.id]: !expanded }))}
                          >
                            {expanded ? 'Read less' : 'Read more'}
                          </button>
                        )}
                        <button className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[#00A896]">
                          <ThumbsUp className="w-3.5 h-3.5" /> Helpful?
                        </button>
                      </article>
                    );
                  })}
                  <button className="w-full py-3 rounded-xl border border-[#00BFA6] text-[#00A896] font-semibold hover:bg-[#00BFA6]/10 transition">
                    Load more reviews
                  </button>
                </div>
              </section>

              <section id="section-location" className="rounded-2xl bg-white p-4 sm:p-6 md:p-8 border border-[rgba(0,191,166,0.15)] shadow-[0_4px_16px_rgba(0,0,0,0.06)] animate-[fadeInUp_1.1s_ease]">
                <h3 className="text-2xl font-bold text-[#263238] mb-5">Location</h3>
                <div className="rounded-2xl overflow-hidden relative h-70">
                  <img src={hotel.images?.[0]} alt={`${hotel.name} location`} className="w-full h-full object-cover" />
                  <div className="absolute inset-x-0 top-0 h-20 bg-linear-to-b from-white/80 to-transparent" />
                  <div className="absolute left-4 top-4 px-4 py-2 rounded-xl bg-white/55 backdrop-blur-[10px] text-sm font-semibold text-[#263238] inline-flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#00BFA6]" /> {hotel.name}
                  </div>
                </div>
                <p className="text-sm text-[#546E7A] mt-4">
                  {hotel?.location?.address || 'Address'}{hotel?.location?.city ? `, ${hotel.location.city}` : ''}
                </p>
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
                  />
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      {!isLoading && !error && hotel && (
        <div className="lg:hidden fixed bottom-0 inset-x-0 z-120 bg-white border-t border-[rgba(0,191,166,0.18)] shadow-[0_-8px_24px_rgba(0,191,166,0.15)] p-3 flex items-center justify-between">
        <div>
          <p className="text-sm text-[#546E7A]">Starting from</p>
          <p className="text-lg font-bold text-[#263238]">NPR {booking.pricePerNight}/night</p>
        </div>
        <button
          type="button"
          onClick={() => setMobileBookingOpen(true)}
          className="px-5 py-3 rounded-xl text-white font-bold bg-linear-to-r from-[#00BFA6] to-[#00E5CC]"
        >
          Book Now →
        </button>
        </div>
      )}

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