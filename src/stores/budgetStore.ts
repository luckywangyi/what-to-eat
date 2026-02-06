import {create} from 'zustand';
import {BudgetSettings, UserPreference} from '../types';
import * as db from '../services/dbService';

interface BudgetState {
  settings: BudgetSettings | null;
  isLoading: boolean;
  error: string | null;

  // 加载/保存设置
  loadSettings: () => Promise<void>;
  saveSettings: (settings: BudgetSettings) => Promise<void>;
  
  // 添加消费
  addConsumption: (amount: number) => Promise<void>;
  
  // 重置月度消费（新月初时调用）
  resetMonthlyConsumption: () => Promise<void>;
  
  // 计算相关
  getDailyBudget: (preferences?: UserPreference) => number;
  getRemainingBudget: () => number;
  getRemainingDays: () => number;
  
  // 清除错误
  clearError: () => void;
}

export const useBudgetStore = create<BudgetState>((set, get) => ({
  settings: null,
  isLoading: false,
  error: null,

  loadSettings: async () => {
    set({isLoading: true, error: null});
    try {
      const settings = await db.getBudgetSettings();
      
      // 检查是否需要重置（新的月份）
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      
      if (settings.startDate && settings.startDate < currentMonth) {
        // 新月份，重置消费
        const newSettings: BudgetSettings = {
          ...settings,
          startDate: currentMonth,
          consumed: 0,
        };
        await db.saveBudgetSettings(newSettings);
        set({settings: newSettings, isLoading: false});
      } else {
        set({settings, isLoading: false});
      }
    } catch (error) {
      set({error: '加载预算设置失败', isLoading: false});
      console.error('Error loading budget settings:', error);
    }
  },

  saveSettings: async (settings: BudgetSettings) => {
    set({isLoading: true, error: null});
    try {
      await db.saveBudgetSettings(settings);
      set({settings, isLoading: false});
    } catch (error) {
      set({error: '保存预算设置失败', isLoading: false});
      console.error('Error saving budget settings:', error);
    }
  },

  addConsumption: async (amount: number) => {
    const {settings} = get();
    if (!settings) return;

    set({isLoading: true, error: null});
    try {
      await db.addToConsumed(amount);
      set({
        settings: {...settings, consumed: settings.consumed + amount},
        isLoading: false,
      });
    } catch (error) {
      set({error: '记录消费失败', isLoading: false});
      console.error('Error adding consumption:', error);
    }
  },

  resetMonthlyConsumption: async () => {
    const {settings} = get();
    if (!settings) return;

    const now = new Date();
    const newStartDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    
    const newSettings: BudgetSettings = {
      ...settings,
      startDate: newStartDate,
      consumed: 0,
    };

    set({isLoading: true, error: null});
    try {
      await db.saveBudgetSettings(newSettings);
      set({settings: newSettings, isLoading: false});
    } catch (error) {
      set({error: '重置月度消费失败', isLoading: false});
      console.error('Error resetting monthly consumption:', error);
    }
  },

  getDailyBudget: (preferences?: UserPreference) => {
    const {settings} = get();
    if (!settings) return 0;

    const remainingBudget = settings.monthlyBudget - settings.consumed;
    const remainingDays = get().getRemainingDays();

    if (remainingDays <= 0) return 0;
    
    return Math.max(0, Math.floor((remainingBudget / remainingDays) * 100) / 100);
  },

  getRemainingBudget: () => {
    const {settings} = get();
    if (!settings) return 0;
    return Math.max(0, settings.monthlyBudget - settings.consumed);
  },

  getRemainingDays: () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    
    // 获取当月最后一天
    const lastDay = new Date(year, month + 1, 0).getDate();
    const today = now.getDate();
    
    return Math.max(1, lastDay - today + 1);
  },

  clearError: () => set({error: null}),
}));
