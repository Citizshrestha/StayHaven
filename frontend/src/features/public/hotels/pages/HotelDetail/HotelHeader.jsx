import { useState } from 'react';
import { Star, StarHalf, Heart, MapPin, Share, Award } from 'lucide-react';
import { formatReviewCount } from './utils';

const HotelHeader = ({ name, location, rating, reviewCount, highlights = [], badges = [], pricePerNight, onBookNow }) => {
  const [isFavorite, setIsFavorite] = useState(false);

  // Render star rating
  const renderStars = () => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Star key={`full-${i}`} className="w-4 h-4 text-[#FFB84D] fill-[#FFB84D]" />
      );
    }

    if (hasHalfStar) {
      stars.push(
        <StarHalf key="half" className="w-4 h-4 text-[#FFB84D] fill-[#FFB84D]" />
      );
    }

    return stars;
  };

  return (
    <div className="bg-white rounded-[16px] pl-5 pr-6 py-6 mb-8 border-l-[4px] border-[#00BFA6] shadow-sm shadow-[#00BFA6]/5 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#00BFA6]/5 rounded-bl-full -z-10 pattern-dots"></div>

      {/* Mobile: Action Buttons at Top Right */}
      <div className="absolute top-4 right-4 flex items-center gap-2 md:hidden">
        <button
          onClick={() => setIsFavorite(!isFavorite)}
          className="group flex flex-col items-center justify-center p-2 rounded-xl border border-[#00BFA6]/15 hover:bg-[#F0FDFB] hover:border-[#00BFA6] transition-all duration-300 bg-white"
          aria-label="Add to Favorites"
        >
          <Heart
            strokeWidth={2}
            className={`w-5 h-5 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-[#546E7A]'}`}
          />
          <span className="text-[9px] font-bold text-[#546E7A]">Save</span>
        </button>
        <button
          className="group flex flex-col items-center justify-center p-2 rounded-xl border border-transparent hover:border-[#00BFA6]/15 hover:bg-[#F8FAFB] transition-all duration-300 bg-white"
          aria-label="Share"
        >
          <Share className="w-5 h-5 text-[#546E7A]" />
          <span className="text-[9px] font-bold text-[#546E7A]">Share</span>
        </button>
      </div>

      <div className="flex flex-col md:flex-row items-start md:items-start justify-between mb-4 gap-4">
        <div className="pr-24 md:pr-0 w-full md:w-auto">
          <h2 className="text-2xl md:text-4xl font-extrabold text-[#263238] tracking-tight mb-2">
            {name}
          </h2>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-2">
             <div className="flex items-center gap-1.5 text-[#546E7A]">
                <MapPin className="w-4 h-4 text-[#00BFA6]" />
                <span className="text-sm font-medium">{location}</span>
             </div>

             {/* Rating Pill */}
             <div className="flex items-center gap-2 bg-[#F8FAFB] px-3 py-1.5 rounded-full border border-[#00BFA6]/10">
                <div className="flex items-center gap-0.5">
                  {renderStars()}
                </div>
                <span className="font-bold text-[#263238]">{rating}</span>
                <span className="text-[#00BFA6] text-xs font-semibold cursor-pointer hover:underline">
                  {formatReviewCount(reviewCount)}
                </span>
             </div>
          </div>
        </div>

        {/* Desktop: Action Buttons */}
        <div className="hidden md:flex items-center gap-2">
          <button
            onClick={() => setIsFavorite(!isFavorite)}
            className="group flex flex-col items-center justify-center p-2.5 rounded-xl border border-[#00BFA6]/15 hover:bg-[#F0FDFB] hover:border-[#00BFA6] transition-all duration-300"
            aria-label="Add to Favorites"
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform duration-300 ${isFavorite ? 'scale-110' : 'group-hover:scale-105'}`}>
               <Heart
                 strokeWidth={2}
                 className={`w-5 h-5 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-[#546E7A] group-hover:text-[#00BFA6]'}`}
               />
            </div>
            <span className="text-[10px] font-bold text-[#546E7A] group-hover:text-[#00BFA6]">Save</span>
          </button>
          <button
            className="group flex flex-col items-center justify-center p-2.5 rounded-xl border border-transparent hover:border-[#00BFA6]/15 hover:bg-[#F8FAFB] transition-all duration-300"
            aria-label="Share"
          >
            <div className="w-8 h-8 rounded-full flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
               <Share className="w-5 h-5 text-[#546E7A] group-hover:text-[#263238]" />
            </div>
            <span className="text-[10px] font-bold text-[#546E7A] group-hover:text-[#263238]">Share</span>
          </button>
        </div>
      </div>

      {/* Mobile: Price and Book Now Button */}
      {pricePerNight && (
        <div className="md:hidden flex items-center justify-between mb-4 p-4 bg-[#F8FAFB] rounded-xl border border-[#00BFA6]/10">
          <div>
            <p className="text-xs text-[#546E7A] font-medium mb-1">Starting from</p>
            <p className="text-2xl font-bold text-[#263238]">NPR {pricePerNight}<span className="text-sm font-normal text-[#546E7A]">/night</span></p>
          </div>
          <button
            onClick={onBookNow}
            className="px-6 py-3 bg-gradient-to-r from-[#00BFA6] to-[#00E5CC] text-white font-bold rounded-xl hover:shadow-lg transition-all duration-300"
          >
            Book Now →
          </button>
        </div>
      )}

      {/* Divider */}
      <hr className="border-[#00BFA6]/10 mb-4" />

      <div className="flex flex-wrap items-center gap-3">
        {badges.map((badge) => (
          <div key={badge} className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-[#00BFA6] to-[#00E5CC] rounded-lg shadow-sm">
            <Award className="w-4 h-4 text-white" />
            <span className="text-xs font-bold text-white tracking-wide">{badge}</span>
          </div>
        ))}
        {highlights.map((item) => (
          <span key={item} className="px-3 py-1.5 bg-[#00BFA6]/10 text-[#00A896] text-xs font-bold rounded-full">
            {item}
          </span>
        ))}
      </div>
    </div>
  );
};

export default HotelHeader;