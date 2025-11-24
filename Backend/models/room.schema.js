import mongoose from "mongoose";


const roomSchema = new mongoose.Schema({
    hotel: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Hotel",
        required: true,
    },
    roomName: {
        type: String,
        required: true,
        trim: true,
    },
    roomNumber:{
        type: String,
        required: true,
    },
    type: {
        type: String,
        enum: ['single','double','suite','deluxe','villa'],
        required: true,
    },
    price: {
        type: Number,
        required: true,
    },
    status: {
        type: String,
        enum: ['available','occupied', 'maintenance', 'cleaning'],
        default: 'available',
        required: true,
    },
    description: {
        type: String,
        trim: true,
    },
    amenities: {
        type: [String],
        default: [],
    },
    images: {
        type: [String],
        default: [],
    },
    capacity: {
        adults: {
            type: Number,
            default: 2,
        },
        children: {
            type: Number,
            default: 0,
        },
    },
    bedType: {
        type: String,
        enum: ['Single', 'Double', 'Queen', 'King', 'Twin'],
    },
    QR: {
        type: String,
    }

}, {timestamps: true})

// Compound index for unique room numbers per hotel
roomSchema.index({ hotel: 1, roomNumber: 1 }, { unique: true })

export const Room = mongoose.model("Room", roomSchema);