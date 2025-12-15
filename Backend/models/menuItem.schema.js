import mongoose from "mongoose";

const menuItemSchema = new mongoose.Schema({
    hotel: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Hotel',
        required: true,
    },
    name: {
        type: String,
        required: true,
        trim: true,
    },
    description: {
        type: String,
        trim: true,
        maxlength: 500,
    },
    category: {
        type: String,
        required: true,
        enum: ['Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Drinks', 'Dessert', 'Appetizers'],
    },
    price: {
        type: Number,
        required: true,
        min: 0,
    },
    image: {
        type: String,
    },
    isAvailable: {
        type: Boolean,
        default: true,
    },
    orderType: {
        type: String,
        enum: ['KOT', 'BOT', 'Dine-In', 'Takeaway', 'Delivery', 'Room Service', 'Others'],
        default: "Others",
    },
    preparationTime: {
        type: Number, // In minutes
        default: 15,
        min: 5,
        max: 120,
    },
    spiceLevel: {
        type: String,
        enum: ['mild', 'medium', 'hot', 'very-hot', 'none'],
    },
    dietary: {
        type: [String],
        enum: ['vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'halal', 'kosher', 'none'],
        default: [],
    },
    allergens: {
        type: [String],
        default: [],
    },
}, {timestamps: true});

// Indexes for performance
menuItemSchema.index({ hotel: 1, category: 1 });
menuItemSchema.index({ hotel: 1, isAvailable: 1 });
menuItemSchema.index({ name: 'text', description: 'text' });

export const MenuItem = mongoose.model("MenuItem", menuItemSchema);

