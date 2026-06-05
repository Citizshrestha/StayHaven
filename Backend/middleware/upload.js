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

const sanitizePathSegment = (value, fallback = 'unknown') =>
    (value || fallback)
        .replace(/[^a-zA-Z0-9\s_-]/g, '')
        .replace(/\s+/g, '_')
        .replace(/_+/g, '_')
        .trim();

const buildStaffProfileFolder = (staffDetails = {}) => {
    const sanitizedFullname = sanitizePathSegment(staffDetails.fullname);
    const sanitizedRole = sanitizePathSegment(staffDetails.role || 'staff', 'staff').toLowerCase();
    return `StayHaven/${sanitizedRole}/profile-pic/${sanitizedFullname}`;
};

export const buildSuperadminProfileFolder = (username) => {
    const sanitizedUsername = sanitizePathSegment(username, 'unknown').toLowerCase();
    return `StayHaven/superadmin/${sanitizedUsername}/profilepic`;
};

// Helper: upload buffer to cloudinary using base64 data URI (more reliable than upload_stream)
// Folder structure: StayHaven/{role}/profile-pic/{fullname} or custom folder via options.folder
export const uploadToCloudinary = async (fileBuffer, options = null) => {
    let folder = "StayHaven/staff/profile-pic/unknown";

    if (typeof options === 'string') {
        folder = options;
    } else if (options?.folder) {
        folder = options.folder;
    } else if (options && (options.role || options.fullname)) {
        folder = buildStaffProfileFolder(options);
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
