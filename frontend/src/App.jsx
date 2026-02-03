import React from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { GoogleOAuthProvider } from "@react-oauth/google";

// Context Providers
import { OrderProvider } from "./context/OrderContext";
import { StaffAuthProvider } from "./context/StaffAuthContext";
import { SocketProvider } from "./context/SocketContext";
import { NotificationProvider } from "./context/NotificationContext";

// Routes
import ProtectedStaffRoute from "./routes/ProtectedStaffRoute";

// Common Components
import Footer from "./components/common/Footer";

// Auth - Guest (Hotel Booking)
import Login from "./components/features/auth/guest/Login";
import Register from "./components/features/auth/guest/Register";
import ForgotPassword from "./components/features/auth/guest/ForgotPassword";
import ResetPassword from "./components/features/auth/guest/ResetPassword";

// Auth - Staff
import StaffLogin from "./components/features/auth/staff/StaffLogin";
import StaffForgotPassword from "./components/features/auth/staff/StaffForgotPassword";
import StaffResetPassword from "./components/features/auth/staff/StaffResetPassword";

// Landing Pages
import Home from "./components/features/landing/Home";
import AboutPage from "./components/features/landing/About/AboutPage";
import Destination from "./components/features/landing/Destination/Destination";
import OffersPage from "./components/features/landing/Offers/OffersPage";
import MembershipPage from "./components/features/landing/Membership/MembershipPage";
import ContactUs from "./components/features/landing/Contact/Contactus";
import Feedback from "./components/features/landing/Feedback";

// Hotels & Booking
import HotelDetailsPage from "./components/features/hotels/HotelDetails";
import FilteredHotels from "./components/features/hotels/FilteredHotels";
import BookingConfirmed from "./components/features/hotels/BookingConfirmed";

// Dashboards - Waiter & Kitchen
import WaiterDashboard from "./components/features/dashboards/waiter/WaiterDashboard";
import KitchenDashboard from "./components/features/dashboards/kitchen/KitchenDashboard";
import ReceptionDashboard from "./components/features/dashboards/reception/ReceptionDashboard";

// Dashboards - Superadmin
import SuperadminDashboard from "./components/features/dashboards/superadmin/SuperadminDashboard";
import UserManagement from "./components/features/dashboards/superadmin/UserManagement";
import HotelManagement from "./components/features/dashboards/superadmin/HotelManagement";
import AddHotel from "./components/features/dashboards/superadmin/AddHotel";

// Dashboards - Hotel Admin
import HoteladminDashboard from "./components/features/dashboards/hotelAdmin/HoteladminDashboard";
import RoomManagement from "./components/features/dashboards/hotelAdmin/RoomManagement";
import RestaurantManagement from "./components/features/dashboards/hotelAdmin/RestaurantManagement";
import TableManagement from "./components/features/dashboards/hotelAdmin/TableManagement";
import RoomQRManagement from "./components/features/dashboards/hotelAdmin/RoomQRManagement";

// Guest QR Components
import GuestTableView from "./components/features/guest/GuestTableView";
import GuestRoomView from "./components/features/guest/GuestRoomView";

// Navbar
import Navbar from "./components/common/Navbar";

// Layout wrapper to conditionally show Navbar and Footer
const Layout = ({ children }) => {
  const location = useLocation();
  
  // Routes that should NOT have Navbar and Footer (dashboards and auth pages)
  const noLayoutRoutes = [
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
    '/staff/login',
    '/staff/forgot-password',
    '/staff/reset-password',
    '/waiter-dashboard',
    '/kitchen-dashboard',
    '/reception-dashboard',
    '/superadmindashboard',
    '/usermanagement',
    '/hotelmanagement',
    '/addhotel',
    '/hoteladmin-dashboard',
    '/roommanagement',
    '/restaurantmanagement'
  ];

  const shouldShowLayout = !noLayoutRoutes.some(route => 
    location.pathname.startsWith(route)
  );

  return (
    <>
      {shouldShowLayout && <Navbar />}
      <div>
        {children}
      </div>
      {shouldShowLayout && <Footer />}
    </>
  );
};

const App = () => {
  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <Router>
        <StaffAuthProvider>
          <SocketProvider>
            <NotificationProvider>
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
                    <Route path="/about" element={<AboutPage />} />
                    <Route path="/offers" element={<OffersPage />} />
                    <Route path="/memberships" element={<MembershipPage />} />
                    <Route path="/membership" element={<MembershipPage />} />
                    <Route path="/hotel/:id" element={<HotelDetailsPage />} />
                    <Route path="/hotels" element={<FilteredHotels />} />
                    <Route path="/booking-confirmed" element={<BookingConfirmed />} />
                    <Route path="/destinations" element={<Destination />} />

                    {/* Staff Routes */}
                    <Route path="/staff/login" element={<StaffLogin />} />
                    <Route path="/staff/forgot-password" element={<StaffForgotPassword />} />
                    <Route path="/staff/reset-password/:token" element={<StaffResetPassword />} />

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
                    {/* Temporarily unprotected for development/testing */}
                    <Route
                      path="/reception-dashboard"
                      element={<ReceptionDashboard />}
                    />

                    {/* Superadmin & Hotel Admin Routes */}
                    <Route path="/superadmindashboard" element={<SuperadminDashboard />} />
                    <Route path="/usermanagement" element={<UserManagement />} />
                    <Route path="/hotelmanagement" element={<HotelManagement />} />
                    <Route path="/addhotel" element={<AddHotel />} />
                    <Route path="/hoteladmin-dashboard" element={<HoteladminDashboard />} />
                    <Route path="/roommanagement" element={<RoomManagement />} />
                    <Route path="/restaurantmanagement" element={<RestaurantManagement />} />
                    <Route path="/tablemanagement" element={<TableManagement />} />
                    <Route path="/roomqrmanagement" element={<RoomQRManagement />} />
                    <Route path="/feedback" element={<Feedback />} />
                    <Route path="/contactus" element={<ContactUs />} />

                    {/* Guest QR Scanning Routes (Public) */}
                    <Route path="/guest/table/:token" element={<GuestTableView />} />
                    <Route path="/guest/room/:token" element={<GuestRoomView />} />
                  </Routes>
                </div>
              </OrderProvider>
            </NotificationProvider>
          </SocketProvider>
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
