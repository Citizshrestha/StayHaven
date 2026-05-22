import { Router } from "express";
import { protect, authorize } from "../middleware/authMiddleware.js";
import { enforcePropertyScope } from "../middleware/propertyScope.js";
import { idempotencyGuard } from "../middleware/idempotency.js";
import {
  receptionLimiter,
  receptionWriteLimiter,
  batchLimiter,
  paymentLimiter,
  exportLimiter,
} from "../middleware/rateLimiter.js";
import {
  bookingValidation,
  paymentValidation,
  batchValidation,
  maintenanceValidation,
  queryValidation,
} from "../middleware/validation.js";
import { paymentSanitization, sanitizeAll } from "../middleware/sanitization.js";
import {
  // Dashboard
  getDashboardSummary,
  getLiveRoomStatus,
  getWeeklyOccupancy,
  getRevenueSplit,
  // Arrivals / Departures
  getTodayArrivals,
  getTodayDepartures,
  // Check-in / Check-out
  performCheckIn,
  performCheckOut,
  getGuestCommunicationTemplates,
  sendGuestCommunication,
  // Reservations
  getReservations,
  // Rooms
  getRoomsList,
  updateRoomStatus,
  // Guests
  getGuestsList,
  getGuestById,
  updateGuestStatus,
  flagGuestBlacklist,
  // Housekeeping
  getHousekeepingTasks,
  updateHousekeepingTask,
  // Guest Requests
  getGuestRequests,
  assignGuestRequest,
  ignoreGuestRequest,
  resolveGuestRequest,
  // Billing
  getInvoices,
  getBillingSummary,
  // Staff
  getStaffList,
  notifyManagerAboutStaff,
  // Reports & Logs
  getReportsOverview,
  getActivityLog,
  // Payment Settlement
  capturePayment,
  refundPayment,
  disputePayment,
  getBookingPayments,
  // Offline Operation Queue
  enqueueOperation,
  syncOperations,
  getPendingOperations,
  // Shift Handover
  closeShift,
  getCurrentShiftSummary,
  getShiftHistory,
  getShiftById,
  acknowledgeShift,
} from "../controllers/receptionController.js";
import {
  bulkCheckIn,
  bulkCheckOut,
  bulkMarkPayment,
  bulkUpdateStatus,
  bulkUpdateRoomStatus,
  getBulkOperationStatus,
} from "../controllers/batchController.js";
import {
  exportBookingsCSV,
  exportInvoicesCSV,
  exportGuestsCSV,
  exportRevenueCSV,
  generateInvoicePDF,
  generateOccupancyReportPDF,
  getExportOptions,
} from "../controllers/exportController.js";
import {
  createMaintenanceSchedule,
  getMaintenanceSchedules,
  getMaintenanceScheduleById,
  updateMaintenanceSchedule,
  startMaintenance,
  completeMaintenance,
  cancelMaintenance,
  getMaintenanceCalendar,
  getRoomMaintenanceHistory,
} from "../controllers/maintenanceController.js";
import {
  createPaymentIntent,
  confirmPayment,
  processRefund,
  getPendingRefunds,
  getPaymentSummary,
  handleStripeWebhook,
} from "../controllers/paymentController.js";
import { preventDoubleCheckIn } from "../middleware/conflictResolution.js";

const router = Router();

// ═════════════════════════════════════════════════════════════════════════════
// PUBLIC ROUTES (NO AUTHENTICATION REQUIRED)
// ═════════════════════════════════════════════════════════════════════════════

// Stripe webhook endpoint (public, signature verified internally)
// MUST be before protect middleware and MUST NOT have body parsing middleware
router.post("/payments/webhook", handleStripeWebhook);

// ════════════════════════════════════════════════════════════════════════════
// GLOBAL MIDDLEWARE FOR AUTHENTICATED ROUTES
// ═════════════════════════════════════════════════════════════════════════════

