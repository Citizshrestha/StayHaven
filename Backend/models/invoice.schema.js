import mongoose from "mongoose";

const invoiceSchema = new mongoose.Schema(
  {
    hotel: { type: mongoose.Schema.Types.ObjectId, ref: "Hotel", required: true },
    company: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    invoiceId: { type: String, unique: true }, // INV-XXXXXXX
    booking: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true },
    guest: { type: mongoose.Schema.Types.ObjectId, ref: "Guest", required: true },
    bookingRef: { type: String }, // #BK-XXXX
    guestName: { type: String },
    room: {
      type: { type: String },
      number: { type: String },
    },
    checkIn: { type: Date },
    checkOut: { type: Date },
    nights: { type: Number },
    charges: {
      room: { type: Number, default: 0 },
      extras: { type: Number, default: 0 },
      taxRate: { type: Number, default: 13 },
      tax: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
    },
    paid: { type: Number, default: 0 },
    balance: { type: Number, default: 0 },
    paymentMethod: {
      type: String,
      enum: ["Credit Card", "Debit Card", "Cash", "Bank Transfer", "Online Payment", "UPI"],
      default: "Cash",
    },
    status: {
      type: String,
      enum: ["pending", "partial", "paid", "overdue", "refunded"],
      default: "pending",
    },
    issuedAt: { type: Date, default: Date.now },
    dueDate: { type: Date },
    paidAt: { type: Date },
  },
  { timestamps: true }
);

invoiceSchema.index({ company: 1, status: 1 });
invoiceSchema.index({ hotel: 1, issuedAt: -1 });


invoiceSchema.pre("save", async function (next) {
  if (!this.invoiceId) {
    const count = await mongoose.model("Invoice").countDocuments({ company: this.company });
    this.invoiceId = `INV-${(2024001 + count).toString()}`;
  }
  next();
});

export const Invoice = mongoose.model("Invoice", invoiceSchema);
