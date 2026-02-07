import { useState } from 'react';
import { Star, StarHalf, Heart, MapPin } from 'lucide-react';
import { formatReviewCount } from './utils';

const HotelHeader = ({ name, location, rating, reviewCount }) => {
  const [isFavorite, setIsFavorite] = useState(false);
  
  // Render star rating
  const renderStars = () => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    
    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Star key={`full-${i}`} className="w-5 h-5 text-yellow-500 fill-yellow-500" />
      );
    }
    
    if (hasHalfStar) {
      stars.push(
        <StarHalf key="half" className="w-5 h-5 text-yellow-500 fill-yellow-500" />
      );
    }
    
    return stars;
  };

  return (
    <div className="mb-8">
      <div className="flex items-start justify-between mb-3">
        <h2 className="text-4xl md:text-5xl font-black leading-tight text-gray-900">
          {name}
        </h2>
        <button
          onClick={() => setIsFavorite(!isFavorite)}
          className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          aria-label="Add to Favorites"
        >
          <Heart 
            className={`w-6 h-6 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-600'}`}
          />
        </button>
      </div>
      
      <div className="flex items-center gap-2 mb-2">
        <MapPin className="w-4 h-4 text-gray-600" />
        <p className="text-gray-600 text-sm">{location}</p>
      </div>
      
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-0.5">
          {renderStars()}
        </div>
        <span className="font-bold text-gray-900 text-lg">{rating}</span>
        <span className="text-gray-600 text-sm">{formatReviewCount(reviewCount)}</span>
      </div>
    </div>
  );
};

export default HotelHeader;