// All reception routes below require authentication
router.use(protect);

// Apply general reception rate limiting (read operations)
router.use(receptionLimiter);

// All reception routes enforce property-level access for non-managers
router.use(enforcePropertyScope());

// ═════════════════════════════════════════════════════════════════════════════
// DASHBOARD (Read-heavy, general rate limiting sufficient)
// ═════════════════════════════════════════════════════════════════════════════

router.get(
  "/dashboard/summary",
  authorize("receptionist", "manager", "admin", "owner"),
  getDashboardSummary
);

router.get(
  "/dashboard/room-status",
  authorize("receptionist", "manager", "admin", "owner"),
  getLiveRoomStatus
);

router.get(
  "/dashboard/occupancy-weekly",
  authorize("receptionist", "manager", "admin", "owner"),
  getWeeklyOccupancy
);

router.get(
  "/dashboard/revenue-split",
  authorize("manager", "admin", "owner"),
  getRevenueSplit
);

// ═════════════════════════════════════════════════════════════════════════════
// CHECK-IN / CHECK-OUT (Write operations - stricter rate limiting)
// ═════════════════════════════════════════════════════════════════════════════

router.get(
  "/arrivals/today",
  authorize("receptionist", "manager", "admin", "owner"),
  getTodayArrivals
);

router.get(
  "/departures/today",
  authorize("receptionist", "manager", "admin", "owner"),
  getTodayDepartures
);

// Check-in with idempotency guard and optimistic locking
router.post(
  "/bookings/:bookingId/check-in",
  receptionWriteLimiter,
  authorize("receptionist", "manager", "admin", "owner"),
  idempotencyGuard,
  bookingValidation.checkIn,
  preventDoubleCheckIn,
  performCheckIn
);

// Check-out with idempotency guard
router.post(
  "/bookings/:bookingId/check-out",
  receptionWriteLimiter,
  authorize("receptionist", "manager", "admin", "owner"),
  idempotencyGuard,
  performCheckOut
);

// ═════════════════════════════════════════════════════════════════════════════
// BULK OPERATIONS (Batch limiter + validation)
// ═════════════════════════════════════════════════════════════════════════════

// Bulk check-in
router.post(
  "/batch/check-in",
  batchLimiter,
  authorize("receptionist", "manager", "admin", "owner"),
  idempotencyGuard,
  batchValidation.checkIn,
  bulkCheckIn
);

// Bulk check-out
router.post(
  "/batch/check-out",
  batchLimiter,
  authorize("receptionist", "manager", "admin", "owner"),
  idempotencyGuard,
  batchValidation.checkOut,
  bulkCheckOut
);

// Bulk payment marking
router.post(
  "/batch/payments",
  batchLimiter,
  authorize("receptionist", "manager", "admin", "owner"),
  idempotencyGuard,
  batchValidation.payment,
  bulkMarkPayment
);

// Bulk status update (mark no-show, cancel, etc.)
router.post(
  "/batch/status-update",
  batchLimiter,
  authorize("receptionist", "manager", "admin", "owner"),
  idempotencyGuard,
  bulkUpdateStatus
);

// Bulk room status update
router.post(
  "/batch/room-status",
  batchLimiter,
  authorize("receptionist", "manager", "admin", "owner"),
  idempotencyGuard,
  batchValidation.roomStatus,
  bulkUpdateRoomStatus
);

// Bulk operation status
router.get(
  "/batch/status",
  authorize("manager", "admin", "owner"),
  getBulkOperationStatus
);

// ═════════════════════════════════════════════════════════════════════════════
// GUEST COMMUNICATION TEMPLATES
// ═════════════════════════════════════════════════════════════════════════════

router.get(
  "/communications/templates",
  authorize("receptionist", "manager", "admin", "owner"),
  getGuestCommunicationTemplates
);

