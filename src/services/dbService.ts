import SQLite from 'react-native-sqlite-storage';
import {
  Canteen,
  Dish,
  DailyMealPlan,
  ConsumptionRecord,
  UserPreference,
  BudgetSettings,
  ApiConfig,
} from '../types';

// 启用 Promise API
SQLite.enablePromise(true);

let db: SQLite.SQLiteDatabase | null = null;

// 初始化数据库
export async function initDatabase(): Promise<void> {
  try {
    db = await SQLite.openDatabase({
      name: 'WhatToEat.db',
      location: 'default',
    });

    // 创建表
    await createTables();
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

// 创建所有表
async function createTables(): Promise<void> {
  if (!db) throw new Error('Database not initialized');

  // 食堂表
  await db.executeSql(`
    CREATE TABLE IF NOT EXISTS canteens (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      location TEXT,
      windows TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);

  // 菜品表
  await db.executeSql(`
    CREATE TABLE IF NOT EXISTS dishes (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      category TEXT NOT NULL,
      nutrition_tags TEXT,
      canteen_id TEXT NOT NULL,
      window_name TEXT,
      is_available INTEGER DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (canteen_id) REFERENCES canteens(id)
    )
  `);

  // 每日饮食计划表
  await db.executeSql(`
    CREATE TABLE IF NOT EXISTS meal_plans (
      date TEXT PRIMARY KEY,
      daily_budget REAL NOT NULL,
      plan_data TEXT NOT NULL,
      total_cost REAL NOT NULL,
      nutrition_summary TEXT,
      created_at INTEGER NOT NULL
    )
  `);

  // 消费记录表
  await db.executeSql(`
    CREATE TABLE IF NOT EXISTS consumption_records (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      meal_type TEXT NOT NULL,
      dish_ids TEXT NOT NULL,
      actual_cost REAL NOT NULL,
      created_at INTEGER NOT NULL
    )
  `);

  // 用户偏好表（单行配置）
  await db.executeSql(`
    CREATE TABLE IF NOT EXISTS preferences (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      spicy_level TEXT DEFAULT 'none',
      excluded_foods TEXT DEFAULT '[]',
      diet_goal TEXT DEFAULT 'none',
      is_vegetarian INTEGER DEFAULT 0,
      is_halal INTEGER DEFAULT 0,
      meal_budget_ratio TEXT DEFAULT '{"breakfast":0.2,"lunch":0.45,"dinner":0.35}'
    )
  `);

  // 预算设置表（单行配置）
  await db.executeSql(`
    CREATE TABLE IF NOT EXISTS budget_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      monthly_budget REAL DEFAULT 900,
      start_date TEXT,
      consumed REAL DEFAULT 0
    )
  `);

  // API 配置表（单行配置）
  await db.executeSql(`
    CREATE TABLE IF NOT EXISTS api_config (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      provider TEXT DEFAULT 'qwen',
      api_key TEXT,
      base_url TEXT,
      model TEXT
    )
  `);

  // 初始化默认配置
  await db.executeSql(`INSERT OR IGNORE INTO preferences (id) VALUES (1)`);
  await db.executeSql(`INSERT OR IGNORE INTO budget_settings (id) VALUES (1)`);
  await db.executeSql(`INSERT OR IGNORE INTO api_config (id) VALUES (1)`);
}

// ==================== 食堂相关操作 ====================

export async function getAllCanteens(): Promise<Canteen[]> {
  if (!db) throw new Error('Database not initialized');
  const [result] = await db.executeSql('SELECT * FROM canteens ORDER BY created_at DESC');
  const canteens: Canteen[] = [];
  for (let i = 0; i < result.rows.length; i++) {
    const row = result.rows.item(i);
    canteens.push({
      id: row.id,
      name: row.name,
      location: row.location,
      windows: row.windows ? JSON.parse(row.windows) : [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }
  return canteens;
}

export async function addCanteen(canteen: Omit<Canteen, 'createdAt' | 'updatedAt'>): Promise<void> {
  if (!db) throw new Error('Database not initialized');
  const now = Date.now();
  await db.executeSql(
    'INSERT INTO canteens (id, name, location, windows, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    [canteen.id, canteen.name, canteen.location || null, JSON.stringify(canteen.windows || []), now, now]
  );
}

export async function updateCanteen(canteen: Canteen): Promise<void> {
  if (!db) throw new Error('Database not initialized');
  await db.executeSql(
    'UPDATE canteens SET name = ?, location = ?, windows = ?, updated_at = ? WHERE id = ?',
    [canteen.name, canteen.location || null, JSON.stringify(canteen.windows || []), Date.now(), canteen.id]
  );
}

export async function deleteCanteen(id: string): Promise<void> {
  if (!db) throw new Error('Database not initialized');
  await db.executeSql('DELETE FROM dishes WHERE canteen_id = ?', [id]);
  await db.executeSql('DELETE FROM canteens WHERE id = ?', [id]);
}

// ==================== 菜品相关操作 ====================

export async function getAllDishes(): Promise<Dish[]> {
  if (!db) throw new Error('Database not initialized');
  const [result] = await db.executeSql('SELECT * FROM dishes ORDER BY created_at DESC');
  const dishes: Dish[] = [];
  for (let i = 0; i < result.rows.length; i++) {
    const row = result.rows.item(i);
    dishes.push({
      id: row.id,
      name: row.name,
      price: row.price,
      category: row.category,
      nutritionTags: row.nutrition_tags ? JSON.parse(row.nutrition_tags) : [],
      canteenId: row.canteen_id,
      windowName: row.window_name,
      isAvailable: row.is_available === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }
  return dishes;
}

export async function getDishesByCanteen(canteenId: string): Promise<Dish[]> {
  if (!db) throw new Error('Database not initialized');
  const [result] = await db.executeSql(
    'SELECT * FROM dishes WHERE canteen_id = ? ORDER BY category, name',
    [canteenId]
  );
  const dishes: Dish[] = [];
  for (let i = 0; i < result.rows.length; i++) {
    const row = result.rows.item(i);
    dishes.push({
      id: row.id,
      name: row.name,
      price: row.price,
      category: row.category,
      nutritionTags: row.nutrition_tags ? JSON.parse(row.nutrition_tags) : [],
      canteenId: row.canteen_id,
      windowName: row.window_name,
      isAvailable: row.is_available === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }
  return dishes;
}

export async function getAvailableDishes(): Promise<Dish[]> {
  if (!db) throw new Error('Database not initialized');
  const [result] = await db.executeSql(
    'SELECT * FROM dishes WHERE is_available = 1 ORDER BY category, name'
  );
  const dishes: Dish[] = [];
  for (let i = 0; i < result.rows.length; i++) {
    const row = result.rows.item(i);
    dishes.push({
      id: row.id,
      name: row.name,
      price: row.price,
      category: row.category,
      nutritionTags: row.nutrition_tags ? JSON.parse(row.nutrition_tags) : [],
      canteenId: row.canteen_id,
      windowName: row.window_name,
      isAvailable: true,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }
  return dishes;
}

export async function addDish(dish: Omit<Dish, 'createdAt' | 'updatedAt'>): Promise<void> {
  if (!db) throw new Error('Database not initialized');
  const now = Date.now();
  await db.executeSql(
    `INSERT INTO dishes (id, name, price, category, nutrition_tags, canteen_id, window_name, is_available, created_at, updated_at) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      dish.id,
      dish.name,
      dish.price,
      dish.category,
      JSON.stringify(dish.nutritionTags),
      dish.canteenId,
      dish.windowName || null,
      dish.isAvailable ? 1 : 0,
      now,
      now,
    ]
  );
}

