import express from "express";
import { isAuthenticated } from "../middleware/isAuthenticated.js";
import { writeOperationLimiter, batchLimiter } from "../middleware/rateLimiter.js";
import { sanitizeAll } from "../middleware/sanitization.js";
import {
  getRooms,
  getRoomById,
  createRoom,
  updateRoom,
  deleteRoom,
  generateRoomQR,
  batchGenerateRoomQR,
  toggleRoomQR,
  getRoomQRDownload,
  getAllRoomQRCodes,
  getRoomAvailability,
} from "../controllers/roomController.js";

const router = express.Router();

// Apply sanitization to all routes
router.use(sanitizeAll());

// Public routes (no auth required)
router.get("/:id/availability", getRoomAvailability);    // Get room availability calendar

// All other routes require authentication
router.use(isAuthenticated);

// Room CRUD operations
router.get("/", getRooms);                              // Get all rooms for a hotel
router.post("/", writeOperationLimiter, createRoom);                           // Create a new room
router.get("/:id", getRoomById);                        // Get single room by ID
router.put("/:id", writeOperationLimiter, updateRoom);                         // Update a room
router.delete("/:id", writeOperationLimiter, deleteRoom);                      // Delete a room

// QR code operations
router.post("/batch-generate-qr", batchLimiter, batchGenerateRoomQR); // Batch generate QR for all rooms
router.get("/qr-codes/:hotelId", getAllRoomQRCodes);    // Get all QR codes for a hotel
router.post("/:id/generate-qr", writeOperationLimiter, generateRoomQR);        // Generate/Regenerate QR code
router.patch("/:id/toggle-qr", writeOperationLimiter, toggleRoomQR);           // Toggle QR active status
router.get("/:id/qr-download", getRoomQRDownload);      // Get QR code for download

export default router;