router.post(
  "/communications/send",
  receptionWriteLimiter,
  authorize("receptionist", "manager", "admin", "owner"),
  idempotencyGuard,
  sanitizeAll(),
  sendGuestCommunication
);

// ═════════════════════════════════════════════════════════════════════════════
// RESERVATIONS (with pagination validation)
// ═════════════════════════════════════════════════════════════════════════════

router.get(
  "/reservations",
  authorize("receptionist", "manager", "admin", "owner"),
  queryValidation.pagination,
  getReservations
);

// ═════════════════════════════════════════════════════════════════════════════
// ROOMS
// ═════════════════════════════════════════════════════════════════════════════

router.get(
  "/rooms",
  authorize("receptionist", "manager", "admin", "owner", "housekeeping"),
  getRoomsList
);

router.patch(
  "/rooms/:id/status",
  receptionWriteLimiter,
  authorize("receptionist", "manager", "admin", "owner", "housekeeping"),
  idempotencyGuard,
  updateRoomStatus
);

// ═════════════════════════════════════════════════════════════════════════════
// GUESTS
// ═════════════════════════════════════════════════════════════════════════════

router.get(
  "/guests",
  authorize("receptionist", "manager", "admin", "owner"),
  queryValidation.pagination,
  getGuestsList
);

router.get(
  "/guests/:id",
  authorize("receptionist", "manager", "admin", "owner"),
  getGuestById
);

router.patch(
  "/guests/:id/status",
  receptionWriteLimiter,
  authorize("receptionist", "manager", "admin", "owner"),
  updateGuestStatus
);

router.patch(
  "/guests/:id/blacklist",
  receptionWriteLimiter,
  authorize("manager", "admin", "owner"),
  flagGuestBlacklist
);

// ═════════════════════════════════════════════════════════════════════════════
// HOUSEKEEPING
// ═════════════════════════════════════════════════════════════════════════════

router.get(
  "/housekeeping",
  authorize("receptionist", "manager", "admin", "owner", "housekeeping"),
  getHousekeepingTasks
);

router.patch(
  "/housekeeping/:id",
  receptionWriteLimiter,
  authorize("receptionist", "manager", "admin", "owner", "housekeeping"),
  updateHousekeepingTask
);

// ═════════════════════════════════════════════════════════════════════════════
// GUEST REQUESTS
// ═════════════════════════════════════════════════════════════════════════════

router.get(
  "/guest-requests",
  authorize("receptionist", "manager", "admin", "owner"),
  getGuestRequests
);

router.patch(
  "/guest-requests/:id/assign",
  receptionWriteLimiter,
  authorize("receptionist", "manager", "admin", "owner"),
  assignGuestRequest
);

router.patch(
  "/guest-requests/:id/ignore",
  receptionWriteLimiter,
  authorize("receptionist", "manager", "admin", "owner"),
  ignoreGuestRequest
);

router.patch(
  "/guest-requests/:id/resolve",
  receptionWriteLimiter,
  authorize("receptionist", "manager", "admin", "owner"),
  resolveGuestRequest
);

// ═════════════════════════════════════════════════════════════════════════════
// BILLING / INVOICES
// ═════════════════════════════════════════════════════════════════════════════

router.get(
  "/billing/invoices",
  authorize("receptionist", "manager", "admin", "owner"),
  queryValidation.pagination,
  getInvoices
);

router.get(
  "/billing/summary",
  authorize("manager", "admin", "owner"),
  getBillingSummary
);

// ═════════════════════════════════════════════════════════════════════════════
// MAINTENANCE SCHEDULE (Proactive PM tracking)
// ═════════════════════════════════════════════════════════════════════════════

// Get maintenance schedules with filters
router.get(
  "/maintenance",
  authorize("receptionist", "manager", "admin", "owner", "maintenance"),
  getMaintenanceSchedules
);

// Get maintenance calendar view
router.get(
  "/maintenance/calendar",
  authorize("manager", "admin", "owner", "maintenance"),
  getMaintenanceCalendar
);

