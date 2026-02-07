export const mockRootProps = {
  hotel: {
    name: "Sunset Valley Resort",
    location: "123 Serenity Lane, Meadowville, California",
    rating: 4.5,
    reviewCount: 1284,
    pricePerNight: 249, // USD, will be converted to NPR
    images: [
      "https://images.unsplash.com/photo-1607836046730-3317bd58a31b?w=800&q=80",
      "https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=400&q=80",
      "https://images.unsplash.com/photo-1575429198097-0414ec08e8cd?w=400&q=80",
      "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&q=80",
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400&q=80"
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
    ]
  },
  booking: {
    nights: 3,
    taxesAndFees: 92,
    guests: "2 Adults, 1 Child"
  }
};
