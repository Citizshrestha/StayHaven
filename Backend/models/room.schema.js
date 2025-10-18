import mongoose from "mongoose";


const roomSchema = new mongoose.Schema({
    roomName: {
        type: String,
        required: true,
        unique: true,
        default: "room",
        trim: true,
    },
    roomNumber:{
        type: Number,
        required: true,
        unique: true,
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
    ammeneties: {
        type: [{type:  string}]
    },
    images: {
        type: String,
        // required: true,
    },

    QR: {
        type: String,
        required: true,
    }

}, {timestamps: true})

export const Room = mongoose.model("Room", roomSchema);