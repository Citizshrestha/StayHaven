import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Heart, MapPin, Star, SlidersHorizontal, X } from 'lucide-react';
import { toast } from 'react-toastify';
import { getAllHotels } from '../../../../core/api/services/hotel.service';
import { getWishlist, toggleWishlist } from '../../../../core/api/services/user.service';
import Sheet from '../lib/Sheet';
import { formatRs } from '../lib/money';
import { usePageMeta } from '../lib/pageMeta';

const PRICE_MAX = 100000;
const PAGE_SIZE = 6;
const AMENITIES = [
  { id: 'wifi', label: 'Free Wi-Fi' },
  { id: 'pool', label: 'Swimming Pool' },
  { id: 'parking', label: 'Parking' },
  { id: 'gym', label: 'Gym' },
];
const SORTS = [
  { value: '-rating', label: 'Top rated' },
  { value: 'priceRange.min', label: 'Price: low to high' },
  { value: '-priceRange.min', label: 'Price: high to low' },
  { value: '-createdAt', label: 'Newest' },
];

const FiltersPanel = ({ city, onCity, rating, onRating, price, onPrice, amenities, onAmenity, idPrefix }) => (
  <div className="space-y-6">
    <div>
      <label htmlFor={`${idPrefix}-city`} className="block text-sm font-semibold text-gray-700 mb-2">City</label>
      <input
        id={`${idPrefix}-city`} type="text" value={city} maxLength={60} autoComplete="off" placeholder="Any city"
        onChange={(e) => onCity(e.target.value)}
        className="w-full min-h-[44px] px-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-teal-500"
      />
    </div>
    <div>
      <p className="block text-sm font-semibold text-gray-700 mb-2" id={`${idPrefix}-rating`}>Minimum rating</p>
      <div className="flex gap-2" role="group" aria-labelledby={`${idPrefix}-rating`}>
        {[1, 2, 3, 4, 5].map((r) => {
          const active = rating !== null && r <= rating;
          return (
            <button
              key={r} type="button" onClick={() => onRating(rating === r ? null : r)}
              aria-pressed={rating === r} aria-label={`${r} star${r > 1 ? 's' : ''} and up`}
              className={`h-11 w-11 inline-flex items-center justify-center rounded-lg border-2 ${active ? 'border-amber-300 bg-amber-50 text-amber-400' : 'border-gray-300 bg-white text-gray-300'}`}
            >
              <Star className="w-5 h-5" fill="currentColor" aria-hidden="true" />
            </button>
          );
        })}
      </div>
    </div>
    <div>
      <label htmlFor={`${idPrefix}-price`} className="block text-sm font-semibold text-gray-700 mb-2">
        Max price per night: <span className="tabular-nums">{price >= PRICE_MAX ? 'Any' : formatRs(price)}</span>
      </label>
      <input
        id={`${idPrefix}-price`} type="range" min="500" max={PRICE_MAX} step="500" value={price}
        onChange={(e) => onPrice(Number(e.target.value))}
        className="w-full h-11 accent-teal-500"
      />
    </div>
    <fieldset>
      <legend className="block text-sm font-semibold text-gray-700 mb-2">Amenities</legend>
      <div className="space-y-1">
        {AMENITIES.map((item) => (
          <label key={item.id} htmlFor={`${idPrefix}-${item.id}`} className="flex items-center gap-3 min-h-[44px] text-sm text-gray-700 cursor-pointer">
            <input id={`${idPrefix}-${item.id}`} type="checkbox" checked={!!amenities[item.id]} onChange={() => onAmenity(item.id)} className="h-5 w-5 accent-teal-500" />
            {item.label}
          </label>
        ))}
      </div>
    </fieldset>
  </div>
);

