/**
 * 营养分析工具函数
 */

import {Dish, NutritionTag, MealOption} from '../types';

/**
 * 分析餐食营养结构
 */
export function analyzeMealNutrition(dishes: Dish[]): {
  hasProtein: boolean;
  hasVegetable: boolean;
  hasStaple: boolean;
  isSpicy: boolean;
  isBalanced: boolean;
  suggestions: string[];
} {
  const hasProtein = dishes.some(
    d => d.category === 'meat' || d.nutritionTags.includes('high_protein')
  );
  const hasVegetable = dishes.some(d => d.category === 'vegetable');
  const hasStaple = dishes.some(d => d.category === 'staple');
  const isSpicy = dishes.some(d => d.nutritionTags.includes('spicy'));
  
  const suggestions: string[] = [];
  
  if (!hasProtein) {
    suggestions.push('建议增加蛋白质摄入');
  }
  if (!hasVegetable) {
    suggestions.push('建议搭配蔬菜');
  }
  if (!hasStaple) {
    suggestions.push('建议搭配主食');
  }
  
  const isBalanced = hasProtein && hasVegetable && hasStaple;
  
  return {
    hasProtein,
    hasVegetable,
    hasStaple,
    isSpicy,
    isBalanced,
    suggestions,
  };
}

/**
 * 生成每日营养总结
 */
export function generateDailyNutritionSummary(
  breakfast: MealOption | undefined,
  lunch: MealOption | undefined,
  dinner: MealOption | undefined
): string {
  const allDishes: Dish[] = [
    ...(breakfast?.dishes || []),
    ...(lunch?.dishes || []),
    ...(dinner?.dishes || []),
  ];

  if (allDishes.length === 0) {
    return '暂无餐食数据';
  }

  const proteinCount = allDishes.filter(
    d => d.category === 'meat' || d.nutritionTags.includes('high_protein')
  ).length;
  
  const vegetableCount = allDishes.filter(d => d.category === 'vegetable').length;
  
  const parts: string[] = [];
  
  if (proteinCount >= 2) {
    parts.push('蛋白质充足');
  } else if (proteinCount === 1) {
    parts.push('蛋白质适中');
  } else {
    parts.push('蛋白质不足');
  }
  
  if (vegetableCount >= 2) {
    parts.push('蔬菜摄入良好');
  } else if (vegetableCount === 1) {
    parts.push('建议多吃蔬菜');
  } else {
    parts.push('缺少蔬菜');
  }
  
  return parts.join('，');
}

/**
 * 检查菜品是否符合饮食偏好
 */
export function isDishMatchPreferences(
  dish: Dish,
  preferences: {
    spicyLevel: string;
    excludedFoods: string[];
    isVegetarian: boolean;
    isHalal: boolean;
  }
): boolean {
  // 素食检查
  if (preferences.isVegetarian && dish.category === 'meat') {
    return false;
  }
  
  // 清真检查
  if (preferences.isHalal && !dish.nutritionTags.includes('halal')) {
    return false;
  }
  
  // 辣度检查
  if (preferences.spicyLevel === 'none' && dish.nutritionTags.includes('spicy')) {
    return false;
  }
  
  // 禁忌食物检查
  if (preferences.excludedFoods.some(food => 
    dish.name.toLowerCase().includes(food.toLowerCase())
  )) {
    return false;
  }
  
  return true;
}

/**
 * 计算菜品多样性得分
 */
export function calculateDiversityScore(
  dishes: Dish[],
  recentDishNames: string[]
): number {
  if (dishes.length === 0) return 0;
  
  let score = 100;
  
  // 检查重复
  dishes.forEach(dish => {
    if (recentDishNames.includes(dish.name)) {
      score -= 20;
    }
  });
  
  // 检查分类多样性
  const categories = new Set(dishes.map(d => d.category));
  if (categories.size >= 3) {
    score += 10;
  } else if (categories.size === 1) {
    score -= 10;
  }
  
  return Math.max(0, Math.min(100, score));
}
