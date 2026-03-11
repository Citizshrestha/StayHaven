<<<<<<< HEAD
﻿import { useContext } from "react";
import {ThemeContext} from  "../context/ThemeContext";

// custom hook for using the theme
export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error("useTheme must be used within ThemeProvider");
    }
    return context;
}
=======
// Re-export from canonical location to avoid duplicate module instances
export { useTheme } from '../core/hooks/useTheme';
>>>>>>> fdaae3dffdc7121130444a067ee3a87c420addbe
