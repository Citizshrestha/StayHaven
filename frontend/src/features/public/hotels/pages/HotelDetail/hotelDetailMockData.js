export const mockRootProps = {
  hotel: {
    name: "Sunset Valley Resort",
    location: "123 Serenity Lane, Meadowville, California",
    rating: 4.5,
    reviewCount: 1284,
    pricePerNight: 850,
    images: [
      "https://images.unsplash.com/photo-1607836046730-3317bd58a31b?w=800&q=80",
      "https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=400&q=80",
      "https://images.unsplash.com/photo-1575429198097-0414ec08e8cd?w=400&q=80",
      "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&q=80",
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400&q=80",
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&q=80",
      "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=1200&q=80",
      "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=1200&q=80",
      "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=1200&q=80",
      "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=1200&q=80"
    ],
    description: "Nestled in the heart of Meadowville, Sunset Valley Resort offers a tranquil escape with breathtaking views and world-class amenities. Whether you're here for a romantic getaway, a family vacation, or a corporate retreat, our resort provides the perfect blend of luxury, comfort, and nature. Enjoy our pristine pools, gourmet dining, and rejuvenating spa services.",
    amenities: [
      { icon: "wifi", label: "Free Wi-Fi" },
      { icon: "pool", label: "Swimming Pool" },
      { icon: "gym", label: "Gym" },
      { icon: "restaurant", label: "Restaurant" },
      { icon: "parking", label: "Free Parking" },
      { icon: "spa", label: "Spa" },
      { icon: "room-service", label: "Room Service" },
      { icon: "pet-friendly", label: "Pet Friendly" }
    ],
    highlights: ["Beachfront", "Free Parking", "Free WiFi"],
    badges: ["Top Rated 2024", "Best Value"],
    mapImage: "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=1600&q=80",
    attractions: [
      { icon: "🏖️", label: "Beach", distance: "0.3km" },
      { icon: "🍽️", label: "Restaurants", distance: "0.1km" },
      { icon: "🛒", label: "Mall", distance: "1.2km" },
      { icon: "⛵", label: "Marina", distance: "0.6km" }
    ],
    rooms: [
      {
        id: "deluxe-king",
        title: "Deluxe King Room",
        size: "35m²",
        bed: "1 King Bed",
        guests: "2 guests",
        view: "Garden view",
        features: ["Bathtub", "Smart TV", "Air Conditioning", "Workspace"],
        price: 850,
        badge: "Popular",
        image: "https://images.unsplash.com/photo-1598928636135-d146006ff4be?w=1200&q=80",
        roomNumbers: [
          { number: "201", available: true },
          { number: "202", available: true },
          { number: "203", available: true },
          { number: "204", available: false }
        ]
      },
      {
        id: "ocean-suite",
        title: "Ocean View Suite",
        size: "52m²",
        bed: "1 King Bed",
        guests: "3 guests",
        view: "Ocean view",
        features: ["Balcony", "Mini Bar", "Lounge Area", "Rain Shower"],
        price: 1200,
        badge: "Best Seller",
        image: "https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=1200&q=80",
        roomNumbers: [
          { number: "301", available: true },
          { number: "302", available: false },
          { number: "303", available: true },
          { number: "304", available: true }
        ]
      },
      {
        id: "family-residence",
        title: "Family Residence",
        size: "68m²",
        bed: "2 Queen Beds",
        guests: "4 guests",
        view: "Pool view",
        features: ["Kitchenette", "Dining Nook", "Smart TV", "Private Patio"],
        price: 1450,
        badge: "Family Pick",
        image: "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=1200&q=80",
        roomNumbers: [
          { number: "401", available: true },
          { number: "402", available: true },
          { number: "403", available: false },
          { number: "404", available: true }
        ]
      }
    ],
    reviewSummary: {
      excellentLabel: "Excellent",
      distribution: [
        { stars: 5, percent: 68 },
        { stars: 4, percent: 23 },
        { stars: 3, percent: 7 },
        { stars: 2, percent: 1 },
        { stars: 1, percent: 1 }
      ]
    },
    reviews: [
      {
        id: "rv-1",
        name: "Olivia Foster",
        country: "🇺🇸",
        date: "Mar 14, 2026",
        rating: 5,
        text: "Absolutely loved the ambiance. The suite overlooked the ocean, breakfast was top-class, and the staff made everything effortless. We extended our stay by two nights."
      },
      {
        id: "rv-2",
        name: "Aarav Shah",
        country: "🇳🇵",
        date: "Feb 28, 2026",
        rating: 4,
        text: "Beautiful property with a premium vibe. Booking process was smooth and the room amenities were exactly as advertised. Great value for the quality."
      },
      {
        id: "rv-3",
        name: "Mila Kovac",
        country: "🇭🇷",
        date: "Jan 10, 2026",
        rating: 5,
        text: "From check-in to check-out, everything felt curated. The pool deck sunsets are unreal and the location is perfect for walking to nearby restaurants."
      }
    ]
  },
  booking: {
    nights: 3,
    taxesAndFees: 92,
    guests: "2 Adults, 1 Child",
    freeCancellationDate: "Apr 4, 2026"
  }
};