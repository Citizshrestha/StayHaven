import {
  listPendingBankTransfers,
  approveBankTransfer,
  rejectBankTransfer,
} from "../services/bankTransferService.js";
import { emitToHotel } from "../config/socket.js";
import { AppError } from "../middleware/errorHandler.js";

// Mirrors receptionController.js's getCtx: prefer the property-scoped hotel
// set by enforcePropertyScope, fall back to the staff user's own assignment.
const getCtx = (req) => {
  const user = req.user;
  const hotel = req._scopedHotelId || null;
  const company = user?.company?._id || user?.company;
  if (!company) throw new AppError("Staff company is required", 403);
  return { hotel, company };
};

/**
 * GET /reception/payments/bank-transfers/pending
 * Staff-facing list of bank transfers awaiting manual verification against
 * the hotel's real bank statement.
 */
export const getPendingBankTransfers = async (req, res) => {
  try {
    const { hotel, company } = getCtx(req);
    const { page, limit } = req.query;
    const result = await listPendingBankTransfers({ hotel, company, page, limit });
    res.json({ success: true, data: result.items, pagination: {
      total: result.total, page: result.page, limit: result.limit, pages: result.pages,
    } });
  } catch (err) {
    const status = err instanceof AppError ? err.statusCode : 500;
    res.status(status).json({ success: false, message: err.message });
  }
};

/**
 * POST /reception/payments/bank-transfers/:id/approve
 * Confirms the bank slip was verified against the real statement and
 * fulfills the associated booking/order/invoice exactly once.
 */
export const approveBankTransferPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const result = await approveBankTransfer({ transactionId: id, staffUser: req.user, notes, scope: getCtx(req) });

    if (result.alreadyProcessed) {
      return res.json({
        success: true,
        message: `Transaction already ${result.transaction.status}`,
        data: result.transaction,
        alreadyProcessed: true,
      });
    }

    emitToHotel(result.transaction.hotel.toString(), "bank-transfer-approved", {
      transactionId: result.transaction.transactionId,
      fulfillment: result.fulfillment,
    });

    res.json({ success: true, message: "Bank transfer approved", data: result.transaction, fulfillment: result.fulfillment });
  } catch (err) {
    const status = err instanceof AppError ? err.statusCode : 500;
    res.status(status).json({ success: false, message: err.message });
  }
};

/**
 * POST /reception/payments/bank-transfers/:id/reject
 * Rejects a bank transfer that could not be matched against the real bank
 * statement. The target is never touched — it stays exactly as payable as
 * it was before submission.
 */
export const rejectBankTransferPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const result = await rejectBankTransfer({ transactionId: id, staffUser: req.user, reason, scope: getCtx(req) });

    if (result.alreadyProcessed) {
      return res.json({
        success: true,
        message: `Transaction already ${result.transaction.status}`,
        data: result.transaction,
        alreadyProcessed: true,
      });
    }

    emitToHotel(result.transaction.hotel.toString(), "bank-transfer-rejected", {
      transactionId: result.transaction.transactionId,
      reason: result.transaction.refundReason,
    });

    res.json({ success: true, message: "Bank transfer rejected", data: result.transaction });
  } catch (err) {
    const status = err instanceof AppError ? err.statusCode : 500;
    res.status(status).json({ success: false, message: err.message });
  }
};
