import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { getMaintenanceStatus } from '../../core/api/services/maintenance.service';
import MaintenanceOverlay from './MaintenanceOverlay';

const STAFF_AND_OPERATIONAL_PREFIXES = [
  '/staff',
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
  '/guest/login',
  '/login',
  '/forgot-password',
  '/reset-password',
];

const PUBLIC_WEBSITE_PREFIXES = [
  '/about',
  '/offers',
  '/memberships',
  '/membership',
  '/destinations',
  '/feedback',
  '/contactus',
  '/hotels',
  '/booking-confirmed',
  '/payment-callback',
  '/register',
];

const isStaffOrOperationalRoute = (pathname) =>
  STAFF_AND_OPERATIONAL_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

const isPublicWebsiteRoute = (pathname) => {
  if (pathname === '/') return true;
  return PUBLIC_WEBSITE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
};

const MaintenanceGate = ({ children }) => {
  const location = useLocation();
  const [maintenance, setMaintenance] = useState({
    active: false,
    message: '',
    scheduledEnd: null,
    checked: false,
  });

  useEffect(() => {
    let cancelled = false;

    const checkMaintenance = async () => {
      try {
        const result = await getMaintenanceStatus();
        if (!cancelled && result?.success) {
          setMaintenance({
            active: result.data?.maintenanceMode === true,
            message: result.data?.maintenanceMessage || '',
            scheduledEnd: result.data?.scheduledEnd || null,
            checked: true,
          });
        }
      } catch {
        if (!cancelled) {
          setMaintenance((prev) => ({ ...prev, checked: true }));
        }
      }
    };

    checkMaintenance();
    const interval = setInterval(checkMaintenance, 60000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [location.pathname]);

  const shouldShowOverlay =
    maintenance.checked &&
    maintenance.active &&
    isPublicWebsiteRoute(location.pathname) &&
    !isStaffOrOperationalRoute(location.pathname);

  return (
    <>
      {children}
      {shouldShowOverlay && (
        <MaintenanceOverlay
          message={maintenance.message}
          scheduledEnd={maintenance.scheduledEnd}
        />
      )}
    </>
  );
};

export default MaintenanceGate;
