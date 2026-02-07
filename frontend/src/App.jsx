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
import KitchenDashboard from "./components/KitchenDashboard/KitchenDashboard";
// Superadmin & Hotel Admin Components
import SuperadminDashboard from "./components/Superadmin/SuperadminDashboard";
import UserManagement from "./components/Superadmin/Usermanagement";
import HotelManagement from "./components/Superadmin/HotelManagement";
import AddHotel from "./components/Superadmin/AddHotel";
import HoteladminDashboard from "./components/HotelAdmin/HoteladminDashboard";
import RoomManagement from "./components/HotelAdmin/RoomManagement";
import RestaurantManagement from "./components/HotelAdmin/RestaurantManagement";
import Loyaltypoints from "./components/HotelAdmin/Loyaltypoints";
import HotelReport from "./components/HotelAdmin/HotelReport";
import Feedback from "./components/Feedback";
import Footer from "./components/Footer";
import ContactUs from "./components/Contactus";
import AboutPage from "./components/AboutPage";
// Staff components
import StaffLogin from "./components/staff/StaffLogin";
import StaffForgotPassword from "./components/staff/staffForgotPassword";
import StaffResetPassword from "./components/staff/StaffResetPassword";
// Contexts / Route helpers
import { OrderProvider } from "./context/OrderContext";
import { StaffAuthProvider } from "./context/StaffAuthContext";
import ProtectedStaffRoute from "./routes/ProtectedStaffRoute";
import GuestDashboard from "./components/guestUsers/GuestDashboard";
import Mybooking from "./components/guestUsers/Mybooking";
import Foodorder from "./components/guestUsers/Foodorder";
import LoyaltyRewards from "./components/guestUsers/LoyaltyRewards";
import Redeem from "./components/guestUsers/Redeem";
import GuestNotification from "./components/guestUsers/GuestNotification";
import HotelDetails from "./components/HotelDetails";
import ProtectedRoute from "./components/ProtectedRoute";
import Dashboard from "./components/Dashboard";

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

                {/* Public/Info Routes */}
                <Route path="/feedback" element={<Feedback />} />
                <Route path="/footer" element={<Footer />} />
                <Route path="/contactus" element={<ContactUs />} />
                {/* Staff Routes */}
                <Route path="/staff/login" element={<StaffLogin />} />
                <Route path="/staff/forgot-password" element={<StaffForgotPassword />} />
                <Route path="/staff/reset-password/:token" element={<StaffResetPassword />} />
                {/* Protected staff dashboards */}
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
                {/* Superadmin & Hotel Admin Routes */}
                <Route path="/superadmindashboard" element={<SuperadminDashboard />} />
                <Route path="/usermanagement" element={<UserManagement />} />
                <Route path="/hotelmanagement" element={<HotelManagement />} />
                <Route path="/addhotel" element={<AddHotel />} />
                {/* Hotel Admin (dashboard + specific pages) */}
                <Route path="/hoteladmin" element={<HoteladminDashboard />} />
                <Route path="/hoteladmin/reports" element={<HotelReport />} />
                <Route path="/hoteladmin/loyalty" element={<Loyaltypoints />} />
                <Route path="/roommanagement" element={<RoomManagement />} />
                <Route path="/restaurantmanagement" element={<RestaurantManagement />} />
                <Route path="/feedback" element={<Feedback />} />
                <Route path="/contactus" element={<ContactUs />} />
                <Route path="/hotelreport" element={<HotelReport />} />
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
      {/* Page Routes */}
      <div className="w-screen min-h-screen overflow-x-hidden">
        <Routes>
          {/* Public Routes */}
          <Route path="/home" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/" element={<OffersPage />} />
          {/* Guest pages */}
          <Route path="/guest-dashboard" element={<GuestDashboard />} />
          <Route path="/guest/bookings" element={<Mybooking />} />
          <Route path="/guest/food-order" element={<Foodorder />} />
          <Route path="/guest/loyalty" element={<LoyaltyRewards />} />
          <Route path="/guest/loyalty/redeem/:rewardId" element={<Redeem />} />
          <Route path="/guest/notifications" element={<GuestNotification />} />
          <Route path="/hotel/:id" element={<HotelDetails />} />
          
          {/* Protected Routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
        </Routes>
      </div>
      
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
