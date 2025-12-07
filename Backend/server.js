import express from 'express';
import connectDB from './config/db.js';
import dotenv from 'dotenv';
import cors from 'cors';
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import hotelRoutes from "./routes/hotelRoutes.js";
import companyRoutes from "./routes/companyRoutes.js";
import { Role } from "./models/role.schema.js";
import staffRoutes from "./routes/staffRoutes.js"
import cookieParser from 'cookie-parser';

dotenv.config();
const app = express();


// Connect to DB
connectDB();

// Seed roles
const seedRoles = async () => {
    const roles = ['admin', 'staff', 'guest', 'owner', 'kitchen', 'waiter', 'manager', 'receptionist'];
    try {
        for (let roleName of roles) {
            if (!(await Role.findOne({ name: roleName }))) {
                await new Role({ name: roleName }).save();
                console.log(`✅ Role '${roleName}' created`);
            }
        }
        console.log('✅ All roles seeded successfully');
    } catch (err) {
        console.error('❌ Error seeding roles:', err);
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
                message: 'Malformed JSON in request body. Remove body for GET requests or send valid JSON.'
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
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return res.status(400).json({
            success: false,
            message: 'Malformed JSON in request body. Remove body for GET requests or send valid JSON.'
        });
    }

    // Some parsers set err.type === 'entity.parse.failed'
    if (err && err.type === 'entity.parse.failed') {
        return res.status(400).json({
            success: false,
            message: 'Invalid JSON body. Please send valid JSON or remove the request body for GET requests.'
        });
    }

    // Otherwise pass error to the next handler
    next(err);
});


const PORT = process.env.PORT || 3000;;

// routes
app.get("/", (req, res) => {
    res.send(`Welcome to Hotel Booking and Order Management System`);
});
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/hotels', hotelRoutes);
app.use('/api/company', companyRoutes);
app.use('/api/staff', staffRoutes);



// start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});