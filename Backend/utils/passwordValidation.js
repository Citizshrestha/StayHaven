/**
 * Password Validation Utility
 * Validates password strength with consistent rules across the application
 */

/**
 * Validates password strength and returns array of errors
 * @param {string} password - The password to validate
 * @returns {string[]} Array of error messages (empty if valid)
 */
export const validatePasswordStrength = (password) => {
    const errors = [];

    if (password.length < 8) {
        errors.push("Password must be at least 8 characters long");
    }
    if (!/[A-Z]/.test(password)) {
        errors.push("Password must contain at least one uppercase letter");
    }
    if (!/[a-z]/.test(password)) {
        errors.push("Password must contain at least one lowercase letter");
    }
    if (!/[0-9]/.test(password)) {
        errors.push("Password must contain at least one number");
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        errors.push("Password must contain at least one special character");
    }

    return errors;
};
