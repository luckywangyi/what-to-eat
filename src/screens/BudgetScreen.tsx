import React, {useState, useCallback, useMemo} from 'react';
import {View, ScrollView, StyleSheet} from 'react-native';
import {
  Text,
  Card,
  TextInput,
  Button,
  List,
} from 'react-native-paper';
import {useFocusEffect} from '@react-navigation/native';
import {useBudgetStore} from '../stores/budgetStore';
import {usePreferenceStore} from '../stores/preferenceStore';
import {usePlanStore} from '../stores/planStore';
import {MEAL_TYPE_LABELS} from '../types';
import {typography, spacing, radius, ThemeColors} from '../theme';
import {useAppTheme} from '../context/ThemeContext';

export const BudgetScreen: React.FC = () => {
  const {colors} = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
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

  // 近7天每日消费数据（用于柱状图）
  const dailyChartData = useMemo(() => {
    const today = new Date();
    const days: { label: string; total: number; breakfast: number; lunch: number; dinner: number }[] = [];
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const weekDay = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()];
      const label = i === 0 ? '今' : weekDay;
      
      const dayRecords = consumptionRecords.filter(r => r.date === dateStr);
      const breakfast = dayRecords.filter(r => r.mealType === 'breakfast').reduce((s, r) => s + r.actualCost, 0);
      const lunch = dayRecords.filter(r => r.mealType === 'lunch').reduce((s, r) => s + r.actualCost, 0);
      const dinner = dayRecords.filter(r => r.mealType === 'dinner').reduce((s, r) => s + r.actualCost, 0);
      
      days.push({ label, total: breakfast + lunch + dinner, breakfast, lunch, dinner });
    }
    return days;
  }, [consumptionRecords]);

  const maxDailySpend = Math.max(...dailyChartData.map(d => d.total), dailyBudget, 1);

  return (
    <ScrollView style={styles.container}>
      {/* 月度预算卡片 - 环形进度 */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.budgetOverview}>
            {/* 环形进度指示 */}
            <View style={styles.ringContainer}>
              <View style={[styles.ringOuter, { borderColor: progress > 0.8 ? colors.error : colors.accent }]}>
                <View style={styles.ringInner}>
                  <Text style={styles.ringPercent}>{Math.min(progress * 100, 100).toFixed(0)}%</Text>
                  <Text style={styles.ringLabel}>已使用</Text>
                </View>
              </View>
            </View>
            
            {/* 预算数字 */}
            <View style={styles.budgetNumbers}>
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
                    dense
                  />
                  <View style={styles.editActions}>
                    <Button onPress={() => setIsEditing(false)} compact>取消</Button>
                    <Button mode="contained" onPress={handleSaveBudget} compact>保存</Button>
                  </View>
                </View>
              ) : (
                <>
                  <View style={styles.budgetRow}>
                    <Text style={styles.budgetLabel}>月预算</Text>
                    <Text style={styles.budgetAmount}>¥{monthlyBudget.toFixed(0)}</Text>
                  </View>
                  <View style={styles.budgetRow}>
                    <Text style={styles.budgetLabel}>已消费</Text>
                    <Text style={[styles.budgetAmount, {color: colors.error}]}>¥{consumed.toFixed(0)}</Text>
                  </View>
                  <View style={styles.budgetRow}>
                    <Text style={styles.budgetLabel}>剩余</Text>
                    <Text style={[styles.budgetAmount, {color: colors.accent}]}>¥{remainingBudget.toFixed(0)}</Text>
                  </View>
                  <Text style={styles.daysLeft}>剩余 {remainingDays} 天</Text>
                  <Button mode="text" onPress={startEditing} compact style={styles.editButton}>修改预算</Button>
                </>
              )}
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* 每日预算分配 */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>今日预算分配</Text>
          <View style={styles.dailyBudgetHeader}>
            <Text style={styles.dailyBudgetLabel}>今日可用</Text>
            <Text style={styles.dailyBudgetAmount}>¥{dailyBudget.toFixed(1)}</Text>
          </View>

          {/* 三餐占比条 */}
          <View style={styles.ratioBar}>
            <View style={[styles.ratioSegment, { flex: preferences.mealBudgetRatio.breakfast, backgroundColor: '#FF9500' }]} />
            <View style={[styles.ratioSegment, { flex: preferences.mealBudgetRatio.lunch, backgroundColor: colors.accent }]} />
            <View style={[styles.ratioSegment, { flex: preferences.mealBudgetRatio.dinner, backgroundColor: '#5856D6' }]} />
          </View>

          <View style={styles.mealBudgetRow}>
            <View style={styles.mealBudgetItem}>
              <View style={[styles.mealDot, { backgroundColor: '#FF9500' }]} />
              <Text style={styles.mealLabel}>早餐</Text>
              <Text style={styles.mealBudget}>¥{breakfastBudget.toFixed(0)}</Text>
            </View>
            <View style={styles.mealBudgetItem}>
              <View style={[styles.mealDot, { backgroundColor: colors.accent }]} />
              <Text style={styles.mealLabel}>午餐</Text>
              <Text style={styles.mealBudget}>¥{lunchBudget.toFixed(0)}</Text>
            </View>
            <View style={styles.mealBudgetItem}>
              <View style={[styles.mealDot, { backgroundColor: '#5856D6' }]} />
              <Text style={styles.mealLabel}>晚餐</Text>
              <Text style={styles.mealBudget}>¥{dinnerBudget.toFixed(0)}</Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* 近7天消费柱状图 */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>近 7 天消费趋势</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>¥{stats.totalSpent.toFixed(0)}</Text>
              <Text style={styles.statLabel}>总消费</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>¥{stats.avgDaily.toFixed(0)}</Text>
              <Text style={styles.statLabel}>日均</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.count}</Text>
              <Text style={styles.statLabel}>记录数</Text>
            </View>
          </View>

          {/* 柱状图 */}
          <View style={styles.chartContainer}>
            {/* 柱状图区域（预算线与柱状图共享同一坐标系） */}
            <View style={styles.chartArea}>
              {/* 预算参考线 */}
              <View style={[styles.budgetLine, { bottom: `${(dailyBudget / maxDailySpend) * 100}%` }]}>
                <Text style={styles.budgetLineLabel}>日预算 ¥{dailyBudget.toFixed(0)}</Text>
              </View>

              {dailyChartData.map((day, i) => (
                <View key={i} style={styles.barColumn}>
                  {day.total > 0 ? (
                    <View style={[styles.bar, { height: `${(day.total / maxDailySpend) * 100}%` }]}>
                      {day.dinner > 0 && <View style={[styles.barSegment, { flex: day.dinner, backgroundColor: '#5856D6' }]} />}
                      {day.lunch > 0 && <View style={[styles.barSegment, { flex: day.lunch, backgroundColor: colors.accent }]} />}
                      {day.breakfast > 0 && <View style={[styles.barSegment, { flex: day.breakfast, backgroundColor: '#FF9500' }]} />}
                    </View>
                  ) : (
                    <View style={styles.barEmpty} />
                  )}
                </View>
              ))}
            </View>

            {/* 标签行（独立于柱状图区域） */}
            <View style={styles.chartLabelsRow}>
              {dailyChartData.map((day, i) => (
                <View key={i} style={styles.chartLabelGroup}>
                  <Text style={[styles.barLabel, i === 6 && styles.barLabelToday]}>{day.label}</Text>
                  {day.total > 0 && <Text style={styles.barValue}>¥{day.total.toFixed(0)}</Text>}
                </View>
              ))}
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* 消费记录 */}
      <Card style={styles.card}>
        <Card.Title title="近期消费记录" />
        <Card.Content>
          {consumptionRecords.length === 0 ? (
            <View style={styles.emptyRecordContainer}>
              <Text style={styles.emptyRecordIcon}>📋</Text>
              <Text style={styles.emptyText}>暂无消费记录</Text>
              <Text style={styles.emptyHint}>确认用餐后消费记录会自动出现在这里</Text>
            </View>
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

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  card: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    elevation: 0,
    shadowOpacity: 0,
  },
  sectionTitle: {
    ...typography.headline,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  // 月度预算 - 环形布局
  budgetOverview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
  },
  ringContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringOuter: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surfaceSecondary,
  },
  ringInner: {
    alignItems: 'center',
  },
  ringPercent: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text.primary,
    letterSpacing: -0.5,
  },
  ringLabel: {
    ...typography.caption2,
    color: colors.text.tertiary,
  },
  budgetNumbers: {
    flex: 1,
  },
  budgetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  budgetLabel: {
    ...typography.subhead,
    color: colors.text.secondary,
  },
  budgetAmount: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    letterSpacing: -0.3,
  },
  daysLeft: {
    ...typography.caption1,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
  },
  editContainer: {
    gap: spacing.sm,
  },
  input: {
    backgroundColor: colors.surface,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  editButton: {
    marginTop: spacing.xs,
    alignSelf: 'flex-start',
  },
  dailyBudgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  dailyBudgetLabel: {
    ...typography.subhead,
    color: colors.text.secondary,
  },
  dailyBudgetAmount: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.accent,
    letterSpacing: -0.5,
  },
  // 占比条
  ratioBar: {
    flexDirection: 'row',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  ratioSegment: {
    height: '100%',
  },
  mealBudgetRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  mealBudgetItem: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  mealDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  mealLabel: {
    ...typography.caption1,
    color: colors.text.secondary,
  },
  mealBudget: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    letterSpacing: -0.3,
  },
  // 统计数字
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text.primary,
    letterSpacing: -0.3,
  },
  statLabel: {
    ...typography.caption1,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
  },
  // 柱状图
  chartContainer: {
  },
  chartArea: {
    height: 100,
    flexDirection: 'row',
    alignItems: 'flex-end',
    position: 'relative',
    gap: spacing.xs,
  },
  budgetLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderTopColor: colors.accent,
    borderStyle: 'dashed',
    zIndex: 1,
  },
  budgetLineLabel: {
    ...typography.caption2,
    color: colors.accent,
    position: 'absolute',
    right: 0,
    top: -14,
  },
  barColumn: {
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bar: {
    width: '70%',
    borderRadius: 4,
    overflow: 'hidden',
    minHeight: 4,
  },
  barSegment: {
    width: '100%',
  },
  barEmpty: {
    width: '70%',
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.surfaceSecondary,
  },
  chartLabelsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: 4,
  },
  chartLabelGroup: {
    flex: 1,
    alignItems: 'center',
  },
  barLabel: {
    ...typography.caption2,
    color: colors.text.tertiary,
  },
  barLabelToday: {
    color: colors.accent,
    fontWeight: '600',
  },
  barValue: {
    fontSize: 9,
    color: colors.text.tertiary,
  },
  // 空状态
  emptyRecordContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyRecordIcon: {
    fontSize: 32,
    marginBottom: spacing.sm,
  },
  emptyText: {
    ...typography.subhead,
    color: colors.text.tertiary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  emptyHint: {
    ...typography.caption1,
    color: colors.text.tertiary,
    textAlign: 'center',
  },
  recordAmount: {
    ...typography.headline,
    color: colors.accent,
    alignSelf: 'center',
  },
  bottomPadding: {
    height: spacing.xl,
  },
});

export default BudgetScreen;
