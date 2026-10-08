import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { fetchCsrfToken } from "../core/utils/csrf";

// ============================================
// ERROR BOUNDARY (Must be imported first)
// ============================================
import ErrorBoundary from "../shared/components/ErrorBoundary";

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
import { DASHBOARD_ROLES } from "../core/routes/staffRoleRoutes";
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
import ChatView from "../features/guest/dashboard/pages/ChatView";
import SettingsView from "../features/guest/dashboard/pages/SettingsView";
import NotFound from "../shared/pages/NotFound";
import MaintenanceGate from "../shared/components/MaintenanceGate";

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
import SavedHotels from "../features/public/hotels/pages/SavedHotels";
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
import ContentManagement from "../features/staff/superadmin/pages/ContentManagement";
import Finance from "../features/staff/superadmin/pages/Finance";
import ReviewModeration from "../features/staff/superadmin/pages/ReviewModeration";
import SystemConfiguration from "../features/staff/superadmin/pages/SystemConfiguration";

// ============================================
// FEATURES - Staff Dashboards (Super Admin) - Legacy Routes
// ============================================
import SuperadminDashboard from "../features/staff/superadmin/pages/SuperadminDashboard";
import UserManagement from "../features/staff/superadmin/pages/UserManagement";
import HotelManagement from "../features/staff/superadmin/pages/HotelManagement";

// ============================================
// FEATURES - Staff Dashboards (Hotel Admin)
// ============================================
import HoteladminDashboard from "../features/staff/hotel-admin/pages/HoteladminDashboard";
// The former standalone hotel-admin pages (Rooms/Restaurant/Table QR/Room QR)
// now live only as sections inside the unified HoteladminDashboard shell.
// Their old top-level routes redirect into the dashboard hash sections below.

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
    '/finance',
    '/reviews',
    '/system-config',
    '/contentmanagement',
    '/hoteladmin-dashboard',
    '/roommanagement',
    '/restaurantmanagement',
    '/tablemanagement',
    '/roomqrmanagement',
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
      <div className="bg-white">
        {children}
      </div>
      {shouldShowLayout && <Footer />}
    </>
  );
};

