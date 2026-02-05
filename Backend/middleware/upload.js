import multer from 'multer';
import cloudinary from "../config/cloudinary.js";
import { Readable } from 'stream';

// using memory storage - file stays in buffer, not saved to local disk
const storage = multer.memoryStorage();

// file filter - only allow images
const fileFilter = (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("Only JPEG, PNG, JPG, and WEBP images are allowed"), false);
    }
};

// multer upload config
export const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5*1024*1024,   //5MB Max
    }
});

// Helper function to convert buffer to readable stream
const bufferToStream = (buffer) => {
    const readable = new Readable();
    readable.push(buffer);
    readable.push(null);
    return readable;
};

//helper func to upload buffer to cloudinary
export const uploadToCloudinary = (fileBuffer, staffDetails = null) => {
    // Create folder structure: profilePictures/staff/{role}/{fullname}
    let folder = "profile-pictures"; // default fallback
    
    if (staffDetails) {
        const { role, fullname } = staffDetails;
        // Sanitize fullname for folder name (remove spaces, special chars)
        const sanitizedName = fullname
            .replace(/[^a-zA-Z0-9]/g, '_')
            .replace(/_+/g, '_')
            .toLowerCase();
        
        folder = `profilePictures/staff/${role}/${sanitizedName}`;
    }
    
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder,
                transformation: [
                    { width: 300, height: 300, crop: 'fill', gravity: 'face' },
                    { quality: "auto", fetch_format: "auto" },
                ],
            },
            (error, result) => {
                if (error) {
                    console.error("Cloudinary upload error details:", error);
                    reject(error);
                } else {
                    resolve(result);
                }
            }
        );

        // Pipe the buffer as a stream to the upload stream
        bufferToStream(fileBuffer).pipe(uploadStream);
    });
}