// Contexto para controlar el modo claro u oscuro.
// Guarda la preferencia del usuario y escucha los
// cambios del sistema operativo.

import React, { createContext, useContext, useEffect, useState } from 'react';

interface ThemeContextType {
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  isDark: false,
  toggleTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDark, setIsDark] = useState(() => {
    // Check localStorage first
    const saved = localStorage.getItem('theme');
    if (saved) {
      return saved === 'dark';
    }
    // If no saved preference, check system preference
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    // Update theme when system preference changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setIsDark(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    setHasMounted(true);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    // Update document class and localStorage when theme changes
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  const toggleTheme = () => {
    setIsDark(prev => !prev);
  };

  if (!hasMounted) return null;

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors">
        {children}
      </div>
    </ThemeContext.Provider>
  );
};
