import React, { createContext, useContext, useEffect, useState } from 'react';

interface ThemeContextType {
  darkMode: boolean;
  toggleDarkMode: () => void;
  setDarkMode: (enabled: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [darkMode, setDarkModeState] = useState(false);

  useEffect(() => {
    // Check localStorage for saved preference
    const savedTheme = localStorage.getItem('darkMode');
    if (savedTheme !== null && savedTheme !== 'undefined') {
      try {
        const isDark = JSON.parse(savedTheme);
        setDarkModeState(isDark);
        updateDocumentClass(isDark);
      } catch (error) {
        console.error('Error parsing saved theme:', error);
        // Fallback to system preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setDarkModeState(prefersDark);
        updateDocumentClass(prefersDark);
      }
    } else {
      // Check system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setDarkModeState(prefersDark);
      updateDocumentClass(prefersDark);
    }
  }, []);

  const updateDocumentClass = (isDark: boolean) => {
    console.log('updateDocumentClass called with:', isDark);
    if (isDark) {
      document.documentElement.classList.add('dark');
      console.log('Added dark class to document');
    } else {
      document.documentElement.classList.remove('dark');
      console.log('Removed dark class from document');
    }
    console.log('Current document classes:', document.documentElement.className);
  };

  const setDarkMode = (enabled: boolean) => {
    setDarkModeState(enabled);
    try {
      localStorage.setItem('darkMode', JSON.stringify(enabled));
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
    updateDocumentClass(enabled);
  };

  const toggleDarkMode = () => {
    console.log('toggleDarkMode called, current darkMode:', darkMode);
    const newMode = !darkMode;
    console.log('Setting dark mode to:', newMode);
    setDarkMode(newMode);
  };

  return (
    <ThemeContext.Provider value={{ darkMode, toggleDarkMode, setDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
};