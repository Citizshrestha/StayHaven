import { FeaturedHotel } from "../../models/FeaturedHotel.model.js";
import { Hotel } from "../../models/hotel.schema.js";
import { createContentController } from "./contentControllerFactory.js";

const populate = {
  path: "hotelId",
  select: "name description location category rating reviewCount starRating priceRange images amenities status isActive featured",
};

const {
  getPublicContent: _getPublicContent,
  getAdminContent,
  getContentById,
  createContent,
  updateContent,
  deleteContent,
  publishContent,
  unpublishContent,
  reorderContent,
} = createContentController({ Model: FeaturedHotel, type: "featured-hotels", populate });

/**
 * GET /api/v1/content/featured-hotels  (public)
 * Returns curated FeaturedHotel records. If none are published/active,
 * falls back to hotels that have the `featured` flag set directly.
 */
export const getPublicContent = async (req, res) => {
  // Step 1: try the curated FeaturedHotel list
  try {
    const mockRes = {
      _data: null,
      status() { return this; },
      json(body) { this._data = body; return this; },
    };
    await _getPublicContent(req, mockRes);
    if (mockRes._data?.success && Array.isArray(mockRes._data.data) && mockRes._data.data.length > 0) {
      return res.json(mockRes._data);
    }
  } catch (curatedErr) {
    console.error("[FeaturedHotel] curated query error", curatedErr?.message);
  }

  // Step 2: fallback to hotels flagged as featured directly
  try {
    const hotels = await Hotel.find({ featured: true, status: "approved", isActive: true })
      .select("name description location category rating reviewCount starRating priceRange images amenities")
      .sort({ rating: -1 })
      .limit(12)
      .lean();

    // Shape to match the FeaturedHotel+populate structure the frontend expects
    const data = hotels.map((hotel, idx) => ({
      _id: hotel._id,
      hotelId: hotel,
      displayOrder: idx,
      badge: null,
      status: "published",
      isActive: true,
    }));

    return res.json({ success: true, data });
  } catch (error) {
    console.error("[FeaturedHotel] fallback error", error?.message);
    return res.json({ success: true, data: [] });
  }
};

export {
  getAdminContent,
  getContentById,
  createContent,
  updateContent,
  deleteContent,
  publishContent,
  unpublishContent,
  reorderContent,
};

/**
 * GET /api/v1/content/featured-hotels/approved-hotels
 * Returns approved + active hotels for the superadmin hotel picker.
 */
export const getApprovedHotels = async (req, res) => {
  try {
    const hotels = await Hotel.find({ status: "approved", isActive: true })
      .select("_id name location category rating priceRange images")
      .sort({ name: 1 })
      .lean();

    return res.json({ success: true, data: hotels });
  } catch (error) {
    console.error("[FeaturedHotel] getApprovedHotels error", error);
    return res.status(500).json({ success: false, message: "Failed to fetch hotels" });
  }
};
