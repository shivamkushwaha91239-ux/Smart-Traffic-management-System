import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    localStorage.setItem('theme', JSON.stringify(isDarkMode));
    if (isDarkMode) {
      document.body.classList.remove('light-mode');
      document.documentElement.classList.remove('light-mode');
      document.body.classList.add('dark-mode');
      document.documentElement.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
      document.documentElement.classList.remove('dark-mode');
      document.body.classList.add('light-mode');
      document.documentElement.classList.add('light-mode');
    }
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode(prev => !prev);
  };

  const theme = {
    isDarkMode,
    toggleTheme,
    colors: isDarkMode ? {
      primary: '#1e293b',
      secondary: '#0f172a',
      accent: '#3b82f6',
      text: '#f1f5f9',
      textSecondary: '#cbd5e1',
      border: '#334155',
      background: '#0f172a',
      surface: '#1e293b',
      success: '#10b981',
      warning: '#f59e0b',
      danger: '#ef4444',
      lightText: '#e2e8f0',
    } : {
      primary: '#ffffff',
      secondary: '#f8fafc',
      accent: '#3b82f6',
      text: '#1e293b',
      textSecondary: '#64748b',
      border: '#e2e8f0',
      background: '#f8fafc',
      surface: '#ffffff',
      success: '#10b981',
      warning: '#f59e0b',
      danger: '#ef4444',
      lightText: '#475569',
    },
  };

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
};
