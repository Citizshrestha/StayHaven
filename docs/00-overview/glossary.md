# Glossary

> Definitions of terms, acronyms, and concepts used throughout StayHaven documentation

---

## 🏨 Business Terms

### **Booking**
A reservation made by a guest for a hotel room. Includes check-in date, check-out date, guest details, and payment information.

### **Check-In**
The process of a guest arriving at the hotel and receiving their assigned room. Typically occurs at 2:00 PM.

### **Check-Out**
The process of a guest leaving the hotel and settling their bill. Typically occurs at 12:00 PM.

### **Commission**
A percentage fee charged on bookings. OTAs typically charge 15-25%, StayHaven charges 10%.

### **Company**
A business entity that owns one or more hotel properties. Used for multi-property management.

### **Direct Booking**
A reservation made directly through the hotel (via StayHaven) rather than through a third-party OTA.

### **Featured Hotel**
A property highlighted on the homepage by platform administrators, typically high-rated or newly listed.

### **Guest**
A customer who books and stays at a hotel. Also refers to the user role in the system.

### **Hotel Chain**
A company that owns or manages multiple hotel properties under a common brand.

### **Occupancy Rate**
Percentage of rooms occupied. Formula: (Occupied Rooms / Total Rooms) × 100

### **OTA (Online Travel Agency)**
Third-party booking platforms like Booking.com, Expedia, Airbnb.

### **Property**
A hotel, resort, villa, or accommodation listed on the StayHaven platform.

### **Room Service**
Food or beverage orders delivered to a guest's room.

