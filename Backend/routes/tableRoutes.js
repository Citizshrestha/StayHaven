import express from "express";
import { isAuthenticated } from "../middleware/isAuthenticated.js";
import { writeOperationLimiter, batchLimiter } from "../middleware/rateLimiter.js";
import { sanitizeAll } from "../middleware/sanitization.js";
import {
  createTable,
  getTables,
  getTableById,
  updateTable,
  deleteTable,
  generateTableQR,
  batchCreateTables,
  updateTableStatus,
  getTableQRDownload,
} from "../controllers/hotelTableController.js";

const router = express.Router();

// Apply sanitization to all routes
router.use(sanitizeAll());

// All routes require authentication
router.use(isAuthenticated);

// Table CRUD operations
router.post("/", writeOperationLimiter, createTable);                      // Create a new table
router.get("/", getTables);                         // Get all tables for a hotel
router.post("/batch", batchLimiter, batchCreateTables);           // Batch create multiple tables
router.get("/:id", getTableById);                   // Get single table by ID
router.put("/:id", writeOperationLimiter, updateTable);                    // Update table
router.delete("/:id", writeOperationLimiter, deleteTable);                 // Delete table

// Table status operations
router.patch("/:id/status", writeOperationLimiter, updateTableStatus);     // Quick status update

// QR code operations
router.post("/:id/generate-qr", writeOperationLimiter, generateTableQR);   // Generate/Regenerate QR code
router.get("/:id/qr-download", getTableQRDownload); // Get QR code for download

export default router;
