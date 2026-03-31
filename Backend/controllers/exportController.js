import { Booking } from "../models/booking.schema.js";
import { Invoice } from "../models/invoice.schema.js";
import { Guest } from "../models/guest.schema.js";
import { Room } from "../models/room.schema.js";
import { PaymentTransaction } from "../models/paymentTransaction.schema.js";
import { jsPDF } from "jspdf";
import "jspdf-autotable";

// Helper: get context from request
const getCtx = (req) => {
  const user = req.user;
  const hotel = req._scopedHotelId || req.query.hotelId || user?.assignedProperties?.[0]?._id;
  const company = req.query.companyId || user?.company?._id || user?.company;
  return { hotel, company };
};

/**
 * Convert data to CSV format
 */
function convertToCSV(data, headers) {
  if (!data || data.length === 0) return "";

  const csvHeaders = headers.map((h) => `"${h.label}"`).join(",");

  const csvRows = data.map((row) => {
    return headers
      .map((h) => {
        let value = row[h.key];
        if (value === null || value === undefined) value = "";
        if (typeof value === "string") {
          // Escape quotes and wrap in quotes
          value = value.replace(/"/g, '""');
        }
        return `"${value}"`;
      })
      .join(",");
  });

  return [csvHeaders, ...csvRows].join("\n");
}

/**
 * Export bookings to CSV
 */
export const exportBookingsCSV = async (req, res) => {
  try {
    const { hotel, company } = getCtx(req);
    const { startDate, endDate, status } = req.query;

    const filter = company ? { company } : hotel ? { hotel } : {};

    if (status && status !== "all") filter.status = status;
    if (startDate || endDate) {
      filter.checkIn = {};
      if (startDate) filter.checkIn.$gte = new Date(startDate);
      if (endDate) filter.checkIn.$lte = new Date(endDate);
    }

    const bookings = await Booking.find(filter)
      .populate("room", "roomNumber type")
      .populate("guest", "fullName email phone")
      .sort({ checkIn: -1 })
      .lean();

    const headers = [
      { key: "bookingId", label: "Booking ID" },
      { key: "guestName", label: "Guest Name" },
      { key: "guestEmail", label: "Email" },
      { key: "guestPhone", label: "Phone" },
      { key: "roomNumber", label: "Room Number" },
      { key: "roomType", label: "Room Type" },
      { key: "checkIn", label: "Check In" },
      { key: "checkOut", label: "Check Out" },
      { key: "nights", label: "Nights" },
      { key: "adults", label: "Adults" },
      { key: "children", label: "Children" },
      { key: "totalAmount", label: "Total Amount" },
      { key: "paymentStatus", label: "Payment Status" },
      { key: "bookingStatus", label: "Status" },
      { key: "bookingSource", label: "Source" },
      { key: "createdAt", label: "Booked On" },
    ];

    const csvData = bookings.map((b) => ({
      bookingId: b.bookingId,
      guestName: b.guest?.fullName || b.guestInfo?.name || "",
      guestEmail: b.guest?.email || b.guestInfo?.email || "",
      guestPhone: b.guest?.phone || b.guestInfo?.phone || "",
      roomNumber: b.room?.roomNumber || "",
      roomType: b.room?.type || "",
      checkIn: b.checkIn ? new Date(b.checkIn).toLocaleDateString() : "",
      checkOut: b.checkOut ? new Date(b.checkOut).toLocaleDateString() : "",
      nights: b.durationNights,
      adults: b.guests?.adults || 1,
      children: b.guests?.children || 0,
      totalAmount: b.totalAmount,
      paymentStatus: b.paymentStatus,
      bookingStatus: b.status,
      bookingSource: b.bookingSource,
      createdAt: b.createdAt ? new Date(b.createdAt).toLocaleDateString() : "",
    }));

    const csv = convertToCSV(csvData, headers);

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=bookings_${new Date().toISOString().split("T")[0]}.csv`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Export invoices to CSV
 */
export const exportInvoicesCSV = async (req, res) => {
  try {
    const { hotel, company } = getCtx(req);
    const { startDate, endDate, status } = req.query;

    const filter = company ? { company } : hotel ? { hotel } : {};

    if (status && status !== "all") filter.status = status;
    if (startDate || endDate) {
      filter.issuedAt = {};
      if (startDate) filter.issuedAt.$gte = new Date(startDate);
      if (endDate) filter.issuedAt.$lte = new Date(endDate);
    }

    const invoices = await Invoice.find(filter)
      .populate("booking", "bookingId")
      .populate("guest", "fullName email")
      .sort({ issuedAt: -1 })
      .lean();

    const headers = [
      { key: "invoiceId", label: "Invoice ID" },
      { key: "bookingRef", label: "Booking Ref" },
      { key: "guestName", label: "Guest Name" },
      { key: "guestEmail", label: "Email" },
      { key: "roomType", label: "Room Type" },
      { key: "roomNumber", label: "Room Number" },
      { key: "checkIn", label: "Check In" },
      { key: "checkOut", label: "Check Out" },
      { key: "nights", label: "Nights" },
      { key: "roomCharges", label: "Room Charges" },
      { key: "extras", label: "Extras" },
      { key: "tax", label: "Tax" },
      { key: "total", label: "Total" },
      { key: "paid", label: "Paid" },
      { key: "balance", label: "Balance" },
      { key: "status", label: "Status" },
      { key: "paymentMethod", label: "Payment Method" },
      { key: "issuedAt", label: "Issued Date" },
    ];

    const csvData = invoices.map((i) => ({
      invoiceId: i.invoiceId,
      bookingRef: i.bookingRef || i.booking?.bookingId,
      guestName: i.guestName || i.guest?.fullName,
      guestEmail: i.guest?.email,
      roomType: i.room?.type,
      roomNumber: i.room?.number,
      checkIn: i.checkIn ? new Date(i.checkIn).toLocaleDateString() : "",
      checkOut: i.checkOut ? new Date(i.checkOut).toLocaleDateString() : "",
      nights: i.nights,
      roomCharges: i.charges?.room,
      extras: i.charges?.extras,
      tax: i.charges?.tax,
      total: i.charges?.total,
      paid: i.paid,
      balance: i.balance,
      status: i.status,
      paymentMethod: i.paymentMethod,
      issuedAt: i.issuedAt ? new Date(i.issuedAt).toLocaleDateString() : "",
    }));

    const csv = convertToCSV(csvData, headers);

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=invoices_${new Date().toISOString().split("T")[0]}.csv`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Export guests to CSV
 */
export const exportGuestsCSV = async (req, res) => {
  try {
    const { hotel, company } = getCtx(req);
    const { tier, status } = req.query;

    const filter = company ? { company } : hotel ? { hotel } : {};

    if (tier && tier !== "all") filter.membershipTier = tier;
    if (status && status !== "all") filter.status = status;

    const guests = await Guest.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    const headers = [
      { key: "guestId", label: "Guest ID" },
      { key: "fullName", label: "Full Name" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Phone" },
      { key: "country", label: "Country" },
      { key: "status", label: "Status" },
      { key: "membershipTier", label: "Membership Tier" },
      { key: "loyaltyPoints", label: "Loyalty Points" },
      { key: "totalStays", label: "Total Stays" },
      { key: "totalSpent", label: "Total Spent" },
      { key: "vipStatus", label: "VIP" },
      { key: "isActive", label: "Active" },
      { key: "createdAt", label: "Registered" },
    ];

    const csvData = guests.map((g) => ({
      guestId: g.guestId,
      fullName: g.fullName,
      email: g.email,
      phone: g.phone,
      country: g.country,
      status: g.status,
      membershipTier: g.membershipTier,
      loyaltyPoints: g.loyaltyPoints,
      totalStays: g.totalStays,
      totalSpent: g.totalSpent,
      vipStatus: g.vipStatus ? "Yes" : "No",
      isActive: g.isActive !== false ? "Yes" : "No",
      createdAt: g.createdAt ? new Date(g.createdAt).toLocaleDateString() : "",
    }));

    const csv = convertToCSV(csvData, headers);

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=guests_${new Date().toISOString().split("T")[0]}.csv`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Export revenue report to CSV
 */
export const exportRevenueCSV = async (req, res) => {
  try {
    const { hotel, company } = getCtx(req);
    const { year, month } = req.query;

    const filter = company ? { company } : hotel ? { hotel } : {};

    // Date filter
    const now = new Date();
    const filterYear = year ? parseInt(year) : now.getFullYear();
    const filterMonth = month ? parseInt(month) - 1 : now.getMonth();

    const startOfMonth = new Date(filterYear, filterMonth, 1);
    const endOfMonth = new Date(filterYear, filterMonth + 1, 0);

    filter.createdAt = { $gte: startOfMonth, $lte: endOfMonth };

    // Get daily revenue data
    const bookings = await Booking.find({
      ...filter,
      status: { $nin: ["Cancelled"] },
    }).lean();

    const payments = await PaymentTransaction.find({
      ...filter,
      status: { $in: ["captured", "settled"] },
    }).lean();

    // Group by day
    const dailyData = {};
    for (let d = 1; d <= endOfMonth.getDate(); d++) {
      const date = new Date(filterYear, filterMonth, d);
      const dateKey = date.toISOString().split("T")[0];
      dailyData[dateKey] = {
        date: dateKey,
        dateFormatted: date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
        bookings: 0,
        roomRevenue: 0,
        paymentsReceived: 0,
        checkIns: 0,
        checkOuts: 0,
      };
    }

    bookings.forEach((b) => {
      const dateKey = new Date(b.createdAt).toISOString().split("T")[0];
      if (dailyData[dateKey]) {
        dailyData[dateKey].bookings += 1;
        dailyData[dateKey].roomRevenue += b.totalAmount || 0;
      }

      // Count check-ins
      if (b.status === "Checked-In") {
        const checkInKey = new Date(b.checkIn).toISOString().split("T")[0];
        if (dailyData[checkInKey]) {
          dailyData[checkInKey].checkIns += 1;
        }
      }

      // Count check-outs
      if (b.status === "Checked-Out") {
        const checkOutKey = new Date(b.checkOut).toISOString().split("T")[0];
        if (dailyData[checkOutKey]) {
          dailyData[checkOutKey].checkOuts += 1;
        }
      }
    });

    payments.forEach((p) => {
      const dateKey = new Date(p.createdAt).toISOString().split("T")[0];
      if (dailyData[dateKey]) {
        dailyData[dateKey].paymentsReceived += p.amount || 0;
      }
    });

    const headers = [
      { key: "dateFormatted", label: "Date" },
      { key: "bookings", label: "New Bookings" },
      { key: "checkIns", label: "Check-ins" },
      { key: "checkOuts", label: "Check-outs" },
      { key: "roomRevenue", label: "Room Revenue" },
      { key: "paymentsReceived", label: "Payments Received" },
    ];

    const csvData = Object.values(dailyData);

    // Add summary row
    const summary = {
      dateFormatted: "TOTAL",
      bookings: csvData.reduce((s, d) => s + d.bookings, 0),
      checkIns: csvData.reduce((s, d) => s + d.checkIns, 0),
      checkOuts: csvData.reduce((s, d) => s + d.checkOuts, 0),
      roomRevenue: csvData.reduce((s, d) => s + d.roomRevenue, 0),
      paymentsReceived: csvData.reduce((s, d) => s + d.paymentsReceived, 0),
    };
    csvData.push(summary);

    const csv = convertToCSV(csvData, headers);

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=revenue_${filterYear}_${filterMonth + 1}.csv`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Generate and download PDF invoice
 */
export const generateInvoicePDF = async (req, res) => {
  try {
    const { invoiceId } = req.params;

    const invoice = await Invoice.findById(invoiceId)
      .populate("booking", "bookingId checkIn checkOut")
      .populate("guest", "fullName email phone")
      .populate("hotel", "name address phone email")
      .lean();

    if (!invoice) {
      return res.status(404).json({ success: false, message: "Invoice not found" });
    }

    const doc = new jsPDF();

    // Hotel header
    doc.setFontSize(20);
    doc.text(invoice.hotel?.name || "Hotel", 20, 30);

    doc.setFontSize(10);
    doc.text(invoice.hotel?.address || "", 20, 40);
    doc.text(`Phone: ${invoice.hotel?.phone || ""}`, 20, 45);
    doc.text(`Email: ${invoice.hotel?.email || ""}`, 20, 50);

    // Invoice details
    doc.setFontSize(16);
    doc.text("INVOICE", 150, 30);

    doc.setFontSize(10);
    doc.text(`Invoice #: ${invoice.invoiceId}`, 150, 40);
    doc.text(`Date: ${new Date(invoice.issuedAt).toLocaleDateString()}`, 150, 45);
    doc.text(`Due Date: ${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : "Immediate"}`, 150, 50);

    // Bill to
    doc.setFontSize(12);
    doc.text("Bill To:", 20, 70);
    doc.setFontSize(10);
    doc.text(invoice.guestName || invoice.guest?.fullName || "Guest", 20, 78);
    doc.text(invoice.guest?.email || "", 20, 83);
    doc.text(invoice.guest?.phone || "", 20, 88);

    // Booking info
    doc.text(`Booking Ref: ${invoice.bookingRef}`, 20, 100);
    doc.text(`Check In: ${new Date(invoice.checkIn).toLocaleDateString()}`, 20, 105);
    doc.text(`Check Out: ${new Date(invoice.checkOut).toLocaleDateString()}`, 20, 110);
    doc.text(`Nights: ${invoice.nights}`, 20, 115);

    // Table
    const tableData = [
      ["Description", "Qty", "Rate", "Amount"],
      ["Room Charges", invoice.nights, (invoice.charges?.room / invoice.nights).toFixed(2), invoice.charges?.room.toFixed(2)],
    ];

    if (invoice.charges?.extras > 0) {
      tableData.push(["Additional Services", "", "", invoice.charges?.extras.toFixed(2)]);
    }

    tableData.push(["Tax", "", `${invoice.charges?.taxRate || 13}%`, invoice.charges?.tax.toFixed(2)]);
    tableData.push(["", "", "Total:", invoice.charges?.total.toFixed(2)]);
    tableData.push(["", "", "Paid:", invoice.paid.toFixed(2)]);
    tableData.push(["", "", "Balance:", invoice.balance.toFixed(2)]);

    doc.autoTable({
      startY: 130,
      head: [tableData[0]],
      body: tableData.slice(1),
      theme: "grid",
      headStyles: { fillColor: [102, 126, 234] },
    });

    // Status
    doc.setFontSize(12);
    doc.setTextColor(invoice.status === "paid" ? 16 : 239, invoice.status === "paid" ? 185 : 68, invoice.status === "paid" ? 129 : 68);
    doc.text(`Status: ${invoice.status.toUpperCase()}`, 20, doc.lastAutoTable.finalY + 20);

    // Footer
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.text("Thank you for your business!", 20, 280);

    const pdfBuffer = doc.output("arraybuffer");

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=invoice_${invoice.invoiceId}.pdf`);
    res.send(Buffer.from(pdfBuffer));
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Generate occupancy report PDF
 */
export const generateOccupancyReportPDF = async (req, res) => {
  try {
    const { hotel, company } = getCtx(req);
    const { month, year } = req.query;

    const filter = company ? { company } : hotel ? { hotel } : {};
    const targetMonth = month ? parseInt(month) - 1 : new Date().getMonth();
    const targetYear = year ? parseInt(year) : new Date().getFullYear();

    const startDate = new Date(targetYear, targetMonth, 1);
    const endDate = new Date(targetYear, targetMonth + 1, 0);

    const [totalRooms, bookings, rooms] = await Promise.all([
      Room.countDocuments(filter),
      Booking.find({
        ...filter,
        checkIn: { $lte: endDate },
        checkOut: { $gte: startDate },
        status: { $nin: ["Cancelled"] },
      }).lean(),
      Room.find(filter).lean(),
    ]);

    const doc = new jsPDF("l"); // Landscape

    // Header
    doc.setFontSize(20);
    doc.text("Monthly Occupancy Report", 20, 30);

    doc.setFontSize(12);
    doc.text(`${startDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}`, 20, 40);

    // Summary stats
    const occupiedNights = bookings.reduce((sum, b) => {
      const checkIn = new Date(Math.max(new Date(b.checkIn), startDate));
      const checkOut = new Date(Math.min(new Date(b.checkOut), endDate));
      return sum + Math.max(0, Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24)));
    }, 0);

    const totalRoomNights = totalRooms * endDate.getDate();
    const occupancyRate = totalRoomNights > 0 ? (occupiedNights / totalRoomNights) * 100 : 0;

    doc.text(`Total Rooms: ${totalRooms}`, 20, 55);
    doc.text(`Occupancy Rate: ${occupancyRate.toFixed(1)}%`, 120, 55);
    doc.text(`Total Bookings: ${bookings.length}`, 220, 55);

    // Daily breakdown
    const dailyData = [];
    for (let d = 1; d <= endDate.getDate(); d++) {
      const date = new Date(targetYear, targetMonth, d);
      const occupied = bookings.filter((b) =>
        new Date(b.checkIn) <= date && new Date(b.checkOut) > date
      ).length;

      dailyData.push([
        date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
        occupied,
        totalRooms - occupied,
        totalRooms,
        `${((occupied / totalRooms) * 100).toFixed(1)}%`,
      ]);
    }

    doc.autoTable({
      startY: 70,
      head: [["Date", "Occupied", "Available", "Total Rooms", "Occupancy %"]],
      body: dailyData,
      theme: "grid",
      headStyles: { fillColor: [102, 126, 234] },
    });

    const pdfBuffer = doc.output("arraybuffer");

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=occupancy_report_${targetYear}_${targetMonth + 1}.pdf`);
    res.send(Buffer.from(pdfBuffer));
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Get export formats and options
 */
export const getExportOptions = async (req, res) => {
  res.json({
    success: true,
    data: {
      formats: [
        { id: "csv", name: "CSV", description: "Comma-separated values for Excel/spreadsheets" },
        { id: "pdf", name: "PDF", description: "Portable Document Format for printing" },
      ],
      reports: [
        { id: "bookings", name: "Bookings", formats: ["csv"] },
        { id: "invoices", name: "Invoices", formats: ["csv", "pdf"] },
        { id: "guests", name: "Guest List", formats: ["csv"] },
        { id: "revenue", name: "Revenue Report", formats: ["csv", "pdf"] },
        { id: "occupancy", name: "Occupancy Report", formats: ["pdf"] },
      ],
    },
  });
};
