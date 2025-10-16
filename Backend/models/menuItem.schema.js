import mongoose from "mongoose";

const menuItemScehma = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    category: {
        type: String,
        required: true,
        enum: ['Breakfast', 'Dinner', 'Lunch', 'Snacks', 'Drinks', 'Dessert'],
    },
    price: {
        type: Number,
        requird: true,
    },
    image:{
        type: String,

    },
    isAvailable : {
        type: Boolean,
        default: true,
    },
    orderType: {
        type: String,
        enum: ['KOT', 'BOT', 'Dine-In', 'Takeaway', 'Delivery', 'Room Service', 'Others'],
        default: "Others",
    },

    

}, {timestamps: true});

export const MenuItem = mongoose.model("MenuItem", menuItem);

