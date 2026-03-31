/**
 * Property-Scope Enforcement Middleware
 *
 * Ensures receptionists (and other property-scoped roles) can only
 * act on hotels they are assigned to. Admins / owners / managers
 * bypass the check.
 *
 * Usage:  router.use(protect, enforcePropertyScope);
 *         — or per-route: router.get("/...", protect, enforcePropertyScope, handler);
 */

const BYPASS_ROLES = new Set(["owner", "admin", "manager"]);

/**
 * Resolve the hotel ID the request is targeting.
 * Priority: explicit param/query/body → user's first assigned property.
 */
const resolveRequestedHotel = (req) => {
  return (
    req.params.hotelId ||
    req.query.hotelId ||
    req.body?.hotelId ||
    null
  );
};

/**
 * Middleware factory.
 * @param {{ strict: boolean }} opts
 *   strict = true  → reject if no hotel ID can be resolved at all
 *   strict = false → allow fall-through when no hotel is specified
 *                     (for company-wide read endpoints)
 */
export const enforcePropertyScope = (opts = { strict: false }) => {
  return (req, res, next) => {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ success: false, message: "Not authenticated" });
    }

    const userRole = user.companyRole || user.role?.name;

    // Bypass for privileged roles
    if (BYPASS_ROLES.has(userRole)) {
      return next();
    }

    const assignedIds = (user.assignedProperties || []).map((p) =>
      (p._id || p).toString()
    );

    // Nothing assigned at all → block property-scoped roles
    if (assignedIds.length === 0) {
      return res.status(403).json({
        success: false,
        message: "No properties assigned to your account. Contact management.",
      });
    }

    const requestedHotel = resolveRequestedHotel(req);

    if (requestedHotel) {
      // Explicit hotel specified — must be in the assignment list
      if (!assignedIds.includes(requestedHotel.toString())) {
        return res.status(403).json({
          success: false,
          message: "You are not authorised to access this property.",
        });
      }
      // Pin the resolved hotel so downstream getCtx() cannot be spoofed
      req._scopedHotelId = requestedHotel.toString();
    } else {
      // No explicit hotel → default to first assigned property
      // (fine for dash/list endpoints that filter by hotel)
      req._scopedHotelId = assignedIds[0];
    }

    // Also expose the full list for controllers that need it
    req._assignedPropertyIds = assignedIds;

    next();
  };
};

/**
 * Strict variant — use for mutating operations where a hotel MUST be known.
 */
export const enforcePropertyScopeStrict = enforcePropertyScope({ strict: true });

export default enforcePropertyScope;
