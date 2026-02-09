/**
 * Role Configuration for the Hotel Booking & Order Management System
 * 
 * This file defines all roles and their permissions across the system.
 * Used for route protection and feature access control.
 */

export const ROLES = {
    // System-wide access
    SUPER_ADMIN: 'superadmin',

    // Hotel-scoped access (staff must be assigned to a hotel)
    HOTEL_ADMIN: 'hoteladmin',
    RECEPTIONIST: 'receptionist',
    WAITER: 'waiter',
    CHEF: 'chief',  // Kitchen staff

    // Guest access
    GUEST: 'guest',
};

/**
 * Role hierarchy for permission inheritance
 * Higher roles inherit permissions from lower roles
 */
export const ROLE_HIERARCHY = {
    [ROLES.SUPER_ADMIN]: 100,
    [ROLES.HOTEL_ADMIN]: 80,
    [ROLES.RECEPTIONIST]: 60,
    [ROLES.WAITER]: 40,
    [ROLES.CHEF]: 40,
    [ROLES.GUEST]: 10,
};

/**
 * Role display names for UI
 */
export const ROLE_LABELS = {
    [ROLES.SUPER_ADMIN]: 'Super Admin',
    [ROLES.HOTEL_ADMIN]: 'Hotel Admin',
    [ROLES.RECEPTIONIST]: 'Receptionist',
    [ROLES.WAITER]: 'Waiter',
    [ROLES.CHEF]: 'Kitchen Staff',
    [ROLES.GUEST]: 'Guest',
};

/**
 * Feature permissions by role
 * Defines what each role can access
 */
export const PERMISSIONS = {
    // Hotel Management
    MANAGE_HOTELS: [ROLES.SUPER_ADMIN],
    VIEW_ALL_HOTELS: [ROLES.SUPER_ADMIN],
    MANAGE_OWN_HOTEL: [ROLES.HOTEL_ADMIN],

    // User Management
    MANAGE_ALL_USERS: [ROLES.SUPER_ADMIN],
    MANAGE_HOTEL_STAFF: [ROLES.HOTEL_ADMIN],

    // Room Management
    MANAGE_ROOMS: [ROLES.HOTEL_ADMIN, ROLES.RECEPTIONIST],
    VIEW_ROOMS: [ROLES.HOTEL_ADMIN, ROLES.RECEPTIONIST, ROLES.WAITER],

    // Table Management
    MANAGE_TABLES: [ROLES.HOTEL_ADMIN],
    VIEW_TABLES: [ROLES.HOTEL_ADMIN, ROLES.WAITER, ROLES.RECEPTIONIST],

    // Order Management
    CREATE_ORDER: [ROLES.WAITER],
    UPDATE_ORDER: [ROLES.WAITER, ROLES.CHEF],
    VIEW_ORDERS: [ROLES.WAITER, ROLES.CHEF, ROLES.HOTEL_ADMIN],
    MANAGE_ORDER_STATUS: [ROLES.CHEF],

    // Kitchen Operations
    VIEW_KITCHEN_QUEUE: [ROLES.CHEF, ROLES.HOTEL_ADMIN],
    MANAGE_MENU: [ROLES.HOTEL_ADMIN, ROLES.CHEF],

    // Reception Operations
    CHECK_IN_GUEST: [ROLES.RECEPTIONIST, ROLES.HOTEL_ADMIN],
    CHECK_OUT_GUEST: [ROLES.RECEPTIONIST, ROLES.HOTEL_ADMIN],
    VIEW_GUEST_LIST: [ROLES.RECEPTIONIST, ROLES.HOTEL_ADMIN],

    // QR Code Management
    GENERATE_QR_CODES: [ROLES.HOTEL_ADMIN],
    VIEW_QR_CODES: [ROLES.HOTEL_ADMIN, ROLES.RECEPTIONIST],

    // Booking Management
    VIEW_BOOKINGS: [ROLES.HOTEL_ADMIN, ROLES.RECEPTIONIST],
    MANAGE_BOOKINGS: [ROLES.RECEPTIONIST, ROLES.HOTEL_ADMIN],
};

/**
 * Check if a role has a specific permission
 * @param {string} role - The user's role
 * @param {string} permission - The permission to check
 * @returns {boolean} - Whether the role has the permission
 */
export const hasPermission = (role, permission) => {
    const allowedRoles = PERMISSIONS[permission];
    if (!allowedRoles) return false;
    return allowedRoles.includes(role);
};

/**
 * Check if a role has higher or equal hierarchy than another
 * @param {string} userRole - The user's role
 * @param {string} requiredRole - The required role
 * @returns {boolean} - Whether the user's role is sufficient
 */
export const hasRoleLevel = (userRole, requiredRole) => {
    return (ROLE_HIERARCHY[userRole] || 0) >= (ROLE_HIERARCHY[requiredRole] || 0);
};

/**
 * Route access configuration
 * Maps route patterns to allowed roles
 */
export const ROUTE_ACCESS = {
    // Public routes (no authentication required)
    '/': null,
    '/login': null,
    '/register': null,
    '/forgot-password': null,
    '/reset-password': null,
    '/staff/login': null,
    '/staff/forgot-password': null,
    '/staff/reset-password': null,
    '/about': null,
    '/hotels': null,
    '/hotel/:id': null,
    '/destinations': null,
    '/offers': null,
    '/memberships': null,
    '/contactus': null,
    '/feedback': null,

    // Guest routes (token-based, no auth)
    '/guest/table/:token': null,
    '/guest/room/:token': null,

    // Protected staff routes
    '/superadmindashboard': [ROLES.SUPER_ADMIN],
    '/usermanagement': [ROLES.SUPER_ADMIN],
    '/hotelmanagement': [ROLES.SUPER_ADMIN],
    '/addhotel': [ROLES.SUPER_ADMIN],

    '/hoteladmin-dashboard': [ROLES.HOTEL_ADMIN],
    '/roommanagement': [ROLES.HOTEL_ADMIN],
    '/restaurantmanagement': [ROLES.HOTEL_ADMIN],
    '/tablemanagement': [ROLES.HOTEL_ADMIN],
    '/roomqrmanagement': [ROLES.HOTEL_ADMIN],

    '/reception-dashboard': [ROLES.RECEPTIONIST, ROLES.HOTEL_ADMIN],

    '/waiter-dashboard': [ROLES.WAITER],

    '/kitchen-dashboard': [ROLES.CHEF],
};

export default {
    ROLES,
    ROLE_HIERARCHY,
    ROLE_LABELS,
    PERMISSIONS,
    hasPermission,
    hasRoleLevel,
    ROUTE_ACCESS,
};
