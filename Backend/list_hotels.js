
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Hotel } from './models/hotel.schema.js';

dotenv.config();

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB Connected');

        const hotels = await Hotel.find({});
        console.log('--- HOTELS ---');
        hotels.forEach(h => {
            console.log(`ID: ${h._id}, Name: ${h.name}, Company: ${h.company}`);
        });

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

connectDB();
