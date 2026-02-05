import express from "express";
import { isAuthenticated } from "../middleware/isAuthenticated.js";
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

// All routes require authentication
router.use(isAuthenticated);

// Table CRUD operations
router.post("/", createTable);                      // Create a new table
router.get("/", getTables);                         // Get all tables for a hotel
router.post("/batch", batchCreateTables);           // Batch create multiple tables
router.get("/:id", getTableById);                   // Get single table by ID
router.put("/:id", updateTable);                    // Update table
router.delete("/:id", deleteTable);                 // Delete table

// Table status operations
router.patch("/:id/status", updateTableStatus);     // Quick status update

// QR code operations
router.post("/:id/generate-qr", generateTableQR);   // Generate/Regenerate QR code
router.get("/:id/qr-download", getTableQRDownload); // Get QR code for download

export default router;
