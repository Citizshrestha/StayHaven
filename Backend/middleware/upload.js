import multer from 'multer';
import cloudinary from "../config/cloudinary.js";

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
        fileSize: 5 * 1024 * 1024,   //5MB Max
    }
});

// Helper: upload buffer to cloudinary using base64 data URI (more reliable than upload_stream)
// Folder structure: StayHaven/{role}/profile-pic/{fullname}
export const uploadToCloudinary = async (fileBuffer, staffDetails = null) => {
    // Create folder structure: StayHaven/{role}/profile-pic/{fullname}
    let folder = "StayHaven/staff/profile-pic/unknown"; // default fallback

    if (staffDetails) {
        const { role, fullname } = staffDetails;
        // Sanitize fullname for folder name (replace spaces with underscores, remove special chars)
        const sanitizedFullname = (fullname || 'unknown')
            .replace(/[^a-zA-Z0-9\s_-]/g, '')
            .replace(/\s+/g, '_')
            .replace(/_+/g, '_')
            .trim();

        const sanitizedRole = (role || 'staff')
            .replace(/[^a-zA-Z0-9]/g, '_')
            .toLowerCase();

        folder = `StayHaven/${sanitizedRole}/profile-pic/${sanitizedFullname}`;
    }

    // Convert buffer to base64 data URI — avoids stream/timeout issues
    const base64String = fileBuffer.toString('base64');
    const dataUri = `data:image/png;base64,${base64String}`;

    try {
        const result = await cloudinary.uploader.upload(dataUri, {
            folder,
            timeout: 120000, // 120 seconds
            overwrite: true, // overwrite existing file in the same folder
            transformation: [
                { width: 300, height: 300, crop: 'fill', gravity: 'face' },
                { quality: "auto", fetch_format: "auto" },
            ],
        });
        return result;
    } catch (error) {
        console.error("Cloudinary upload error details:", error);
        throw error;
    }
};
