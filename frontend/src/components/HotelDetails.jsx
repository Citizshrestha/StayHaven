import { useState } from 'react';
// import { useParams, useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import BookingSidebar from './HotelDetail/BookingSidebar';

const HotelDetails = () => {
  // const { id } = useParams();
  // const navigate = useNavigate();
  const [showImageModal, setShowImageModal] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Sample hotel data - in production, this would come from an API
  const hotel = {
    id: 1,
    name: 'Sunset Valley Resort',
    address: '123 Serenity Lane, Meadowville, California',
    rating: 4.5,
    reviews: 1284,
    price: 249,
    images: [
      'https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=2070&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=2070&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1571896349842-33c89424de2d?q=80&w=2080&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?q=80&w=2070&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?q=80&w=2070&auto=format&fit=crop'
    ],
    description: 'Nestled in the heart of Meadowville, Sunset Valley Resort offers a tranquil escape with breathtaking views and world-class amenities. Whether you\'re here for a romantic getaway, a family vacation, or a corporate retreat, our resort provides the perfect blend of luxury, comfort, and nature. Enjoy our pristine pools, gourmet dining, and rejuvenating spa services.',
    amenities: [
      { name: 'Free Wi-Fi', icon: '📶' },
      { name: 'Swimming Pool', icon: '🏊' },
      { name: 'Gym', icon: '💪' },
      { name: 'Restaurant', icon: '🍴' },
      { name: 'Free Parking', icon: '🅿️' },
      { name: 'Spa', icon: '🧖' },
      { name: 'Room Service', icon: '🛎️' },
      { name: 'Pet Friendly', icon: '🐾' }
    ],
    location: {
      lat: 37.7749,
      lng: -122.4194
    }
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % hotel.images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + hotel.images.length) % hotel.images.length);
  };

  return (
    <div className="min-h-screen ">
      <Navbar />

      {/* Full-Screen Image Modal */}
      {showImageModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-95 z-50 flex items-center justify-center"
          onClick={() => setShowImageModal(false)}
        >
          {/* Close Button */}
          <button
            onClick={() => setShowImageModal(false)}
            className="absolute top-4 right-4 w-12 h-12 bg-white rounded-full flex items-center justify-center text-gray-900 hover:bg-gray-100 transition-colors z-10"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Previous Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              prevImage();
            }}
            className="absolute left-4 w-14 h-14 bg-white bg-opacity-90 rounded-full flex items-center justify-center text-gray-900 hover:bg-opacity-100 transition-all z-10"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Image Container */}
          <div 
            className="relative w-full h-full flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={hotel.images[currentImageIndex]}
              alt={`Hotel view ${currentImageIndex + 1}`}
              className="max-w-full max-h-full object-contain"
            />
          </div>

          {/* Next Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              nextImage();
            }}
            className="absolute right-4 w-14 h-14 bg-white bg-opacity-90 rounded-full flex items-center justify-center text-gray-900 hover:bg-opacity-100 transition-all z-10"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Image Counter */}
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-75 text-white px-6 py-3 rounded-full text-sm font-medium">
            {currentImageIndex + 1} / {hotel.images.length}
          </div>
        </div>
      )}

      {/* Image Modal for Mobile */}
      {showImageModal && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.95)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onClick={() => setShowImageModal(false)}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowImageModal(false);
            }}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: 'white',
              border: 'none',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              color: '#000'
            }}
          >
            ×
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              prevImage();
            }}
            style={{
              position: 'absolute',
              left: '20px',
              background: 'rgba(255, 255, 255, 0.9)',
              border: 'none',
              borderRadius: '50%',
              width: '48px',
              height: '48px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              fontWeight: 'bold'
            }}
          >
            ‹
          </button>

          <img
            src={hotel.images[currentImageIndex]}
            alt={`Hotel view ${currentImageIndex + 1}`}
            style={{
              maxWidth: '90%',
              maxHeight: '90%',
              objectFit: 'contain'
            }}
            onClick={(e) => e.stopPropagation()}
          />

          <button
            onClick={(e) => {
              e.stopPropagation();
              nextImage();
            }}
            style={{
              position: 'absolute',
              right: '20px',
              background: 'rgba(255, 255, 255, 0.9)',
              border: 'none',
              borderRadius: '50%',
              width: '48px',
              height: '48px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              fontWeight: 'bold'
            }}
          >
            ›
          </button>

          <div style={{
            position: 'absolute',
            bottom: '30px',
            color: 'white',
            fontSize: '16px'
          }}>
            {currentImageIndex + 1} / {hotel.images.length}
          </div>
        </div>
      )}

      <main style={{marginTop: "4.5rem", marginLeft: "1.3rem"}} className="w-full px-4 py-8 pt-20 lg:pt-24 lg:mt-20 lg:ml-4">
        <div className="max-w-[1490px] mx-auto box-border">
          <div className="flex flex-wrap gap-2 mb-4">
            <a className="text-gray-500 text-sm font-medium leading-normal" href="#">USA</a>
            <span className="text-gray-500 text-sm font-medium leading-normal">/</span>
            <a className="text-gray-500 text-sm font-medium leading-normal" href="#">California</a>
            <span className="text-gray-500 text-sm font-medium leading-normal">/</span>
            <span className="text-gray-900 text-sm font-medium leading-normal">Sunset Valley Resort</span>
          </div>

          {/* Hotel Image Gallery - Desktop: Main + Thumbnails, Mobile: Vertical Stack */}
          <div className="mb-8">
            {/* Desktop View - Large Main Image + 4 Thumbnails in 2x2 Grid */}
            <div className="hidden lg:grid lg:grid-cols-2 gap-2">
              {/* Main large image - left side */}
              <div 
                className="rounded-2xl overflow-hidden cursor-pointer relative group row-span-2"
                style={{ height: '500px' }}
                onClick={() => { setCurrentImageIndex(0); setShowImageModal(true); }}
              >
                <img
                  src={hotel.images[0]}
                  alt="Sunset Valley Resort Main View"
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0  bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300"></div>
              </div>

              {/* Thumbnails grid - right side (2x2 layout) */}
              <div className="grid grid-cols-2 gap-2" style={{ height: '500px' }}>
                {hotel.images.slice(1, 5).map((image, index) => (
                  <div 
                    key={index + 1}
                    className="rounded-2xl overflow-hidden cursor-pointer relative group"
                    onClick={() => { setCurrentImageIndex(index + 1); setShowImageModal(true); }}
                  >
                    <img
                      src={image}
                      alt={`Hotel view ${index + 2}`}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0  bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300"></div>
                  </div>
                ))}
              </div>
            </div>

            {/* Mobile View - Show only first image, open modal for slider */}
            <div className="lg:hidden">
              <div 
                className="rounded-2xl w-11/12  mx-auto overflow-hidden cursor-pointer relative h-[300px]"
                onClick={() => { setCurrentImageIndex(0); setShowImageModal(true); }}
              >
                <img
                  src={hotel.images[0]}
                  alt="Sunset Valley Resort"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-8 mt-2">
            <div className="w-full lg:w-2/3">
              <div className="flex flex-wrap justify-between gap-4 items-start mb-6">
                <div className="flex flex-col gap-2">
                  <h1 className="text-4xl font-bold leading-tight text-gray-900">Sunset Valley Resort</h1>
                  <div className="flex items-center gap-2 text-gray-500">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <p className="text-base font-normal leading-normal">123 Serenity Lane, Meadowville, California</p>
                  </div>
                <div className="flex items-center gap-1.5">
                  <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span className="ml-2 font-bold text-gray-900">4.5</span>
                  <span className="text-gray-500">(1,284 reviews)</span>
                </div>
                </div>
                <button style={{padding: "10px"}} className="flex items-center bg-gray-100 gap-2 px-4 py-2 border-none rounded-lg hover:bg-gray-50 transition text-gray-900">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  <span className="text-sm font-bold px-2">Add to Favorites</span>
                </button>
              </div>

              <div style={{marginTop: "10px"}} className="border-b border-gray-200 sm:mt-4 mb-8">
                <nav aria-label="Tabs" className="-mb-px flex space-x-8 gap-6">
                  <a className="whitespace-nowrap py-4 px-2 border-b-2 font-medium text-sm text-teal-600 border-teal-600 hover:text-teal-700" href="#">Overview</a>
                  <a className="whitespace-nowrap py-4 px-2 border-b-2 font-medium text-sm text-gray-600 hover:text-gray-900 border-transparent hover:border-gray-300" href="#">Rooms</a>
                  <a className="whitespace-nowrap py-4 px-2 border-b-2 font-medium text-sm text-gray-600 hover:text-gray-900 border-transparent hover:border-gray-300" href="#">Virtual Tour</a>
                  <a className="whitespace-nowrap py-4 px-2 border-b-2 font-medium text-sm text-gray-600 hover:text-gray-900 border-transparent hover:border-gray-300" href="#">Reviews</a>
                </nav>
              </div>

              <div id="overview-content">
                <p className="text-gray-600 mb-8 leading-relaxed lg:max-w-3xl max-w-sm">Nestled in the heart of Meadowville, Sunset Valley Resort offers a tranquil escape with breathtaking views and world-class amenities. Whether you're here for a romantic getaway, a family vacation, or a corporate retreat, our resort provides the perfect blend of luxury, comfort, and nature. Enjoy our pristine pools, gourmet dining, and rejuvenating spa services.</p>

                <h3 className="text-xl font-bold mb-4 text-gray-900">Amenities</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 mb-8">
                  {[
                    { icon: '📶', label: 'Free Wi-Fi' },
                    { icon: '🏊', label: 'Swimming Pool' },
                    { icon: '💪', label: 'Gym' },
                    { icon: '🍴', label: 'Restaurant' },
                    { icon: '🅿️', label: 'Free Parking' },
                    { icon: '🧖', label: 'Spa' },
                    { icon: '🛎️', label: 'Room Service' },
                    { icon: '🐾', label: 'Pet Friendly' }
                  ].map((a)=> (
                    <div key={a.label} className="flex flex-col w-[150px] items-center gap-2 p-4 rounded-xl bg-gray-50">
                      <span className="text-3xl">{a.icon}</span>
                      <span className="text-sm font-medium text-gray-900 text-center">{a.label}</span>
                    </div>
                  ))}
                </div>

                <h3 className="text-xl font-bold mb-4 text-gray-900">Location</h3>
                <div className="w-11/12 lg:w-full mx-auto h-80 rounded-xl overflow-hidden mb-8">
                  <div className="w-full h-full bg-cover bg-center" data-location="California" style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuC-9jtw8YSuTMkW8gSDozdQuDqrl6OtbKr1vrZTa629boVuOYoTpc85l2aA6FH2oIZOlALuqRhhuI0vZu8-MbBOuCjSRNvGuDA6Wh87XDSZHjKcfQfJIAWtJG46MrzznU7kU4XH1tti9CVkxVxnv9G7ot-vwyd-D0j4IWaFjYSKl1x7eBD-CaFS_BtAtJz9EmADqAWwhI6-ObjbHh9TPgGNwHTbjLBy4JFlVZduHZuioVcCvCjFpsPFhmAvzaALYw3R-F9fK30B4g")' }}></div>
                </div>
              </div>
            </div>

            {/* Desktop BookingSidebar */}
            <div className="hidden lg:block w-full lg:w-1/3">
              <BookingSidebar 
                pricePerNight={850}
                nights={3}
                taxesAndFees={92}
                guests="2 Adults, 1 Child"
              />
            </div>
          </div>

          <div className="mt-8 lg:mt-12 pt-8 border-t border-gray-200">
            <h2 className="text-3xl font-bold mb-6 text-gray-900">Select Your Room</h2>
          <div className="space-y-8">
            <div className="p-6 rounded-xl bg-white border border-gray-200 shadow-sm w-11/12 lg:w-full mx-auto">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="w-full md:w-1/3 h-48 md:h-auto rounded-lg overflow-hidden">
                  <div className="w-full h-full bg-cover bg-center" data-alt="Deluxe King Room" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuC5FhlMmyigesRYz2IamwJ4Asdjt5J1D1kLeyQRESncdDsvdsynVr5S0RRdQD5CvsXN9bpv4oTa2mqlC7ATpVeL2pCremJwIxBLIfSni_XeyW9Tw3ySwYQoSAMUc0oaYJcBvoPzCtERNN36vzb5cINygipe-Q2MsM79ED9OHHYO2ex9K249PsXI4Z6CaIFMKWMEFM3BSYQVJ1PoxdLvuA3IhbcLemK4rZ3mI1cCpMpgDexmOPgSESjD0P0QoNB7oGSrWoLm32Q1MA')" }}></div>
                </div>
                <div className="w-full md:w-2/3">
                  <h3 className="text-xl font-bold text-gray-900">Deluxe King Room</h3>
                  <p className="text-gray-600 text-sm mt-1">35m² • 1 King Bed • Max 2 guests</p>
                  <p className="my-3 text-sm text-gray-700">A spacious room with a king-sized bed, modern amenities, and a view of the gardens.</p>
                  <p className="font-bold text-lg text-teal-600 mb-4">$249 / night</p>
                  <h4 className="font-semibold text-sm mb-2 text-gray-900">Select a specific room:</h4>
                  <div className="grid grid-cols-5 gap-2 max-w-xs">
                    <div className="aspect-square flex items-center justify-center rounded bg-gray-200 text-xs font-medium text-gray-600">201</div>
                    <div className="aspect-square flex items-center justify-center rounded bg-gray-200 text-xs font-medium text-gray-600">202</div>
                    <div className="aspect-square flex items-center justify-center rounded bg-teal-50 border border-teal-500 text-xs font-medium text-teal-600 cursor-pointer">203</div>
                    <div className="aspect-square flex items-center justify-center rounded bg-red-50 text-xs font-medium text-red-600 cursor-not-allowed">204</div>
                    <div className="aspect-square flex items-center justify-center rounded bg-gray-200 text-xs font-medium text-gray-600">205</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-xl bg-white border border-gray-200 shadow-sm w-11/12 lg:w-full mx-auto">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="w-full md:w-1/3 h-48 md:h-auto rounded-lg overflow-hidden">
                  <div className="w-full h-full bg-cover bg-center" data-alt="Ocean View Suite" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuD73f1f9_vAxpkv58TpN6PN3qIZuEcejvIdLT1NHwN3tsgWMvO5MZLlRf8k7ILs0KnwqC2uQ4AYiol-LiqUsJ7HSpVJ3EhBzCUG0-vux447zeM1Twb5WUqUHeUc9LMUcHYFzcFV7-JP-dSYrLv2wgGDOKbmVpWea3UdtTO5WzbE3bByCsTnqXVQZUQ8iaYhvIGO3R3lvHXW5mzLF-yGcaUMRetFMOBvOZygBTPZAGw9JsL0926JtNRLDIUSmSMqgMyAnFmBK2CyWw')" }}></div>
                </div>
                <div className="w-full md:w-2/3">
                  <h3 className="text-xl font-bold text-gray-900">Ocean View Suite</h3>
                  <p className="text-gray-600 text-sm mt-1">55m² • 1 King Bed • 1 Sofa Bed • Max 4 guests</p>
                  <p className="my-3 text-sm text-gray-700">Enjoy stunning ocean views from your private balcony in this luxurious suite with a separate living area.</p>
                  <p className="font-bold text-lg text-teal-600 mb-4">$399 / night</p>
                  <h4 className="font-semibold text-sm mb-2 text-gray-900">Select a specific room:</h4>
                  <div className="grid grid-cols-5 gap-2 max-w-xs">
                    <div className="aspect-square flex items-center justify-center rounded bg-gray-200 text-xs font-medium text-gray-600">301</div>
                    <div className="aspect-square flex items-center justify-center rounded bg-red-50 text-xs font-medium text-red-600 cursor-not-allowed">302</div>
                    <div className="aspect-square flex items-center justify-center rounded bg-gray-200 text-xs font-medium text-gray-600">303</div>
                    <div className="aspect-square flex items-center justify-center rounded bg-red-50 text-xs font-medium text-red-600 cursor-not-allowed">304</div>
                    <div className="aspect-square flex items-center justify-center rounded bg-gray-200 text-xs font-medium text-gray-600">305</div>
                  </div>
                </div>
              </div>
            </div>
            </div>
          </div>

          {/* Mobile BookingSidebar - Shown after Select Your Room section */}
          <div className="lg:hidden mt-8 w-11/12 mx-auto">
            <BookingSidebar 
              pricePerNight={850}
              nights={3}
              taxesAndFees={92}
              guests="2 Adults, 1 Child"
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default HotelDetails;
