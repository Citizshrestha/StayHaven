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
                <Route path="/home" element={<Home />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/offers" element={<OffersPage />} />
                <Route path="/memberships" element={<MembershipPage />} />
                <Route path="/membership" element={<MembershipPage />} />
                <Route path="/hotel/:id" element={<HotelDetailsPage />} />
                <Route path="/hotels" element={<FilteredHotels />} />
                <Route path="/booking-confirmed" element={<BookingConfirmed />} />
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
