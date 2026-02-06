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
