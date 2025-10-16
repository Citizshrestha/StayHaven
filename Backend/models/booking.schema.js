import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema({
   user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
   },
   room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Room",
    required: true,
   },
   checkIn: {
    type: Date, 
    required: true,
   },
   checkOut: {
    type: Date, 
    required: true,
   },
   totalAmount: {
    type: Number,
    required: true,
   },
   status: {
    type: String,
    enum: ['Pending', 'Confirmed', 'Checked-In', 'Check-Out', 'Cancelled'],
    default: 'Pending',
   },

}, {timestamps: true});

export const Booking =  mongoose.model("Booking", bookingSchema);

