import {v2 as cloudinary} from 'cloudinary';

// Function to initialize cloudinary with env vars
const initCloudinary = () => {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
    });
    
    console.log("Cloudinary initialized:", {
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME ? "SET" : "NOT SET",
        api_key: process.env.CLOUDINARY_API_KEY ? "SET" : "NOT SET",
        api_secret: process.env.CLOUDINARY_API_SECRET ? "SET" : "NOT SET",
    });
};

export { initCloudinary };
export default cloudinary;

