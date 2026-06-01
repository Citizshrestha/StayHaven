import mongoose from "mongoose";
import { getIO } from "../../config/socket.js";

const getModelPath = (Model, path) => Model.schema.path(path);

const hasPath = (Model, path) => Boolean(getModelPath(Model, path));

const getSort = (Model) => {
  const sort = {};
  if (hasPath(Model, "displayOrder")) sort.displayOrder = 1;
  sort.updatedAt = -1;
  return sort;
};

const normalizeBody = (Model, body = {}, userId) => {
  const data = { ...body };
  if (userId && hasPath(Model, "createdBy") && !data.createdBy) data.createdBy = userId;
  return data;
};

// Network/DB error code sets that indicate infrastructure failure (not user error)
const NETWORK_ERROR_CODES = new Set([
  "ECONNREFUSED", "ECONNRESET", "ETIMEDOUT", "ENOTFOUND",
  "ENETUNREACH", "EHOSTUNREACH", "EADDRNOTAVAIL",
]);

// MongoServerError code 50 = MaxTimeMSExpired (query timeout)
const isQueryTimeout = (error) =>
  error?.name === "MongoServerError" && error?.code === 50;

// Any error that indicates the DB/network is unavailable rather than bad input
const isInfrastructureError = (error) =>
  NETWORK_ERROR_CODES.has(error?.code) ||
  isQueryTimeout(error) ||
  error?.name === "MongoNetworkError" ||
  error?.name === "MongoNetworkTimeoutError" ||
  error?.name === "MongoServerSelectionError" ||
  error?.statusCode === 503;

// Derive a safe client-facing message that never leaks internal details
const getSafeMessage = (error, responseStatus) => {
  if (error?.code === 11000) {
    return "A content item with the same unique value already exists.";
  }

  if (isInfrastructureError(error) || responseStatus === 503) {
    return "Service temporarily unavailable. Please try again later.";
  }

  // 4xx errors (validation, cast, not-found) are safe to expose
  if (responseStatus < 500) {
    return error.message || "Invalid request.";
  }

  // 5xx in dev: expose message to aid debugging; in production always sanitize
  if (process.env.NODE_ENV !== "production") {
    return error.message || "An unexpected error occurred.";
  }

  return "An unexpected error occurred. Please try again later.";
};

const serializeError = (res, error, statusCode = 500) => {
  const isCastError = error instanceof mongoose.Error.CastError;
  const isValidationError = error instanceof mongoose.Error.ValidationError;
  const isDuplicateKey = error?.code === 11000;

  let responseStatus;
  if (isCastError || isValidationError || isDuplicateKey) {
    responseStatus = 400;
  } else if (isInfrastructureError(error)) {
    responseStatus = 503;
  } else {
    responseStatus = statusCode;
  }

  const message = getSafeMessage(error, responseStatus);

  console.error("[ContentAPI] Error", {
    statusCode: responseStatus,
    name: error?.name,
    code: error?.code,
    message: error?.message,
    stack: error?.stack,
  });

  return res.status(responseStatus).json({
    success: false,
    message,
    data: [],
  });
};

const emitContentUpdated = (type, data) => {
  const io = getIO();
  if (io) io.emit("content:updated", { type, data });
};

const getPublicFilter = (Model) => {
  const filter = {};
  if (hasPath(Model, "isActive")) filter.isActive = true;
  if (hasPath(Model, "status")) filter.status = "published";
  return filter;
};

const maybePopulate = (query, populate) => (populate ? query.populate(populate) : query);

const assertMongoConnected = () => {
  // readyState: 0=disconnected, 1=connected, 2=connecting, 3=disconnecting
  if (mongoose.connection.readyState !== 1) {
    const stateLabel = ["disconnected", "connected", "connecting", "disconnecting"][mongoose.connection.readyState] ?? "unknown";
    const error = new Error(`Database is currently ${stateLabel}. Please try again shortly.`);
    error.statusCode = 503;
    throw error;
  }
};

const withQueryTimeout = (query) => query.maxTimeMS(10000);

const toJson = (doc) => (typeof doc?.toObject === "function" ? doc.toObject() : doc);

const getDefaultSelectOptions = (Model, path) => {
  const schemaPath = getModelPath(Model, path);
  return Array.isArray(schemaPath?.enumValues) ? schemaPath.enumValues : [];
};

const cleanString = (value) => (typeof value === "string" ? value.trim() : value);

const isBlank = (value) => value == null || (typeof value === "string" && value.trim() === "");

const normalizeUrl = (value) => {
  if (isBlank(value)) return undefined;
  const url = cleanString(value);
  if (url.startsWith("/") || url.startsWith("http://") || url.startsWith("https://")) return url;
  throw new Error("Image and link fields must be absolute HTTP(S) URLs or app-relative paths.");
};

const normalizeArray = (value) => {
  if (Array.isArray(value)) return value;
  if (isBlank(value)) return [];
  return [value];
};

// 24-char hex strings are valid MongoDB ObjectIds — don't mangle them
const isObjectIdString = (value) =>
  typeof value === "string" && /^[0-9a-fA-F]{24}$/.test(value);

