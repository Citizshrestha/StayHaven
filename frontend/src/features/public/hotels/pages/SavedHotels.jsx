import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, MapPin, Star, ArrowLeft, Loader } from 'lucide-react';
import { getWishlist, toggleWishlist as toggleWishlistApi } from '../../../../core/api/services/user.service';
import { getAllHotels } from '../../../../core/api/services/hotel.service';
import { allProperties } from '../../../../core/utils/allProperties';
import { toast } from 'react-toastify';

const SavedHotels = () => {
  const navigate = useNavigate();
  const [savedHotels, setSavedHotels] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEmpty, setIsEmpty] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const loadSavedHotels = async () => {
      setIsLoading(true);
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) {
          navigate('/login');
          return;
        }

        // Fetch wishlist IDs from server
        const { wishlist } = await getWishlist();

        if (!wishlist || wishlist.length === 0) {
          setIsEmpty(true);
          setSavedHotels([]);
          setIsLoading(false);
          return;
        }

        // Try to fetch from backend API first
        try {
          const data = await getAllHotels({ limit: 100 });
          const backendHotels = data?.hotels || [];
          const saved = backendHotels.filter(h => wishlist.includes(String(h._id)));
          if (saved.length > 0) {
            setSavedHotels(saved);
            setIsEmpty(false);
            setIsLoading(false);
            return;
          }
        } catch {
          console.log('Backend hotels fetch failed, using local data');
        }

        // Fall back to local allProperties
        const saved = allProperties.filter(h => wishlist.includes(String(h.id)));
        setSavedHotels(saved);
        setIsEmpty(saved.length === 0);
      } catch (err) {
        console.error('Error loading saved hotels:', err);
        toast.error('Failed to load saved hotels');
        setIsEmpty(true);
      } finally {
        setIsLoading(false);
      }
    };

    loadSavedHotels();
  }, [navigate]);

  const toggleWishlist = async (hotelId, e) => {
    e.stopPropagation();
    try {
      const { message } = await toggleWishlistApi(hotelId);
      setSavedHotels((current) => {
        const next = current.filter((hotel) => String(hotel.id || hotel._id) !== String(hotelId));
        setIsEmpty(next.length === 0);
        return next;
      });
      window.dispatchEvent(new Event('wishlistUpdated'));
      toast.success(message || '❤️ Removed from saved');
    } catch {
      toast.error('Failed to update saved hotels');
    }
  };

  const handleBackClick = () => {
    navigate('/hotels');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center pt-24">
        <div className="flex flex-col items-center gap-4">
          <Loader className="w-12 h-12 text-teal-600 animate-spin" />
          <p className="text-gray-600 font-medium">Loading your saved hotels...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="pt-28 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-12">
            <button
              onClick={handleBackClick}
              className="inline-flex items-center gap-2 text-teal-600 hover:text-teal-700 font-semibold mb-6 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Hotels
            </button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <Heart className="w-6 h-6 text-red-500 fill-red-500" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-gray-900">Saved Hotels</h1>
                <p className="text-gray-600 mt-1">Your collection of favorite stays</p>
              </div>
            </div>
          </div>

          {/* Empty State */}
          {isEmpty ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 py-24 px-8 text-center">
              <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-6">
                <Heart className="w-10 h-10 text-gray-300" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">No saved hotels yet</h2>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                Start exploring and save your favorite hotels to view them anytime. Click the heart icon on any hotel to add it to your collection.
              </p>
              <button
                onClick={() => navigate('/hotels')}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-500 to-teal-600 text-white font-semibold rounded-xl hover:from-teal-600 hover:to-teal-700 transition-all shadow-lg hover:shadow-xl"
              >
                Explore Hotels
              </button>
            </div>
          ) : (
            <div>
              {/* Count Badge */}
              <div className="mb-8 inline-block">
                <span className="px-4 py-2 bg-red-100 text-red-700 font-semibold rounded-full text-sm">
                  {savedHotels.length} hotel{savedHotels.length !== 1 ? 's' : ''} saved
                </span>
              </div>

              {/* Hotels Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {savedHotels.map((hotel) => (
                  <div
                    key={hotel.id || hotel._id}
                    onClick={() => navigate(`/hotels/${hotel.id || hotel._id}`)}
                    className="group bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-200 hover:shadow-xl transition-all duration-300 cursor-pointer"
                  >
                    {/* Image Container */}
                    <div className="relative h-56 overflow-hidden bg-gray-200">
                      <img
                        src={hotel.images?.[0] || hotel.image || hotel.thumbnail}
                        alt={hotel.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />

                      {/* Wishlist Button */}
                      <button
                        onClick={(e) => toggleWishlist(hotel.id || hotel._id, e)}
                        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center hover:scale-110 transition-transform duration-200"
                        aria-label="Remove from wishlist"
                      >
                        <Heart className="w-5 h-5 text-red-500 fill-red-500" />
                      </button>

                      {/* Category Badge */}
                      {(hotel.category || hotel.type) && (
                        <div className="absolute top-4 left-4">
                          <span className="px-3 py-1 bg-teal-500 text-white text-xs font-bold rounded-full">
                            {hotel.category || hotel.type}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-6">
                      {/* Rating */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${
                                i < Math.floor(hotel.rating || hotel.starRating || 0)
                                  ? 'text-amber-400 fill-amber-400'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-sm font-semibold text-gray-900">
                          {hotel.rating || hotel.starRating || 'N/A'}
                        </span>
                      </div>

                      {/* Hotel Name */}
                      <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">
                        {hotel.name}
                      </h3>

                      {/* Location */}
                      <div className="flex items-start gap-2 mb-4">
                        <MapPin className="w-4 h-4 text-teal-600 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-gray-600">
                          {hotel.location?.address || hotel.location || hotel.address || hotel.city || '-'}
                        </span>
                      </div>

                      {/* Review Count */}
                      {(hotel.reviews || hotel.reviewCount) && (
                        <p className="text-xs text-gray-500 mb-4">
                          {hotel.reviews || hotel.reviewCount} reviews
                        </p>
                      )}

                      {/* Price */}
                      <div className="pt-4 border-t border-gray-200">
                        <div className="flex items-baseline justify-between">
                          <span className="text-2xl font-bold text-teal-600">
                            NPR {(hotel.priceRange?.min || hotel.price || hotel.pricePerNight || 0).toLocaleString()}
                          </span>
                          <span className="text-sm text-gray-600">/night</span>
                        </div>
                      </div>

                      {/* View Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/hotels/${hotel.id || hotel._id}`);
                        }}
                        className="w-full mt-4 py-3 bg-teal-50 text-teal-600 font-semibold rounded-xl hover:bg-teal-100 transition-colors"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SavedHotels;
