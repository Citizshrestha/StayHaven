import express from "express";
import { isAuthenticated } from "../middleware/isAuthenticated.js";
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

// Public routes (no auth required)
router.get("/:id/availability", getRoomAvailability);    // Get room availability calendar

// All other routes require authentication
router.use(isAuthenticated);

// Room CRUD operations
router.get("/", getRooms);                              // Get all rooms for a hotel
router.post("/", createRoom);                           // Create a new room
router.get("/:id", getRoomById);                        // Get single room by ID
router.put("/:id", updateRoom);                         // Update a room
router.delete("/:id", deleteRoom);                      // Delete a room

// QR code operations
router.post("/batch-generate-qr", batchGenerateRoomQR); // Batch generate QR for all rooms
router.get("/qr-codes/:hotelId", getAllRoomQRCodes);    // Get all QR codes for a hotel
router.post("/:id/generate-qr", generateRoomQR);        // Generate/Regenerate QR code
router.patch("/:id/toggle-qr", toggleRoomQR);           // Toggle QR active status
router.get("/:id/qr-download", getRoomQRDownload);      // Get QR code for download

export default router;
