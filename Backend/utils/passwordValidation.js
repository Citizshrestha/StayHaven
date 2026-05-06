// Common weak passwords to reject
const COMMON_PASSWORDS = [
  "password", "password123", "12345678", "qwerty", "abc123", "monkey",
  "1234567890", "letmein", "trustno1", "dragon", "baseball", "iloveyou",
  "master", "sunshine", "ashley", "bailey", "passw0rd", "shadow", "123123",
  "654321", "superman", "qazwsx", "michael", "football", "welcome", "jesus",
  "ninja", "mustang", "password1", "123456789", "password!", "admin", "admin123"
];

export const validatePasswordStrength = (password) => {
    const errors = [];

    if (!password || typeof password !== 'string') {
        errors.push("Password is required");
        return errors;
    }

    if (password.length < 8) {
        errors.push("Password must be at least 8 characters long");
    }

    if (password.length > 128) {
        errors.push("Password must not exceed 128 characters");
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

    if (!/[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/~`]/.test(password)) {
        errors.push("Password must contain at least one special character (!@#$%^&*(),.?\":{}|<>_-+=[]\\\/~`)");
    }

    // Check for common weak passwords (case-insensitive)
    const lowerPassword = password.toLowerCase();
    if (COMMON_PASSWORDS.includes(lowerPassword)) {
        errors.push("This password is too common. Please choose a more unique password");
    }

    // Check for sequential characters (e.g., "12345", "abcde")
    if (/(?:012|123|234|345|456|567|678|789|890|abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)/i.test(password)) {
        errors.push("Password should not contain sequential characters");
    }

    // Check for repeated characters (e.g., "aaaa", "1111")
    if (/(.)\1{3,}/.test(password)) {
        errors.push("Password should not contain repeated characters");
    }

    return errors;
};
