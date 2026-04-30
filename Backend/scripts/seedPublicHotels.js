import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import connectDB from "../config/db.js";
import { Role } from "../models/role.schema.js";
import { User } from "../models/user.schema.js";
import { Company } from "../models/company.schema.js";
import { Hotel } from "../models/hotel.schema.js";
import { Room } from "../models/room.schema.js";

const SEED_OWNER = {
  fullname: "Seed Owner",
  username: "seed_owner",
  email: "seed.owner@test.com",
  password: "Seed@1234",
};

const SEED_COMPANY = {
  name: "Seed Hospitality Group",
  legalName: "Seed Hospitality Group Pvt. Ltd.",
  type: "hotel_chain",
  description: "Seed",
  contact: {
    phone: "+977-9800000000",
    email: "hello@seedhospitality.com",
    website: "https://seedhospitality.com",
  },
  address: {
    street: "Durbar Marg",
    city: "Kathmandu",
    state: "Bagmati",
    country: "Nepal",
    postalCode: "44600",
    coordinates: { latitude: 27.7172, longitude: 85.324 },
  },
  status: "active",
  isVerified: true,
  verifiedAt: new Date(),
};

const HOTEL_SEED = [
  {
    name: "The Grand Elysian",
    category: "Hotel",
    starRating: 5,
    rating: 4.8,
    reviewCount: 1284,
    location: { city: "Kathmandu", address: "Thamel, Kathmandu" },
    priceRange: { min: 1850, max: 3200 },
    images: [
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1600&q=80",
      "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=1600&q=80",
      "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=1600&q=80",
      "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=1600&q=80",
      "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1600&q=80",
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1600&q=80",
    ],
    amenities: ["wifi", "restaurant", "parking", "room-service", "spa"],
    contact: { phone: "+977-1-5551111", email: "elysian@stayhaven.com" },
    description:
      "A refined boutique stay in the heart of Thamel with rooftop dining, curated art interiors, and quick access to heritage streets and nightlife.",
  },
  {
    name: "Himalayan Oasis",
    category: "Hotel",
    starRating: 5,
    rating: 4.7,
    reviewCount: 1089,
    location: { city: "Kathmandu", address: "Lazimpat, Kathmandu" },
    priceRange: { min: 1950, max: 3600 },
    images: [
      "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=1600&q=80",
      "https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=1600&q=80",
      "https://images.unsplash.com/photo-1598928636135-d146006ff4be?w=1600&q=80",
      "https://images.unsplash.com/photo-1575429198097-0414ec08e8cd?w=1600&q=80",
      "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=1600&q=80",
    ],
    amenities: ["wifi", "gym", "spa", "restaurant", "room-service"],
    contact: { phone: "+977-1-5552222", email: "oasis@stayhaven.com" },
    description:
      "Calm, design-forward rooms with mountain-view balconies, a compact fitness studio, and an on-site spa built for long, restorative stays.",
  },
  {
    name: "Boudha Boutique Hotel",
    category: "Hotel",
    starRating: 4,
    rating: 4.3,
    reviewCount: 856,
    location: { city: "Kathmandu", address: "Boudha, Kathmandu" },
    priceRange: { min: 1250, max: 2200 },
    images: [
      "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=1600&q=80",
      "https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=1600&q=80",
      "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=1600&q=80",
      "https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=1600&q=80",
    ],
    amenities: ["wifi", "parking", "restaurant", "pet-friendly"],
    contact: { phone: "+977-1-5553333", email: "boudha@stayhaven.com" },
    description:
      "Steps from the stupa, this boutique property pairs warm wood textures with quiet courtyards, ideal for travelers who want peace without losing convenience.",
  },
  {
    name: "Lakeside Retreat Hotel",
    category: "Hotel",
    starRating: 4,
    rating: 4.4,
    reviewCount: 634,
    location: { city: "Pokhara", address: "Lakeside, Pokhara" },
    priceRange: { min: 1350, max: 2600 },
    images: [
      "https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=1600&q=80",
      "https://images.unsplash.com/photo-1501117716987-c8e1ecb2100b?w=1600&q=80",
      "https://images.unsplash.com/photo-1445991842772-097fea258e7b?w=1600&q=80",
      "https://images.unsplash.com/photo-1541971875076-8f970d573be6?w=1600&q=80",
    ],
    amenities: ["wifi", "pool", "restaurant", "parking"],
    contact: { phone: "+977-61-5554444", email: "lakeside@stayhaven.com" },
    description:
      "Lakefront sunsets, a bright pool deck, and airy rooms with outdoor seating make this a relaxed base for paragliding mornings and café evenings.",
  },
  {
    name: "Mountain View Hotel",
    category: "Hotel",
    starRating: 3,
    rating: 3.9,
    reviewCount: 521,
    location: { city: "Pokhara", address: "Sarangkot, Pokhara" },
    priceRange: { min: 900, max: 1650 },
    images: [
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1600&q=80",
      "https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=1600&q=80",
      "https://images.unsplash.com/photo-1549294413-26f195200c16?w=1600&q=80",
    ],
    amenities: ["wifi", "parking", "pet-friendly"],
    contact: { phone: "+977-61-5555555", email: "mountainview@stayhaven.com" },
    description:
      "Simple, scenic, and budget-friendly—wake up early for sunrise viewpoints and return to a cozy stay with reliable Wi‑Fi and warm service.",
  },
  {
    name: "Everest Panorama Resort",
    category: "Resort",
    starRating: 5,
    rating: 4.6,
    reviewCount: 876,
    location: { city: "Bhaktapur", address: "Nagarkot, Bhaktapur" },
    priceRange: { min: 18900, max: 25500 },
    images: [
      "https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=1600&q=80",
      "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1600&q=80",
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1600&q=80",
      "https://images.unsplash.com/photo-1596436889106-be35e843f974?w=1600&q=80",
    ],
    amenities: ["wifi", "pool", "spa", "restaurant", "gym", "parking"],
    contact: { phone: "+977-1-5556666", email: "panorama@stayhaven.com" },
    description:
      "A hilltop resort designed around wide Himalayan vistas, with a full spa, outdoor pool, and cozy fireside lounges for crisp evenings.",
  },
];

