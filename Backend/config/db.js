import mongoose from "mongoose";
import dns from "dns";

// Override DNS to use Google's public DNS (8.8.8.8) to fix querySrv ECONNREFUSED
// caused by local DNS servers blocking MongoDB Atlas SRV record lookups
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);

const connectDB = async () => {
    try {
        if (!process.env.MONGODB_URI) {
            console.error("MONGODB-URI is not defined in the .env file, please check again");
            process.exit(1);
        }

        await mongoose.connect(process.env.MONGODB_URI);
        console.log("MongoDB Connected Successfully");
    } catch (error) {
        console.error("MongoDB Connection Failed:", error.message);
        console.error("Full error:", error);
        process.exit(1);
    }
}

export default connectDB;