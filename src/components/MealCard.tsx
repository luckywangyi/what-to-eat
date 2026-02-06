import React, {useState} from 'react';
import {View, StyleSheet, TouchableOpacity} from 'react-native';
import {Card, Text, Chip, IconButton, useTheme} from 'react-native-paper';
import {MealRecommendation, MealOption, MEAL_TYPE_LABELS} from '../types';

interface MealCardProps {
  meal: MealRecommendation;
  onSelectOption?: (option: MealOption) => void;
  onRefresh?: () => void;
  selectedOptionId?: 'A' | 'B' | 'C';
}

const MEAL_ICONS = {
  breakfast: '🌅',
  lunch: '☀️',
  dinner: '🌙',
};

export const MealCard: React.FC<MealCardProps> = ({
  meal,
  onSelectOption,
  onRefresh,
  selectedOptionId,
}) => {
  const theme = useTheme();
  const [selected, setSelected] = useState<'A' | 'B' | 'C'>(selectedOptionId || 'A');

  const handleSelectOption = (option: MealOption) => {
    setSelected(option.optionId);
    onSelectOption?.(option);
  };

  return (
    <Card style={styles.card} mode="elevated">
      <Card.Title
        title={`${MEAL_ICONS[meal.mealType]} ${MEAL_TYPE_LABELS[meal.mealType]}`}
        subtitle={`建议预算: ¥${meal.suggestedBudget.toFixed(1)}`}
        right={() => (
          onRefresh && (
            <IconButton
              icon="refresh"
              size={20}
              onPress={onRefresh}
            />
          )
        )}
      />
      <Card.Content>
        <View style={styles.optionsContainer}>
          {meal.options.map((option) => (
            <TouchableOpacity
              key={option.optionId}
              style={[
                styles.optionCard,
                selected === option.optionId && {
                  borderColor: theme.colors.primary,
                  backgroundColor: theme.colors.primaryContainer,
                },
              ]}
              onPress={() => handleSelectOption(option)}
            >
              <View style={styles.optionHeader}>
                <Text style={styles.optionId}>{option.optionId}</Text>
                <Text style={styles.optionPrice}>¥{option.totalPrice.toFixed(1)}</Text>
              </View>
              <View style={styles.dishesContainer}>
                {option.dishes.map((dish, index) => (
                  <Chip
                    key={`${dish.id}-${index}`}
                    compact
                    style={styles.dishChip}
                    textStyle={styles.dishChipText}
                  >
                    {dish.name}
                  </Chip>
                ))}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 8,
  },
  optionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  optionCard: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    backgroundColor: '#fafafa',
    minHeight: 100,
  },
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  optionId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
  },
  optionPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2196F3',
  },
  dishesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  dishChip: {
    height: 28,
    marginBottom: 4,
  },
  dishChipText: {
    fontSize: 12,
  },
});

export default MealCard;