const roomTemplates = (hotelName, basePrice) => [
  {
    roomNumber: "201",
    type: "Deluxe King",
    price: Math.round(basePrice * 1.0),
    bedType: "King",
    amenities: ["WiFi", "AC", "Smart TV", "Workspace"],
    description: `Deluxe King Room with city views at ${hotelName}.`,
    images: [
      "https://images.unsplash.com/photo-1598928636135-d146006ff4be?w=1200&q=80",
      "https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=1200&q=80",
    ],
  },
  {
    roomNumber: "305",
    type: "Executive Suite",
    price: Math.round(basePrice * 1.35),
    bedType: "King",
    amenities: ["WiFi", "AC", "Smart TV", "Mini Bar", "Coffee Maker"],
    description: `Spacious Executive Suite with lounge area at ${hotelName}.`,
    images: [
      "https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=1200&q=80",
      "https://images.unsplash.com/photo-1501117716987-c8e1ecb2100b?w=1200&q=80",
    ],
  },
  {
    roomNumber: "402",
    type: "Standard Queen",
    price: Math.round(basePrice * 0.85),
    bedType: "Queen",
    amenities: ["WiFi", "AC", "TV"],
    description: `Comfortable Standard Queen room at ${hotelName}.`,
    images: [
      "https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=1200&q=80",
    ],
  },
];

async function ensureOwnerAndCompany() {
  const ownerRole = (await Role.findOne({ name: "owner" })) || (await Role.create({ name: "owner" }));

  let owner = await User.findOne({ email: SEED_OWNER.email });
  if (!owner) {
    owner = await User.create({
      ...SEED_OWNER,
      role: ownerRole._id,
      companyRole: "owner",
      isActive: true,
      isEmailVerified: true,
      accountStatus: "active",
    });
  }

  let company = await Company.findOne({ owner: owner._id });
  if (!company) {
    company = await Company.create({
      ...SEED_COMPANY,
      owner: owner._id,
      totalUsers: 1,
      totalProperties: 0,
    });
  }

  // Attach company to owner if missing
  if (!owner.company || String(owner.company) !== String(company._id)) {
    owner.company = company._id;
    owner.companyRole = "owner";
    await owner.save();
  }

  return { owner, company };
}

async function seedHotels({ owner, company }) {
  const names = HOTEL_SEED.map((h) => h.name);

  // Remove existing seed hotels (idempotent)
  const existing = await Hotel.find({ owner: owner._id, company: company._id, name: { $in: names } }, "_id");
  if (existing.length) {
    const ids = existing.map((h) => h._id);
    await Room.deleteMany({ hotel: { $in: ids } });
    await Hotel.deleteMany({ _id: { $in: ids } });
  }

  const hotelsToInsert = HOTEL_SEED.map((h) => ({
    ...h,
    owner: owner._id,
    company: company._id,
    status: "approved",
    isActive: true,
    featured: h.starRating >= 5 && h.rating >= 4.6,
    policies: {
      checkIn: "2:00 PM",
      checkOut: "12:00 PM",
      cancellationPolicy: "Free cancellation up to 24 hours before check-in",
      petPolicy: h.amenities.includes("pet-friendly") ? "Pets allowed (small breeds only)" : "Pets not allowed",
    },
  }));

  const createdHotels = await Hotel.insertMany(hotelsToInsert, { ordered: false });

  // Rooms
  const rooms = [];
  for (const hotel of createdHotels) {
    const base = Math.max(900, hotel.priceRange?.min || 900);
    for (const rt of roomTemplates(hotel.name, base)) {
      rooms.push({
        hotel: hotel._id,
        company: company._id,
        roomName: `${hotel.name} - Room ${rt.roomNumber}`,
        roomNumber: rt.roomNumber,
        type: rt.type,
        price: rt.price,
        bedType: rt.bedType,
        amenities: rt.amenities,
        description: rt.description,
        images: rt.images,
        status: "available",
        isQrActive: true,
      });
    }
  }
  if (rooms.length) {
    await Room.insertMany(rooms, { ordered: false });
  }

  await Company.findByIdAndUpdate(company._id, { totalProperties: createdHotels.length });

  return createdHotels;
}

async function main() {
  const connected = await connectDB();
  if (!connected) {
    throw new Error("MongoDB not connected. Please set MONGODB_URI in Backend/.env");
  }

  const { owner, company } = await ensureOwnerAndCompany();
  const hotels = await seedHotels({ owner, company });

  // eslint-disable-next-line no-console
  console.log(`Seeded ${hotels.length} hotels into DB (company: ${company.name}).`);
  // eslint-disable-next-line no-console
  console.log("Sample hotel ids:", hotels.slice(0, 3).map((h) => String(h._id)));
}

main()
  .then(async () => {
    await mongoose.disconnect();
    process.exit(0);
  })
  .catch(async (err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    try {
      await mongoose.disconnect();
    } catch (_) {
      // ignore
    }
    process.exit(1);
  });

