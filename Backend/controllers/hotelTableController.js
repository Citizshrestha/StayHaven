import { HotelTable } from "../models/hotelTable.schema.js";
import { Hotel } from "../models/hotel.schema.js";
import { Company } from "../models/company.schema.js";
import { User } from "../models/user.schema.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { generateTableQRCode } from "../utils/qrGenerator.js";

// Helper function to get hotel ID from user
const getHotelFromUser = async (user) => {
  // Populate assignedProperties if not already
  const populatedUser = await User.findById(user._id).populate('assignedProperties');
  
  if (populatedUser.assignedProperties && populatedUser.assignedProperties.length > 0) {
    return populatedUser.assignedProperties[0];
  }
  
  // Fallback: check if user owns any hotels
  const ownedHotel = await Hotel.findOne({ owner: user._id });
  if (ownedHotel) {
    return ownedHotel;
  }
  
  return null;
};

// @desc    Create a new table
// @route   POST /api/tables
// @access  Private (Owner, Manager)
export const createTable = asyncHandler(async (req, res) => {
  let {
    hotelId,
    tableNumber,
    tableName,
    capacity,
    location,
    description,
    minSpend,
  } = req.body;

  // If hotelId not provided, get it from user's assigned properties
  if (!hotelId) {
    const userHotel = await getHotelFromUser(req.user);
    if (userHotel) {
      hotelId = userHotel._id.toString();
    }
  }

  // Validate required fields
  if (!hotelId || !tableNumber) {
    return res.status(400).json({
      success: false,
      message: "Hotel ID and table number are required",
    });
  }

  // Verify hotel exists and user has access
  const hotel = await Hotel.findById(hotelId);
  if (!hotel) {
    return res.status(404).json({
      success: false,
      message: "Hotel not found",
    });
  }

  // Check ownership/access
  if (hotel.owner.toString() !== req.user._id.toString() && 
      req.user.role?.name !== 'admin' &&
      req.user.role?.name !== 'manager') {
    return res.status(403).json({
      success: false,
      message: "Not authorized to add tables to this hotel",
    });
  }

  // Check if table number already exists for this hotel
  const existingTable = await HotelTable.findOne({
    hotel: hotelId,
    tableNumber: tableNumber,
  });

  if (existingTable) {
    return res.status(400).json({
      success: false,
      message: `Table ${tableNumber} already exists in this hotel`,
    });
  }

  // Create the table
  const table = await HotelTable.create({
    hotel: hotelId,
    company: hotel.company,
    tableNumber,
    tableName: tableName || `Table ${tableNumber}`,
    capacity: capacity || 4,
    location: location || 'indoor',
    description,
    minSpend: minSpend || 0,
    createdBy: req.user._id,
  });

  // Generate QR code
  const { qrCodeData, qrCodeImage } = await generateTableQRCode(table.uniqueToken, hotelId);
  table.qrCodeData = qrCodeData;
  table.qrCodeImage = qrCodeImage;
  await table.save();

  res.status(201).json({
    success: true,
    message: "Table created successfully with QR code",
    table,
  });
});

// @desc    Get all tables for a hotel
// @route   GET /api/tables?hotelId=xxx
// @access  Private (Owner, Manager, Staff)
export const getTables = asyncHandler(async (req, res) => {
  let { hotelId, status, location, isActive } = req.query;

  // If hotelId not provided, get it from user's assigned properties
  if (!hotelId) {
    const userHotel = await getHotelFromUser(req.user);
    if (userHotel) {
      hotelId = userHotel._id.toString();
    }
  }

  if (!hotelId) {
    return res.status(400).json({
      success: false,
      message: "Hotel ID is required. Please ensure you have an assigned property.",
    });
  }

  // Build query
  const query = { hotel: hotelId };

  if (status) {
    query.status = status;
  }

  if (location) {
    query.location = location;
  }

  if (isActive !== undefined) {
    query.isActive = isActive === 'true';
  }

  const tables = await HotelTable.find(query)
    .sort({ tableNumber: 1 })
    .populate('hotel', 'name location')
    .populate('createdBy', 'fullname');

  res.status(200).json({
    success: true,
    count: tables.length,
    data: tables,
  });
});

