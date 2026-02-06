import {create} from 'zustand';
import {Canteen, Dish, DishCategory, NutritionTag} from '../types';
import * as db from '../services/dbService';

// 生成唯一ID
const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

interface MenuState {
  canteens: Canteen[];
  dishes: Dish[];
  isLoading: boolean;
  error: string | null;

  // 食堂操作
  loadCanteens: () => Promise<void>;
  addCanteen: (name: string, location?: string) => Promise<void>;
  updateCanteen: (canteen: Canteen) => Promise<void>;
  deleteCanteen: (id: string) => Promise<void>;

  // 菜品操作
  loadDishes: () => Promise<void>;
  loadDishesByCanteen: (canteenId: string) => Promise<Dish[]>;
  addDish: (dish: {
    name: string;
    price: number;
    category: DishCategory;
    nutritionTags: NutritionTag[];
    canteenId: string;
    windowName?: string;
  }) => Promise<void>;
  updateDish: (dish: Dish) => Promise<void>;
  deleteDish: (id: string) => Promise<void>;
  toggleDishAvailability: (id: string) => Promise<void>;

  // 获取可用菜品
  getAvailableDishes: () => Dish[];
  
  // 清除错误
  clearError: () => void;
}

export const useMenuStore = create<MenuState>((set, get) => ({
  canteens: [],
  dishes: [],
  isLoading: false,
  error: null,

  loadCanteens: async () => {
    set({isLoading: true, error: null});
    try {
      const canteens = await db.getAllCanteens();
      set({canteens, isLoading: false});
    } catch (error) {
      set({error: '加载食堂列表失败', isLoading: false});
      console.error('Error loading canteens:', error);
    }
  },

  addCanteen: async (name: string, location?: string) => {
    set({isLoading: true, error: null});
    try {
      const newCanteen = {
        id: generateId(),
        name,
        location,
        windows: [],
      };
      await db.addCanteen(newCanteen);
      const canteens = await db.getAllCanteens();
      set({canteens, isLoading: false});
    } catch (error) {
      set({error: '添加食堂失败', isLoading: false});
      console.error('Error adding canteen:', error);
    }
  },

  updateCanteen: async (canteen: Canteen) => {
    set({isLoading: true, error: null});
    try {
      await db.updateCanteen(canteen);
      const canteens = await db.getAllCanteens();
      set({canteens, isLoading: false});
    } catch (error) {
      set({error: '更新食堂失败', isLoading: false});
      console.error('Error updating canteen:', error);
    }
  },

  deleteCanteen: async (id: string) => {
    set({isLoading: true, error: null});
    try {
      await db.deleteCanteen(id);
      const canteens = await db.getAllCanteens();
      const dishes = await db.getAllDishes();
      set({canteens, dishes, isLoading: false});
    } catch (error) {
      set({error: '删除食堂失败', isLoading: false});
      console.error('Error deleting canteen:', error);
    }
  },

  loadDishes: async () => {
    set({isLoading: true, error: null});
    try {
      const dishes = await db.getAllDishes();
      set({dishes, isLoading: false});
    } catch (error) {
      set({error: '加载菜品列表失败', isLoading: false});
      console.error('Error loading dishes:', error);
    }
  },

  loadDishesByCanteen: async (canteenId: string) => {
    try {
      return await db.getDishesByCanteen(canteenId);
    } catch (error) {
      console.error('Error loading dishes by canteen:', error);
      return [];
    }
  },

  addDish: async (dishData) => {
    set({isLoading: true, error: null});
    try {
      const newDish = {
        id: generateId(),
        ...dishData,
        isAvailable: true,
      };
      await db.addDish(newDish);
      const dishes = await db.getAllDishes();
      set({dishes, isLoading: false});
    } catch (error) {
      set({error: '添加菜品失败', isLoading: false});
      console.error('Error adding dish:', error);
    }
  },

  updateDish: async (dish: Dish) => {
    set({isLoading: true, error: null});
    try {
      await db.updateDish(dish);
      const dishes = await db.getAllDishes();
      set({dishes, isLoading: false});
    } catch (error) {
      set({error: '更新菜品失败', isLoading: false});
      console.error('Error updating dish:', error);
    }
  },

  deleteDish: async (id: string) => {
    set({isLoading: true, error: null});
    try {
      await db.deleteDish(id);
      const dishes = await db.getAllDishes();
      set({dishes, isLoading: false});
    } catch (error) {
      set({error: '删除菜品失败', isLoading: false});
      console.error('Error deleting dish:', error);
    }
  },

  toggleDishAvailability: async (id: string) => {
    const {dishes} = get();
    const dish = dishes.find(d => d.id === id);
    if (!dish) return;

    set({isLoading: true, error: null});
    try {
      await db.toggleDishAvailability(id, !dish.isAvailable);
      const updatedDishes = await db.getAllDishes();
      set({dishes: updatedDishes, isLoading: false});
    } catch (error) {
      set({error: '更新菜品状态失败', isLoading: false});
      console.error('Error toggling dish availability:', error);
    }
  },

  getAvailableDishes: () => {
    return get().dishes.filter(d => d.isAvailable);
  },

  clearError: () => set({error: null}),
}));
