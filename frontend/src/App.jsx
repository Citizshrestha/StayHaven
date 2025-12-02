import React from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { GoogleOAuthProvider } from "@react-oauth/google";

// Import components
import Home from "./components/Home";
import Login from "./components/Login";
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
import { OrderProvider } from "./context/OrderContext";
import AboutPage from "./components/AboutPage";
import StaffLogin from "./components/StaffLogin";

const App = () => {
  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <Router>
        <OrderProvider>
          {/* Page Routes */}
          <div className="w-screen min-h-screen overflow-x-hidden">
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/staff/login" element={<StaffLogin />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/" element={<Home />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/offers" element={<OffersPage />} />
              <Route path="/memberships" element={<MembershipPage />} />
              <Route path="/membership" element={<MembershipPage />} />
              <Route path="/hotel/:id" element={<HotelDetailsPage />} />
              <Route path="/hotels" element={<FilteredHotels />} />
              <Route path="/booking-confirmed" element={<BookingConfirmed />} />
              
              {/* Dashboard Routes */}
              <Route path="/waiter-dashboard" element={<WaiterDashboard />} />
              <Route path="/kitchen-dashboard" element={<KitchenDashboard />} />
            </Routes>
          </div>
        </OrderProvider>

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