// Get single maintenance schedule
router.get(
  "/maintenance/:id",
  authorize("receptionist", "manager", "admin", "owner", "maintenance"),
  getMaintenanceScheduleById
);

// Get room maintenance history
router.get(
  "/maintenance/room/:roomId/history",
  authorize("manager", "admin", "owner", "maintenance"),
  getRoomMaintenanceHistory
);

// Create new maintenance schedule
router.post(
  "/maintenance",
  receptionWriteLimiter,
  authorize("manager", "admin", "owner", "maintenance"),
  idempotencyGuard,
  maintenanceValidation.create,
  createMaintenanceSchedule
);

// Update maintenance schedule
router.patch(
  "/maintenance/:id",
  receptionWriteLimiter,
  authorize("manager", "admin", "owner", "maintenance"),
  updateMaintenanceSchedule
);

// Start maintenance work
router.post(
  "/maintenance/:id/start",
  receptionWriteLimiter,
  authorize("manager", "admin", "owner", "maintenance"),
  startMaintenance
);

// Complete maintenance work
router.post(
  "/maintenance/:id/complete",
  receptionWriteLimiter,
  authorize("manager", "admin", "owner", "maintenance"),
  idempotencyGuard,
  completeMaintenance
);

// Cancel maintenance schedule
router.post(
  "/maintenance/:id/cancel",
  receptionWriteLimiter,
  authorize("manager", "admin", "owner"),
  cancelMaintenance
);

// ═════════════════════════════════════════════════════════════════════════════
// PAYMENT PROCESSING (Payment limiter for financial operations)
// ═════════════════════════════════════════════════════════════════════════════

// Create Stripe payment intent
router.post(
  "/payments/intent",
  paymentLimiter,
  authorize("receptionist", "manager", "admin", "owner"),
  paymentValidation.createIntent,
  createPaymentIntent
);

// Confirm payment and create transaction
router.post(
  "/payments/confirm",
  paymentLimiter,
  authorize("receptionist", "manager", "admin", "owner"),
  idempotencyGuard,
  confirmPayment
);

// Capture payment (manual recording)
router.post(
  "/payments/capture",
  paymentLimiter,
  authorize("receptionist", "manager", "admin", "owner"),
  idempotencyGuard,
  paymentValidation.capture,
  paymentSanitization.capture,
  capturePayment
);

// Get payment summary for booking
router.get(
  "/payments/booking/:bookingId/summary",
  authorize("receptionist", "manager", "admin", "owner"),
  getPaymentSummary
);

// Get all transactions for a booking
router.get(
  "/payments/booking/:bookingId",
  authorize("receptionist", "manager", "admin", "owner"),
  getBookingPayments
);

// Request refund
router.post(
  "/payments/:id/refund",
  paymentLimiter,
  authorize("receptionist", "manager", "admin", "owner"),
  idempotencyGuard,
  paymentValidation.refund,
  paymentSanitization.refund,
  refundPayment
);

// Approve or reject refund request (manager only)
router.post(
  "/payments/refunds/approve",
  paymentLimiter,
  authorize("manager", "admin", "owner"),
  idempotencyGuard,
  processRefund
);

// Get pending refund requests
router.get(
  "/payments/refunds/pending",
  authorize("manager", "admin", "owner"),
  getPendingRefunds
);

// Flag payment as disputed
router.post(
  "/payments/:id/dispute",
  receptionWriteLimiter,
  authorize("receptionist", "manager", "admin", "owner"),
  idempotencyGuard,
  disputePayment
);

// ═════════════════════════════════════════════════════════════════════════════
// EXPORT / REPORTING (Export limiter for resource-intensive operations)
// ═════════════════════════════════════════════════════════════════════════════

// Get available export options
router.get(
  "/exports/options",
  authorize("receptionist", "manager", "admin", "owner"),
  getExportOptions
);

