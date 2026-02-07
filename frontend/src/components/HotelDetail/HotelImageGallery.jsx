const HotelImageGallery = ({ images }) => {
  return (
    <div className="w-full overflow-hidden">
      <div className="w-full h-[500px] grid grid-cols-4 grid-rows-2 gap-2 p-4 max-w-7xl mx-auto">
        {/* Main large image */}
        <div className="col-span-4 sm:col-span-2 row-span-2 rounded-xl overflow-hidden shadow-lg">
          <img 
            src={images[0]} 
            alt="Main resort view" 
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" 
          />
        </div>
        
        {/* Smaller thumbnail images */}
        {images.slice(1).map((img, idx) => (
          <div 
            key={idx} 
            className="col-span-2 sm:col-span-1 rounded-xl overflow-hidden hidden sm:block shadow-md"
          >
            <img 
              src={img} 
              alt={`Resort view ${idx + 2}`} 
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" 
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default HotelImageGallery;