### **SaaS (Software as a Service)**
Business model where software is provided via subscription (StayHaven's model).

---

## 🖥️ Technical Terms

### **Access Token**
Short-lived JWT token (1 hour) used to authenticate API requests. Stored in localStorage.

### **API (Application Programming Interface)**
Set of endpoints that allow frontend to communicate with backend. RESTful design.

### **Authentication**
Process of verifying a user's identity (login with email/password or Google OAuth).

### **Authorization**
Process of verifying what actions a user is allowed to perform (RBAC).

### **Bcrypt**
Password hashing algorithm used to securely store passwords. Uses 10 salt rounds.

### **CORS (Cross-Origin Resource Sharing)**
Security mechanism that allows frontend (localhost:5173) to make requests to backend (localhost:3000).

### **JWT (JSON Web Token)**
Compact token format for securely transmitting authentication information between client and server.

### **Middleware**
Functions that execute before route handlers in Express.js (e.g., authentication, error handling).

### **MongoDB**
NoSQL document database used to store all application data. Hosted on MongoDB Atlas.

### **Mongoose**
ODM (Object Data Modeling) library for MongoDB. Provides schema validation and query building.

### **OAuth 2.0**
Industry-standard protocol for authorization. Used for Google Sign-In integration.

### **OTP (One-Time Password)**
6-digit code sent via email for verification (signup, password reset). Expires in 10 minutes.

### **RBAC (Role-Based Access Control)**
Authorization strategy where permissions are assigned based on user roles.

### **Refresh Token**
Long-lived token (7 days) stored in httpOnly cookie. Used to generate new access tokens.

### **RESTful API**
Architectural style for APIs using HTTP methods (GET, POST, PUT, DELETE) and resource-based URLs.

### **Schema**
MongoDB document structure defined using Mongoose. Includes fields, types, and validation rules.

### **Socket.io**
JavaScript library for real-time, bidirectional communication using WebSockets.

### **WebSocket**
Protocol for persistent, two-way communication between client and server. Enables real-time updates.

---

## 🍽️ Order Management Terms

### **BOT (Bar Order Ticket)**
Digital ticket for bar/beverage orders. Sent to bar staff for preparation.

### **Dine-In**
Order type where guest eats at the hotel restaurant (not room service).

### **KOT (Kitchen Order Ticket)**
Digital ticket for food orders. Sent to kitchen staff for preparation.

### **Order Number**
Auto-incremented unique identifier for orders. Starts at 1001 per hotel.

### **Order Status**
Lifecycle state of an order:
- **Pending**: Order placed, not yet acknowledged
- **Confirmed**: Kitchen/bar has accepted order
- **Preparing**: Currently being made
- **Ready**: Completed, waiting for delivery
- **Delivered**: Handed to guest
- **Cancelled**: Order cancelled by staff or guest

### **Order Type**
Category of order:
- **Room Service**: Delivered to guest room
- **Dine-In**: Eat at restaurant
- **Takeaway**: Guest picks up and leaves

### **Priority Level**
Urgency of an order:
- **Normal**: Standard processing (default)
- **High**: Expedited processing (VIP guest, urgent request)

### **Takeaway**
Order prepared for guest to pick up and take with them (no delivery).

---

## 👥 User Roles

### **Admin**
Platform-level administrator. Can approve hotels, manage users, feature properties.

### **Chief (Chef)**
Kitchen staff member who manages food preparation. Views kitchen dashboard.

### **Guest**
Customer who books hotels and orders services. Lowest privilege level.

### **Manager**
Hotel manager who oversees all property operations. Can manage staff and view analytics.

### **Owner**
Business owner who creates company, lists hotels, invites staff. Highest hotel-level privilege.

### **Receptionist**
Front desk staff who handles check-ins, bookings, room assignments.

### **Staff**
Generic term for hotel employees (waiter, chef, receptionist, manager).

### **Waiter**
Restaurant staff who takes orders and serves guests. Views waiter dashboard.

---

## 🔐 Security Terms

### **Cookie**
Small piece of data stored in browser. Used for refresh tokens (httpOnly, Secure flags).

### **CSRF (Cross-Site Request Forgery)**
Attack where malicious site tricks user into executing unwanted actions. Mitigated by SameSite cookies.

### **Hash**
One-way cryptographic function. Passwords are hashed before storage (cannot be reversed).

### **HttpOnly Cookie**
Cookie that cannot be accessed via JavaScript. Used for refresh tokens to prevent XSS attacks.

### **Salt**
Random data added to passwords before hashing. Prevents rainbow table attacks.

### **Session**
Period of time a user is logged in. Managed via access/refresh token pair.

### **Token Expiry**
Time after which a token becomes invalid. Access: 1 hour, Refresh: 7 days.

### **XSS (Cross-Site Scripting)**
Attack where malicious scripts are injected into web pages. Mitigated by input sanitization.

---

## 📊 Database Terms

### **Collection**
MongoDB equivalent of a SQL table. Contains documents (e.g., users, hotels, orders).

### **Document**
MongoDB equivalent of a SQL row. JSON-like object stored in a collection.

### **Index**
Database optimization structure. Speeds up queries on specific fields (e.g., email, hotelId).

### **Compound Index**
Index on multiple fields. Used for queries filtering by multiple criteria.

### **Population**
Mongoose feature that replaces document IDs with actual documents (like SQL JOIN).

### **Reference**
MongoDB relationship where one document stores the ObjectId of another.

### **Schema Validation**
Rules enforced by Mongoose to ensure data integrity (required fields, types, enums).

---

## 🔄 Real-Time Terms

### **Broadcast**
Sending a message to multiple clients simultaneously via Socket.io.

### **Connection**
Active WebSocket link between client and server. Persists until client disconnects.

### **Event**
Named message sent over Socket.io (e.g., 'new-order', 'order-ready').

### **Ping/Pong**
Heartbeat mechanism to check if connection is alive. Sent every 25 seconds.

### **Reconnection**
Automatic process of re-establishing WebSocket connection after disconnect.

### **Room**
Socket.io concept for grouping connections. Used for hotel-specific and role-specific broadcasts.

### **Socket**
Individual WebSocket connection instance. Has unique socket.id.

---

## 🏗️ Architecture Terms

### **Backend**
Server-side application (Node.js + Express.js) running on port 3000.

### **Client-Server**
Architecture where frontend (client) requests data from backend (server).

### **Component**
Reusable React UI element (e.g., Navbar, HotelCard, OrderList).

### **Context API**
React's built-in state management solution. Used for auth, socket, orders.

### **Frontend**
Client-side application (React + Vite) running on port 5173.

### **MERN Stack**
MongoDB, Express.js, React, Node.js - the technology stack used.

### **Multi-Tenancy**
Architecture where single system serves multiple organizations (companies/hotels).

### **MVC (Model-View-Controller)**
Design pattern separating data (Model), UI (View), and logic (Controller).

### **SPA (Single Page Application)**
Web app that loads once and dynamically updates content without full page reloads.

---

## 📦 Development Terms

### **Environment Variables**
Configuration values stored in .env files (API keys, database URLs).

### **Hot Module Replacement (HMR)**
Vite feature that updates code in browser without full reload.

### **Middleware**
Function that processes requests before they reach route handlers.

### **Route**
URL endpoint that maps to a controller function (e.g., /api/auth/login).

### **State Management**
Managing and sharing data across React components (using Context API).

---

## 🔗 Related Documents

- [Target Users and Personas](./target-users-and-personas.md) - User role details
- [System Architecture Overview](../02-architecture/system-architecture-overview.md) - Technical terms in context
- [Database Overview](../06-database/database-overview.md) - Database terminology

---

## 📅 Document Info

**Created**: February 2, 2026
**Last Updated**: February 2, 2026
**Version**: 1.0
**Status**: ✅ Complete