const FilteredHotels = () => {
  const [searchParams] = useSearchParams();
  const hotelSearch = searchParams.get('search')?.trim() || '';
  const destination = searchParams.get('destination')?.trim() || '';
  const checkIn = searchParams.get('checkIn') || '';
  const checkOut = searchParams.get('checkOut') || '';
  const [city, setCity] = useState(destination);
  const [rating, setRating] = useState(null);
  const [price, setPrice] = useState(PRICE_MAX);
  const [amenities, setAmenities] = useState({});
  const [sortBy, setSortBy] = useState('-rating');
  const [page, setPage] = useState(1);
  const [hotels, setHotels] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reload, setReload] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [saved, setSaved] = useState([]);

  usePageMeta({
    title: hotelSearch ? `Hotels matching "${hotelSearch}"` : city ? `Hotels in ${city}` : 'Browse hotels',
    description: `Compare and book hotels${city ? ` in ${city}` : ' across Nepal'} on StayHaven.`,
  });

  useEffect(() => { window.scrollTo(0, 0); }, []);
  // A new destination from the landing search / destination picker replaces the city filter.
  useEffect(() => { setCity(destination); setPage(1); }, [destination, hotelSearch]);

  useEffect(() => {
    if (!localStorage.getItem('accessToken')) return;
    getWishlist().then(({ wishlist }) => setSaved((wishlist || []).map(String))).catch(() => setSaved([]));
  }, []);

  const selectedAmenityIds = useMemo(() => Object.entries(amenities).filter(([, v]) => v).map(([k]) => k), [amenities]);
  const filtersActive = !!(city || rating || price < PRICE_MAX || selectedAmenityIds.length);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const filters = { limit: PAGE_SIZE, page, sort: sortBy };
        if (price < PRICE_MAX) filters.maxPrice = price;
        if (hotelSearch) filters.search = hotelSearch;
        if (city.trim()) filters.destination = city.trim();
        if (checkIn && checkOut) { filters.checkIn = checkIn; filters.checkOut = checkOut; }
        if (rating) filters.minRating = rating;
        if (selectedAmenityIds.length) filters.amenities = selectedAmenityIds.join(',');
        const data = await getAllHotels(filters);
        if (cancelled) return;
        setHotels(data?.hotels || []);
        setTotalPages(Math.max(1, data?.totalPages || 1));
        setTotal(data?.total ?? (data?.hotels || []).length);
      } catch (e) {
        if (cancelled) return;
        setError(e?.message || 'Failed to load hotels');
        setHotels([]); setTotalPages(1); setTotal(0);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    // Debounce typing in the city box / dragging the slider.
    const t = setTimeout(load, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [hotelSearch, checkIn, checkOut, city, rating, price, selectedAmenityIds, page, sortBy, reload]);

  const clearFilters = useCallback(() => { setCity(''); setRating(null); setPrice(PRICE_MAX); setAmenities({}); setPage(1); }, []);
  const change = (setter) => (value) => { setter(value); setPage(1); };
  const toggleAmenity = (id) => { setAmenities((prev) => ({ ...prev, [id]: !prev[id] })); setPage(1); };

  const toggleSaved = async (id) => {
    if (!localStorage.getItem('accessToken')) { toast.info('Please sign in to save hotels'); return; }
    try {
      const { wishlist, message } = await toggleWishlist(id);
      setSaved((wishlist || []).map(String));
      window.dispatchEvent(new Event('wishlistUpdated'));
      toast.success(message);
    } catch (e) { toast.error(e?.message || 'Could not update saved hotels'); }
  };

  const panelProps = { city, onCity: change(setCity), rating, onRating: change(setRating), price, onPrice: change(setPrice), amenities, onAmenity: toggleAmenity };

  return (
    <div className="bg-gray-50 min-h-screen">
      <main className="max-w-[1400px] mx-auto px-4 py-8">
        <div className="mt-20 lg:flex lg:gap-8">
          <aside className="hidden lg:block w-full max-w-[280px] shrink-0">
            <div className="sticky top-24 bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Filters</h2>
                {filtersActive && <button type="button" onClick={clearFilters} className="min-h-[44px] text-sm font-semibold text-teal-700 underline">Clear</button>}
              </div>
              <FiltersPanel {...panelProps} idPrefix="side" />
            </div>
          </aside>

          <section className="flex-1 min-w-0">
            <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 break-words" style={{ fontFamily: 'Nunito, sans-serif' }}>
                  {hotelSearch ? `Hotels matching "${hotelSearch}"` : city ? `Hotels in ${city}` : 'Browse hotels'}
                </h1>
                <p className="mt-1 text-sm text-gray-600" aria-live="polite">
                  {!isLoading && !error ? `${total} hotel${total === 1 ? '' : 's'} found` : '\u00a0'}
                  {checkIn && checkOut ? ` \u00b7 available ${checkIn} to ${checkOut}` : ''}
                </p>
              </div>
              <div className="flex w-full sm:w-auto items-center gap-2">
                <button type="button" onClick={() => setFiltersOpen(true)} className="lg:hidden min-h-[44px] inline-flex items-center gap-2 px-4 rounded-lg border border-gray-300 bg-white text-sm font-semibold text-gray-700">
                  <SlidersHorizontal className="w-4 h-4" aria-hidden="true" /> Filters{filtersActive ? ' \u2022' : ''}
                </button>
                <label className="sr-only" htmlFor="sort-by">Sort hotels</label>
                <select id="sort-by" value={sortBy} onChange={(e) => { setSortBy(e.target.value); setPage(1); }} className="flex-1 sm:flex-none sm:w-56 min-h-[44px] px-3 border border-gray-300 rounded-lg bg-white text-base text-gray-700">
                  {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
            </div>

            {filtersActive && (
              <div className="lg:hidden flex flex-wrap gap-2 mb-4" aria-label="Active filters">
                {city && <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-teal-50 text-teal-800 text-sm">{city}</span>}
                {rating && <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-teal-50 text-teal-800 text-sm">{rating}+ stars</span>}
                {price < PRICE_MAX && <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-teal-50 text-teal-800 text-sm">up to {formatRs(price)}</span>}
                {selectedAmenityIds.map((id) => <span key={id} className="px-3 py-1.5 rounded-full bg-teal-50 text-teal-800 text-sm">{AMENITIES.find((a) => a.id === id)?.label}</span>)}
                <button type="button" onClick={clearFilters} className="inline-flex items-center gap-1 min-h-[36px] px-3 text-sm font-semibold text-teal-700 underline"><X className="w-3.5 h-3.5" aria-hidden="true" /> Clear all</button>
              </div>
            )}

            <div className="grid gap-6 grid-cols-1 min-[640px]:grid-cols-2 xl:grid-cols-3 mb-8">
              {isLoading && Array.from({ length: 3 }, (_, i) => (
                <div key={i} className="rounded-2xl bg-white border border-gray-100 overflow-hidden" role="status" aria-label="Loading hotels">
                  <div className="h-[200px] bg-gray-200 animate-pulse" />
                  <div className="p-5 space-y-3"><div className="h-5 w-3/4 bg-gray-200 animate-pulse rounded" /><div className="h-4 w-1/2 bg-gray-200 animate-pulse rounded" /><div className="h-8 w-full bg-gray-200 animate-pulse rounded" /></div>
                </div>
              ))}

              {!isLoading && error && (
                <div role="alert" className="col-span-full rounded-xl bg-white p-6 text-center">
                  <p className="text-red-700 mb-3">{error}</p>
                  <button type="button" onClick={() => setReload((n) => n + 1)} className="min-h-[44px] px-5 rounded-lg border-2 border-teal-500 text-teal-700 font-semibold">Try again</button>
                </div>
              )}

              {!isLoading && !error && hotels.length === 0 && (
                <div className="col-span-full rounded-xl bg-white p-8 text-center">
                  <p className="text-lg font-semibold text-gray-900 mb-1">No hotels match these filters</p>
                  <p className="text-gray-600 mb-4">Try another city, a lower rating, or fewer amenities.</p>
                  <button type="button" onClick={() => { clearFilters(); }} className="min-h-[44px] px-5 rounded-lg bg-teal-500 text-white font-semibold">Clear filters</button>
                </div>
              )}

              {!isLoading && !error && hotels.map((hotel) => {
                const id = String(hotel._id || hotel.id);
                const image = hotel.images?.[0] || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&q=80';
                const place = [hotel.location?.address, hotel.location?.city].filter(Boolean).join(', ') || '-';
                const isSaved = saved.includes(id);
                const query = checkIn && checkOut ? `?checkIn=${encodeURIComponent(checkIn)}&checkOut=${encodeURIComponent(checkOut)}` : '';
                return (
                  <article key={id} className="relative bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-lg transition-shadow">
                    <div className="relative aspect-[16/10] bg-gray-200 overflow-hidden">
                      <img src={image} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                    </div>
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h2 className="text-lg font-bold text-gray-900 leading-snug break-words min-w-0" style={{ fontFamily: 'Nunito, sans-serif' }}>
                          {/* The whole card is the tap target: the link's ::after covers it. */}
                          <Link to={`/hotels/${id}${query}`} className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-teal-500 focus-visible:after:rounded-2xl">{hotel.name}</Link>
                        </h2>
                        <span className="flex items-center gap-1 shrink-0 text-sm font-semibold text-gray-900"><Star className="w-4 h-4 text-amber-300 fill-amber-300" aria-hidden="true" />{Number(hotel.rating || 0).toFixed(1)}</span>
                      </div>
                      <p className="flex items-center gap-1.5 text-sm text-gray-600 mb-4"><MapPin className="w-3.5 h-3.5 shrink-0" aria-hidden="true" /><span className="truncate">{place}</span></p>
                      <p className="text-gray-900"><span className="text-2xl font-bold tabular-nums">{formatRs(hotel.priceRange?.min ?? 0)}</span> <span className="text-sm text-gray-600">/ night</span></p>
                    </div>
                    <button
                      type="button" onClick={() => toggleSaved(id)} aria-pressed={isSaved} aria-label={isSaved ? `Remove ${hotel.name} from saved hotels` : `Save ${hotel.name}`}
                      className="absolute top-2 right-2 z-10 h-11 w-11 inline-flex items-center justify-center rounded-full bg-white shadow-md"
                    >
                      <Heart className={`w-5 h-5 ${isSaved ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} aria-hidden="true" />
                    </button>
                  </article>
                );
              })}
            </div>

            {!isLoading && !error && totalPages > 1 && (
              <nav className="flex justify-center items-center gap-2 flex-wrap" aria-label="Pagination">
                <button type="button" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="min-h-[44px] px-4 border border-gray-300 rounded-lg bg-white text-sm font-medium text-gray-700 disabled:opacity-50">Previous</button>
                <span className="px-2 text-sm text-gray-700 sm:hidden" aria-live="polite">Page {page} of {totalPages}</span>
                {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 10).map((p) => (
                  <button key={p} type="button" aria-current={page === p ? 'page' : undefined} onClick={() => setPage(p)} className={`hidden sm:inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-sm font-medium ${page === p ? 'bg-teal-500 text-white' : 'bg-white text-gray-700 border border-gray-300'}`}>{p}</button>
                ))}
                <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="min-h-[44px] px-4 border border-gray-300 rounded-lg bg-white text-sm font-medium text-gray-700 disabled:opacity-50">Next</button>
              </nav>
            )}
          </section>
        </div>
      </main>

      <Sheet
        open={filtersOpen} onClose={() => setFiltersOpen(false)} title="Filters" maxWidth="sm:max-w-md"
        footer={(
          <div className="flex gap-3">
            <button type="button" onClick={clearFilters} className="flex-1 min-h-[48px] rounded-lg border border-gray-300 font-semibold text-gray-700">Clear</button>
            <button type="button" onClick={() => setFiltersOpen(false)} className="flex-1 min-h-[48px] rounded-lg bg-teal-500 text-white font-semibold">Show {total} hotel{total === 1 ? '' : 's'}</button>
          </div>
        )}
      >
        <FiltersPanel {...panelProps} idPrefix="sheet" />
      </Sheet>
    </div>
  );
};

export default FilteredHotels;
