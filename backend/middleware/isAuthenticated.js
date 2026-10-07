// Re-export protect as isAuthenticated for backward compatibility
import { protect } from './authMiddleware.js';
export const isAuthenticated = protect;
