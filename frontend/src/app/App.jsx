import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { fetchCsrfToken } from "../utils/csrf";

// ============================================
// ERROR BOUNDARY (Must be imported first)
// ============================================
import ErrorBoundary from "../components/ErrorBoundary";

// ============================================
// CORE - Context Providers (Global State)
// ============================================
import { OrderProvider } from "../core/context/OrderContext";
import { StaffAuthProvider } from "../core/context/StaffAuthContext";
import { SocketProvider } from "../core/context/SocketContext";
import { NotificationProvider } from "../core/context/NotificationContext";

// ============================================
// CORE - Routes (Guards & Protection)
// ============================================
import ProtectedStaffRoute from "../core/routes/ProtectedStaffRoute";
import ProtectedGuestRoute from "../core/routes/ProtectedGuestRoute";

// ============================================
// FEATURES - Guest Dashboard
// ============================================
import GuestDashboardLayout from "../features/guest/dashboard/layout/GuestDashboardLayout";
import DashboardView from "../features/guest/dashboard/pages/DashboardView";
import RoomServiceView from "../features/guest/dashboard/pages/RoomServiceView";
import BookingsView from "../features/guest/dashboard/pages/BookingsView";
import BillingView from "../features/guest/dashboard/pages/BillingView";
import ProfileView from "../features/guest/dashboard/pages/ProfileView";
import RequestsView from "../features/guest/dashboard/pages/RequestsView";

// ============================================
// SHARED - Layout Components
// ============================================
import Footer from "../shared/layout/Footer";
import Navbar from "../shared/layout/Navbar";

// ============================================
// FEATURES - Public Auth (Guest)
// ============================================
import AuthPage from "../features/public/auth/guest/AuthPage";
import ForgotPassword from "../features/public/auth/guest/ForgotPassword";
import ResetPassword from "../features/public/auth/guest/ResetPassword";
import GuestDashboardLogin from "../features/public/auth/guest/GuestDashboardLogin";

// ============================================
// FEATURES - Public Auth (Staff)
// ============================================
import StaffLogin from "../features/public/auth/staff/StaffLogin";
import StaffForgotPassword from "../features/public/auth/staff/StaffForgotPassword";
import StaffResetPassword from "../features/public/auth/staff/StaffResetPassword";

// ============================================
// FEATURES - Public Landing Pages
// ============================================
import Home from "../features/public/landing/pages/HomePage";
import AboutPage from "../features/public/landing/pages/AboutPage";
import Destination from "../features/public/landing/pages/Destination";
import OffersPage from "../features/public/landing/pages/OffersPage";
import MembershipPage from "../features/public/landing/pages/MembershipPage";
import ContactUs from "../features/public/landing/pages/Contactus";
import Feedback from "../features/public/landing/pages/Feedback";

// ============================================
// FEATURES - Public Hotels & Booking
// ============================================
import HotelDetailPage from "../features/public/hotels/pages/HotelDetail/Index";
import FilteredHotels from "../features/public/hotels/pages/FilteredHotels";
import BookingConfirmed from "../features/public/hotels/pages/BookingConfirmed";
import PaymentCallback from "../features/public/payment/PaymentCallback";

// ============================================
// FEATURES - Staff Dashboards (Waiter)
// ============================================
import WaiterDashboard from "../features/staff/waiter/pages/WaiterDashboard";

// ============================================
// FEATURES - Staff Dashboards (Kitchen)
// ============================================
import KitchenDashboard from "../features/staff/kitchen/pages/KitchenDashboard";

// ============================================
// FEATURES - Staff Dashboards (Reception)
// ============================================
import ReceptionDashboard from "../features/staff/reception/pages/ReceptionDashboard";

// ============================================
// FEATURES - Staff Dashboards (Super Admin)
// ============================================
import SuperadminDashboard from "../features/staff/superadmin/pages/SuperadminDashboard";
import UserManagement from "../features/staff/superadmin/pages/UserManagement";
import HotelManagement from "../features/staff/superadmin/pages/HotelManagement";
import AddHotel from "../features/staff/superadmin/pages/AddHotel";

// ============================================
// FEATURES - Staff Dashboards (Hotel Admin)
// ============================================
import HoteladminDashboard from "../features/staff/hotel-admin/pages/HoteladminDashboard";
import RoomManagement from "../features/staff/hotel-admin/pages/RoomManagement";
import RestaurantManagement from "../features/staff/hotel-admin/pages/RestaurantManagement";
import TableManagement from "../features/staff/hotel-admin/pages/TableManagement";
import RoomQRManagement from "../features/staff/hotel-admin/pages/RoomQRManagement";

// ============================================
// FEATURES - Guest QR Access
// ============================================
import GuestTableView from "../features/guest/qr-access/GuestTableView";
import GuestRoomView from "../features/guest/qr-access/GuestRoomView";

