/**
 * useNotifications - Hook to access notification context
 * 
 * Separated from NotificationContext.jsx to satisfy React Fast Refresh requirements
 */
import { useContext } from "react";
import NotificationContext from "./NotificationContext";
export const useNotifications = () => {
  const context = useContext(NotificationContext);
  
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  
  return context;
};
// Notification types for consistent styling
export const NOTIFICATION_TYPES = {
  NEW_ORDER: 'new_order',
  ORDER_READY: 'order_ready',
  ORDER_STATUS: 'status_update',
  WAITER_CALL: 'waiter_call',
  CHIEF_UPDATE: 'chief_update',
  WAITER_UPDATE: 'waiter_update',
};
export default useNotifications;