// ============================================
// Main App Component
// ============================================
const NARROW_QUERY = "(max-width: 640px)";
const useIsNarrowViewport = () => {
  const [narrow, setNarrow] = useState(() => typeof window !== "undefined" && window.matchMedia?.(NARROW_QUERY).matches);
  useEffect(() => {
    const mq = window.matchMedia?.(NARROW_QUERY);
    if (!mq) return undefined;
    const onChange = () => setNarrow(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return narrow;
};

// Per-route boundary: a crash in one page shows the fallback inside the app
// shell (providers, sockets and auth stay alive) and resets on navigation.
const RouteErrorBoundary = ({ children }) => {
  const { pathname } = useLocation();
  return <ErrorBoundary resetKey={pathname}>{children}</ErrorBoundary>;
};

const App = () => {
  const isNarrowViewport = useIsNarrowViewport();
  // Fetch CSRF token on app initialization
  useEffect(() => {
    const initializeCsrf = async () => {
      try {
        await fetchCsrfToken();
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
                  <div className="w-screen min-h-screen overflow-x-hidden bg-white">
                    <MaintenanceGate>
                    <Layout>
                      <RouteErrorBoundary>
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
                      <Route path="/saved-hotels" element={<SavedHotels />} />
                      <Route path="/booking-confirmed" element={<BookingConfirmed />} />
                      <Route path="/payment-callback" element={<PaymentCallback />} />

                      {/* ================================ */}
                      {/* STAFF ROUTES - Role Protected    */}
                      {/* ================================ */}

                      {/* Waiter Dashboard */}
                      <Route
                        path="/waiter-dashboard"
                        element={
                          <ProtectedStaffRoute allowedRoles={DASHBOARD_ROLES.waiter}>
                            <WaiterDashboard />
                          </ProtectedStaffRoute>
                        }
                      />

                      {/* Kitchen Dashboard */}
                      <Route
                        path="/kitchen-dashboard"
                        element={
                          <ProtectedStaffRoute allowedRoles={DASHBOARD_ROLES.kitchen}>
                            <KitchenDashboard />
                          </ProtectedStaffRoute>
                        }
                      />

                      {/* Reception Dashboard - Protected */}
                      <Route
                        path="/reception-dashboard"
                        element={
                          <ProtectedStaffRoute allowedRoles={DASHBOARD_ROLES.reception}>
                            <ReceptionDashboard />
                          </ProtectedStaffRoute>
                        }
                      />

                      {/* Super Admin Dashboard */}
                      <Route
                        path="/superadmindashboard"
                        element={
                          <ProtectedStaffRoute allowedRoles={DASHBOARD_ROLES.superadmin}>
                            <SuperadminDashboard />
                          </ProtectedStaffRoute>
                        }
                      />
                      <Route
                        path="/usermanagement"
                        element={
                          <ProtectedStaffRoute allowedRoles={DASHBOARD_ROLES.superadmin}>
                            <UserManagement />
                          </ProtectedStaffRoute>
                        }
                      />
                      <Route
                        path="/hotelmanagement"
                        element={
                          <ProtectedStaffRoute allowedRoles={DASHBOARD_ROLES.superadmin}>
                            <HotelManagement />
                          </ProtectedStaffRoute>
                        }
                      />

                      <Route
                        path="/contentmanagement"
                        element={
                          <ProtectedStaffRoute allowedRoles={DASHBOARD_ROLES.superadmin}>
                            <ContentManagement />
                          </ProtectedStaffRoute>
                        }
                      />
                      <Route
                        path="/finance"
                        element={
                          <ProtectedStaffRoute allowedRoles={DASHBOARD_ROLES.superadmin}>
                            <Finance />
                          </ProtectedStaffRoute>
                        }
                      />
                      <Route
                        path="/reviews"
                        element={
                          <ProtectedStaffRoute allowedRoles={DASHBOARD_ROLES.superadmin}>
                            <ReviewModeration />
                          </ProtectedStaffRoute>
                        }
                      />
                      <Route
                        path="/system-config"
                        element={
                          <ProtectedStaffRoute allowedRoles={DASHBOARD_ROLES.superadmin}>
                            <SystemConfiguration />
                          </ProtectedStaffRoute>
                        }
                      />

                      {/* Hotel Admin Dashboard */}
                      <Route
                        path="/hoteladmin-dashboard"
                        element={
                          <ProtectedStaffRoute allowedRoles={DASHBOARD_ROLES.hotelAdmin}>
                            <HoteladminDashboard />
                          </ProtectedStaffRoute>
                        }
                      />
                      {/* Legacy standalone routes now redirect into the unified dashboard shell */}
                      <Route path="/roommanagement" element={<Navigate to="/hoteladmin-dashboard#rooms" replace />} />
                      <Route path="/restaurantmanagement" element={<Navigate to="/hoteladmin-dashboard#restaurant" replace />} />
                      <Route path="/tablemanagement" element={<Navigate to="/hoteladmin-dashboard#tables" replace />} />
                      <Route path="/roomqrmanagement" element={<Navigate to="/hoteladmin-dashboard#roomqr" replace />} />

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
                        <Route path="chat" element={<ChatView />} />
                        <Route path="room-service" element={<RoomServiceView />} />
                        <Route path="bookings" element={<BookingsView />} />
                        <Route path="billing" element={<BillingView />} />
                        <Route path="requests" element={<RequestsView />} />
                        <Route path="profile" element={<ProfileView />} />
                        <Route path="settings" element={<SettingsView />} />
                        <Route path="*" element={<Navigate to="/guest-dashboard" replace />} />
                      </Route>

                      {/* ================================ */}
                      {/* 404 - CATCH ALL ROUTES           */}
                      {/* ================================ */}
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                      </RouteErrorBoundary>
                  </Layout>
                  </MaintenanceGate>
                </div>
              </OrderProvider>
            </NotificationProvider>
          </SocketProvider>
        </StaffAuthProvider>

        {/* Toast Container */}
        <ToastContainer
          position={isNarrowViewport ? "top-center" : "top-right"}
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
            // Above every modal/dialog layer (ConfirmDialog overlay is 9999).
            zIndex: 10050,
            // Clear dashboard top bars (~64px on phones, ~72px on desktop).
            top: isNarrowViewport ? 'calc(64px + env(safe-area-inset-top))' : '80px',
            ...(isNarrowViewport ? { width: 'calc(100vw - 32px)', left: '50%', transform: 'translateX(-50%)' } : {}),
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
