import { useState, useEffect } from 'react';

// Category counts based on actual hotel data
const CATEGORY_COUNTS = {
  'Villa': 5,
  'Hotel': 7,
  'Resort': 6,
  'Cottage': 4,
  'Bungalow': 2,
  'Duplex': 6
};

const Categories = ({ onCategorySelect, selectedCategory: externalSelectedCategory }) => {
  const [selectedCategory, setSelectedCategory] = useState(externalSelectedCategory || 'Hotel');

  // Sync with external category changes (from slider)
  useEffect(() => {
    if (externalSelectedCategory) {
      setSelectedCategory(externalSelectedCategory);
    }
  }, [externalSelectedCategory]);

  const handleCategoryClick = (categoryName) => {
    setSelectedCategory(categoryName);
    if (onCategorySelect) {
      onCategorySelect(categoryName);
    }
  };

  const categories = [
    {
      name: 'Villa',
      items: `${CATEGORY_COUNTS['Villa']} Items`,
      image: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?q=80&w=2071&auto=format&fit=crop',
      icon: (
        <svg className="w-12 h-12 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      )
    },
    {
      name: 'Hotel',
      items: `${CATEGORY_COUNTS['Hotel']} Items`,
      image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=2070&auto=format&fit=crop',
      icon: (
        <svg className="w-12 h-12 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      )
    },
    {
      name: 'Resort',
      items: `${CATEGORY_COUNTS['Resort']} Items`,
      image: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?q=80&w=2080&auto=format&fit=crop',
      icon: (
        <svg className="w-12 h-12 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 21h18M4 18h16M6 18V9l6-6 6 6v9M9 21v-7a1 1 0 011-1h4a1 1 0 011 1v7" />
        </svg>
      )
    },
    {
      name: 'Cottage',
      items: `${CATEGORY_COUNTS['Cottage']} Items`,
      image: 'https://images.unsplash.com/photo-1518780664697-55e3ad937233?q=80&w=2065&auto=format&fit=crop',
      icon: (
        <svg className="w-12 h-12 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l9-9 9 9M5 10v10a1 1 0 001 1h3a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1h3a1 1 0 001-1V10" />
        </svg>
      )
    },
    {
      name: 'Bungalow',
      items: `${CATEGORY_COUNTS['Bungalow']} Items`,
      image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=2070&auto=format&fit=crop',
      icon: (
        <svg className="w-12 h-12 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
        </svg>
      )
    },
    {
      name: 'Duplex',
      items: `${CATEGORY_COUNTS['Duplex']} Items`,
      image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=2075&auto=format&fit=crop',
      icon: (
        <svg className="w-12 h-12 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      )
    }
  ];

  return (
    <div className="w-full bg-white pt-32 pb-20 px-4 sm:px-6 lg:px-8 ml-0 lg:ml-20">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16" style={{marginLeft: "10.5rem"}}>
          <div className="inline-block mb-4">
            <span className="px-6 py-2 bg-gray-800 text-white rounded-full text-sm font-semibold tracking-wide shadow-lg">
              Categories
            </span>
          </div>
          <h2 className="text-5xl font-bold text-gray-900 mb-4">
            Luxury & Comfort Choices
          </h2>
          <p className="text-gray-600 text-lg font-light">Explore our premium collection of accommodations</p>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 justify-items-center" style={{marginLeft: "8rem", marginTop: "1rem"}}>
          {categories.map((category, index) => (
            <div
              key={index}
              onClick={() => handleCategoryClick(category.name)}
              className={`group relative rounded-2xl border transition-all duration-300 cursor-pointer overflow-hidden w-full max-w-[200px] ${
                selectedCategory === category.name
                  ? 'bg-gray-100 border-gray-800 shadow-2xl scale-105 ring-2 ring-gray-800'
                  : 'bg-white border-gray-300 hover:border-gray-600 hover:shadow-xl hover:scale-102 hover:bg-gray-50'
              }`}
            >
              {/* Background Image */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity duration-300">
                <img
                  src={category.image}
                  alt={category.name}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Content */}
              <div className="relative p-6 flex flex-col items-center text-center">
                {/* Icon */}
                <div className={`mb-4 transition-all duration-300 ${selectedCategory === category.name ? 'text-gray-800' : 'text-gray-700 group-hover:text-gray-900'}`}>
                  {category.icon}
                </div>

                {/* Category Name */}
                <h3 className={`text-lg font-bold mb-1 transition-colors duration-300 ${selectedCategory === category.name ? 'text-gray-900' : 'text-gray-800 group-hover:text-gray-900'}`}>
                  {category.name}
                </h3>

                {/* Items Count */}
                <p className={`text-sm transition-colors duration-300 ${selectedCategory === category.name ? 'text-gray-700' : 'text-gray-600 group-hover:text-gray-700'}`}>
                  {category.items}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Categories;
