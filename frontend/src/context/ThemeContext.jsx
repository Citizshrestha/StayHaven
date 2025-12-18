import { createContext, useContext, useState } from "react"


// create an context
const ThemeContext = createContext();

// custom hook for using the theme
export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error("useTheme must be used within ThemeProvider");
    }
    return context;
}

// provider
export const ThemeProvider = ({ children }) => {
    // get theme from localStorage or default to light theme if not found any 
    const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");
    useEffect(() => {
        // Remove both classes first
        document.documentElement.classList.remove('light-theme', 'dark-theme');
        // Add the current theme class
        document.documentElement.classList.add(`${theme}-theme`);
        // Save to localStorage
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
    };

    const value = {
        theme,
        toggleTheme,
        isDark: theme === 'dark'
    };

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
};