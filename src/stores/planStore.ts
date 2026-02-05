import {create} from 'zustand';
import {DailyMealPlan, ConsumptionRecord, MealType} from '../types';
import * as db from '../services/dbService';

// 生成唯一ID
const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

// 获取今天的日期字符串
const getTodayStr = () => new Date().toISOString().split('T')[0];

interface PlanState {
  todayPlan: DailyMealPlan | null;
  recentPlans: DailyMealPlan[];
  consumptionRecords: ConsumptionRecord[];
  isLoading: boolean;
  error: string | null;

  // 加载计划
  loadTodayPlan: () => Promise<void>;
  loadRecentPlans: (days?: number) => Promise<void>;
  
  // 保存计划
  savePlan: (plan: DailyMealPlan) => Promise<void>;
  
  // 消费记录
  loadConsumptionRecords: (days?: number) => Promise<void>;
  recordConsumption: (mealType: MealType, dishIds: string[], cost: number) => Promise<void>;
  
  // 获取近期吃过的菜品（用于避免重复）
  getRecentDishNames: () => string[];
  
  // 清除错误
  clearError: () => void;
}

export const usePlanStore = create<PlanState>((set, get) => ({
  todayPlan: null,
  recentPlans: [],
  consumptionRecords: [],
  isLoading: false,
  error: null,

  loadTodayPlan: async () => {
    set({isLoading: true, error: null});
    try {
      const today = getTodayStr();
      const plan = await db.getMealPlan(today);
      set({todayPlan: plan, isLoading: false});
    } catch (error) {
      set({error: '加载今日计划失败', isLoading: false});
      console.error('Error loading today plan:', error);
    }
  },

  loadRecentPlans: async (days: number = 7) => {
    set({isLoading: true, error: null});
    try {
      const plans = await db.getRecentMealPlans(days);
      set({recentPlans: plans, isLoading: false});
    } catch (error) {
      set({error: '加载历史计划失败', isLoading: false});
      console.error('Error loading recent plans:', error);
    }
  },

  savePlan: async (plan: DailyMealPlan) => {
    set({isLoading: true, error: null});
    try {
      await db.saveMealPlan(plan);
      
      // 如果是今天的计划，更新 todayPlan
      const today = getTodayStr();
      if (plan.date === today) {
        set({todayPlan: plan});
      }
      
      // 更新历史记录
      const plans = await db.getRecentMealPlans(7);
      set({recentPlans: plans, isLoading: false});
    } catch (error) {
      set({error: '保存计划失败', isLoading: false});
      console.error('Error saving plan:', error);
    }
  },

  loadConsumptionRecords: async (days: number = 7) => {
    set({isLoading: true, error: null});
    try {
      const records = await db.getConsumptionRecords(days);
      set({consumptionRecords: records, isLoading: false});
    } catch (error) {
      set({error: '加载消费记录失败', isLoading: false});
      console.error('Error loading consumption records:', error);
    }
  },

  recordConsumption: async (mealType: MealType, dishIds: string[], cost: number) => {
    set({isLoading: true, error: null});
    try {
      const record: ConsumptionRecord = {
        id: generateId(),
        date: getTodayStr(),
        mealType,
        dishIds,
        actualCost: cost,
        createdAt: Date.now(),
      };
      await db.addConsumptionRecord(record);
      
      // 重新加载记录
      const records = await db.getConsumptionRecords(7);
      set({consumptionRecords: records, isLoading: false});
    } catch (error) {
      set({error: '记录消费失败', isLoading: false});
      console.error('Error recording consumption:', error);
    }
  },

  getRecentDishNames: () => {
    const {recentPlans} = get();
    const dishNames: string[] = [];
    
    recentPlans.forEach(plan => {
      ['breakfast', 'lunch', 'dinner'].forEach(mealType => {
        const meal = plan[mealType as keyof Pick<DailyMealPlan, 'breakfast' | 'lunch' | 'dinner'>];
        if (meal && meal.options) {
          meal.options.forEach(option => {
            option.dishes.forEach(dish => {
              if (!dishNames.includes(dish.name)) {
                dishNames.push(dish.name);
              }
            });
          });
        }
      });
    });
    
    return dishNames;
  },

  clearError: () => set({error: null}),
}));
