import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import Categories from './Categories';
import FeaturedHotels from './FeaturedHotels';

const Home = () => {
  const [selectedCategory, setSelectedCategory] = useState('Hotel');
  const navigate = useNavigate();

  return (
    <div className="relative w-screen overflow-x-hidden">
      {/* Navigation */}
      <Navbar />

      {/* Hero Section */}
      <div className="relative h-screen pt-24">
        {/* Background Image */}
        <div className="absolute inset-0 w-full h-full overflow-hidden -z-10">
          <div 
            className="absolute inset-0 w-full h-full bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: "url('https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=2070&auto=format&fit=crop')",
            }}
          ></div>
          
          {/* Dark Overlay (40% opacity) */}
          <div className="absolute inset-0 bg-black opacity-40"></div>
        </div>

        {/* Hero Content */}
        <div 
          style={{paddingTop: "5rem"}}
          className="relative z-10 flex flex-col justify-center h-full w-full px-4 sm:px-4 md:px-6 lg:px-8 py-8 sm:py-12"
        >
          {/* Main Content */}
          <div className="flex flex-col items-center justify-center mb-4 sm:mb-6 md:mb-8 lg:mb-10">
            <div className="max-w-7xl mx-auto text-center">
              {/* Value Proposition */}
              <p className="text-lg md:text-xl font-medium mb-2 text-teal-400">
                Curated Luxury Stays. Best Price Guarantee.
              </p>

              {/* Main Headlines */}
              <h1 className="text-4xl md:text-6xl font-bold leading-tight text-white mb-2 drop-shadow-lg">
                Your Dream Stay Awaits
              </h1>
              <h2 className="text-4xl md:text-6xl font-bold leading-tight text-white drop-shadow-lg">
                Book the Perfect Hotel Today!
              </h2>
            </div>
          </div>

          {/* Search Box - Original Code */}
          <div 
            style={{paddingTop: "4rem"}}
            className="w-full max-w-xs sm:max-w-md md:max-w-2xl lg:max-w-4xl xl:max-w-6xl mx-auto mt-4 sm:mt-6 md:mt-8 lg:mt-10 px-4 sm:px-6 md:px-8 lg:px-10"
          >
            <div
              style={{
                padding: "1.5rem",
                marginTop:"8rem",
                marginLeft: "14rem",
                marginRight: "auto",
                maxWidth: "90%"
              }}
              className="bg-white backdrop-blur-md rounded-lg sm:rounded-xl shadow-lg w-full border border-white/20"
            >
              <div 
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 md:gap-6"
              >
                {/* Find Hotel */}
                <div className="text-left">
                  <label className="block text-gray-700 text-xs sm:text-sm font-semibold mb-2">Find Hotel</label>
                  <input
                    type="text"
                    placeholder="Search here"
                    className="w-full px-0 py-2 sm:py-3 border-0 border-b-2 border-gray-300 focus:border-teal-500 focus:outline-none text-gray-800 placeholder-gray-500 bg-transparent transition-all duration-200 text-sm sm:text-base font-medium"
                  />
                </div>

                {/* Select Location */}
                <div className="text-left">
                  <label className="block text-gray-700 text-xs sm:text-sm font-semibold mb-2">Select Location</label>
                  <select className="w-full px-0 py-2 sm:py-3 border-0 border-b-2 border-gray-300 focus:border-teal-500 focus:outline-none text-gray-800 appearance-none bg-transparent cursor-pointer transition-all duration-200 text-sm sm:text-base font-medium">
                    <option>Kathmandu</option>
                    <option>Pokhara</option>
                    <option>Chitwan</option>
                    <option>Butwal</option>
                    <option>Itahari</option>
                  </select>
                </div>

                {/* Select Category */}
                <div className="text-left">
                  <label className="block text-gray-700 text-xs sm:text-sm font-semibold mb-2">Select Category</label>
                  <select className="w-full px-0 py-2 sm:py-3 border-0 border-b-2 border-gray-300 focus:border-teal-500 focus:outline-none text-gray-800 appearance-none bg-transparent cursor-pointer transition-all duration-200 text-sm sm:text-base font-medium">
                    <option>Resort</option>
                    <option>Hotel</option>
                    <option>Villa</option>
                    <option>Apartment</option>
                  </select>
                </div>

                {/* Select Rating */}
                <div className="text-left">
                  <label className="block text-gray-700 text-xs sm:text-sm font-semibold mb-2">Select Rating</label>
                  <select className="w-full px-0 py-2 sm:py-3 border-0 border-b-2 border-gray-300 focus:border-teal-500 focus:outline-none text-gray-800 appearance-none bg-transparent cursor-pointer transition-all duration-200 text-sm sm:text-base font-medium">
                    <option>5 Star</option>
                    <option>4 Star</option>
                    <option>3 Star</option>
                  </select>
                </div>

                {/* Search Button */}
                <div className={"text-center sm:text-left lg:flex lg:items-end"}>
                  <button 
                    style={{
                      padding: "0.75rem 1rem",
                      marginTop: ".2rem",
                    }}
                    className="w-full bg-teal-600 hover:bg-teal-700 text-white rounded-md font-semibold text-sm sm:text-base flex items-center justify-center gap-2 transition-all duration-300 shadow-lg hover:shadow-xl lg:mt-0"
                    onClick={() => navigate('/hotels')}
                  >
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
      </div>

      {/* Categories Section */}
      <div id="destination" className="-mt-20" style={{marginTop: "-10px", marginBottom: "1rem"}}>
        <Categories onCategorySelect={setSelectedCategory} selectedCategory={selectedCategory} />
      </div>

      {/* Featured Hotels Section */}
      <FeaturedHotels 
        selectedCategory={selectedCategory} 
        onCategoryChange={setSelectedCategory} 
      />
    </div>
  );
};

export default Home;
