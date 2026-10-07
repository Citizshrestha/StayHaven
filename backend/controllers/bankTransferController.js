import mongoose from "mongoose";
import {
  listPendingBankTransfers,
  approveBankTransfer,
  rejectBankTransfer,
} from "../services/bankTransferService.js";
import { emitToHotel } from "../config/socket.js";
import { AppError } from "../middleware/errorHandler.js";
import { PaymentTransaction } from "../models/paymentTransaction.schema.js";
import { getReceptionScope, scopeFilter } from "./receptionScope.js";

// Same property scope as receptionController.js: the selected hotel, else the
// hotels this user may work on (company hotels for owner/admin, assignments otherwise).
const getCtx = (req) => {
  const scope = getReceptionScope(req);
  if (!scope.company) throw new AppError("Staff company is required", 403);
  return { hotel: scope.hotel, company: scope.company };
};

// 404 unless the transaction belongs to one of the caller's hotels.
const assertTxnInScope = async (req, id) => {
  if (!mongoose.isValidObjectId(id)) throw new AppError("Invalid transaction id", 400);
  const found = await PaymentTransaction.exists({ _id: id, method: "bank-transfer", ...scopeFilter(req) });
  if (!found) throw new AppError("Bank transfer transaction not found", 404);
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
    // Without a selected hotel, list every hotel in scope ({ $in: [...] }).
    const result = await listPendingBankTransfers({ hotel: hotel || scopeFilter(req).hotel, company, page, limit });
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
    await assertTxnInScope(req, id);
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
    await assertTxnInScope(req, id);
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