const sanitizePayload = (Model, body = {}) => {
  const payload = { ...body };

  Object.keys(payload).forEach((key) => {
    const value = payload[key];
    const schemaPath = getModelPath(Model, key);
    // Preserve ObjectId strings so Mongoose can cast them correctly
    if (schemaPath?.instance === "ObjectID" && isObjectIdString(value)) return;
    if (value === "") payload[key] = undefined;
    else if (typeof value === "string") payload[key] = value.trim();
  });

  ["image", "backgroundImage", "ctaLink"].forEach((key) => {
    if (key in payload) payload[key] = normalizeUrl(payload[key]);
  });

  // contactInfo is stored as a plain object {address, phone, email}.
  // If the client accidentally sends it as an array, unwrap the first element.
  // If it is already an object (or undefined), leave it untouched.
  if (Array.isArray(payload.contactInfo)) {
    payload.contactInfo = payload.contactInfo[0] || {};
  }

  ["images", "activities", "features"].forEach((key) => {
    if (key in payload) {
      payload[key] = normalizeArray(payload[key]).map(cleanString).filter(Boolean);
    }
  });

  ["displayOrder", "hotelsCount", "discountPercent", "discountFlat", "price", "liveViewers"].forEach((key) => {
    if (key in payload && payload[key] !== undefined) {
      const numberValue = Number(payload[key]);
      payload[key] = Number.isFinite(numberValue) ? numberValue : undefined;
    }
  });

  Object.keys(payload).forEach((key) => {
    const schemaPath = getModelPath(Model, key);
    if (!schemaPath || payload[key] === undefined || payload[key] === null || payload[key] === "") return;
    if (schemaPath.instance === "Date") {
      const dateValue = new Date(payload[key]);
      payload[key] = Number.isNaN(dateValue.getTime()) ? undefined : dateValue;
    }
  });

  ["isPopular", "isActive", "secureBooking", "newsletterEnabled"].forEach((key) => {
    if (key in payload && payload[key] !== undefined) payload[key] = Boolean(payload[key]);
  });

  if (hasPath(Model, "applicableTo") && !payload.applicableTo) payload.applicableTo = "all";
  if (hasPath(Model, "billingCycle") && !payload.billingCycle) payload.billingCycle = "yearly";
  if (hasPath(Model, "type") && !payload.type) payload.type = getDefaultSelectOptions(Model, "type")[0];
  if (hasPath(Model, "status") && !payload.status) payload.status = "published";
  if (hasPath(Model, "isActive") && payload.isActive === undefined) payload.isActive = true;
  if (hasPath(Model, "publishedAt") && !payload.publishedAt) payload.publishedAt = new Date();

  return payload;
};

const createDefaultDoc = async (Model, defaultContent) => {
  if (!defaultContent || Object.keys(defaultContent).length === 0) return null;

  const payload = sanitizePayload(Model, defaultContent);
  const doc = await Model.create(payload);
  return toJson(doc);
};

