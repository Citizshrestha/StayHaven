import { useState } from 'react';
import Navbar from '../../../common/Navbar';
import HotelImageGallery from './HotelImageGallery';
import HotelHeader from './HotelHeader';
import TabNavigation from './TabNavigation';
import BookingSidebar from './BookingSidebar';
import AmenityCard from './AmenityCard';
import { mockRootProps } from './hotelDetailMockData';

const HotelDetail = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const { hotel, booking } = mockRootProps;

  return (
    <div className="min-h-screen bg-linear-to-b from-gray-50 to-white">
      <Navbar />
      
      <main className="w-full mt-0" style={{ marginTop: "5rem" }}>
        {/* Image Gallery */}
        <HotelImageGallery images={hotel.images} />

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Left Column */}
            <div className="w-full lg:w-2/3">
              {/* Header */}
              <HotelHeader
                name={hotel.name}
                location={hotel.location}
                rating={hotel.rating}
                reviewCount={hotel.reviewCount}
              />

              {/* Tabs */}
              <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

              {/* Tab Content */}
              <div className="mt-6 mb-10" style={{ marginTop: 16, marginBottom: 40 }}>
                {activeTab === 'overview' && (
                  <div>
                    <h3 className="text-2xl font-bold mb-4 text-gray-900">
                      About {hotel.name}
                    </h3>
                    <div className="prose prose-gray max-w-none">
                      <p className="text-gray-700 text-base leading-relaxed" style={{ color: '#6C757D', marginBottom: 32 }}>
                        {hotel.description}
                      </p>
                    </div>
                  </div>
                )}
                
                {activeTab === 'rooms' && (
                  <div className="text-center py-16 bg-linear-to-b from-gray-50 to-white rounded-xl border border-gray-200" style={{ borderRadius: 16, border: '1px solid #e5e7eb', background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}>
                    <h3 className="text-2xl font-bold text-gray-900 mb-3">Rooms Coming Soon</h3>
                    <p className="text-gray-600 text-base" style={{ color: '#6C757D' }}>
                      Room selection and booking features will be available soon!
                    </p>
                  </div>
                )}
                
                {activeTab === 'virtualtour' && (
                  <div className="text-center py-16 bg-linear-to-b from-gray-50 to-white rounded-xl border border-gray-200" style={{ borderRadius: 16, border: '1px solid #e5e7eb', background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}>
                    <div className="w-20 h-20 bg-linear-to-br from-teal-500 to-teal-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                      <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-3">Virtual Tour Coming Soon</h3>
                    <p className="text-gray-600 text-base" style={{ color: '#6C757D' }}>
                      Experience our resort through an immersive 360° virtual tour. Available soon!
                    </p>
                  </div>
                )}
                
                {activeTab === 'reviews' && (
                  <div className="text-center py-16 bg-linear-to-b from-gray-50 to-white rounded-xl border border-gray-200" style={{ borderRadius: 16, border: '1px solid #e5e7eb', background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}>
                    <h3 className="text-2xl font-bold text-gray-900 mb-3">Reviews Coming Soon</h3>
                    <p className="text-gray-600 text-base" style={{ color: '#6C757D' }}>
                      Guest reviews and ratings will be displayed here.
                    </p>
                  </div>
                )}
              </div>

              {/* Amenities */}
              <div className="pt-10 border-t border-gray-200 mt-10">
                <h3 className="text-2xl font-bold mb-6 text-gray-900">Amenities</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {hotel.amenities.map((amenity, idx) => (
                    <AmenityCard key={idx} icon={amenity.icon} label={amenity.label} />
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column - Booking Card */}
            <div className="w-full lg:w-1/3" style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <BookingSidebar
                pricePerNight={hotel.pricePerNight}
                nights={booking.nights}
                taxesAndFees={booking.taxesAndFees}
                guests={booking.guests}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default HotelDetail;