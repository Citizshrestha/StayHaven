import mongoose from "mongoose";
import dns from "dns";

// Override DNS to use Google's public DNS (8.8.8.8) to fix querySrv ECONNREFUSED
// caused by local DNS servers blocking MongoDB Atlas SRV record lookups
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);

const connectDB = async () => {
    const isProduction = process.env.NODE_ENV === "production";

    try {
        if (!process.env.MONGODB_URI) {
            console.error("MONGODB-URI is not defined in the .env file, please check again");
            if (isProduction) {
                throw new Error("MONGODB_URI is required in production");
            }

            console.warn("⚠️ Starting backend without MongoDB connection (development mode)");
            return false;
        }

        await mongoose.connect(process.env.MONGODB_URI);
        console.log("MongoDB Connected Successfully");
        return true;
    } catch (error) {
        console.error("MongoDB Connection Failed:", error.message);
        console.error("Full error:", error);

        if (isProduction) {
            throw error;
        }

        console.warn("⚠️ Continuing without MongoDB (development mode)");
        return false;
    }
}

export default connectDB;