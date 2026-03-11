import dotenv from "dotenv";
dotenv.config();
<<<<<<< HEAD
import { createServer } from "http";
=======

import express from "express";
import { createServer } from "http";
import connectDB from "./config/db.js";
>>>>>>> fdaae3dffdc7121130444a067ee3a87c420addbe
import cors from "cors";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import hotelRoutes from "./routes/hotelRoutes.js";
import companyRoutes from "./routes/companyRoutes.js";
import { Role } from "./models/role.schema.js";
import staffRoutes from "./routes/staffRoutes.js";
import tableRoutes from "./routes/tableRoutes.js";
import roomRoutes from "./routes/roomRoutes.js";
import guestRoutes from "./routes/guestRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import seedRoutes from "./routes/seedRoutes.js";
import cookieParser from "cookie-parser";
<<<<<<< HEAD
import notificationRoutes from "./routes/notificationRoutes.js";
import { initCloudinary } from "./config/cloudinary.js";
import { initSocket } from "./config/socket.js";
=======
import { initCloudinary } from "./config/cloudinary.js";
import { initSocket } from "./config/socket.js";

>>>>>>> fdaae3dffdc7121130444a067ee3a87c420addbe
// Initialize cloudinary with env vars
initCloudinary();

const app = express();
// Create HTTP server for Socket.io
const httpServer = createServer(app);

// Initialize Socket.io
initSocket(httpServer);

// Connect to DB
connectDB();

// Seed roles
const seedRoles = async () => {
  const roles = [
    "admin",
    "staff",
    "guest",
    "owner",
    "chief", 
    "waiter",
    "manager",
    "receptionist",
  ];
  try {
    for (let roleName of roles) {
      if (!(await Role.findOne({ name: roleName }))) {
        await new Role({ name: roleName }).save();
        console.log(`✅ Role '${roleName}' created`);
      }
    }
    console.log("✅ All roles seeded successfully");
  } catch (err) {
    console.error("❌ Error seeding roles:", err);
  }
};
seedRoles();

// Middleware
// Wrap express.json so we can immediately handle malformed JSON and avoid uncaught exceptions
app.use((req, res, next) => {
  express.json()(req, res, (err) => {
    if (err) {
      // Malformed JSON — respond immediately
      return res.status(400).json({
        success: false,
        message:
          "Malformed JSON in request body. Remove body for GET requests or send valid JSON.",
      });
    }
    next();
  });
});
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

// JSON/body parse error handler - returns JSON instead of HTML stack trace
app.use((err, req, res, next) => {
  // body-parser / express.json throws SyntaxError for malformed JSON
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({
      success: false,
      message:
        "Malformed JSON in request body. Remove body for GET requests or send valid JSON.",
    });
  }

  // Some parsers set err.type === 'entity.parse.failed'
  if (err && err.type === "entity.parse.failed") {
    return res.status(400).json({
      success: false,
      message:
        "Invalid JSON body. Please send valid JSON or remove the request body for GET requests.",
    });
  }

  // Otherwise pass error to the next handler
  next(err);
});

const PORT = process.env.PORT || 3000;

// routes
app.get("/", (req, res) => {
  res.send(`Welcome to Hotel Booking and Order Management System`);
});
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/hotels", hotelRoutes);
app.use("/api/company", companyRoutes);
app.use("/api/staff", staffRoutes);
<<<<<<< HEAD
app.use("/api/notifications", notificationRoutes);
=======
app.use("/api/tables", tableRoutes);      // HotelTable management (authenticated)
app.use("/api/rooms", roomRoutes);        // Room QR management (authenticated)
app.use("/api/bookings", bookingRoutes);  // Booking management (authenticated)
app.use("/api/seed", seedRoutes);         // Seed test data (admin only)
app.use("/api/guest", guestRoutes);       // Guest QR scanning (public)
>>>>>>> fdaae3dffdc7121130444a067ee3a87c420addbe

// start server - use httpServer instead of app for Socket.io support
httpServer.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`🔌 WebSocket server ready for connections`);
});