// @desc    Get single table by ID
// @route   GET /api/tables/:id
// @access  Private (Owner, Manager, Staff)
export const getTableById = asyncHandler(async (req, res) => {
  const table = await HotelTable.findById(req.params.id)
    .populate('hotel', 'name location')
    .populate('createdBy', 'fullname');

  if (!table) {
    return res.status(404).json({
      success: false,
      message: "Table not found",
    });
  }

  res.status(200).json({
    success: true,
    table,
  });
});

// @desc    Update table
// @route   PUT /api/tables/:id
// @access  Private (Owner, Manager)
export const updateTable = asyncHandler(async (req, res) => {
  const {
    tableNumber,
    tableName,
    capacity,
    location,
    status,
    description,
    minSpend,
    isActive,
    isQrActive,
  } = req.body;

  const table = await HotelTable.findById(req.params.id);

  if (!table) {
    return res.status(404).json({
      success: false,
      message: "Table not found",
    });
  }

  // Verify ownership
  const hotel = await Hotel.findById(table.hotel);
  if (hotel.owner.toString() !== req.user._id.toString() && 
      req.user.role?.name !== 'admin' &&
      req.user.role?.name !== 'manager') {
    return res.status(403).json({
      success: false,
      message: "Not authorized to update this table",
    });
  }

  // Check if new table number conflicts with existing
  if (tableNumber && tableNumber !== table.tableNumber) {
    const existingTable = await HotelTable.findOne({
      hotel: table.hotel,
      tableNumber: tableNumber,
      _id: { $ne: table._id },
    });

    if (existingTable) {
      return res.status(400).json({
        success: false,
        message: `Table ${tableNumber} already exists in this hotel`,
      });
    }
  }

  // Update fields
  if (tableNumber) table.tableNumber = tableNumber;
  if (tableName) table.tableName = tableName;
  if (capacity) table.capacity = capacity;
  if (location) table.location = location;
  if (status) table.status = status;
  if (description !== undefined) table.description = description;
  if (minSpend !== undefined) table.minSpend = minSpend;
  if (isActive !== undefined) table.isActive = isActive;
  if (isQrActive !== undefined) table.isQrActive = isQrActive;

  await table.save();

  res.status(200).json({
    success: true,
    message: "Table updated successfully",
    table,
  });
});

// @desc    Delete table
// @route   DELETE /api/tables/:id
// @access  Private (Owner, Admin)
export const deleteTable = asyncHandler(async (req, res) => {
  const table = await HotelTable.findById(req.params.id);

  if (!table) {
    return res.status(404).json({
      success: false,
      message: "Table not found",
    });
  }

  // Verify ownership
  const hotel = await Hotel.findById(table.hotel);
  if (hotel.owner.toString() !== req.user._id.toString() && 
      req.user.role?.name !== 'admin') {
    return res.status(403).json({
      success: false,
      message: "Not authorized to delete this table",
    });
  }

  await HotelTable.findByIdAndDelete(req.params.id);

  res.status(200).json({
    success: true,
    message: "Table deleted successfully",
  });
});

// @desc    Generate/Regenerate QR code for a table
// @route   POST /api/tables/:id/generate-qr
// @access  Private (Owner, Manager)
export const generateTableQR = asyncHandler(async (req, res) => {
  const { regenerate } = req.body; // If true, generate new token

  const table = await HotelTable.findById(req.params.id);

  if (!table) {
    return res.status(404).json({
      success: false,
      message: "Table not found",
    });
  }

  // Verify ownership
  const hotel = await Hotel.findById(table.hotel);
  if (hotel.owner.toString() !== req.user._id.toString() && 
      req.user.role?.name !== 'admin' &&
      req.user.role?.name !== 'manager') {
    return res.status(403).json({
      success: false,
      message: "Not authorized to generate QR for this table",
    });
  }

  // Regenerate token if requested (invalidates old QR codes)
  if (regenerate) {
    table.regenerateToken();
  }

  // Generate QR code
  const { qrCodeData, qrCodeImage } = await generateTableQRCode(table.uniqueToken, table.hotel.toString());
  table.qrCodeData = qrCodeData;
  table.qrCodeImage = qrCodeImage;
  table.isQrActive = true;

  await table.save();

  res.status(200).json({
    success: true,
    message: regenerate ? "QR code regenerated successfully (old QR is now invalid)" : "QR code generated successfully",
    table: {
      _id: table._id,
      tableNumber: table.tableNumber,
      uniqueToken: table.uniqueToken,
      qrCodeData: table.qrCodeData,
      qrCodeImage: table.qrCodeImage,
    },
  });
});

