import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { GoogleOAuthProvider } from "@react-oauth/google";

// Import components
import Home from "./components/Home";
import Login from "./components/guestUsers/Login";
import Register from "./components/Register";
import ForgotPassword from "./components/ForgotPassword";
import ResetPassword from "./components/ResetPassword";
import OffersPage from "./components/OffersPage";
import MembershipPage from "./components/MembershipPage";
import HotelDetailsPage from "./components/HotelDetails";
import FilteredHotels from "./components/FilteredHotels";
import BookingConfirmed from "./components/BookingConfirmed";
import WaiterDashboard from "./components/WaiterDashboard/WaiterDashboard";
<<<<<<< HEAD
import SuperadminDashboard from "./components/Superadmin/SuperadminDashboard";
import UserManagement from "./components/Superadmin/Usermanagement";
import HotelManagement from "./components/Superadmin/HotelManagement";
import Feedback from "./components/Feedback";
import Footer from "./components/Footer";
import ContactUs from "./components/Contactus";
import AddHotel from "./components/Superadmin/AddHotel";
import RoomManagement from "./components/HotelAdmin/RoomManagement";
import HoteladminDashboard from "./components/HotelAdmin/HoteladminDashboard";
import RestaurantManagement from "./components/HotelAdmin/RestaurantManagement";
import AboutPage from "./components/AboutPage";
import StaffLogin from "./components/staff/StaffLogin";
import StaffForgotPassword from "./components/staff/staffForgotPassword";
import KitchenDashboard from "./components/KitchenDashboard/KitchenDashboard";

// Contexts / Route helpers
import { OrderProvider } from "./context/OrderContext";
import { StaffAuthProvider } from "./context/StaffAuthContext";
import ProtectedStaffRoute from "./routes/ProtectedStaffRoute";
=======
import KitchenDashboard from "./components/KitchenDashboard/KitchenDashboard";
import { OrderProvider } from "./context/OrderContext";
import { StaffAuthProvider } from "./context/StaffAuthContext";
import ProtectedStaffRoute from "./routes/ProtectedStaffRoute";
import AboutPage from "./components/AboutPage";
import StaffLogin from "./components/staff/StaffLogin";
import StaffForgotPassword from "./components/staff/StaffForgotPassword";

// Superadmin & Hotel Admin Components (commented out until files exist)
import SuperadminDashboard from "./components/Superadmin/SuperadminDashboard";  
import UserManagement from "./components/Superadmin/Usermanagement";
import HotelManagement from "./components/Superadmin/HotelManagement";
import AddHotel from "./components/Superadmin/AddHotel";
import HoteladminDashboard from "./components/HotelAdmin/HoteladminDashboard";
import RoomManagement from "./components/HotelAdmin/RoomManagement";
import RestaurantManagement from "./components/HotelAdmin/RestaurantManagement";
import Feedback from "./components/Feedback";
import Footer from "./components/Footer";
import ContactUs from "./components/Contactus";
import StaffResetPassword from "./components/staff/StaffResetPassword";
>>>>>>> 63ec8fd3f83e3b44e944b7bff3fb1e6f4119a602

const App = () => {
  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <Router>
        <StaffAuthProvider>
          <OrderProvider>
            {/* Page Routes */}
            <div className="w-screen min-h-screen overflow-x-hidden">
              <Routes>
                {/* Public Routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/" element={<Home />} />
<<<<<<< HEAD
                <Route path="/home" element={<Home />} />
=======
>>>>>>> 63ec8fd3f83e3b44e944b7bff3fb1e6f4119a602
                <Route path="/about" element={<AboutPage />} />
                <Route path="/offers" element={<OffersPage />} />
                <Route path="/memberships" element={<MembershipPage />} />
                <Route path="/membership" element={<MembershipPage />} />
                <Route path="/hotel/:id" element={<HotelDetailsPage />} />
                <Route path="/hotels" element={<FilteredHotels />} />
                <Route path="/booking-confirmed" element={<BookingConfirmed />} />
<<<<<<< HEAD
                <Route path="/feedback" element={<Feedback />} />
                <Route path="/footer" element={<Footer />} />
                <Route path="/contactus" element={<ContactUs />} />

                {/* Superadmin / Management Routes (temporary/public) */}
                <Route path="/waiter-dashboard" element={<WaiterDashboard />} />
                <Route path="/superadmindashboard" element={<SuperadminDashboard />} />
                <Route path="/usermanagement" element={<UserManagement />} />
                <Route path="/hotelmanagement" element={<HotelManagement />} />
                <Route path="/addhotel" element={<AddHotel />} />

                {/* Hoteladmin Dashboard - temporary */}
                <Route path="/hoteladmin" element={<HoteladminDashboard />} />
                <Route path="/roommanagement" element={<RoomManagement />} />
                <Route path="/restaurantmanagement" element={<RestaurantManagement />} />

                {/* Staff routes */}
                <Route path="/staff/login" element={<StaffLogin />} />
                <Route path="/staff/forgot-password" element={<StaffForgotPassword />} />

                {/* Protected staff dashboards */}
                <Route
                  path="/waiter-dashboard-protected"
                  element={
                    <ProtectedStaffRoute allowedRoles={["waiter"]}>
                      <WaiterDashboard />
                    </ProtectedStaffRoute>
                  }
                />
                <Route
                  path="/kitchen-dashboard"
                  element={
                    <ProtectedStaffRoute allowedRoles={["chief"]}>
                      <KitchenDashboard />
                    </ProtectedStaffRoute>
                  }
                />
=======

                {/* Staff Routes */}
                <Route path="/staff/login" element={<StaffLogin />} />
                <Route path="/staff/forgot-password" element={<StaffForgotPassword />} />
                <Route path="/staff/reset-password/:token" element = {<StaffResetPassword /> } />

                {/* Dashboard Routes (protected) */}
                <Route
                  path="/waiter-dashboard"
                  element={
                    <ProtectedStaffRoute allowedRoles={["waiter"]}>
                      <WaiterDashboard />
                    </ProtectedStaffRoute>
                  }
                />
                <Route
                  path="/kitchen-dashboard"
                  element={
                    <ProtectedStaffRoute allowedRoles={["chief"]}>
                      <KitchenDashboard />
                    </ProtectedStaffRoute>
                  }
                />

             {/*   Superadmin & Hotel Admin Routes (commented out until files exist) */}
                <Route path="/superadmindashboard" element={<SuperadminDashboard />} />
                <Route path="/usermanagement" element={<UserManagement />} />
                <Route path="/hotelmanagement" element={<HotelManagement />} />
                <Route path="/addhotel" element={<AddHotel />} />
                <Route path="/hoteladmin-dashboard" element={<HoteladminDashboard />} />
                <Route path="/roommanagement" element={<RoomManagement />} />
                <Route path="/restaurantmanagement" element={<RestaurantManagement />} />
                <Route path="/feedback" element={<Feedback />} />
                 <Route path="/contactus" element={<ContactUs />} />
>>>>>>> 63ec8fd3f83e3b44e944b7bff3fb1e6f4119a602
              </Routes>
            </div>
          </OrderProvider>
        </StaffAuthProvider>

        {/* Toast Container */}
        <ToastContainer
          position="top-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
        />
      </Router>
    </GoogleOAuthProvider>
  );
};

export default App;
