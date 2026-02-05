import React from 'react';
import {View, StyleSheet, TouchableOpacity} from 'react-native';
import {Text, Chip, IconButton, Switch} from 'react-native-paper';
import {Dish, DISH_CATEGORY_LABELS, NUTRITION_TAG_LABELS} from '../types';

interface DishItemProps {
  dish: Dish;
  onEdit?: (dish: Dish) => void;
  onDelete?: (dish: Dish) => void;
  onToggleAvailable?: (dish: Dish) => void;
  showActions?: boolean;
}

export const DishItem: React.FC<DishItemProps> = ({
  dish,
  onEdit,
  onDelete,
  onToggleAvailable,
  showActions = true,
}) => {
  return (
    <View style={[styles.container, !dish.isAvailable && styles.unavailable]}>
      <View style={styles.mainContent}>
        <View style={styles.header}>
          <Text style={styles.name}>{dish.name}</Text>
          <Text style={styles.price}>¥{dish.price.toFixed(1)}</Text>
        </View>
        
        <View style={styles.tagsContainer}>
          <Chip compact style={styles.categoryChip} textStyle={styles.chipText}>
            {DISH_CATEGORY_LABELS[dish.category]}
          </Chip>
          {dish.nutritionTags.map((tag) => (
            <Chip key={tag} compact style={styles.tagChip} textStyle={styles.chipText}>
              {NUTRITION_TAG_LABELS[tag]}
            </Chip>
          ))}
        </View>
        
        {dish.windowName && (
          <Text style={styles.windowName}>窗口: {dish.windowName}</Text>
        )}
      </View>
      
      {showActions && (
        <View style={styles.actions}>
          <Switch
            value={dish.isAvailable}
            onValueChange={() => onToggleAvailable?.(dish)}
          />
          <IconButton
            icon="pencil"
            size={20}
            onPress={() => onEdit?.(dish)}
          />
          <IconButton
            icon="delete"
            size={20}
            iconColor="#e53935"
            onPress={() => onDelete?.(dish)}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 12,
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  unavailable: {
    opacity: 0.5,
    backgroundColor: '#f5f5f5',
  },
  mainContent: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  price: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 4,
  },
  categoryChip: {
    backgroundColor: '#E3F2FD',
    height: 24,
  },
  tagChip: {
    backgroundColor: '#FFF3E0',
    height: 24,
  },
  chipText: {
    fontSize: 11,
  },
  windowName: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default DishItem;
