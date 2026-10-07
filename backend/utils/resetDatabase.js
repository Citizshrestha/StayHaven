import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const resetDatabase = async () => {
    try {
        console.log(' Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log(' Connected!\n');

        const collections = ['hotels', 'rooms', 'bookings', 'companies'];

        for (const collectionName of collections) {
            try {
                await mongoose.connection.db.dropCollection(collectionName);
                console.log(`✓ Dropped collection: ${collectionName}`);
            } catch (error) {
                if (error.message.includes('ns not found')) {
                    console.log(`ℹ  Collection '${collectionName}' doesn't exist, skipping...`);
                } else {
                    throw error;
                }
            }
        }

        console.log('\n Database reset complete!');
        await mongoose.connection.close();
        console.log(' Disconnected from MongoDB');
        process.exit(0);
    } catch (error) {
        console.error(' Error:', error.message);
        process.exit(1);
    }
};

resetDatabase();
