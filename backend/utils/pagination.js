/**
 * Cursor-Based Pagination Helper
 * Production-grade pagination for guest/booking lists with 100 max per request
 */

import mongoose from "mongoose";
import { query } from "express-validator";

// Maximum allowed page size
export const MAX_PAGE_SIZE = 100;
export const DEFAULT_PAGE_SIZE = 20;

/**
 * Pagination Configuration Options
 */
export const PaginationDefaults = {
  maxLimit: MAX_PAGE_SIZE,
  defaultLimit: DEFAULT_PAGE_SIZE,
  maxSkip: 100000, // Prevent excessive offset
};

/**
 * Parse and validate pagination parameters from request
 * Enforces 100 max limit per request
 */
export const parsePaginationParams = (req) => {
  let { page, limit, cursor, sortBy, sortOrder, search } = req.query;
  
  // Parse cursor-based pagination params
  let cursorId = null;
  let cursorValue = null;
  
  if (cursor) {
    try {
      const cursorData = JSON.parse(Buffer.from(cursor, "base64").toString("utf8"));
      cursorId = cursorData.id;
      cursorValue = cursorData.v; // value to compare for sorting
    } catch (e) {
      // Invalid cursor, fall back to regular pagination
      cursor = null;
    }
  }
  
  // Parse limit - enforce maximum of 100
  let parsedLimit = parseInt(limit, 10) || PaginationDefaults.defaultLimit;
  parsedLimit = Math.min(Math.max(1, parsedLimit), PaginationDefaults.maxLimit);
  
  // Parse page for offset-based pagination
  let parsedPage = parseInt(page, 10) || 1;
  parsedPage = Math.max(1, parsedPage);
  
  // Calculate skip with safety limit
  let skip = (parsedPage - 1) * parsedLimit;
  if (skip > PaginationDefaults.maxSkip) {
    skip = PaginationDefaults.maxSkip;
  }
  
  // Sort configuration
  const validSortFields = ["createdAt", "updatedAt", "checkIn", "checkOut", "fullName", "guestId", "bookingId", "totalAmount"];
  const safeSortBy = validSortFields.includes(sortBy) ? sortBy : "createdAt";
  const safeSortOrder = sortOrder === "asc" ? 1 : -1;
  
  return {
    // Cursor-based pagination
    useCursor: !!cursorId,
    cursorId,
    cursorValue,
    
    // Offset-based pagination
    page: parsedPage,
    limit: parsedLimit,
    skip,
    
    // Sorting
    sortBy: safeSortBy,
    sortOrder: safeSortOrder,
    sort: { [safeSortBy]: safeSortOrder },
    
    // Search
    search: search ? search.trim() : null,
  };
};

/**
 * Create pagination metadata for response
 */
export const createPaginationMeta = ({
  total,
  page,
  limit,
  hasMore,
  nextCursor,
  prevCursor,
  sortBy,
  sortOrder,
}) => {
  const totalPages = Math.ceil(total / limit);
  
  return {
    total,
    page,
    limit,
    totalPages,
    hasMore,
    hasNextPage: hasMore,
    hasPrevPage: page > 1,
    ...(nextCursor && { nextCursor }),
    ...(prevCursor && { prevCursor }),
    sortBy,
    sortOrder: sortOrder === 1 ? "asc" : "desc",
  };
};

/**
 * Encode cursor for next page
 */
export const encodeCursor = (lastItem, sortField) => {
  if (!lastItem) return null;
  
  const cursorData = {
    id: lastItem._id?.toString() || lastItem.id,
    v: lastItem[sortField],
    sf: sortField,
  };
  
  return Buffer.from(JSON.stringify(cursorData)).toString("base64");
};

/**
 * Build query conditions for cursor-based pagination
 */
export const buildCursorQuery = (cursorId, cursorValue, sortField, sortOrder) => {
  if (!cursorId || cursorValue === undefined) return null;
  
  const comparison = sortOrder === 1 ? "$gt" : "$lt";
  
  return {
    $or: [
      { [sortField]: { [comparison]: cursorValue } },
      { 
        [sortField]: cursorValue,
        _id: { [comparison]: new mongoose.Types.ObjectId(cursorId) },
      },
    ],
  };
};

/**
 * Main pagination helper function
 * Returns paginated query results with cursor or offset-based pagination
 */
