import { v2 as cloudinary } from 'cloudinary';

// Function to initialize cloudinary with env vars
const initCloudinary = () => {
    const isConfigured = process.env.CLOUDINARY_CLOUD_NAME && 
                        process.env.CLOUDINARY_API_KEY && 
                        process.env.CLOUDINARY_API_SECRET;

    if (!isConfigured) {
        console.warn('⚠️  Cloudinary not configured. Image uploads will not work.');
        return;
    }

    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
        timeout: 120000, // 120 seconds timeout for all API calls
    });

    console.log(`✅ Cloudinary initialized: ${process.env.CLOUDINARY_CLOUD_NAME}`);
};

export { initCloudinary };
export default cloudinary;