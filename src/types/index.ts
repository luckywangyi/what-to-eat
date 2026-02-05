// 菜品分类
export type DishCategory = 'staple' | 'meat' | 'vegetable' | 'soup' | 'snack' | 'drink';

// 菜品分类中文映射
export const DISH_CATEGORY_LABELS: Record<DishCategory, string> = {
  staple: '主食',
  meat: '荤菜',
  vegetable: '素菜',
  soup: '汤类',
  snack: '小吃',
  drink: '饮品',
};

// 营养标签
export type NutritionTag = 
  | 'high_protein'    // 高蛋白
  | 'low_fat'         // 低脂
  | 'high_fiber'      // 高纤维
  | 'spicy'           // 辣
  | 'mild'            // 清淡
  | 'vegetarian'      // 素食
  | 'halal';          // 清真

export const NUTRITION_TAG_LABELS: Record<NutritionTag, string> = {
  high_protein: '高蛋白',
  low_fat: '低脂',
  high_fiber: '高纤维',
  spicy: '辣',
  mild: '清淡',
  vegetarian: '素食',
  halal: '清真',
};

// 餐次类型
export type MealType = 'breakfast' | 'lunch' | 'dinner';

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐',
};

// 辣度等级
export type SpicyLevel = 'none' | 'mild' | 'medium' | 'hot';

export const SPICY_LEVEL_LABELS: Record<SpicyLevel, string> = {
  none: '不辣',
  mild: '微辣',
  medium: '中辣',
  hot: '重辣',
};

// 饮食目标
export type DietGoal = 'lose_weight' | 'gain_muscle' | 'maintain' | 'none';

export const DIET_GOAL_LABELS: Record<DietGoal, string> = {
  lose_weight: '减脂',
  gain_muscle: '增肌',
  maintain: '维持',
  none: '无特殊',
};

// 食堂
export interface Canteen {
  id: string;
  name: string;
  location?: string;
  windows?: string[];  // 窗口列表
  createdAt: number;
  updatedAt: number;
}

// 菜品
export interface Dish {
  id: string;
  name: string;
  price: number;
  category: DishCategory;
  nutritionTags: NutritionTag[];
  canteenId: string;
  windowName?: string;
  isAvailable: boolean;
  createdAt: number;
  updatedAt: number;
}

// 用户偏好
export interface UserPreference {
  spicyLevel: SpicyLevel;
  excludedFoods: string[];       // 禁忌食物
  dietGoal: DietGoal;
  isVegetarian: boolean;         // 素食
  isHalal: boolean;              // 清真
  mealBudgetRatio: {             // 餐次预算比例
    breakfast: number;           // 如 0.2
    lunch: number;               // 如 0.45
    dinner: number;              // 如 0.35
  };
}

// 预算设置
export interface BudgetSettings {
  monthlyBudget: number;         // 月预算
  startDate: string;             // 月初日期 YYYY-MM-DD
  consumed: number;              // 已消费金额
}

// 餐次选项
export interface MealOption {
  optionId: 'A' | 'B' | 'C';
  dishes: Dish[];
  totalPrice: number;
}

// 单餐推荐
export interface MealRecommendation {
  mealType: MealType;
  suggestedBudget: number;
  options: MealOption[];
}

// 每日饮食计划
export interface DailyMealPlan {
  date: string;                  // YYYY-MM-DD
  dailyBudget: number;
  breakfast: MealRecommendation;
  lunch: MealRecommendation;
  dinner: MealRecommendation;
  totalCost: number;
  nutritionSummary: string;
  createdAt: number;
}

// 消费记录
export interface ConsumptionRecord {
  id: string;
  date: string;
  mealType: MealType;
  dishIds: string[];
  actualCost: number;
  createdAt: number;
}

// API 配置
export interface ApiConfig {
  provider: 'qwen' | 'tongyi' | 'custom';
  apiKey: string;
  baseUrl?: string;
  model?: string;
}

// AI 推荐请求参数
export interface RecommendationRequest {
  dailyBudget: number;
  availableDishes: Dish[];
  preferences: UserPreference;
  recentDishes: string[];        // 近期吃过的菜品名称
  date: string;
}

// AI 推荐响应
export interface RecommendationResponse {
  success: boolean;
  plan?: DailyMealPlan;
  error?: string;
}

// 图片识别出的菜品（未入库）
export interface ParsedDish {
  id: string;                    // 临时 ID
  name: string;
  price: number;
  category: DishCategory;
  selected: boolean;             // 是否选中导入
}

// 图片识别结果
export interface ImageRecognitionResult {
  success: boolean;
  dishes?: ParsedDish[];
  error?: string;
  rawResponse?: string;          // 原始 AI 响应
}
