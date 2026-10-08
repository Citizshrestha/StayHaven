// Platform (superadmin) finance helpers: one commission/tax/payout formula for
// the dashboard, finance pages, payouts and exports, computed in integer paisa
// so totals don't drift (Rs. 3,390.50 stays 339050 paisa end to end).
import { PlatformSettings } from "../models/platformSettings.model.js";

// VAT charged on the platform's commission.
export const COMMISSION_VAT_RATE = 13;

export const isObjectId = (value) => typeof value === "string" && /^[0-9a-fA-F]{24}$/.test(value);

export const toPaisa = (amount) => {
  const n = Number(amount);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
};
export const fromPaisa = (paisa) => Math.round(paisa) / 100;

// System Configuration → "Global commission rate" (%). The schema default
// applies when the settings document has never been saved.
export const getCommissionRate = async () => {
  const settings = await PlatformSettings.findById("singleton").select("globalCommissionRate").lean();
  const fallback = PlatformSettings.schema.path("globalCommissionRate").defaultValue;
  const rate = Number(settings?.globalCommissionRate ?? fallback);
  // A value saved before validation existed (e.g. 500) must not zero or
  // multiply commissions; fall back to the schema default instead.
  return Number.isFinite(rate) && rate >= 0 && rate <= 100 ? rate : fallback;
};

/** Splits a gross amount (paisa) into commission, VAT on commission and hotel net payout. */
export const splitGross = (grossPaisa, ratePercent) => {
  const commission = Math.round((grossPaisa * ratePercent) / 100);
  const taxes = Math.round((commission * COMMISSION_VAT_RATE) / 100);
  return { gross: grossPaisa, commission, taxes, net: grossPaisa - commission - taxes };
};

/** Same split, returned in rupees (2 decimals) for API responses. */
export const splitGrossRupees = (grossPaisa, ratePercent) => {
  const s = splitGross(grossPaisa, ratePercent);
  return { gross: fromPaisa(s.gross), commission: fromPaisa(s.commission), taxes: fromPaisa(s.taxes), net: fromPaisa(s.net) };
};

export const sumPaisa = (items, pick = (x) => x) => items.reduce((sum, item) => sum + toPaisa(pick(item)), 0);

export const parseDate = (value) => {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" && typeof value !== "number") return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
};

// Spreadsheet formula injection guard for CSV cells.
export const csvCell = (value) => {
  const s = value === null || value === undefined ? "" : String(value);
  const guarded = /^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s) ? `'${s}` : s;
  return /[",\n\r]/.test(guarded) ? `"${guarded.replace(/"/g, '""')}"` : guarded;
};
