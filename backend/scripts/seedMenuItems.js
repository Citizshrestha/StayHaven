import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

import mongoose from "mongoose";
import { Hotel } from "../models/hotel.schema.js";
import { MenuItem } from "../models/menuItem.schema.js";

const MENU_ITEMS = [
  // ========== BREAKFAST (8 items) ==========
  {
    name: "Nepali Breakfast Set",
    description: "Aloo paratha, curd, pickle, and masala tea",
    category: "Breakfast", price: 280,
    image: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&h=300&fit=crop",
    isAvailable: true, preparationTime: 20,
  },
  {
    name: "English Full Breakfast",
    description: "Fried eggs, sausages, baked beans, mushrooms, grilled tomato, and toast",
    category: "Breakfast", price: 520,
    image: "https://images.unsplash.com/photo-1533089862017-5614ecb352ae?w=400&h=300&fit=crop",
    isAvailable: true, preparationTime: 20,
  },
  {
    name: "Berry Pancakes",
    description: "Fluffy pancakes served with maple syrup and fresh mixed berries",
    category: "Breakfast", price: 350,
    image: "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400&h=300&fit=crop",
    isAvailable: true, preparationTime: 15,
  },
  {
    name: "Avocado Toast",
    description: "Sourdough toast topped with smashed avocado, poached egg, and chili flakes",
    category: "Breakfast", price: 320,
    image: "https://images.unsplash.com/photo-1588137372308-15f75323ca8d?w=400&h=300&fit=crop",
    isAvailable: true, preparationTime: 10,
  },
  {
    name: "Eggs Benedict",
    description: "Poached eggs on toasted English muffins with ham and hollandaise sauce",
    category: "Breakfast", price: 450,
    image: "https://images.unsplash.com/photo-1608039829572-78524f79c4c7?w=400&h=300&fit=crop",
    isAvailable: true, preparationTime: 18,
  },
  {
    name: "French Toast",
    description: "Thick brioche slices dipped in egg batter, pan-fried, dusted with cinnamon sugar",
    category: "Breakfast", price: 300,
    image: "https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=400&h=300&fit=crop",
    isAvailable: true, preparationTime: 15,
  },
  {
    name: "Oatmeal with Fruits",
    description: "Warm oatmeal topped with sliced banana, strawberries, honey, and almonds",
    category: "Breakfast", price: 220,
    image: "https://images.unsplash.com/photo-1517673400267-0251440c45dc?w=400&h=300&fit=crop",
    isAvailable: true, preparationTime: 8,
  },
  {
    name: "Breakfast Burrito",
    description: "Flour tortilla stuffed with scrambled eggs, cheese, beans, and salsa",
    category: "Breakfast", price: 380,
    image: "https://images.unsplash.com/photo-1626700051175-6818013e1d28?w=400&h=300&fit=crop",
    isAvailable: true, preparationTime: 15,
  },

  // ========== LUNCH (10 items) ==========
  {
    name: "Chicken Biryani",
    description: "Fragrant basmati rice cooked with tender chicken and aromatic spices",
    category: "Lunch", price: 480,
    image: "https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=400&h=300&fit=crop",
    isAvailable: true, preparationTime: 30,
  },
  {
    name: "Dal Bhat Tarkari",
    description: "Traditional Nepali meal with rice, lentils, vegetable curry, and pickle",
    category: "Lunch", price: 320,
    image: "https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?w=400&h=300&fit=crop",
    isAvailable: true, preparationTime: 25,
  },
  {
    name: "Chicken Momo (10 pcs)",
    description: "Steamed dumplings filled with seasoned chicken, served with spicy tomato chutney",
    category: "Lunch", price: 300,
    image: "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=400&h=300&fit=crop",
    isAvailable: true, preparationTime: 20,
  },
  {
    name: "Veg Chowmein",
    description: "Stir-fried noodles with fresh vegetables and soy sauce",
    category: "Lunch", price: 240,
    image: "https://images.unsplash.com/photo-1552611052-33e04de081de?w=400&h=300&fit=crop",
    isAvailable: true, preparationTime: 15,
  },
  {
    name: "Margherita Pizza",
    description: "Classic Italian pizza with tomato sauce, mozzarella, and fresh basil",
    category: "Lunch", price: 550,
    image: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400&h=300&fit=crop",
    isAvailable: true, preparationTime: 25,
  },
  {
    name: "Chicken Burger",
    description: "Grilled chicken breast in a brioche bun with lettuce, tomato, and mayo",
    category: "Lunch", price: 450,
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop",
    isAvailable: true, preparationTime: 18,
  },
  {
    name: "Fish and Chips",
    description: "Beer-battered cod fillet served with thick-cut fries and tartar sauce",
    category: "Lunch", price: 580,
    image: "https://images.unsplash.com/photo-1579208575657-c595a05383b7?w=400&h=300&fit=crop",
    isAvailable: true, preparationTime: 22,
  },
  {
    name: "Thai Green Curry",
    description: "Creamy coconut curry with bamboo shoots, Thai basil, and jasmine rice",
    category: "Lunch", price: 420,
    image: "https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=400&h=300&fit=crop",
    isAvailable: true, preparationTime: 25,
  },
  {
    name: "Sushi Platter (12 pcs)",
    description: "Assorted nigiri and maki rolls with soy sauce, wasabi, and pickled ginger",
    category: "Lunch", price: 750,
    image: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=400&h=300&fit=crop",
    isAvailable: true, preparationTime: 20,
  },
  {
    name: "Grilled Chicken Wrap",
    description: "Flour tortilla wrap with grilled chicken, lettuce, cheese, and ranch dressing",
    category: "Lunch", price: 360,
    image: "https://images.unsplash.com/photo-1626700051175-6818013e1d28?w=400&h=300&fit=crop",
    isAvailable: true, preparationTime: 12,
  },

  // ========== DINNER (10 items) ==========
  {
    name: "Butter Chicken",
    description: "Creamy tomato-based curry with tender chicken pieces and butter",
    category: "Dinner", price: 550,
    image: "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=400&h=300&fit=crop",
    isAvailable: true, preparationTime: 30,
  },
  {
    name: "Tandoori Chicken",
    description: "Chicken marinated in yogurt and spices, roasted in clay oven",
    category: "Dinner", price: 480,
    image: "https://images.unsplash.com/photo-1603360946369-dc9bb6258143?w=400&h=300&fit=crop",
    isAvailable: true, preparationTime: 35,
  },
  {
    name: "Paneer Tikka",
    description: "Grilled cottage cheese cubes marinated in spiced yogurt",
    category: "Dinner", price: 420,
    image: "https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=400&h=300&fit=crop",
    isAvailable: true, preparationTime: 25,
  },
  {
    name: "Grilled Salmon",
    description: "Fresh Atlantic salmon grilled with herbs and lemon butter sauce",
    category: "Dinner", price: 950,
    image: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400&h=300&fit=crop",
    isAvailable: true, preparationTime: 25,
  },
  {
    name: "New York Steak",
    description: "300g premium beef steak with mashed potatoes and grilled vegetables",
    category: "Dinner", price: 1350,
    image: "https://images.unsplash.com/photo-1600891964092-4316c288032c?w=400&h=300&fit=crop",
    isAvailable: true, preparationTime: 35,
  },
  {
    name: "Lamb Chops",
    description: "Herb-crusted lamb chops served with mint sauce and roasted potatoes",
    category: "Dinner", price: 1100,
    image: "https://images.unsplash.com/photo-1544025162-d76690b60944?w=400&h=300&fit=crop",
    isAvailable: true, preparationTime: 30,
  },
  {
    name: "Prawn Tempura",
    description: "Crispy battered prawns served with tentsuyu dipping sauce",
    category: "Dinner", price: 680,
    image: "https://images.unsplash.com/photo-1615361200141-f45040f367be?w=400&h=300&fit=crop",
    isAvailable: true, preparationTime: 20,
  },
  {
    name: "Vegetable Korma",
    description: "Mixed vegetables in a rich, creamy cashew and coconut gravy",
    category: "Dinner", price: 380,
    image: "https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=400&h=300&fit=crop",
    isAvailable: true, preparationTime: 25,
  },
  {
    name: "Chicken Tikka Masala",
    description: "Roasted chicken chunks in a spiced creamy orange-colored sauce",
    category: "Dinner", price: 520,
    image: "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=400&h=300&fit=crop",
    isAvailable: true, preparationTime: 30,
  },
  {
    name: "Pasta Alfredo",
    description: "Fettuccine pasta in a rich and creamy parmesan cheese sauce",
    category: "Dinner", price: 480,
    image: "https://images.unsplash.com/photo-1612874742237-6526221588e3?w=400&h=300&fit=crop",
    isAvailable: true, preparationTime: 20,
  },

  // ========== SNACKS (8 items) ==========
  {
    name: "French Fries",
    description: "Crispy golden fries served with ketchup and mayo",
    category: "Snacks", price: 180,
    image: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400&h=300&fit=crop",
    isAvailable: true, preparationTime: 10,
  },
  {
    name: "Onion Rings",
    description: "Crispy battered onion rings with tangy dipping sauce",
    category: "Snacks", price: 200,
    image: "https://images.unsplash.com/photo-1639024471283-03518883512d?w=400&h=300&fit=crop",
    isAvailable: true, preparationTime: 12,
  },
  {
    name: "Buffalo Wings (8 pcs)",
    description: "Spicy buffalo chicken wings with blue cheese dip and celery sticks",
    category: "Snacks", price: 420,
    image: "https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=400&h=300&fit=crop",
    isAvailable: true, preparationTime: 20,
  },
  {
    name: "Samosa (3 pcs)",
    description: "Crispy pastry filled with spiced potatoes and peas",
    category: "Snacks", price: 150,
    image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&h=300&fit=crop",
    isAvailable: true, preparationTime: 15,
  },
  {
    name: "Nachos with Cheese",
    description: "Tortilla chips loaded with melted cheese, jalapenos, and salsa",
    category: "Snacks", price: 320,
    image: "https://images.unsplash.com/photo-1513456852971-30c0b81956d7?w=400&h=300&fit=crop",
    isAvailable: true, preparationTime: 12,
  },
  {
    name: "Garlic Bread",
    description: "Toasted bread brushed with garlic butter and herbs",
    category: "Snacks", price: 180,
    image: "https://images.unsplash.com/photo-1573140247632-f3a0f2f6b1b7?w=400&h=300&fit=crop",
    isAvailable: true, preparationTime: 8,
  },
  {
    name: "Mozzarella Sticks",
    description: "Breaded mozzarella sticks served with marinara sauce",
    category: "Snacks", price: 280,
    image: "https://images.unsplash.com/photo-1548340748-6d4e6f3a0ac1?w=400&h=300&fit=crop",
    isAvailable: true, preparationTime: 12,
  },
  {
    name: "Popcorn Chicken",
    description: "Bite-sized crispy fried chicken pieces with spicy mayo",
    category: "Snacks", price: 350,
    image: "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=400&h=300&fit=crop",
    isAvailable: true, preparationTime: 15,
  },

  // ========== DRINKS (8 items) ==========
  {
    name: "Masala Chai",
    description: "Traditional spiced milk tea with cardamom and ginger",
    category: "Drinks", price: 60,
    image: "https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=400&h=300&fit=crop",
    isAvailable: true, preparationTime: 8,
  },
  {
    name: "Fresh Lemon Soda",
    description: "Refreshing lemonade with soda, mint, and a pinch of salt",
    category: "Drinks", price: 120,
    image: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=400&h=300&fit=crop",
    isAvailable: true, preparationTime: 5,
  },
  {
    name: "Mango Lassi",
    description: "Creamy yogurt smoothie with fresh mango pulp",
    category: "Drinks", price: 150,
    image: "https://images.unsplash.com/photo-1623065422902-30a2d299bbe4?w=400&h=300&fit=crop",
    isAvailable: true, preparationTime: 5,
  },
  {
    name: "Cappuccino",
    description: "Rich espresso with steamed milk and velvety foam",
    category: "Drinks", price: 180,
    image: "https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=400&h=300&fit=crop",
    isAvailable: true, preparationTime: 8,
  },
  {
    name: "Iced Latte",
    description: "Espresso poured over ice with cold milk and vanilla syrup",
    category: "Drinks", price: 220,
    image: "https://images.unsplash.com/photo-1517701604599-bb29b5dd7359?w=400&h=300&fit=crop",
    isAvailable: true, preparationTime: 5,
  },
  {
    name: "Fresh Orange Juice",
    description: "Freshly squeezed oranges, served chilled with pulp",
    category: "Drinks", price: 160,
    image: "https://images.unsplash.com/photo-1613478223719-2ab802602423?w=400&h=300&fit=crop",
    isAvailable: true, preparationTime: 5,
  },
  {
    name: "Green Smoothie",
    description: "Blended spinach, banana, apple, and kale with chia seeds",
    category: "Drinks", price: 250,
    image: "https://images.unsplash.com/photo-1623065422902-30a2d299bbe4?w=400&h=300&fit=crop",
    isAvailable: true, preparationTime: 6,
  },
  {
    name: "Hot Chocolate",
    description: "Rich melted chocolate with steamed milk and whipped cream",
    category: "Drinks", price: 200,
    image: "https://images.unsplash.com/photo-1542990253-0d0f5be5f0c3?w=400&h=300&fit=crop",
    isAvailable: true, preparationTime: 8,
  },

  // ========== DESSERT (8 items) ==========
  {
    name: "Gulab Jamun (2 pcs)",
    description: "Soft milk dumplings soaked in fragrant sugar syrup",
    category: "Dessert", price: 120,
    image: "https://images.unsplash.com/photo-1590080875515-8a3a8dc5735c?w=400&h=300&fit=crop",
    isAvailable: true, preparationTime: 10,
  },
  {
    name: "Chocolate Lava Cake",
    description: "Warm chocolate cake with a molten center, served with vanilla ice cream",
    category: "Dessert", price: 400,
    image: "https://images.unsplash.com/photo-1624353365286-3f8b75663445?w=400&h=300&fit=crop",
    isAvailable: true, preparationTime: 20,
  },
  {
    name: "New York Cheesecake",
    description: "Creamy baked cheesecake with graham cracker crust and berry compote",
    category: "Dessert", price: 450,
    image: "https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=400&h=300&fit=crop",
    isAvailable: true, preparationTime: 15,
  },
  {
    name: "Tiramisu",
    description: "Classic Italian coffee-flavoured dessert with mascarpone and cocoa",
    category: "Dessert", price: 380,
    image: "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=400&h=300&fit=crop",
    isAvailable: true, preparationTime: 12,
  },
  {
    name: "Fruit Tart",
    description: "Crisp pastry shell filled with custard and topped with seasonal fresh fruits",
    category: "Dessert", price: 320,
    image: "https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=400&h=300&fit=crop",
    isAvailable: true, preparationTime: 15,
  },
  {
    name: "Chocolate Brownie",
    description: "Dense fudgy brownie served warm with vanilla ice cream",
    category: "Dessert", price: 280,
    image: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=400&h=300&fit=crop",
    isAvailable: true, preparationTime: 12,
  },
  {
    name: "Mango Sticky Rice",
    description: "Sweet glutinous rice with fresh mango slices and coconut cream",
    category: "Dessert", price: 280,
    image: "https://images.unsplash.com/photo-1596797038530-2c8db982bc51?w=400&h=300&fit=crop",
    isAvailable: true, preparationTime: 15,
  },
  {
    name: "Crème Brûlée",
    description: "Rich custard base topped with a layer of hardened caramelized sugar",
    category: "Dessert", price: 350,
    image: "https://images.unsplash.com/photo-1470324161839-ce2bb6fa6bc3?w=400&h=300&fit=crop",
    isAvailable: true, preparationTime: 15,
  },

  // ========== APPETIZERS (8 items) ==========
  {
    name: "Tomato Basil Soup",
    description: "Creamy tomato soup with fresh basil and croutons",
    category: "Appetizers", price: 180,
    image: "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&h=300&fit=crop",
    isAvailable: true, preparationTime: 15,
  },
  {
    name: "Caesar Salad",
    description: "Romaine lettuce with Caesar dressing, croutons, and parmesan shavings",
    category: "Appetizers", price: 320,
    image: "https://images.unsplash.com/photo-1550304943-4f24f54ddde9?w=400&h=300&fit=crop",
    isAvailable: true, preparationTime: 10,
  },
  {
    name: "Bruschetta",
    description: "Toasted bread topped with diced tomatoes, garlic, basil, and olive oil",
    category: "Appetizers", price: 280,
    image: "https://images.unsplash.com/photo-1572695157360-7e77afae9bf0?w=400&h=300&fit=crop",
    isAvailable: true, preparationTime: 12,
  },
  {
    name: "Spring Rolls (4 pcs)",
    description: "Crispy vegetable-filled spring rolls with sweet chili dip",
    category: "Appetizers", price: 250,
    image: "https://images.unsplash.com/photo-1606525437679-037aca74a3e9?w=400&h=300&fit=crop",
    isAvailable: true, preparationTime: 15,
  },
  {
    name: "Garlic Prawns",
    description: "Sizzling prawns cooked in garlic butter with chili and parsley",
    category: "Appetizers", price: 550,
    image: "https://images.unsplash.com/photo-1559737558-2f5a35f4523b?w=400&h=300&fit=crop",
    isAvailable: true, preparationTime: 15,
  },
  {
    name: "Stuffed Mushrooms",
    description: "Baked mushrooms stuffed with cream cheese, herbs, and breadcrumbs",
    category: "Appetizers", price: 300,
    image: "https://images.unsplash.com/photo-1504545102780-26774c1f6b9e?w=400&h=300&fit=crop",
    isAvailable: true, preparationTime: 18,
  },
  {
    name: "Shrimp Cocktail",
    description: "Chilled poached prawns served with tangy cocktail sauce",
    category: "Appetizers", price: 480,
    image: "https://images.unsplash.com/photo-1559737558-2f5a35f4523b?w=400&h=300&fit=crop",
    isAvailable: true, preparationTime: 10,
  },
  {
    name: "Hummus and Pita",
    description: "Creamy chickpea hummus with warm pita bread and olive oil",
    category: "Appetizers", price: 220,
    image: "https://images.unsplash.com/photo-1637949385162-e416fb15b2ce?w=400&h=300&fit=crop",
    isAvailable: true, preparationTime: 8,
  },
];

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ MongoDB connected");
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    process.exit(1);
  }
};