export async function updateDish(dish: Dish): Promise<void> {
  if (!db) throw new Error('Database not initialized');
  await db.executeSql(
    `UPDATE dishes SET name = ?, price = ?, category = ?, nutrition_tags = ?, 
     canteen_id = ?, window_name = ?, is_available = ?, updated_at = ? WHERE id = ?`,
    [
      dish.name,
      dish.price,
      dish.category,
      JSON.stringify(dish.nutritionTags),
      dish.canteenId,
      dish.windowName || null,
      dish.isAvailable ? 1 : 0,
      Date.now(),
      dish.id,
    ]
  );
}

export async function deleteDish(id: string): Promise<void> {
  if (!db) throw new Error('Database not initialized');
  await db.executeSql('DELETE FROM dishes WHERE id = ?', [id]);
}

export async function toggleDishAvailability(id: string, isAvailable: boolean): Promise<void> {
  if (!db) throw new Error('Database not initialized');
  await db.executeSql(
    'UPDATE dishes SET is_available = ?, updated_at = ? WHERE id = ?',
    [isAvailable ? 1 : 0, Date.now(), id]
  );
}

// ==================== 饮食计划相关操作 ====================

export async function getMealPlan(date: string): Promise<DailyMealPlan | null> {
  if (!db) throw new Error('Database not initialized');
  const [result] = await db.executeSql('SELECT * FROM meal_plans WHERE date = ?', [date]);
  if (result.rows.length === 0) return null;
  const row = result.rows.item(0);
  return JSON.parse(row.plan_data);
}

export async function saveMealPlan(plan: DailyMealPlan): Promise<void> {
  if (!db) throw new Error('Database not initialized');
  await db.executeSql(
    `INSERT OR REPLACE INTO meal_plans (date, daily_budget, plan_data, total_cost, nutrition_summary, created_at) 
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      plan.date,
      plan.dailyBudget,
      JSON.stringify(plan),
      plan.totalCost,
      plan.nutritionSummary,
      plan.createdAt,
    ]
  );
}

export async function getRecentMealPlans(days: number = 7): Promise<DailyMealPlan[]> {
  if (!db) throw new Error('Database not initialized');
  const [result] = await db.executeSql(
    'SELECT * FROM meal_plans ORDER BY date DESC LIMIT ?',
    [days]
  );
  const plans: DailyMealPlan[] = [];
  for (let i = 0; i < result.rows.length; i++) {
    const row = result.rows.item(i);
    plans.push(JSON.parse(row.plan_data));
  }
  return plans;
}

// ==================== 消费记录相关操作 ====================

export async function addConsumptionRecord(record: ConsumptionRecord): Promise<void> {
  if (!db) throw new Error('Database not initialized');
  await db.executeSql(
    `INSERT INTO consumption_records (id, date, meal_type, dish_ids, actual_cost, created_at) 
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      record.id,
      record.date,
      record.mealType,
      JSON.stringify(record.dishIds),
      record.actualCost,
      record.createdAt,
    ]
  );
}

