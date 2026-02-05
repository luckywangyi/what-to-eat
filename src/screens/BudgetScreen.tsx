import React, {useState, useCallback} from 'react';
import {View, ScrollView, StyleSheet} from 'react-native';
import {
  Text,
  Card,
  TextInput,
  Button,
  ProgressBar,
  Divider,
  List,
  useTheme,
} from 'react-native-paper';
import {useFocusEffect} from '@react-navigation/native';
import {useBudgetStore} from '../stores/budgetStore';
import {usePreferenceStore} from '../stores/preferenceStore';
import {usePlanStore} from '../stores/planStore';
import {MEAL_TYPE_LABELS} from '../types';

export const BudgetScreen: React.FC = () => {
  const theme = useTheme();
  const [monthlyBudgetInput, setMonthlyBudgetInput] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const {settings, loadSettings, saveSettings, getDailyBudget, getRemainingBudget, getRemainingDays} = useBudgetStore();
  const {preferences, loadPreferences} = usePreferenceStore();
  const {consumptionRecords, loadConsumptionRecords} = usePlanStore();

  useFocusEffect(
    useCallback(() => {
      loadSettings();
      loadPreferences();
      loadConsumptionRecords(30);
    }, [])
  );

  // 保存预算设置
  const handleSaveBudget = async () => {
    const amount = parseFloat(monthlyBudgetInput);
    if (isNaN(amount) || amount <= 0) {
      return;
    }

    if (settings) {
      await saveSettings({
        ...settings,
        monthlyBudget: amount,
      });
    }
    setIsEditing(false);
  };

  // 开始编辑
  const startEditing = () => {
    setMonthlyBudgetInput(settings?.monthlyBudget.toString() || '');
    setIsEditing(true);
  };

  const dailyBudget = getDailyBudget(preferences);
  const remainingBudget = getRemainingBudget();
  const remainingDays = getRemainingDays();
  const monthlyBudget = settings?.monthlyBudget || 0;
  const consumed = settings?.consumed || 0;
  const progress = monthlyBudget > 0 ? consumed / monthlyBudget : 0;

  // 计算各餐预算分配
  const breakfastBudget = dailyBudget * preferences.mealBudgetRatio.breakfast;
  const lunchBudget = dailyBudget * preferences.mealBudgetRatio.lunch;
  const dinnerBudget = dailyBudget * preferences.mealBudgetRatio.dinner;

  // 获取最近消费统计
  const getRecentStats = () => {
    const today = new Date();
    const last7Days = consumptionRecords.filter(r => {
      const recordDate = new Date(r.date);
      const diffDays = Math.floor((today.getTime() - recordDate.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays < 7;
    });

    const totalSpent = last7Days.reduce((sum, r) => sum + r.actualCost, 0);
    const avgDaily = last7Days.length > 0 ? totalSpent / 7 : 0;

    return {totalSpent, avgDaily, count: last7Days.length};
  };

  const stats = getRecentStats();

  return (
    <ScrollView style={styles.container}>
      {/* 月度预算卡片 */}
      <Card style={styles.card}>
        <Card.Title title="月度预算" />
        <Card.Content>
          {isEditing ? (
            <View style={styles.editContainer}>
              <TextInput
                label="月度预算"
                value={monthlyBudgetInput}
                onChangeText={setMonthlyBudgetInput}
                keyboardType="decimal-pad"
                mode="outlined"
                left={<TextInput.Affix text="¥" />}
                style={styles.input}
              />
              <View style={styles.editActions}>
                <Button onPress={() => setIsEditing(false)}>取消</Button>
                <Button mode="contained" onPress={handleSaveBudget}>
                  保存
                </Button>
              </View>
            </View>
          ) : (
            <>
              <View style={styles.budgetRow}>
                <Text style={styles.budgetLabel}>本月预算</Text>
                <Text style={styles.budgetAmount}>¥{monthlyBudget.toFixed(0)}</Text>
              </View>
              
              <View style={styles.budgetRow}>
                <Text style={styles.budgetLabel}>已消费</Text>
                <Text style={[styles.budgetAmount, {color: theme.colors.error}]}>
                  ¥{consumed.toFixed(1)}
                </Text>
              </View>
              
              <View style={styles.budgetRow}>
                <Text style={styles.budgetLabel}>剩余</Text>
                <Text style={[styles.budgetAmount, {color: theme.colors.primary}]}>
                  ¥{remainingBudget.toFixed(1)}
                </Text>
              </View>

              <ProgressBar
                progress={Math.min(progress, 1)}
                color={progress > 0.8 ? theme.colors.error : theme.colors.primary}
                style={styles.progressBar}
              />
              
              <Text style={styles.progressText}>
                已使用 {(progress * 100).toFixed(1)}%，剩余 {remainingDays} 天
              </Text>

              <Button
                mode="outlined"
                onPress={startEditing}
                style={styles.editButton}
              >
                修改预算
              </Button>
            </>
          )}
        </Card.Content>
      </Card>

      {/* 每日预算分配 */}
      <Card style={styles.card}>
        <Card.Title title="今日预算分配" />
        <Card.Content>
          <View style={styles.dailyBudgetHeader}>
            <Text style={styles.dailyBudgetLabel}>今日可用</Text>
            <Text style={styles.dailyBudgetAmount}>¥{dailyBudget.toFixed(1)}</Text>
          </View>

          <Divider style={styles.divider} />

          <View style={styles.mealBudgetRow}>
            <View style={styles.mealBudgetItem}>
              <Text style={styles.mealLabel}>🌅 早餐</Text>
              <Text style={styles.mealBudget}>¥{breakfastBudget.toFixed(1)}</Text>
              <Text style={styles.mealPercent}>
                {(preferences.mealBudgetRatio.breakfast * 100).toFixed(0)}%
              </Text>
            </View>
            
            <View style={styles.mealBudgetItem}>
              <Text style={styles.mealLabel}>☀️ 午餐</Text>
              <Text style={styles.mealBudget}>¥{lunchBudget.toFixed(1)}</Text>
              <Text style={styles.mealPercent}>
                {(preferences.mealBudgetRatio.lunch * 100).toFixed(0)}%
              </Text>
            </View>
            
            <View style={styles.mealBudgetItem}>
              <Text style={styles.mealLabel}>🌙 晚餐</Text>
              <Text style={styles.mealBudget}>¥{dinnerBudget.toFixed(1)}</Text>
              <Text style={styles.mealPercent}>
                {(preferences.mealBudgetRatio.dinner * 100).toFixed(0)}%
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* 消费统计 */}
      <Card style={styles.card}>
        <Card.Title title="近7天消费统计" />
        <Card.Content>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>¥{stats.totalSpent.toFixed(1)}</Text>
              <Text style={styles.statLabel}>总消费</Text>
            </View>
            
            <View style={styles.statItem}>
              <Text style={styles.statValue}>¥{stats.avgDaily.toFixed(1)}</Text>
              <Text style={styles.statLabel}>日均</Text>
            </View>
            
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.count}</Text>
              <Text style={styles.statLabel}>记录数</Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* 消费记录 */}
      <Card style={styles.card}>
        <Card.Title title="近期消费记录" />
        <Card.Content>
          {consumptionRecords.length === 0 ? (
            <Text style={styles.emptyText}>暂无消费记录</Text>
          ) : (
            <List.Section>
              {consumptionRecords.slice(0, 10).map(record => (
                <List.Item
                  key={record.id}
                  title={MEAL_TYPE_LABELS[record.mealType]}
                  description={record.date}
                  right={() => (
                    <Text style={styles.recordAmount}>¥{record.actualCost.toFixed(1)}</Text>
                  )}
                />
              ))}
            </List.Section>
          )}
        </Card.Content>
      </Card>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  card: {
    margin: 16,
    marginBottom: 8,
  },
  budgetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  budgetLabel: {
    fontSize: 16,
    color: '#666',
  },
  budgetAmount: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginVertical: 12,
  },
  progressText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
  },
  editContainer: {
    gap: 12,
  },
  input: {
    marginBottom: 8,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  editButton: {
    marginTop: 16,
  },
  dailyBudgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dailyBudgetLabel: {
    fontSize: 16,
    color: '#666',
  },
  dailyBudgetAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  divider: {
    marginVertical: 16,
  },
  mealBudgetRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  mealBudgetItem: {
    alignItems: 'center',
  },
  mealLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  mealBudget: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  mealPercent: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  emptyText: {
    color: '#888',
    textAlign: 'center',
    padding: 20,
  },
  recordAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2196F3',
    alignSelf: 'center',
  },
  bottomPadding: {
    height: 20,
  },
});

export default BudgetScreen;