export const paginateQuery = async ({
  model,
  filter = {},
  pagination,
  populate = [],
  select = null,
  lean = true,
}) => {
  const { useCursor, cursorId, cursorValue, skip, limit, sort, sortBy, sortOrder } = pagination;
  
  let query = model.find(filter);
  
  // Apply cursor-based filter if provided
  if (useCursor && cursorId) {
    const cursorQuery = buildCursorQuery(cursorId, cursorValue, sortBy, sortOrder);
    if (cursorQuery) {
      query = model.find({ ...filter, ...cursorQuery });
    }
  } else {
    // Apply offset-based skip
    query = query.skip(skip);
  }
  
  // Apply limit (fetch one extra to check if there are more results)
  query = query.limit(limit + 1);
  
  // Apply sort
  query = query.sort(sort);
  
  // Apply populate
  populate.forEach((p) => {
    if (typeof p === "string") {
      query = query.populate(p);
    } else if (typeof p === "object") {
      query = query.populate(p);
    }
  });
  
  // Apply select
  if (select) {
    query = query.select(select);
  }
  
  // Apply lean
  if (lean) {
    query = query.lean();
  }
  
  // Execute query
  const results = await query.exec();
  
  // Check if there are more results
  const hasMore = results.length > limit;
  const items = hasMore ? results.slice(0, limit) : results;
  
  // Get total count (for offset-based pagination)
  let total = null;
  if (!useCursor) {
    total = await model.countDocuments(filter);
  }
  
  // Create next cursor
  const nextCursor = hasMore ? encodeCursor(items[items.length - 1], sortBy) : null;
  
  // Create previous cursor (for bi-directional pagination)
  let prevCursor = null;
  if (useCursor && items.length > 0) {
    // Reverse sort to get previous page cursor
    const reverseSort = { [sortBy]: sortOrder * -1 };
    const prevQuery = model
      .find({
        ...filter,
        [sortBy]: { [sortOrder === 1 ? "$lt" : "$gt"]: items[0][sortBy] || items[0][sortBy.toLowerCase()] },
      })
      .sort(reverseSort)
      .limit(1);
    
    const prevItem = await prevQuery.lean().exec();
    if (prevItem && prevItem.length > 0) {
      prevCursor = encodeCursor(prevItem[0], sortBy);
    }
  }
  
  return {
    items,
    pagination: createPaginationMeta({
      total,
      page: pagination.page,
      limit,
      hasMore,
      nextCursor,
      prevCursor,
      sortBy,
      sortOrder,
    }),
  };
};

/**
 * Express middleware to parse and attach pagination params to request
 */
export const paginationMiddleware = (req, res, next) => {
  req.pagination = parsePaginationParams(req);
  
  // Also validate query params for safety
  if (req.query.limit) {
    const requestedLimit = parseInt(req.query.limit, 10);
    if (requestedLimit > MAX_PAGE_SIZE) {
      return res.status(400).json({
        success: false,
        message: `Maximum page size is ${MAX_PAGE_SIZE}. Requested: ${requestedLimit}`,
        maxAllowed: MAX_PAGE_SIZE,
      });
    }
  }
  
  next();
};

/**
 * Helper to create paginated response
 */
export const createPaginatedResponse = (items, paginationMeta, additionalData = {}) => ({
  success: true,
  data: items,
  pagination: paginationMeta,
  ...additionalData,
});

/**
 * Express validator for pagination query params
 */
export const paginationValidation = [
  query("page")
    .optional()
    .isInt({ min: 1, max: 10000 })
    .withMessage("Page must be between 1 and 10000"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: MAX_PAGE_SIZE })
    .withMessage(`Limit must be between 1 and ${MAX_PAGE_SIZE}`),
  query("cursor")
    .optional()
    .isString()
    .withMessage("Cursor must be a valid string"),
  query("sortBy")
    .optional()
    .isIn(["createdAt", "updatedAt", "checkIn", "checkOut", "fullName", "guestId", "bookingId"])
    .withMessage("Invalid sort field"),
  query("sortOrder")
    .optional()
    .isIn(["asc", "desc"])
    .withMessage("Sort order must be 'asc' or 'desc'"),
  query("search")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Search query too long (max 100 characters)"),
];

export default {
  parsePaginationParams,
  paginateQuery,
  paginationMiddleware,
  createPaginatedResponse,
  createPaginationMeta,
  encodeCursor,
  buildCursorQuery,
  paginationValidation,
  MAX_PAGE_SIZE,
};