const seedMenuItems = async () => {
  try {
    await connectDB();

    const hotels = await Hotel.find();
    if (hotels.length === 0) {
      console.log("❌ No hotels found. Please create a hotel first.");
      process.exit(1);
    }

    console.log(`📍 Found ${hotels.length} hotel(s). Seeding menu items...\n`);

    let totalCreated = 0;
    let totalSkipped = 0;

    for (const hotel of hotels) {
      console.log(`🏨 Hotel: ${hotel.name} (${hotel._id})`);

      // Get existing item names for this hotel
      const existingItems = await MenuItem.find({ hotel: hotel._id }).select("name");
      const existingNames = new Set(existingItems.map(i => i.name.toLowerCase()));

      // Filter only new items
      const newItems = MENU_ITEMS.filter(item => !existingNames.has(item.name.toLowerCase()));

      if (newItems.length === 0) {
        console.log(`   ⚠️  All ${MENU_ITEMS.length} menu items already exist. Skipping...`);
        continue;
      }

      const itemsToCreate = newItems.map((item) => ({
        ...item,
        hotel: hotel._id,
      }));

      const created = await MenuItem.insertMany(itemsToCreate);
      console.log(`   ✅ Created ${created.length} new menu items`);
      totalCreated += created.length;
      totalSkipped += existingNames.size;

      // Log summary by category
      const byCategory = {};
      created.forEach((item) => {
        byCategory[item.category] = (byCategory[item.category] || 0) + 1;
      });
      Object.entries(byCategory).forEach(([cat, count]) => {
        console.log(`      • ${cat}: ${count} new items`);
      });
    }

    console.log(`\n✅ Total new menu items created: ${totalCreated}`);
    if (totalSkipped > 0) {
      console.log(`⏭️  Total existing items skipped: ${totalSkipped}`);
    }
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding menu items:", error);
    process.exit(1);
  }
};

seedMenuItems();