export const createContentController = ({ Model, type, populate = null, singleton = false, defaultContent = null }) => {
  const getPublicContent = async (req, res) => {
    try {
      assertMongoConnected();

      const filter = getPublicFilter(Model);
      let query = withQueryTimeout(Model.find(filter).sort(getSort(Model))).lean();
      query = maybePopulate(query, populate);
      let docs = await query;

      if (singleton && docs.length === 0) {
        const existing = await withQueryTimeout(Model.findOne().sort(getSort(Model))).lean();
        if (existing) docs = [existing];
      }

      if (singleton && docs.length === 0 && defaultContent) {
        // Attempt to seed default content; if this write fails, degrade gracefully
        // rather than letting a write error break a public GET endpoint.
        try {
          const created = await createDefaultDoc(Model, defaultContent);
          docs = created ? [created] : [];
        } catch (seedErr) {
          console.error("[ContentAPI] Failed to seed default content", {
            type,
            message: seedErr?.message,
          });
          docs = [];
        }
      }

      const data = singleton ? docs.slice(0, 1) : docs;
      return res.json({ success: true, data });
    } catch (error) {
      return serializeError(res, error, error.statusCode || 500);
    }
  };

  const getAdminContent = async (req, res) => {
    try {
      assertMongoConnected();

      const filter = {};
      if (req.query.status && hasPath(Model, "status")) filter.status = req.query.status;
      if (req.query.isActive && hasPath(Model, "isActive")) {
        filter.isActive = req.query.isActive === "true";
      }

      let query = withQueryTimeout(Model.find(filter).sort(getSort(Model))).lean();
      query = maybePopulate(query, populate);
      let docs = await query;

      if (singleton && docs.length === 0) {
        const created = await createDefaultDoc(Model, defaultContent);
        docs = created ? [created] : [];
      }

      return res.json({ success: true, data: singleton ? docs.slice(0, 1) : docs });
    } catch (error) {
      return serializeError(res, error, error.statusCode || 500);
    }
  };

  const getContentById = async (req, res) => {
    try {
      assertMongoConnected();

      let query = withQueryTimeout(Model.findById(req.params.id)).lean();
      query = maybePopulate(query, populate);
      const doc = await query;
      if (!doc) return res.status(404).json({ success: false, message: "Content not found" });
      return res.json({ success: true, data: doc });
    } catch (error) {
      return serializeError(res, error, error.statusCode || 500);
    }
  };

  const createContent = async (req, res) => {
    try {
      assertMongoConnected();

      const payload = normalizeBody(Model, sanitizePayload(Model, req.body), req.user?._id);
      let doc;

      if (singleton) {
        const existing = await withQueryTimeout(Model.findOne().sort({ updatedAt: -1 }));
        if (existing) {
          Object.assign(existing, payload);
          doc = await existing.save();
        } else {
          doc = await Model.create(payload);
        }
      } else {
        doc = await Model.create(payload);
      }

      let response = withQueryTimeout(Model.findById(doc._id)).lean();
      response = maybePopulate(response, populate);
      const data = await response;
      emitContentUpdated(type, data);
      return res.status(201).json({ success: true, data });
    } catch (error) {
      return serializeError(res, error, error.statusCode || 400);
    }
  };

  const updateContent = async (req, res) => {
    try {
      assertMongoConnected();

      const payload = sanitizePayload(Model, req.body);
      let doc = await withQueryTimeout(Model.findByIdAndUpdate(req.params.id, payload, {
        new: true,
        runValidators: true,
      })).lean();
      if (!doc) return res.status(404).json({ success: false, message: "Content not found" });
      if (populate) doc = await Model.populate(doc, populate);
      emitContentUpdated(type, doc);
      return res.json({ success: true, data: doc });
    } catch (error) {
      return serializeError(res, error, error.statusCode || 400);
    }
  };

  const deleteContent = async (req, res) => {
    try {
      assertMongoConnected();

      let doc;
      if (hasPath(Model, "isActive")) {
        doc = await withQueryTimeout(Model.findByIdAndUpdate(
          req.params.id,
          { isActive: false },
          { new: true, runValidators: true }
        )).lean();
      } else if (hasPath(Model, "status")) {
        doc = await withQueryTimeout(Model.findByIdAndUpdate(
          req.params.id,
          { status: "draft" },
          { new: true, runValidators: true }
        )).lean();
      } else {
        return res.status(400).json({ success: false, message: "Soft delete is not supported for this content type" });
      }

      if (!doc) return res.status(404).json({ success: false, message: "Content not found" });
      if (populate) doc = await Model.populate(doc, populate);
      emitContentUpdated(type, doc);
      return res.json({ success: true, data: doc });
    } catch (error) {
      return serializeError(res, error, error.statusCode || 400);
    }
  };

  const publishContent = async (req, res) => {
    try {
      assertMongoConnected();

      const updates = {};
      if (hasPath(Model, "status")) updates.status = "published";
      if (hasPath(Model, "isActive")) updates.isActive = true;
      if (hasPath(Model, "publishedAt")) updates.publishedAt = new Date();

      let doc = await withQueryTimeout(Model.findByIdAndUpdate(req.params.id, updates, {
        new: true,
        runValidators: true,
      })).lean();
      if (!doc) return res.status(404).json({ success: false, message: "Content not found" });
      if (populate) doc = await Model.populate(doc, populate);
      emitContentUpdated(type, doc);
      return res.json({ success: true, data: doc });
    } catch (error) {
      return serializeError(res, error, error.statusCode || 400);
    }
  };

  const unpublishContent = async (req, res) => {
    try {
      assertMongoConnected();

      const updates = {};
      if (hasPath(Model, "status")) updates.status = "draft";
      if (!hasPath(Model, "status") && hasPath(Model, "isActive")) updates.isActive = false;

      let doc = await withQueryTimeout(Model.findByIdAndUpdate(req.params.id, updates, {
        new: true,
        runValidators: true,
      })).lean();
      if (!doc) return res.status(404).json({ success: false, message: "Content not found" });
      if (populate) doc = await Model.populate(doc, populate);
      emitContentUpdated(type, doc);
      return res.json({ success: true, data: doc });
    } catch (error) {
      return serializeError(res, error, error.statusCode || 400);
    }
  };

  const reorderContent = async (req, res) => {
    try {
      assertMongoConnected();

      if (!hasPath(Model, "displayOrder")) {
        return res.status(400).json({ success: false, message: "Reorder is not supported for this content type" });
      }

      const items = Array.isArray(req.body.items) ? req.body.items : [];
      await Promise.all(
        items.map((item, index) => withQueryTimeout(Model.findByIdAndUpdate(item.id || item._id, {
          displayOrder: Number.isFinite(Number(item.displayOrder)) ? Number(item.displayOrder) : index,
        })))
      );

      let query = withQueryTimeout(Model.find({}).sort(getSort(Model))).lean();
      query = maybePopulate(query, populate);
      const data = await query;
      emitContentUpdated(type, data);
      return res.json({ success: true, data });
    } catch (error) {
      return serializeError(res, error, error.statusCode || 400);
    }
  };

  return {
    getPublicContent,
    getAdminContent,
    getContentById,
    createContent,
    updateContent,
    deleteContent,
    publishContent,
    unpublishContent,
    reorderContent,
  };
};
