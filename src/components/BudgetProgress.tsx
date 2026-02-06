import React, {useMemo} from 'react';
import {View, StyleSheet} from 'react-native';
import {Text, ProgressBar} from 'react-native-paper';
import {typography, spacing, radius, ThemeColors} from '../theme';
import {useAppTheme} from '../context/ThemeContext';

interface BudgetProgressProps {
  dailyBudget: number;
  spent: number;
  remaining: number;
  remainingDays: number;
}

export const BudgetProgress: React.FC<BudgetProgressProps> = ({
  dailyBudget,
  spent,
  remaining,
  remainingDays,
}) => {
  const {colors} = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const progress = dailyBudget > 0 ? spent / dailyBudget : 0;
  
  // 根据进度设置颜色
  const getProgressColor = () => {
    if (progress < 0.5) return colors.accent;
    if (progress < 0.8) return colors.warning;
    return colors.error;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.budgetInfo}>
          <Text style={styles.label}>今日预算</Text>
          <Text style={styles.amount}>¥{dailyBudget.toFixed(0)}</Text>
        </View>
        <View style={styles.budgetInfo}>
          <Text style={styles.label}>已花费</Text>
          <Text style={[styles.amount, {color: getProgressColor()}]}>
            ¥{spent.toFixed(0)}
          </Text>
        </View>
        <View style={styles.budgetInfo}>
          <Text style={styles.label}>本月剩余</Text>
          <Text style={styles.amount}>¥{remaining.toFixed(0)}</Text>
        </View>
      </View>
      
      <View style={styles.progressContainer}>
        <ProgressBar
          progress={Math.min(progress, 1)}
          color={getProgressColor()}
          style={styles.progressBar}
        />
      </View>
      
      <Text style={styles.daysRemaining}>
        本月还剩 {remainingDays} 天
      </Text>
    </View>
  );
};

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
    borderRadius: radius.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  budgetInfo: {
    alignItems: 'center',
    flex: 1,
  },
  label: {
    ...typography.footnote,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  amount: {
    fontSize: 26,
    fontWeight: '600',
    color: colors.text.primary,
    letterSpacing: -0.5,
  },
  progressContainer: {
    marginBottom: spacing.md,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surfaceSecondary,
  },
  daysRemaining: {
    ...typography.caption1,
    color: colors.text.tertiary,
    textAlign: 'center',
  },
});

export default BudgetProgress;
