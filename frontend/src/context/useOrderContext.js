import { useContext } from "react";
import { OrderContext } from "./OrderContextDef";

// Custom hook for easy access
export const useOrderContext = () => {
  const context = useContext(OrderContext);
  if (!context) {
    throw new Error("useOrderContext must be used within an OrderProvider");
  }
  return context;
};
