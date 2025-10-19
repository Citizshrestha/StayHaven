// components/Home.jsx
import { useState } from 'react';
import Navbar from './Navbar';
import video from "../../public/source/homeVideo.mp4";

const Home = () => {
  const [videoError, setVideoError] = useState(false);
  return (
    <div className="relative min-h-screen w-screen overflow-x-hidden">
      {/* Background Video/Image */}
      <div className="fixed inset-0 w-full h-full overflow-hidden">
        {!videoError ? (
          <video
            className="absolute inset-0 w-full h-full object-cover"
            autoPlay
            muted
            loop
            playsInline
            onError={() => setVideoError(true)}
            onLoadStart={() => setVideoError(false)}
          >
            <source src={video} type="video/mp4" />
          </video>
        ) : (
          <div 
            className="absolute inset-0 w-full h-full bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: "url('https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=2070&auto=format&fit=crop')",
            }}
          ></div>
        )}
        {/* Dark Overlay */}
        <div className="absolute inset-0 bg-black/10"></div>
      </div>

      {/* Navbar */}
      <Navbar />

      {/* Hero Content */}
      <div className="relative z-10 flex flex-col justify-between min-h-screen w-full px-2 sm:px-4 md:px-6 lg:px-8 py-16 sm:py-20">
        {/* Main Content */}
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="max-w-7xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-block mb-4 sm:mb-6 md:mb-8">
              <span className="px-3 sm:px-4 md:px-6 py-1.5 sm:py-2 bg-gray-800/70 backdrop-blur-md text-white rounded-full text-xs sm:text-sm font-medium border border-white/30 shadow-md">
                Find. Book. Stay. Explore.
              </span>
            </div>

            {/* Main Heading */}
            <h1 className="text-[#A8D52C] text-2xl xs:text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold leading-tight mb-4 sm:mb-6 md:mb-8 drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)] px-2 sm:px-0" style={{ fontFamily: 'cursive' }}>
              Your Dream Stay Awaits<br />Book the Perfect Hotel Today!
            </h1>

            {/* Subheading */}
            <p className="text-white text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl max-w-xs sm:max-w-md md:max-w-2xl lg:max-w-3xl xl:max-w-4xl mx-auto mb-6 sm:mb-8 md:mb-10 lg:mb-12 drop-shadow-[0_2px_2px_rgba(0,0,0,0.3)] font-medium px-2 sm:px-4 md:px-6 text-center" style={{marginLeft: '3rem', marginTop: '10px'}}>
              Discover handpicked hotels, villas, and resorts for an unforgettable stay. Find your ideal getaway by location, category, or rating!
            </p>
          </div>
        </div>

        {/* Search Box - Fixed at Bottom */}
        <div className="w-full max-w-xs sm:max-w-md md:max-w-2xl lg:max-w-4xl xl:max-w-6xl mx-auto mb-4 sm:mb-6 md:mb-8 px-2 sm:px-0" style={{marginLeft: '11rem', marginRight: 'auto', marginBottom: '2rem'}}>
          <div className="bg-white/90 backdrop-blur-md rounded-lg sm:rounded-xl shadow-lg p-3 sm:p-4 md:p-6 lg:p-10 xl:p-12 w-full border border-white/20">
            <div className="grid grid-cols-1  sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 lg:gap-8" style={{margin: '4px'}}>
              {/* Find Hotel */}
              <div className="text-left">
                <label className="block text-gray-700 text-xs sm:text-sm font-semibold mb-2 sm:mb-3">Find Hotel</label>
                <input
                  type="text"
                  placeholder="Search here"
                  className="w-full px-0 py-2 sm:py-3 md:py-4 border-0 border-b-2 border-gray-300 focus:border-teal-500 focus:outline-none text-gray-800 placeholder-gray-500 bg-transparent transition-all duration-200 text-sm sm:text-base font-medium"
                />
              </div>

              {/* Select Location */}
              <div className="text-left">
                <label className="block text-gray-700 text-xs sm:text-sm font-semibold mb-2 sm:mb-3">Select Location</label>
                <select className="w-full px-0 py-2 sm:py-3 md:py-4 border-0 border-b-2 border-gray-300 focus:border-teal-500 focus:outline-none text-gray-800 appearance-none bg-transparent cursor-pointer transition-all duration-200 text-sm sm:text-base font-medium">
                  <option>Kathmandu</option>
                  <option>Pokhara</option>
                  <option>Chitwan</option>
                  <option>Butwal</option>
                  <option>Itahari</option>
                </select>
              </div>

              {/* Select Category */}
              <div className="text-left">
                <label className="block text-gray-700 text-xs sm:text-sm font-semibold mb-2 sm:mb-3">Select Category</label>
                <select className="w-full px-0 py-2 sm:py-3 md:py-4 border-0 border-b-2 border-gray-300 focus:border-teal-500 focus:outline-none text-gray-800 appearance-none bg-transparent cursor-pointer transition-all duration-200 text-sm sm:text-base font-medium">
                  <option>Resort</option>
                  <option>Hotel</option>
                  <option>Villa</option>
                  <option>Apartment</option>
                </select>
              </div>

              {/* Select Rating */}
              <div className="text-left">
                <label className="block text-gray-700 text-xs sm:text-sm font-semibold mb-2 sm:mb-3">Select Rating</label>
                <select className="w-full px-0 py-2 sm:py-3 md:py-4 border-0 border-b-2 border-gray-300 focus:border-teal-500 focus:outline-none text-gray-800 appearance-none bg-transparent cursor-pointer transition-all duration-200 text-sm sm:text-base font-medium">
                  <option>5 Star</option>
                  <option>4 Star</option>
                  <option>3 Star</option>
                </select>
              </div>
            </div>

            {/* Search Button */}
            <div className="mt-4 sm:mt-6 md:mt-8 lg:mt-12 flex justify-center" style={{marginTop: "10px"}}>
              <button className="bg-teal-600 hover:bg-teal-700 text-white px-4 sm:px-6 md:px-8 lg:px-14 xl:px-16 py-2 sm:py-3 md:py-4 rounded-md sm:rounded-lg font-semibold text-sm sm:text-base md:text-lg flex items-center gap-1 sm:gap-3 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 w-full sm:w-auto">
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Search Now
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;