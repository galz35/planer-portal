import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
    theme: Theme;
    actualTheme: 'light' | 'dark';
    setTheme: (theme: Theme) => void;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};

interface ThemeProviderProps {
    children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
    const [theme, setThemeState] = useState<Theme>(() => {
        const saved = localStorage.getItem('clarity_theme');
        return (saved === 'light' || saved === 'dark' || saved === 'system') ? saved : 'light';
    });

    const [actualTheme, setActualTheme] = useState<'light' | 'dark'>('light');

    // Detect system preference
    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

        const updateActualTheme = () => {
            if (theme === 'system') {
                setActualTheme(mediaQuery.matches ? 'dark' : 'light');
            } else {
                setActualTheme(theme);
            }
        };

        updateActualTheme();
        mediaQuery.addEventListener('change', updateActualTheme);

        return () => mediaQuery.removeEventListener('change', updateActualTheme);
    }, [theme]);

    // Apply theme to document
    useEffect(() => {
        const root = document.documentElement;

        if (actualTheme === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
    }, [actualTheme]);

    const setTheme = (newTheme: Theme) => {
        setThemeState(newTheme);
        localStorage.setItem('clarity_theme', newTheme);
    };

    const toggleTheme = () => {
        const newTheme = actualTheme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
    };

    return (
        <ThemeContext.Provider value={{ theme, actualTheme, setTheme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};
