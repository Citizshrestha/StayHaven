<<<<<<< HEAD
﻿import { useContext } from "react";
import { OrderContext } from "./OrderContextDef";

// Custom hook for easy access
export const useOrderContext = () => {
  const context = useContext(OrderContext);
  if (!context) {
    throw new Error("useOrderContext must be used within an OrderProvider");
  }
  return context;
};
=======
// Re-export from canonical location to avoid duplicate module instances
export { useOrderContext } from '../core/context/useOrderContext';
>>>>>>> fdaae3dffdc7121130444a067ee3a87c420addbe