export async function getConsumptionRecords(days: number = 7): Promise<ConsumptionRecord[]> {
  if (!db) throw new Error('Database not initialized');
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  const cutoffStr = cutoffDate.toISOString().split('T')[0];
  
  const [result] = await db.executeSql(
    'SELECT * FROM consumption_records WHERE date >= ? ORDER BY date DESC, created_at DESC',
    [cutoffStr]
  );
  const records: ConsumptionRecord[] = [];
  for (let i = 0; i < result.rows.length; i++) {
    const row = result.rows.item(i);
    records.push({
      id: row.id,
      date: row.date,
      mealType: row.meal_type,
      dishIds: JSON.parse(row.dish_ids),
      actualCost: row.actual_cost,
      createdAt: row.created_at,
    });
  }
  return records;
}

export async function getMonthlyConsumption(year: number, month: number): Promise<number> {
  if (!db) throw new Error('Database not initialized');
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  
  const [result] = await db.executeSql(
    'SELECT SUM(actual_cost) as total FROM consumption_records WHERE date >= ? AND date < ?',
    [startDate, endDate]
  );
  return result.rows.item(0).total || 0;
}

// ==================== 用户偏好相关操作 ====================

export async function getPreferences(): Promise<UserPreference> {
  if (!db) throw new Error('Database not initialized');
  const [result] = await db.executeSql('SELECT * FROM preferences WHERE id = 1');
  const row = result.rows.item(0);
  return {
    spicyLevel: row.spicy_level,
    excludedFoods: JSON.parse(row.excluded_foods),
    dietGoal: row.diet_goal,
    isVegetarian: row.is_vegetarian === 1,
    isHalal: row.is_halal === 1,
    mealBudgetRatio: JSON.parse(row.meal_budget_ratio),
  };
}

export async function savePreferences(prefs: UserPreference): Promise<void> {
  if (!db) throw new Error('Database not initialized');
  await db.executeSql(
    `UPDATE preferences SET spicy_level = ?, excluded_foods = ?, diet_goal = ?, 
     is_vegetarian = ?, is_halal = ?, meal_budget_ratio = ? WHERE id = 1`,
    [
      prefs.spicyLevel,
      JSON.stringify(prefs.excludedFoods),
      prefs.dietGoal,
      prefs.isVegetarian ? 1 : 0,
      prefs.isHalal ? 1 : 0,
      JSON.stringify(prefs.mealBudgetRatio),
    ]
  );
}

// ==================== 预算设置相关操作 ====================

export async function getBudgetSettings(): Promise<BudgetSettings> {
  if (!db) throw new Error('Database not initialized');
  const [result] = await db.executeSql('SELECT * FROM budget_settings WHERE id = 1');
  const row = result.rows.item(0);
  return {
    monthlyBudget: row.monthly_budget,
    startDate: row.start_date || new Date().toISOString().split('T')[0].slice(0, 7) + '-01',
    consumed: row.consumed,
  };
}

export async function saveBudgetSettings(settings: BudgetSettings): Promise<void> {
  if (!db) throw new Error('Database not initialized');
  await db.executeSql(
    'UPDATE budget_settings SET monthly_budget = ?, start_date = ?, consumed = ? WHERE id = 1',
    [settings.monthlyBudget, settings.startDate, settings.consumed]
  );
}

export async function addToConsumed(amount: number): Promise<void> {
  if (!db) throw new Error('Database not initialized');
  await db.executeSql(
    'UPDATE budget_settings SET consumed = consumed + ? WHERE id = 1',
    [amount]
  );
}

// ==================== API 配置相关操作 ====================

export async function getApiConfig(): Promise<ApiConfig> {
  if (!db) throw new Error('Database not initialized');
  const [result] = await db.executeSql('SELECT * FROM api_config WHERE id = 1');
  const row = result.rows.item(0);
  return {
    provider: row.provider,
    apiKey: row.api_key || '',
    baseUrl: row.base_url,
    model: row.model,
  };
}

export async function saveApiConfig(config: ApiConfig): Promise<void> {
  if (!db) throw new Error('Database not initialized');
  await db.executeSql(
    'UPDATE api_config SET provider = ?, api_key = ?, base_url = ?, model = ? WHERE id = 1',
    [config.provider, config.apiKey, config.baseUrl || null, config.model || null]
  );
}

// 关闭数据库连接
export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.close();
    db = null;
  }
}
