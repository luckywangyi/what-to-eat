import {create} from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {MealOption, MealType} from '../types';

const FAVORITES_KEY = '@what_to_eat_favorites';

export interface FavoriteMeal {
  id: string;
  mealType: MealType;
  dishes: { name: string; price: number }[];
  totalPrice: number;
  savedAt: number;
}

interface FavoriteState {
  favorites: FavoriteMeal[];
  isLoaded: boolean;
  loadFavorites: () => Promise<void>;
  addFavorite: (mealType: MealType, option: MealOption) => Promise<void>;
  removeFavorite: (id: string) => Promise<void>;
  isFavorited: (mealType: MealType, dishNames: string[]) => boolean;
}

export const useFavoriteStore = create<FavoriteState>((set, get) => ({
  favorites: [],
  isLoaded: false,

  loadFavorites: async () => {
    try {
      const data = await AsyncStorage.getItem(FAVORITES_KEY);
      if (data) {
        set({favorites: JSON.parse(data), isLoaded: true});
      } else {
        set({isLoaded: true});
      }
    } catch (error) {
      console.error('Failed to load favorites:', error);
      set({isLoaded: true});
    }
  },

  addFavorite: async (mealType: MealType, option: MealOption) => {
    const newFavorite: FavoriteMeal = {
      id: `fav_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      mealType,
      dishes: option.dishes.map(d => ({name: d.name, price: d.price})),
      totalPrice: option.totalPrice,
      savedAt: Date.now(),
    };

    const updated = [newFavorite, ...get().favorites];
    set({favorites: updated});

    try {
      await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to save favorite:', error);
    }
  },

  removeFavorite: async (id: string) => {
    const updated = get().favorites.filter(f => f.id !== id);
    set({favorites: updated});

    try {
      await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to remove favorite:', error);
    }
  },

  isFavorited: (mealType: MealType, dishNames: string[]) => {
    const sorted = [...dishNames].sort().join(',');
    return get().favorites.some(
      f => f.mealType === mealType && [...f.dishes.map(d => d.name)].sort().join(',') === sorted
    );
  },
}));

export default useFavoriteStore;
