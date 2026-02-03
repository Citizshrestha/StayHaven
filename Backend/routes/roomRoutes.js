import express from "express";
import { isAuthenticated } from "../middleware/isAuthenticated.js";
import {
  getRooms,
  getRoomById,
  generateRoomQR,
  batchGenerateRoomQR,
  toggleRoomQR,
  getRoomQRDownload,
  getAllRoomQRCodes,
} from "../controllers/roomController.js";

const router = express.Router();

// All routes require authentication
router.use(isAuthenticated);

// Room listing
router.get("/", getRooms);                              // Get all rooms for a hotel
router.get("/:id", getRoomById);                        // Get single room by ID

// QR code operations
router.post("/batch-generate-qr", batchGenerateRoomQR); // Batch generate QR for all rooms
router.get("/qr-codes/:hotelId", getAllRoomQRCodes);    // Get all QR codes for a hotel
router.post("/:id/generate-qr", generateRoomQR);        // Generate/Regenerate QR code
router.patch("/:id/toggle-qr", toggleRoomQR);           // Toggle QR active status
router.get("/:id/qr-download", getRoomQRDownload);      // Get QR code for download

export default router;
