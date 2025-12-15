
// Script to list users and their roles
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from './models/user.schema.js';
import { Role } from './models/role.schema.js';

dotenv.config();

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB Connected');

        const users = await User.find({}).populate('role');
        console.log('--- USERS ---');
        users.forEach(u => {
            console.log(`Email: ${u.email}, Role: ${u.role?.name || u.companyRole}, Password (hashed): ${u.password.substring(0, 10)}...`);
        });

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

connectDB();
