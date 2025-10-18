import express from 'express';
import connectDB from './config/db.js';
import dotenv from 'dotenv';
import cors from 'cors';
import authRoutes from "./routes/authRoutes.js";
import {Role} from "./models/role.schema.js";


dotenv.config();
const app = express();


// Connect to DB
connectDB();

// Seed roles
const seedRoles = async () => {
    const roles = ['admin', 'staff', 'guest'];
    try {
        for (let roleName of roles){
            if (!(await Role.findOne({role: roleName}))){
                await new Role({name: roleName}).save();
                // console.log(`Role ${roleName} created`);
            }
        }
    } catch (err) {
        console.error('Error seeding roles:', err);
    }
};
seedRoles();

// Middleware
app.use(express.json());
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


const PORT  =  process.env.PORT || 3000;;

 // routes
app.get("/",(req,res)=> {
    res.send(`Welcome to Hotel Booking and Order Management System`);
});
app.use('/api/auth', authRoutes);




// start server
app.listen(PORT,()=> {
    console.log(`Server is running on port ${PORT}`);
});