import { createContext, useEffect, useState } from "react"


// create an context
export const ThemeContext = createContext();


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