// @desc    Batch create multiple tables
// @route   POST /api/tables/batch
// @access  Private (Owner, Manager)
export const batchCreateTables = asyncHandler(async (req, res) => {
  let { hotelId, startNumber, endNumber, prefix, capacity, location, count } = req.body;

  // If hotelId not provided, get it from user's assigned properties
  if (!hotelId) {
    const userHotel = await getHotelFromUser(req.user);
    if (userHotel) {
      hotelId = userHotel._id.toString();
    }
  }

  // Support both count-based and range-based creation
  if (count && startNumber !== undefined) {
    endNumber = startNumber + count - 1;
  }

  if (!hotelId || startNumber === undefined || endNumber === undefined) {
    return res.status(400).json({
      success: false,
      message: "Hotel ID, start number, and end number (or count) are required",
    });
  }

  if (startNumber > endNumber) {
    return res.status(400).json({
      success: false,
      message: "Start number must be less than or equal to end number",
    });
  }

  if (endNumber - startNumber > 50) {
    return res.status(400).json({
      success: false,
      message: "Cannot create more than 50 tables at once",
    });
  }

  // Verify hotel exists and user has access
  const hotel = await Hotel.findById(hotelId);
  if (!hotel) {
    return res.status(404).json({
      success: false,
      message: "Hotel not found",
    });
  }

  if (hotel.owner.toString() !== req.user._id.toString() && 
      req.user.role?.name !== 'admin' &&
      req.user.role?.name !== 'manager') {
    return res.status(403).json({
      success: false,
      message: "Not authorized to add tables to this hotel",
    });
  }

  const createdTables = [];
  const errors = [];

  for (let i = startNumber; i <= endNumber; i++) {
    const tableNumber = prefix ? `${prefix}${i}` : `${i}`;
    
    try {
      // Check if table exists
      const exists = await HotelTable.findOne({ hotel: hotelId, tableNumber });
      if (exists) {
        errors.push(`Table ${tableNumber} already exists`);
        continue;
      }

      // Create table
      const table = await HotelTable.create({
        hotel: hotelId,
        company: hotel.company,
        tableNumber,
        tableName: `Table ${tableNumber}`,
        capacity: capacity || 4,
        location: location || 'indoor',
        createdBy: req.user._id,
      });

      // Generate QR code
      const { qrCodeData, qrCodeImage } = await generateTableQRCode(table.uniqueToken, hotelId);
      table.qrCodeData = qrCodeData;
      table.qrCodeImage = qrCodeImage;
      await table.save();

      createdTables.push(table);
    } catch (error) {
      errors.push(`Failed to create table ${tableNumber}: ${error.message}`);
    }
  }

  res.status(201).json({
    success: true,
    message: `${createdTables.length} tables created successfully`,
    createdCount: createdTables.length,
    tables: createdTables,
    errors: errors.length > 0 ? errors : undefined,
  });
});

// @desc    Update table status (quick update)
// @route   PATCH /api/tables/:id/status
// @access  Private (Owner, Manager, Staff)
export const updateTableStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;

  if (!status || !['available', 'occupied', 'reserved', 'maintenance'].includes(status)) {
    return res.status(400).json({
      success: false,
      message: "Valid status is required (available, occupied, reserved, maintenance)",
    });
  }

  const table = await HotelTable.findById(req.params.id);

  if (!table) {
    return res.status(404).json({
      success: false,
      message: "Table not found",
    });
  }

  table.status = status;
  await table.save();

  res.status(200).json({
    success: true,
    message: `Table status updated to ${status}`,
    table,
  });
});

// @desc    Get QR code download data for a table
// @route   GET /api/tables/:id/qr-download
// @access  Private (Owner, Manager)
export const getTableQRDownload = asyncHandler(async (req, res) => {
  const table = await HotelTable.findById(req.params.id)
    .populate('hotel', 'name');

  if (!table) {
    return res.status(404).json({
      success: false,
      message: "Table not found",
    });
  }

  if (!table.qrCodeImage) {
    return res.status(400).json({
      success: false,
      message: "QR code not generated yet. Please generate first.",
    });
  }

  res.status(200).json({
    success: true,
    qrData: {
      tableNumber: table.tableNumber,
      tableName: table.tableName,
      hotelName: table.hotel?.name,
      qrCodeImage: table.qrCodeImage,
      qrCodeUrl: table.qrCodeData,
      uniqueToken: table.uniqueToken,
    },
  });
});
