import QRCode from 'qrcode';
import cloudinary from '../config/cloudinary.js';

/**
 * QR Code Generator Utility
 * Generates QR codes for hotel tables and rooms
 * Supports both base64 storage and Cloudinary upload for production
 */

// Base URL for the guest portal - should be set in environment variables
const getBaseUrl = () => {
  return process.env.FRONTEND_URL || 'http://localhost:5173';
};

/**
 * Upload base64 image to Cloudinary
 * @param {string} base64Image - Base64 encoded image
 * @param {string} folder - Cloudinary folder path
 * @param {string} publicId - Public ID for the image
 * @returns {Promise<string>} - Cloudinary URL
 */
const uploadToCloudinary = async (base64Image, folder, publicId) => {
  try {
    const result = await cloudinary.uploader.upload(base64Image, {
      folder: folder,
      public_id: publicId,
      overwrite: true,
      resource_type: 'image',
    });
    return result.secure_url;
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    // Return base64 as fallback
    return null;
  }
};

/**
 * Generate QR code data URL for a table
 * @param {string} uniqueToken - The unique token for the table
 * @param {string} hotelId - The hotel ID (optional, for additional context)
 * @param {boolean} uploadToCloud - Whether to upload to Cloudinary (default: false)
 * @returns {Promise<{qrCodeData: string, qrCodeImage: string}>}
 */
export const generateTableQRCode = async (uniqueToken, hotelId = null, uploadToCloud = false) => {
  const baseUrl = getBaseUrl();
  const qrCodeData = `${baseUrl}/guest/table/${uniqueToken}`;
  
  try {
    // Generate QR code as base64 data URL
    const qrCodeBase64 = await QRCode.toDataURL(qrCodeData, {
      type: 'image/png',
      width: 400,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
      errorCorrectionLevel: 'H', // High error correction for better scanning
    });
    
    let qrCodeImage = qrCodeBase64;
    
    // Optionally upload to Cloudinary for production
    if (uploadToCloud && process.env.CLOUDINARY_CLOUD_NAME) {
      const cloudinaryUrl = await uploadToCloudinary(
        qrCodeBase64,
        `qrcodes/tables/${hotelId || 'general'}`,
        uniqueToken
      );
      if (cloudinaryUrl) {
        qrCodeImage = cloudinaryUrl;
      }
    }
    
    return {
      qrCodeData,
      qrCodeImage,
    };
  } catch (error) {
    console.error('Error generating table QR code:', error);
    throw new Error('Failed to generate QR code');
  }
};

/**
 * Generate QR code data URL for a room
 * @param {string} uniqueToken - The unique token for the room
 * @param {string} hotelId - The hotel ID (optional, for additional context)
 * @param {boolean} uploadToCloud - Whether to upload to Cloudinary (default: false)
 * @returns {Promise<{qrCodeData: string, qrCodeImage: string}>}
 */
export const generateRoomQRCode = async (uniqueToken, hotelId = null, uploadToCloud = false) => {
  const baseUrl = getBaseUrl();
  const qrCodeData = `${baseUrl}/guest/room/${uniqueToken}`;
  
  try {
    // Generate QR code as base64 data URL
    const qrCodeBase64 = await QRCode.toDataURL(qrCodeData, {
      type: 'image/png',
      width: 400,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
      errorCorrectionLevel: 'H',
    });
    
    let qrCodeImage = qrCodeBase64;
    
    // Optionally upload to Cloudinary for production
    if (uploadToCloud && process.env.CLOUDINARY_CLOUD_NAME) {
      const cloudinaryUrl = await uploadToCloudinary(
        qrCodeBase64,
        `qrcodes/rooms/${hotelId || 'general'}`,
        uniqueToken
      );
      if (cloudinaryUrl) {
        qrCodeImage = cloudinaryUrl;
      }
    }
    
    return {
      qrCodeData,
      qrCodeImage,
    };
  } catch (error) {
    console.error('Error generating room QR code:', error);
    throw new Error('Failed to generate QR code');
  }
};

/**
 * Generate QR code as Buffer (for file saving or upload)
 * @param {string} data - The data to encode
 * @param {object} options - QR code options
 * @returns {Promise<Buffer>}
 */
export const generateQRCodeBuffer = async (data, options = {}) => {
  const defaultOptions = {
    type: 'png',
    width: 400,
    margin: 2,
    errorCorrectionLevel: 'H',
    ...options,
  };
  
  try {
    return await QRCode.toBuffer(data, defaultOptions);
  } catch (error) {
    console.error('Error generating QR code buffer:', error);
    throw new Error('Failed to generate QR code buffer');
  }
};

/**
 * Generate QR code as SVG string
 * @param {string} data - The data to encode
 * @returns {Promise<string>}
 */
export const generateQRCodeSVG = async (data) => {
  try {
    return await QRCode.toString(data, {
      type: 'svg',
      width: 400,
      margin: 2,
      errorCorrectionLevel: 'H',
    });
  } catch (error) {
    console.error('Error generating QR code SVG:', error);
    throw new Error('Failed to generate QR code SVG');
  }
};

/**
 * Validate QR token format
 * @param {string} token - The token to validate
 * @param {string} type - 'table' or 'room'
 * @returns {boolean}
 */
export const validateQRToken = (token, type) => {
  if (!token || typeof token !== 'string') {
    return false;
  }
  
  if (type === 'table') {
    return token.startsWith('TBL-') && token.length === 20; // TBL- + 16 hex chars
  }
  
  if (type === 'room') {
    return token.startsWith('RM-') && token.length === 19; // RM- + 16 hex chars
  }
  
  return false;
};

/**
 * Parse QR code URL to extract token and type
 * @param {string} url - The QR code URL
 * @returns {{type: string, token: string} | null}
 */
export const parseQRCodeUrl = (url) => {
  if (!url || typeof url !== 'string') {
    return null;
  }
  
  // Match table URL pattern
  const tableMatch = url.match(/\/guest\/table\/(TBL-[A-F0-9]+)/i);
  if (tableMatch) {
    return { type: 'table', token: tableMatch[1] };
  }
  
  // Match room URL pattern
  const roomMatch = url.match(/\/guest\/room\/(RM-[A-F0-9]+)/i);
  if (roomMatch) {
    return { type: 'room', token: roomMatch[1] };
  }
  
  return null;
};

export default {
  generateTableQRCode,
  generateRoomQRCode,
  generateQRCodeBuffer,
  generateQRCodeSVG,
  validateQRToken,
  parseQRCodeUrl,
};
