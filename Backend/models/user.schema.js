import mongoose, { Mongoose } from "mongoose";

const User = new Mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    password: {
        type: String,
        required: true,
    },
    role: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Role",
        required: true
    },
    roomNumber: {
        type: String,
        default: null,
    },
    contact: {
        type: String,
    },
    isActive: {
        type: Boolean,
        default: true,
    }

}, {timestamps: true});


export default mongoose.model("User", userSchema);