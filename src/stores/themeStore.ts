import {create} from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {ThemeMode, themes, setThemeColors} from '../theme';

const THEME_STORAGE_KEY = '@what_to_eat_theme';

interface ThemeState {
  currentTheme: ThemeMode;
  isLoaded: boolean;
  loadTheme: () => Promise<void>;
  setTheme: (mode: ThemeMode) => Promise<void>;
  getThemeColors: () => typeof themes.light.colors;
  getThemeName: () => string;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  currentTheme: 'light',
  isLoaded: false,

  loadTheme: async () => {
    try {
      const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme && themes[savedTheme as ThemeMode]) {
        const mode = savedTheme as ThemeMode;
        setThemeColors(mode);
        set({currentTheme: mode, isLoaded: true});
      } else {
        set({isLoaded: true});
      }
    } catch (error) {
      console.error('Failed to load theme:', error);
      set({isLoaded: true});
    }
  },

  setTheme: async (mode: ThemeMode) => {
    const previousTheme = get().currentTheme;
    // 乐观更新：先立即切换状态，再异步保存
    setThemeColors(mode);
    set({currentTheme: mode});
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch (error) {
      // 保存失败则回滚
      console.error('Failed to save theme:', error);
      setThemeColors(previousTheme);
      set({currentTheme: previousTheme});
    }
  },

  getThemeColors: () => {
    return themes[get().currentTheme].colors;
  },

  getThemeName: () => {
    return themes[get().currentTheme].name;
  },
}));

export default useThemeStore;
