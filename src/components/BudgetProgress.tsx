import React from 'react';
import {View, StyleSheet} from 'react-native';
import {Text, ProgressBar, useTheme} from 'react-native-paper';

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
  const theme = useTheme();
  const progress = dailyBudget > 0 ? spent / dailyBudget : 0;
  
  // 根据进度设置颜色
  const getProgressColor = () => {
    if (progress < 0.5) return theme.colors.primary;
    if (progress < 0.8) return '#FFA000';
    return theme.colors.error;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.budgetInfo}>
          <Text style={styles.label}>今日预算</Text>
          <Text style={styles.amount}>¥{dailyBudget.toFixed(1)}</Text>
        </View>
        <View style={styles.budgetInfo}>
          <Text style={styles.label}>已花费</Text>
          <Text style={[styles.amount, {color: getProgressColor()}]}>
            ¥{spent.toFixed(1)}
          </Text>
        </View>
        <View style={styles.budgetInfo}>
          <Text style={styles.label}>本月剩余</Text>
          <Text style={styles.amount}>¥{remaining.toFixed(0)}</Text>
        </View>
      </View>
      
      <ProgressBar
        progress={Math.min(progress, 1)}
        color={getProgressColor()}
        style={styles.progressBar}
      />
      
      <Text style={styles.daysRemaining}>
        本月还剩 {remainingDays} 天
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  budgetInfo: {
    alignItems: 'center',
  },
  label: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  amount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#e0e0e0',
  },
  daysRemaining: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    marginTop: 8,
  },
});

export default BudgetProgress;
