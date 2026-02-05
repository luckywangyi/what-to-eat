/**
 * 预算计算工具函数
 */

import {BudgetSettings, UserPreference} from '../types';

/**
 * 计算每日可用预算
 */
export function calculateDailyBudget(
  settings: BudgetSettings,
  remainingDays: number
): number {
  const remaining = settings.monthlyBudget - settings.consumed;
  if (remainingDays <= 0) return 0;
  return Math.max(0, Math.floor((remaining / remainingDays) * 100) / 100);
}

/**
 * 计算各餐预算
 */
export function calculateMealBudgets(
  dailyBudget: number,
  ratio: UserPreference['mealBudgetRatio']
): {breakfast: number; lunch: number; dinner: number} {
  return {
    breakfast: Math.floor(dailyBudget * ratio.breakfast * 100) / 100,
    lunch: Math.floor(dailyBudget * ratio.lunch * 100) / 100,
    dinner: Math.floor(dailyBudget * ratio.dinner * 100) / 100,
  };
}

/**
 * 获取当月剩余天数
 */
export function getRemainingDaysInMonth(): number {
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return Math.max(1, lastDay - now.getDate() + 1);
}

/**
 * 获取当月第一天
 */
export function getMonthStartDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

/**
 * 格式化金额
 */
export function formatCurrency(amount: number): string {
  return `¥${amount.toFixed(1)}`;
}

/**
 * 检查是否超预算
 */
export function isOverBudget(spent: number, budget: number): boolean {
  return spent > budget;
}

/**
 * 计算预算使用百分比
 */
export function getBudgetUsagePercent(spent: number, budget: number): number {
  if (budget <= 0) return 0;
  return Math.min(100, (spent / budget) * 100);
}
