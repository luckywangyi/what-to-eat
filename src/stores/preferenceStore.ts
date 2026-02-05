import {create} from 'zustand';
import {UserPreference, SpicyLevel, DietGoal} from '../types';
import * as db from '../services/dbService';

// 默认偏好设置
const DEFAULT_PREFERENCES: UserPreference = {
  spicyLevel: 'none',
  excludedFoods: [],
  dietGoal: 'none',
  isVegetarian: false,
  isHalal: false,
  mealBudgetRatio: {
    breakfast: 0.2,
    lunch: 0.45,
    dinner: 0.35,
  },
};

interface PreferenceState {
  preferences: UserPreference;
  isLoading: boolean;
  error: string | null;

  // 加载/保存偏好
  loadPreferences: () => Promise<void>;
  savePreferences: (prefs: Partial<UserPreference>) => Promise<void>;
  
  // 单独更新某项偏好
  setSpicyLevel: (level: SpicyLevel) => Promise<void>;
  setDietGoal: (goal: DietGoal) => Promise<void>;
  setVegetarian: (value: boolean) => Promise<void>;
  setHalal: (value: boolean) => Promise<void>;
  addExcludedFood: (food: string) => Promise<void>;
  removeExcludedFood: (food: string) => Promise<void>;
  setMealBudgetRatio: (ratio: UserPreference['mealBudgetRatio']) => Promise<void>;
  
  // 重置为默认
  resetToDefault: () => Promise<void>;
  
  // 清除错误
  clearError: () => void;
}

export const usePreferenceStore = create<PreferenceState>((set, get) => ({
  preferences: DEFAULT_PREFERENCES,
  isLoading: false,
  error: null,

  loadPreferences: async () => {
    set({isLoading: true, error: null});
    try {
      const preferences = await db.getPreferences();
      set({preferences, isLoading: false});
    } catch (error) {
      set({error: '加载偏好设置失败', isLoading: false});
      console.error('Error loading preferences:', error);
    }
  },

  savePreferences: async (prefs: Partial<UserPreference>) => {
    const {preferences} = get();
    const newPreferences = {...preferences, ...prefs};
    
    set({isLoading: true, error: null});
    try {
      await db.savePreferences(newPreferences);
      set({preferences: newPreferences, isLoading: false});
    } catch (error) {
      set({error: '保存偏好设置失败', isLoading: false});
      console.error('Error saving preferences:', error);
    }
  },

  setSpicyLevel: async (level: SpicyLevel) => {
    await get().savePreferences({spicyLevel: level});
  },

  setDietGoal: async (goal: DietGoal) => {
    await get().savePreferences({dietGoal: goal});
  },

  setVegetarian: async (value: boolean) => {
    await get().savePreferences({isVegetarian: value});
  },

  setHalal: async (value: boolean) => {
    await get().savePreferences({isHalal: value});
  },

  addExcludedFood: async (food: string) => {
    const {preferences} = get();
    if (preferences.excludedFoods.includes(food)) return;
    
    await get().savePreferences({
      excludedFoods: [...preferences.excludedFoods, food],
    });
  },

  removeExcludedFood: async (food: string) => {
    const {preferences} = get();
    await get().savePreferences({
      excludedFoods: preferences.excludedFoods.filter(f => f !== food),
    });
  },

  setMealBudgetRatio: async (ratio: UserPreference['mealBudgetRatio']) => {
    // 确保比例总和为 1
    const total = ratio.breakfast + ratio.lunch + ratio.dinner;
    if (Math.abs(total - 1) > 0.01) {
      set({error: '餐次预算比例总和必须为 100%'});
      return;
    }
    await get().savePreferences({mealBudgetRatio: ratio});
  },

  resetToDefault: async () => {
    set({isLoading: true, error: null});
    try {
      await db.savePreferences(DEFAULT_PREFERENCES);
      set({preferences: DEFAULT_PREFERENCES, isLoading: false});
    } catch (error) {
      set({error: '重置偏好设置失败', isLoading: false});
      console.error('Error resetting preferences:', error);
    }
  },

  clearError: () => set({error: null}),
}));
