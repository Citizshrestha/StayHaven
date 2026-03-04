import { Router } from "express";
import { protect, authorize } from "../middleware/authMiddleware.js";
import {
  getDashboardSummary,
  getLiveRoomStatus,
  getWeeklyOccupancy,
  getRevenueSplit,
  getTodayArrivals,
  getTodayDepartures,
  performCheckIn,
  performCheckOut,
  getReservations,
  getRoomsList,
  getGuestsList,
  getGuestById,
  updateGuestStatus,
  flagGuestBlacklist,
  getHousekeepingTasks,
  updateHousekeepingTask,
  getGuestRequests,
  assignGuestRequest,
  ignoreGuestRequest,
  resolveGuestRequest,
  getInvoices,
  getBillingSummary,
  getStaffList,
  notifyManagerAboutStaff,
  getReportsOverview,
  getActivityLog,
  updateRoomStatus,
} from "../controllers/receptionController.js";

const router = Router();

// All routes require auth
router.use(protect);

// Dashboard
router.get("/dashboard/summary", getDashboardSummary);
router.get("/dashboard/room-status", getLiveRoomStatus);
router.get("/dashboard/occupancy-weekly", getWeeklyOccupancy);
router.get("/dashboard/revenue-split", getRevenueSplit);

// Check-in/out
router.get("/checkin/today-arrivals", getTodayArrivals);
router.get("/checkin/today-departures", getTodayDepartures);
router.post("/checkin/:bookingId/checkin", authorize("receptionist", "manager", "admin", "owner"), performCheckIn);
router.post("/checkin/:bookingId/checkout", authorize("receptionist", "manager", "admin", "owner"), performCheckOut);

// Reservations
router.get("/reservations", getReservations);

// Rooms
router.get("/rooms/list", getRoomsList);
router.patch("/rooms/:id/status", authorize("receptionist", "manager", "admin", "owner"), updateRoomStatus);

// Guests
router.get("/guests", getGuestsList);
router.get("/guests/:id", getGuestById);
// Mark guest active/inactive (safe alternative to deletion — preserves records)
router.patch("/guests/:id/status", authorize("receptionist", "manager", "admin", "owner"), updateGuestStatus);
// Blacklist/flag a guest (with reason) — never deletes
router.patch("/guests/:id/blacklist", authorize("receptionist", "manager", "admin", "owner"), flagGuestBlacklist);

// Housekeeping
router.get("/housekeeping", getHousekeepingTasks);
router.patch("/housekeeping/:id", authorize("receptionist", "manager", "admin", "owner", "housekeeping"), updateHousekeepingTask);

// Guest Requests
router.get("/guest-requests", getGuestRequests);
router.patch("/guest-requests/:id/assign", authorize("receptionist", "manager", "admin", "owner"), assignGuestRequest);
router.patch("/guest-requests/:id/ignore", authorize("receptionist", "manager", "admin", "owner"), ignoreGuestRequest);
router.patch("/guest-requests/:id/resolve", authorize("receptionist", "manager", "admin", "owner"), resolveGuestRequest);

// Billing
router.get("/billing/invoices", getInvoices);
router.get("/billing/summary", getBillingSummary);

// Staff (view-only for receptionists — no delete/deactivate allowed)
router.get("/staff/list", getStaffList);
// Report a staff issue to managers (receptionist cannot delete/deactivate staff)
router.post("/staff/:staffId/notify-manager", authorize("receptionist", "manager", "admin", "owner"), notifyManagerAboutStaff);

// Reports
router.get("/reports/overview", getReportsOverview);

// Activity Log
router.get("/activity/live", getActivityLog);

export default router;
