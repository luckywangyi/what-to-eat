import React, {createContext, useContext, useMemo} from 'react';
import {useThemeStore} from '../stores/themeStore';
import {themes, ThemeColors, ThemeMode} from '../theme';

interface ThemeContextType {
  colors: ThemeColors;
  currentTheme: ThemeMode;
}

const ThemeContext = createContext<ThemeContextType>({
  colors: themes.light.colors,
  currentTheme: 'light',
});

export const ThemeProvider: React.FC<{children: React.ReactNode}> = ({children}) => {
  const {currentTheme} = useThemeStore();
  
  const value = useMemo(() => ({
    colors: themes[currentTheme].colors,
    currentTheme,
  }), [currentTheme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useAppTheme = () => {
  const context = useContext(ThemeContext);
  return context;
};

export default ThemeContext;
