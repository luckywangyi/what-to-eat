import React, {useState} from 'react';
import {View, StyleSheet, ScrollView} from 'react-native';
import {Text, IconButton} from 'react-native-paper';
import {MealOption, Dish, MEAL_TYPE_LABELS, MealType} from '../types';
import {colors, typography, spacing, radius} from '../theme';
import {AnimatedModal} from './AnimatedModal';
import {PressableScale} from './PressableScale';

interface MealDetailModalProps {
  visible: boolean;
  onDismiss: () => void;
  mealType: MealType;
  option: MealOption;
  availableDishes: Dish[];
  onReplaceDish: (oldDishId: string, newDish: Dish) => void;
  onConfirm: () => void;
}

export const MealDetailModal: React.FC<MealDetailModalProps> = ({
  visible,
  onDismiss,
  mealType,
  option,
  availableDishes,
  onReplaceDish,
  onConfirm,
}) => {
  const [replacingDishId, setReplacingDishId] = useState<string | null>(null);

  // 找到价格相近的替代菜品
  const getSimilarDishes = (currentDish: Dish) => {
    const priceRange = 3; // 价格浮动范围 ±3元
    const currentDishIds = option.dishes.map(d => d.id);
    
    return availableDishes
      .filter(d => 
        !currentDishIds.includes(d.id) && // 排除已选菜品
        d.category === currentDish.category && // 同类别
        Math.abs(d.price - currentDish.price) <= priceRange // 价格相近
      )
      .slice(0, 5); // 最多显示5个
  };

  const handleDeleteDish = (dishId: string) => {
    setReplacingDishId(dishId);
  };

  const handleSelectReplacement = (oldDishId: string, newDish: Dish) => {
    onReplaceDish(oldDishId, newDish);
    setReplacingDishId(null);
  };

  const handleCancelReplace = () => {
    setReplacingDishId(null);
  };

  const currentDish = option.dishes.find(d => d.id === replacingDishId);

  return (
    <AnimatedModal
      visible={visible}
      onDismiss={onDismiss}
      contentContainerStyle={styles.modal}
    >
        <View style={styles.header}>
          <Text style={styles.title}>
            {MEAL_TYPE_LABELS[mealType]} - 选项 {option.optionId}
          </Text>
          <IconButton
            icon="close"
            size={20}
            iconColor={colors.text.tertiary}
            onPress={onDismiss}
            style={styles.closeButton}
          />
        </View>

        <View style={styles.totalPrice}>
          <Text style={styles.totalLabel}>总价</Text>
          <Text style={styles.totalAmount}>¥{option.totalPrice.toFixed(0)}</Text>
        </View>

        <ScrollView style={styles.dishList}>
          {replacingDishId && currentDish ? (
            // 替换菜品视图
            <View style={styles.replaceView}>
              <Text style={styles.replaceTitle}>
                选择替代「{currentDish.name}」的菜品
              </Text>
              <Text style={styles.replaceHint}>
                原价 ¥{currentDish.price.toFixed(0)}，推荐相近价格菜品
              </Text>
              
              {getSimilarDishes(currentDish).length > 0 ? (
                getSimilarDishes(currentDish).map(dish => (
                  <PressableScale
                    key={dish.id}
                    style={styles.replacementItem}
                    onPress={() => handleSelectReplacement(replacingDishId, dish)}
                  >
                    <View style={styles.replacementInfo}>
                      <Text style={styles.replacementName}>{dish.name}</Text>
                      <Text style={styles.replacementCategory}>
                        {dish.windowName || ''}
                      </Text>
                    </View>
                    <Text style={styles.replacementPrice}>
                      ¥{dish.price.toFixed(0)}
                    </Text>
                  </PressableScale>
                ))
              ) : (
                <Text style={styles.noReplacement}>暂无相似价格的替代菜品</Text>
              )}
              
              <PressableScale
                onPress={handleCancelReplace}
                style={styles.cancelButton}
              >
                <Text style={styles.cancelButtonText}>取消</Text>
              </PressableScale>
            </View>
          ) : (
            // 菜品列表视图
            option.dishes.map((dish, index) => (
              <View key={dish.id} style={styles.dishItem}>
                <View style={styles.dishInfo}>
                  <Text style={styles.dishIndex}>{index + 1}</Text>
                  <View style={styles.dishDetails}>
                    <Text style={styles.dishName}>{dish.name}</Text>
                    {dish.windowName && (
                      <Text style={styles.dishWindow}>{dish.windowName}</Text>
                    )}
                  </View>
                </View>
                <View style={styles.dishActions}>
                  <Text style={styles.dishPrice}>¥{dish.price.toFixed(0)}</Text>
                  {option.dishes.length > 1 && (
                    <IconButton
                      icon="swap-horizontal"
                      size={18}
                      iconColor={colors.accent}
                      onPress={() => handleDeleteDish(dish.id)}
                      style={styles.actionButton}
                    />
                  )}
                </View>
              </View>
            ))
          )}
        </ScrollView>

        {!replacingDishId && (
          <View style={styles.footer}>
            <PressableScale
              onPress={onConfirm}
              style={styles.confirmButton}
            >
              <Text style={styles.confirmButtonText}>确认选择此方案</Text>
            </PressableScale>
          </View>
        )}
    </AnimatedModal>
  );
};

const styles = StyleSheet.create({
  modal: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    maxHeight: '80%',
    minWidth: 320,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  title: {
    ...typography.title3,
    color: colors.text.primary,
  },
  closeButton: {
    margin: -8,
  },
  totalPrice: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.accentSubtle,
    marginHorizontal: spacing.lg,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  totalLabel: {
    ...typography.subhead,
    color: colors.text.secondary,
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.accent,
    letterSpacing: -0.5,
  },
  dishList: {
    paddingHorizontal: spacing.lg,
    maxHeight: 300,
  },
  dishItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.separator,
  },
  dishInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  dishIndex: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.surfaceSecondary,
    textAlign: 'center',
    lineHeight: 22,
    fontSize: 12,
    color: colors.text.secondary,
    marginRight: spacing.sm,
    flexShrink: 0,
  },
  dishDetails: {
    flex: 1,
    minWidth: 0,
  },
  dishName: {
    ...typography.body,
    color: colors.text.primary,
  },
  dishWindow: {
    ...typography.caption1,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  dishActions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    marginLeft: spacing.sm,
  },
  dishPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.accent,
    marginRight: spacing.xs,
  },
  actionButton: {
    margin: 0,
  },
  replaceView: {
    paddingVertical: spacing.md,
  },
  replaceTitle: {
    ...typography.headline,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  replaceHint: {
    ...typography.footnote,
    color: colors.text.secondary,
    marginBottom: spacing.lg,
  },
  replacementItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
  },
  replacementInfo: {
    flex: 1,
  },
  replacementName: {
    ...typography.body,
    color: colors.text.primary,
  },
  replacementCategory: {
    ...typography.caption1,
    color: colors.text.tertiary,
  },
  replacementPrice: {
    ...typography.headline,
    color: colors.accent,
  },
  noReplacement: {
    ...typography.subhead,
    color: colors.text.tertiary,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
  cancelButton: {
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  cancelButtonText: {
    ...typography.subhead,
    fontWeight: '600',
    color: colors.text.primary,
  },
  footer: {
    padding: spacing.lg,
  },
  confirmButton: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  confirmButtonText: {
    ...typography.subhead,
    fontWeight: '600',
    color: colors.surface,
  },
});

export default MealDetailModal;
