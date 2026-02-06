import React from 'react';
import {View, StyleSheet} from 'react-native';
import {Text, IconButton, Switch} from 'react-native-paper';
import {Dish, DISH_CATEGORY_LABELS, NUTRITION_TAG_LABELS} from '../types';
import {colors, typography, spacing, radius} from '../theme';

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
          <Text style={styles.price}>¥{dish.price.toFixed(0)}</Text>
        </View>
        
        <View style={styles.tagsContainer}>
          <View style={styles.categoryTag}>
            <Text style={styles.categoryText}>
              {DISH_CATEGORY_LABELS[dish.category]}
            </Text>
          </View>
          {dish.nutritionTags.map((tag) => (
            <View key={tag} style={styles.nutritionTag}>
              <Text style={styles.nutritionText}>
                {NUTRITION_TAG_LABELS[tag]}
              </Text>
            </View>
          ))}
        </View>
        
        {dish.windowName && (
          <Text style={styles.windowName}>{dish.windowName}</Text>
        )}
      </View>
      
      {showActions && (
        <View style={styles.actions}>
          <Switch
            value={dish.isAvailable}
            onValueChange={() => onToggleAvailable?.(dish)}
            color={colors.accent}
            style={styles.switch}
          />
          <IconButton
            icon="pencil-outline"
            size={20}
            iconColor={colors.text.tertiary}
            onPress={() => onEdit?.(dish)}
            style={styles.actionButton}
          />
          <IconButton
            icon="trash-can-outline"
            size={20}
            iconColor={colors.error}
            onPress={() => onDelete?.(dish)}
            style={styles.actionButton}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.xs,
    borderRadius: radius.md,
  },
  unavailable: {
    opacity: 0.5,
    backgroundColor: colors.surfaceSecondary,
  },
  mainContent: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  name: {
    ...typography.headline,
    color: colors.text.primary,
    flex: 1,
    marginRight: spacing.sm,
  },
  price: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.accent,
    letterSpacing: -0.3,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  categoryTag: {
    backgroundColor: colors.accentSubtle,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  categoryText: {
    ...typography.caption2,
    color: colors.accent,
    fontWeight: '500',
  },
  nutritionTag: {
    backgroundColor: colors.surfaceSecondary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  nutritionText: {
    ...typography.caption2,
    color: colors.text.secondary,
  },
  windowName: {
    ...typography.caption1,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
  switch: {
    transform: [{scaleX: 0.8}, {scaleY: 0.8}],
  },
  actionButton: {
    margin: 0,
  },
});

export default DishItem;
