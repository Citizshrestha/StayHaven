import mongoose from "mongoose";

const connectDB = async () => {
    try {
        if (!process.env.MONGODB_URI){
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