// Export bookings to CSV
router.get(
  "/exports/bookings",
  exportLimiter,
  authorize("receptionist", "manager", "admin", "owner"),
  queryValidation.dateRange,
  exportBookingsCSV
);

// Export invoices to CSV
router.get(
  "/exports/invoices",
  exportLimiter,
  authorize("manager", "admin", "owner"),
  queryValidation.dateRange,
  exportInvoicesCSV
);

// Export guests to CSV
router.get(
  "/exports/guests",
  exportLimiter,
  authorize("manager", "admin", "owner"),
  exportGuestsCSV
);

// Export revenue report to CSV
router.get(
  "/exports/revenue",
  exportLimiter,
  authorize("manager", "admin", "owner"),
  queryValidation.dateRange,
  exportRevenueCSV
);

// Generate PDF invoice
router.get(
  "/exports/invoices/:invoiceId/pdf",
  exportLimiter,
  authorize("receptionist", "manager", "admin", "owner"),
  generateInvoicePDF
);

// Generate occupancy report PDF
router.get(
  "/exports/occupancy-report",
  exportLimiter,
  authorize("manager", "admin", "owner"),
  generateOccupancyReportPDF
);

// ═════════════════════════════════════════════════════════════════════════════
// OFFLINE OPERATION QUEUE
// ═════════════════════════════════════════════════════════════════════════════

// Enqueue a deferred operation (used in degraded / offline mode)
router.post(
  "/operations/enqueue",
  receptionWriteLimiter,
  authorize("receptionist", "manager", "admin", "owner"),
  enqueueOperation
);

// Sync / process queued operations (call when connectivity is restored)
router.post(
  "/operations/sync",
  receptionWriteLimiter,
  authorize("receptionist", "manager", "admin", "owner"),
  syncOperations
);

// List pending/failed operations for audit
router.get(
  "/operations/pending",
  authorize("receptionist", "manager", "admin", "owner"),
  getPendingOperations
);

// ═════════════════════════════════════════════════════════════════════════════
// STAFF
// ═════════════════════════════════════════════════════════════════════════════

router.get(
  "/staff",
  authorize("receptionist", "manager", "admin", "owner"),
  getStaffList
);

router.post(
  "/staff/:staffId/notify-manager",
  receptionWriteLimiter,
  authorize("receptionist", "manager", "admin", "owner"),
  notifyManagerAboutStaff
);

// ═════════════════════════════════════════════════════════════════════════════
// REPORTS & ACTIVITY LOG
// ═════════════════════════════════════════════════════════════════════════════

router.get(
  "/reports/overview",
  authorize("manager", "admin", "owner"),
  getReportsOverview
);

router.get(
  "/activity",
  authorize("receptionist", "manager", "admin", "owner"),
  getActivityLog
);

// ═════════════════════════════════════════════════════════════════════════════
// SHIFT HANDOVER
// ═════════════════════════════════════════════════════════════════════════════

// Close current shift with report, pending tasks, incidents
router.post(
  "/shifts/close",
  receptionWriteLimiter,
  authorize("receptionist", "manager", "admin", "owner"),
  idempotencyGuard,
  closeShift
);

// Live summary of the current shift (auto-aggregated)
router.get(
  "/shifts/current",
  authorize("receptionist", "manager", "admin", "owner"),
  getCurrentShiftSummary
);

// Paginated history of past shift reports
router.get(
  "/shifts/history",
  authorize("receptionist", "manager", "admin", "owner"),
  queryValidation.pagination,
  getShiftHistory
);

// Single shift report
router.get(
  "/shifts/:id",
  authorize("receptionist", "manager", "admin", "owner"),
  getShiftById
);

// Incoming receptionist acknowledges the handover
router.patch(
  "/shifts/:id/acknowledge",
  receptionWriteLimiter,
  authorize("receptionist", "manager", "admin", "owner"),
  acknowledgeShift
);

export default router;
