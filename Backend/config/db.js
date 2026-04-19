import mongoose from "mongoose";
import dns from "dns";
import { createLogger } from "../utils/logger.js";

const logger = createLogger('Database');

// Override DNS to use Google's public DNS (8.8.8.8) to fix querySrv ECONNREFUSED
// caused by local DNS servers blocking MongoDB Atlas SRV record lookups
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);

const connectDB = async () => {
    const isProduction = process.env.NODE_ENV === "production";

    try {
        if (!process.env.MONGODB_URI) {
            logger.error("MONGODB_URI is not defined in the .env file");
            if (isProduction) {
                throw new Error("MONGODB_URI is required in production");
            }

            logger.warn("Starting backend without MongoDB connection (development mode)");
            return false;
        }

        await mongoose.connect(process.env.MONGODB_URI);
        logger.info("MongoDB Connected Successfully");
        return true;
    } catch (error) {
        logger.error("MongoDB Connection Failed", { message: error.message, stack: error.stack });

        if (isProduction) {
            throw error;
        }

        logger.warn("Continuing without MongoDB (development mode)");
        return false;
    }
}

export default connectDB;