// ============================================
// Layout Wrapper Component
// ============================================
const Layout = ({ children }) => {
  const location = useLocation();

  // Routes that should NOT have Navbar and Footer (dashboards, auth pages, home page)
  const noLayoutRoutes = [
    '/',
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
    '/guest/login',
    '/staff/login',
    '/staff/forgot-password',
    '/staff/reset-password',
    '/payment-callback',
    '/waiter-dashboard',
    '/kitchen-dashboard',
    '/reception-dashboard',
    '/superadmindashboard',
    '/usermanagement',
    '/hotelmanagement',
    '/addhotel',
    '/hoteladmin-dashboard',
    '/roommanagement',
    '/restaurantmanagement',
    '/guest/table',
    '/guest/room',
    '/guest-dashboard',
  ];

  const isHome = location.pathname === '/';
  const shouldShowLayout = !noLayoutRoutes.some(route =>
    route === '/' ? isHome : location.pathname.startsWith(route)
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

// ============================================
// Main App Component
// ============================================
const App = () => {
  // Fetch CSRF token on app initialization
  useEffect(() => {
    const initializeCsrf = async () => {
      try {
        await fetchCsrfToken();
        console.log('✅ CSRF token initialized');
      } catch (error) {
        console.error('❌ Failed to initialize CSRF token:', error);
      }
    };

    initializeCsrf();
  }, []);

  return (
    <ErrorBoundary>
      <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
        <Router>
          <StaffAuthProvider>
            <SocketProvider>
              <NotificationProvider>
                <OrderProvider>
                  {/* Page Routes */}
                  <div className="w-screen min-h-screen overflow-x-hidden">
                    <Layout>
                      <Routes>
                      {/* ================================ */}
                      {/* PUBLIC ROUTES - No Auth Required */}
                      {/* ================================ */}

                      {/* Auth - Guest */}
                      <Route path="/login" element={<AuthPage />} />
                      <Route path="/register" element={<AuthPage />} />
                      <Route path="/forgot-password" element={<ForgotPassword />} />
                      <Route path="/reset-password" element={<ResetPassword />} />
                      
                      {/* Guest Dashboard Login - Separate from public login */}
                      <Route path="/guest/login" element={<GuestDashboardLogin />} />

                      {/* Auth - Staff */}
                      <Route path="/staff/login" element={<StaffLogin />} />
                      <Route path="/staff/forgot-password" element={<StaffForgotPassword />} />
                      <Route path="/staff/reset-password/:token" element={<StaffResetPassword />} />

                      {/* Landing Pages */}
                      <Route path="/" element={<Home />} />
                      <Route path="/about" element={<AboutPage />} />
                      <Route path="/offers" element={<OffersPage />} />
                      <Route path="/memberships" element={<MembershipPage />} />
                      <Route path="/membership" element={<MembershipPage />} />
                      <Route path="/destinations" element={<Destination />} />
                      <Route path="/feedback" element={<Feedback />} />
                      <Route path="/contactus" element={<ContactUs />} />

                      {/* Hotels & Booking */}
                      <Route path="/hotels/:id" element={<HotelDetailPage />} />
                      <Route path="/hotels" element={<FilteredHotels />} />
                      <Route path="/booking-confirmed" element={<BookingConfirmed />} />
                      <Route path="/payment-callback" element={<PaymentCallback />} />

                      {/* ================================ */}
                      {/* STAFF ROUTES - Role Protected    */}
                      {/* ================================ */}

                      {/* Waiter Dashboard */}
                      <Route
                        path="/waiter-dashboard"
                        element={
                          <ProtectedStaffRoute allowedRoles={["waiter"]}>
                            <WaiterDashboard />
                          </ProtectedStaffRoute>
                        }
                      />

                      {/* Kitchen Dashboard */}
                      <Route
                        path="/kitchen-dashboard"
                        element={
                          <ProtectedStaffRoute allowedRoles={["chief"]}>
                            <KitchenDashboard />
                          </ProtectedStaffRoute>
                        }
                      />

                      {/* Reception Dashboard - Protected */}
                      <Route
                        path="/reception-dashboard"
                        element={
                          <ProtectedStaffRoute allowedRoles={["receptionist", "manager", "admin", "owner"]}>
                            <ReceptionDashboard />
                          </ProtectedStaffRoute>
                        }
                      />

                      {/* Super Admin Dashboard */}
                      <Route path="/superadmindashboard" element={<SuperadminDashboard />} />
                      <Route path="/usermanagement" element={<UserManagement />} />
                      <Route path="/hotelmanagement" element={<HotelManagement />} />
                      <Route path="/addhotel" element={<AddHotel />} />

                      {/* Hotel Admin Dashboard */}
                      <Route path="/hoteladmin-dashboard" element={<HoteladminDashboard />} />
                      <Route path="/roommanagement" element={<RoomManagement />} />
                      <Route path="/restaurantmanagement" element={<RestaurantManagement />} />
                      <Route path="/tablemanagement" element={<TableManagement />} />
                      <Route path="/roomqrmanagement" element={<RoomQRManagement />} />

                      {/* ================================ */}
                      {/* GUEST QR ROUTES - Token Based    */}
                      {/* ================================ */}
                      <Route path="/guest/table/:token" element={<GuestTableView />} />
                      <Route path="/guest/room/:token" element={<GuestRoomView />} />

                      {/* ================================ */}
                      {/* GUEST DASHBOARD - Auth Required  */}
                      {/* ================================ */}
                      <Route
                        path="/guest-dashboard/*"
                        element={
                          <ProtectedGuestRoute>
                            <GuestDashboardLayout />
                          </ProtectedGuestRoute>
                        }
                      >
                        <Route index element={<DashboardView />} />
                        <Route path="room-service" element={<RoomServiceView />} />
                        <Route path="bookings" element={<BookingsView />} />
                        <Route path="billing" element={<BillingView />} />
                        <Route path="requests" element={<RequestsView />} />
                        <Route path="profile" element={<ProfileView />} />
                      </Route>
                    </Routes>
                  </Layout>
                </div>
              </OrderProvider>
            </NotificationProvider>
          </SocketProvider>
        </StaffAuthProvider>

        {/* Toast Container */}
        <ToastContainer
          position="top-right"
          autoClose={4000}
          hideProgressBar={true}
          newestOnTop={true}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="colored"
          style={{
            zIndex: 9999,
            top: '80px' // Add top offset to the container instead of margin to each toast
          }}
          toastStyle={{
            maxWidth: '400px',
          }}
        />
      </Router>
    </GoogleOAuthProvider>
    </ErrorBoundary>
  );
};

export default App;
