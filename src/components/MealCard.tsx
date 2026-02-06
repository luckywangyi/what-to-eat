import React, {useState} from 'react';
import {View, StyleSheet, TouchableOpacity} from 'react-native';
import {Text, IconButton} from 'react-native-paper';
import {MealRecommendation, MealOption, MEAL_TYPE_LABELS} from '../types';
import {colors, typography, spacing, radius} from '../theme';
import {PressableScale} from './PressableScale';

interface MealCardProps {
  meal: MealRecommendation;
  onSelectOption?: (option: MealOption) => void;
  onConfirmMeal?: (option: MealOption) => void;
  onRefresh?: () => void;
  onShowDetail?: (option: MealOption) => void;
  selectedOptionId?: 'A' | 'B' | 'C';
  isConfirmed?: boolean;
  confirmedOptionId?: 'A' | 'B' | 'C';
}

export const MealCard: React.FC<MealCardProps> = ({
  meal,
  onSelectOption,
  onConfirmMeal,
  onRefresh,
  onShowDetail,
  selectedOptionId,
  isConfirmed = false,
  confirmedOptionId,
}) => {
  const [selected, setSelected] = useState<'A' | 'B' | 'C'>(selectedOptionId || 'A');

  const handleSelectOption = (option: MealOption) => {
    if (isConfirmed) return; // 已确认则不能再选择
    setSelected(option.optionId);
    onSelectOption?.(option);
  };

  const handleShowDetail = (option: MealOption) => {
    if (!isConfirmed) {
      setSelected(option.optionId);
    }
    onShowDetail?.(option);
  };

  const handleConfirm = () => {
    const selectedOption = meal.options.find(o => o.optionId === selected);
    if (selectedOption && onConfirmMeal) {
      onConfirmMeal(selectedOption);
    }
  };

  const getSelectedOption = () => {
    return meal.options.find(o => o.optionId === (isConfirmed ? confirmedOptionId : selected));
  };

  return (
    <View style={[styles.card, isConfirmed && styles.cardConfirmed]}>
      {/* 头部 */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.mealTitle}>{MEAL_TYPE_LABELS[meal.mealType]}</Text>
          {isConfirmed ? (
            <View style={styles.confirmedBadge}>
              <Text style={styles.confirmedText}>已用餐 ¥{getSelectedOption()?.totalPrice.toFixed(0)}</Text>
            </View>
          ) : (
            <Text style={styles.budgetHint}>建议 ¥{meal.suggestedBudget.toFixed(0)}</Text>
          )}
        </View>
        {!isConfirmed && onRefresh && (
          <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
            <IconButton
              icon="refresh"
              size={20}
              iconColor={colors.text.tertiary}
              style={styles.refreshIcon}
            />
          </TouchableOpacity>
        )}
        {isConfirmed && (
          <View style={styles.checkMark}>
            <IconButton
              icon="check-circle"
              size={24}
              iconColor={colors.success}
              style={styles.refreshIcon}
            />
          </View>
        )}
      </View>

      {/* 选项列表 */}
      <View style={styles.optionsContainer}>
        {meal.options.map((option) => {
          const isSelected = (isConfirmed ? confirmedOptionId : selected) === option.optionId;
          const isDisabled = isConfirmed && !isSelected;
          
          return (
            <PressableScale
              key={option.optionId}
              style={[
                styles.optionCard,
                isSelected && styles.optionSelected,
                isConfirmed && isSelected && styles.optionConfirmed,
                isDisabled && styles.optionDisabled,
              ]}
              onPress={() => handleSelectOption(option)}
              disabled={isConfirmed}
              disableAnimation={isConfirmed}
            >
              <View style={styles.optionHeader}>
                <View style={[
                  styles.optionBadge,
                  isSelected && styles.optionBadgeSelected,
                  isConfirmed && isSelected && styles.optionBadgeConfirmed,
                ]}>
                  <Text style={[
                    styles.optionId,
                    isSelected && styles.optionIdSelected,
                  ]}>
                    {isConfirmed && isSelected ? '✓' : option.optionId}
                  </Text>
                </View>
                <Text style={[
                  styles.optionPrice,
                  isSelected && styles.optionPriceSelected,
                  isConfirmed && isSelected && styles.optionPriceConfirmed,
                ]}>
                  ¥{option.totalPrice.toFixed(0)}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => handleShowDetail(option)}
                disabled={isConfirmed && isDisabled}
                activeOpacity={0.6}
              >
                <Text 
                  style={[
                    styles.optionDishes, 
                    isDisabled && styles.optionDishesDisabled,
                    !isDisabled && styles.optionDishesClickable,
                  ]}
                  numberOfLines={2}
                >
                  {option.dishes.map(d => d.name).join(' + ')}
                </Text>
                {!isDisabled && onShowDetail && (
                  <Text style={styles.viewDetailHint}>点击查看详情</Text>
                )}
              </TouchableOpacity>
            </PressableScale>
          );
        })}
      </View>

      {/* 确认按钮 */}
      {!isConfirmed && onConfirmMeal && (
        <PressableScale onPress={handleConfirm} style={styles.confirmButton}>
          <Text style={styles.confirmButtonLabel}>
            确认用餐 ¥{getSelectedOption()?.totalPrice.toFixed(0)}
          </Text>
        </PressableScale>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.sm,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
  },
  cardConfirmed: {
    backgroundColor: colors.successSubtle,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  headerLeft: {
    flex: 1,
  },
  mealTitle: {
    ...typography.title3,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  budgetHint: {
    ...typography.footnote,
    color: colors.text.secondary,
  },
  confirmedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  confirmedText: {
    ...typography.footnote,
    color: colors.success,
    fontWeight: '600',
  },
  refreshButton: {
    marginTop: -8,
    marginRight: -8,
  },
  checkMark: {
    marginTop: -8,
    marginRight: -8,
  },
  refreshIcon: {
    margin: 0,
  },
  optionsContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  optionCard: {
    flex: 1,
    padding: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    minHeight: 88,
  },
  optionSelected: {
    backgroundColor: colors.accentSubtle,
  },
  optionConfirmed: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.success,
  },
  optionDisabled: {
    opacity: 0.4,
  },
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  optionBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionBadgeSelected: {
    backgroundColor: colors.accent,
  },
  optionBadgeConfirmed: {
    backgroundColor: colors.success,
  },
  optionId: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  optionIdSelected: {
    color: colors.surface,
  },
  optionPrice: {
    ...typography.headline,
    color: colors.text.primary,
  },
  optionPriceSelected: {
    color: colors.accent,
  },
  optionPriceConfirmed: {
    color: colors.success,
  },
  optionDishes: {
    ...typography.caption1,
    color: colors.text.secondary,
    lineHeight: 16,
  },
  optionDishesClickable: {
    textDecorationLine: 'underline',
    textDecorationStyle: 'dotted',
  },
  optionDishesDisabled: {
    color: colors.text.tertiary,
  },
  viewDetailHint: {
    ...typography.caption2,
    color: colors.accent,
    marginTop: spacing.xs,
  },
  confirmButton: {
    marginTop: spacing.md,
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonLabel: {
    ...typography.subhead,
    fontWeight: '600',
    color: colors.surface,
  },
});

export default MealCard;
