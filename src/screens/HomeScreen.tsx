import React, {useEffect, useState, useCallback, useMemo} from 'react';
import {View, ScrollView, StyleSheet, RefreshControl, Alert, Vibration} from 'react-native';
import {Text, Snackbar, FAB} from 'react-native-paper';
import {useFocusEffect} from '@react-navigation/native';
import {MealCard} from '../components/MealCard';
import {BudgetProgress} from '../components/BudgetProgress';
import {MealDetailModal} from '../components/MealDetailModal';
import {AnimatedModal} from '../components/AnimatedModal';
import {PressableScale} from '../components/PressableScale';
import {useBudgetStore} from '../stores/budgetStore';
import {usePreferenceStore} from '../stores/preferenceStore';
import {useMenuStore} from '../stores/menuStore';
import {usePlanStore} from '../stores/planStore';
import {useApiConfigStore} from '../stores/apiConfigStore';
import {useFavoriteStore} from '../stores/favoriteStore';
import {generateRecommendation} from '../services/aiService';
import {MealOption, MealType, Dish, MEAL_TYPE_LABELS} from '../types';
import {typography, spacing, radius, ThemeColors} from '../theme';
import {useAppTheme} from '../context/ThemeContext';

// 已确认餐次的类型
interface ConfirmedMeals {
  breakfast?: { optionId: 'A' | 'B' | 'C'; cost: number };
  lunch?: { optionId: 'A' | 'B' | 'C'; cost: number };
  dinner?: { optionId: 'A' | 'B' | 'C'; cost: number };
}

export const HomeScreen: React.FC = () => {
  const [refreshing, setRefreshing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [confirmedMeals, setConfirmedMeals] = useState<ConfirmedMeals>({});
  const [pendingConfirm, setPendingConfirm] = useState<{
    mealType: MealType;
    option: MealOption;
  } | null>(null);
  const [showWeekHistory, setShowWeekHistory] = useState(false);
  const [detailModal, setDetailModal] = useState<{
    visible: boolean;
    mealType: MealType;
    option: MealOption;
  } | null>(null);

  const {settings, loadSettings, getDailyBudget, getRemainingBudget, getRemainingDays, addConsumption} = useBudgetStore();
  const {preferences, loadPreferences} = usePreferenceStore();
  const {dishes, loadDishes, getAvailableDishes} = useMenuStore();
  const {todayPlan, loadTodayPlan, savePlan, loadRecentPlans, getRecentDishNames, recordConsumption, consumptionRecords, loadConsumptionRecords} = usePlanStore();
  const {config, loadConfig, isConfigured} = useApiConfigStore();
  const {loadFavorites} = useFavoriteStore();
  const {colors} = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // 初始加载
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    await Promise.all([
      loadSettings(),
      loadPreferences(),
      loadDishes(),
      loadTodayPlan(),
      loadRecentPlans(),
      loadConfig(),
      loadFavorites(),
      loadConsumptionRecords(7),
    ]);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // 生成今日推荐
  const handleGeneratePlan = async () => {
    if (!isConfigured) {
      setSnackbarMessage('请先在设置中配置 API Key');
      setSnackbarVisible(true);
      return;
    }

    const availableDishes = getAvailableDishes();
    if (availableDishes.length === 0) {
      setSnackbarMessage('请先添加食堂菜单');
      setSnackbarVisible(true);
      return;
    }

    setGenerating(true);

    try {
      const dailyBudget = getDailyBudget(preferences);
      const recentDishes = getRecentDishNames();
      const today = new Date().toISOString().split('T')[0];

      const result = await generateRecommendation(
        {
          dailyBudget,
          availableDishes,
          preferences,
          recentDishes,
          date: today,
        },
        config
      );

      if (result.success && result.plan) {
        await savePlan(result.plan);
        if (result.error) {
          setSnackbarMessage(result.error);
          setSnackbarVisible(true);
        } else {
          setSnackbarMessage('推荐生成成功！');
          setSnackbarVisible(true);
        }
      } else {
        setSnackbarMessage(result.error || '生成推荐失败');
        setSnackbarVisible(true);
      }
    } catch (error) {
      setSnackbarMessage('生成推荐时出错');
      setSnackbarVisible(true);
      console.error('Error generating plan:', error);
    } finally {
      setGenerating(false);
    }
  };

  const handleSelectOption = (mealType: string, option: MealOption) => {
    // 记录用户选择（用于 UI 显示）
    console.log(`Selected ${mealType} option ${option.optionId}`);
  };

  // 显示详情弹窗
  const handleShowDetail = (mealType: MealType, option: MealOption) => {
    setDetailModal({ visible: true, mealType, option });
  };

  // 替换菜品
  const handleReplaceDish = (oldDishId: string, newDish: Dish) => {
    if (!detailModal || !todayPlan) return;

    const { mealType, option } = detailModal;
    
    // 创建新的选项，替换菜品
    const newDishes = option.dishes.map(d => 
      d.id === oldDishId ? newDish : d
    );
    const newTotalPrice = newDishes.reduce((sum, d) => sum + d.price, 0);
    const updatedOption: MealOption = {
      ...option,
      dishes: newDishes,
      totalPrice: newTotalPrice,
    };

    // 更新 todayPlan 中对应的选项
    const mealRec = todayPlan[mealType];
    const updatedOptions = mealRec.options.map(o => 
      o.optionId === option.optionId ? updatedOption : o
    );
    
    const updatedMealRec = {
      ...mealRec,
      options: updatedOptions,
    };

    const updatedPlan = {
      ...todayPlan,
      [mealType]: updatedMealRec,
    };

    // 保存更新后的计划
    savePlan(updatedPlan);

    // 更新弹窗中显示的选项
    setDetailModal({
      ...detailModal,
      option: updatedOption,
    });

    setSnackbarMessage(`已将「${option.dishes.find(d => d.id === oldDishId)?.name}」替换为「${newDish.name}」`);
    setSnackbarVisible(true);
  };

  // 从详情弹窗确认选择
  const handleDetailConfirm = () => {
    if (!detailModal) return;
    setDetailModal(null);
    handleConfirmMeal(detailModal.mealType, detailModal.option);
  };

  // 处理确认用餐
  const handleConfirmMeal = (mealType: MealType, option: MealOption) => {
    setPendingConfirm({ mealType, option });
  };

  // 确认用餐弹窗确认
  const confirmMealConsumption = async () => {
    if (!pendingConfirm) return;

    const { mealType, option } = pendingConfirm;
    
    try {
      // 记录消费到数据库
      await recordConsumption(
        mealType,
        option.dishes.map(d => d.id),
        option.totalPrice
      );
      
      // 更新预算消费
      await addConsumption(option.totalPrice);
      
      // 触觉反馈
      Vibration.vibrate(50);
      
      // 更新本地已确认状态
      setConfirmedMeals(prev => ({
        ...prev,
        [mealType]: {
          optionId: option.optionId,
          cost: option.totalPrice,
        },
      }));
      
      setSnackbarMessage(`已记录${mealType === 'breakfast' ? '早餐' : mealType === 'lunch' ? '午餐' : '晚餐'}消费 ¥${option.totalPrice.toFixed(0)}`);
      setSnackbarVisible(true);
    } catch (error) {
      setSnackbarMessage('记录消费失败，请重试');
      setSnackbarVisible(true);
      console.error('Error confirming meal:', error);
    } finally {
      setPendingConfirm(null);
    }
  };

  // 计算今日已花费
  const getTodaySpent = () => {
    let total = 0;
    if (confirmedMeals.breakfast) total += confirmedMeals.breakfast.cost;
    if (confirmedMeals.lunch) total += confirmedMeals.lunch.cost;
    if (confirmedMeals.dinner) total += confirmedMeals.dinner.cost;
    return total;
  };

  const dailyBudget = getDailyBudget(preferences);
  const remainingBudget = getRemainingBudget();
  const remainingDays = getRemainingDays();

  // 问候语
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 9) return '早上好';
    if (hour < 11) return '上午好';
    if (hour < 14) return '中午好';
    if (hour < 18) return '下午好';
    return '晚上好';
  };

  const getDateString = () => {
    const d = new Date();
    const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
    return `${d.getMonth() + 1}月${d.getDate()}日 周${weekDays[d.getDay()]}`;
  };

  const tips = [
    '均衡饮食，元气满满',
    '今天也要好好吃饭哦',
    '合理搭配，营养加倍',
    '吃好每一餐，开心每一天',
    '健康饮食，从今天开始',
  ];
  const todayTip = tips[new Date().getDate() % tips.length];

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* 问候语卡片 */}
        <View style={styles.greetingCard}>
          <Text style={styles.greetingText}>{getGreeting()} 👋</Text>
          <Text style={styles.greetingDate}>{getDateString()}</Text>
          <Text style={styles.greetingTip}>{todayTip}</Text>
        </View>

        {/* 预算概览 */}
        <BudgetProgress
          dailyBudget={dailyBudget}
          spent={getTodaySpent()}
          remaining={remainingBudget}
          remainingDays={remainingDays}
        />

        {/* 今日餐单 */}
        {generating ? (
          <View style={styles.skeletonContainer}>
            {[1, 2, 3].map(i => (
              <View key={i} style={styles.skeletonCard}>
                <View style={styles.skeletonHeader}>
                  <View style={styles.skeletonTitle} />
                  <View style={styles.skeletonBadge} />
                </View>
                <View style={styles.skeletonOptions}>
                  <View style={styles.skeletonOption} />
                  <View style={styles.skeletonOption} />
                  <View style={styles.skeletonOption} />
                </View>
                <View style={styles.skeletonButton} />
              </View>
            ))}
            <Text style={styles.loadingText}>AI 正在生成推荐...</Text>
          </View>
        ) : todayPlan ? (
          <>
            <Text style={styles.dateText}>
              {todayPlan.date} 推荐餐单
            </Text>
            
            <MealCard
              meal={todayPlan.breakfast}
              onSelectOption={(opt) => handleSelectOption('breakfast', opt)}
              onConfirmMeal={(opt) => handleConfirmMeal('breakfast', opt)}
              onShowDetail={(opt) => handleShowDetail('breakfast', opt)}
              isConfirmed={!!confirmedMeals.breakfast}
              confirmedOptionId={confirmedMeals.breakfast?.optionId}
            />
            
            <MealCard
              meal={todayPlan.lunch}
              onSelectOption={(opt) => handleSelectOption('lunch', opt)}
              onConfirmMeal={(opt) => handleConfirmMeal('lunch', opt)}
              onShowDetail={(opt) => handleShowDetail('lunch', opt)}
              isConfirmed={!!confirmedMeals.lunch}
              confirmedOptionId={confirmedMeals.lunch?.optionId}
            />
            
            <MealCard
              meal={todayPlan.dinner}
              onSelectOption={(opt) => handleSelectOption('dinner', opt)}
              onConfirmMeal={(opt) => handleConfirmMeal('dinner', opt)}
              onShowDetail={(opt) => handleShowDetail('dinner', opt)}
              isConfirmed={!!confirmedMeals.dinner}
              confirmedOptionId={confirmedMeals.dinner?.optionId}
            />

            {/* 营养建议 */}
            <View style={styles.nutritionCard}>
              <Text style={styles.nutritionTitle}>📊 今日营养建议</Text>
              <Text style={styles.nutritionText}>
                {todayPlan.nutritionSummary}
              </Text>
            </View>
          </>
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🍽️</Text>
            <Text style={styles.emptyText}>今日还没有生成推荐</Text>
            <Text style={styles.emptySubtext}>
              {dishes.length === 0
                ? '请先前往「菜单管理」添加食堂菜品'
                : !isConfigured
                ? '请先前往「设置」配置 API Key'
                : '点击下方按钮，让 AI 为你规划今日三餐'}
            </Text>
            {dishes.length > 0 && isConfigured && (
              <PressableScale onPress={handleGeneratePlan} style={styles.emptyButton}>
                <Text style={styles.emptyButtonText}>生成今日推荐</Text>
              </PressableScale>
            )}
          </View>
        )}

        {/* 本周用餐历史 */}
        <PressableScale
          onPress={() => setShowWeekHistory(!showWeekHistory)}
          style={styles.weekHistoryToggle}
        >
          <Text style={styles.weekHistoryToggleText}>
            📅 本周用餐记录 ({consumptionRecords.length} 条)
          </Text>
          <Text style={styles.weekHistoryArrow}>
            {showWeekHistory ? '收起' : '展开'}
          </Text>
        </PressableScale>

        {showWeekHistory && (
          <View style={styles.weekHistoryContainer}>
            {consumptionRecords.length === 0 ? (
              <View style={styles.weekHistoryEmpty}>
                <Text style={styles.weekHistoryEmptyText}>本周还没有用餐记录</Text>
              </View>
            ) : (
              consumptionRecords.slice(0, 21).map(record => (
                <View key={record.id} style={styles.weekHistoryItem}>
                  <View style={styles.weekHistoryLeft}>
                    <Text style={styles.weekHistoryMeal}>
                      {MEAL_TYPE_LABELS[record.mealType]}
                    </Text>
                    <Text style={styles.weekHistoryDate}>{record.date}</Text>
                  </View>
                  <Text style={styles.weekHistoryCost}>
                    ¥{record.actualCost.toFixed(0)}
                  </Text>
                </View>
              ))
            )}
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* 生成推荐按钮 */}
      <FAB
        icon={todayPlan ? 'refresh' : 'auto-fix'}
        label={todayPlan ? '重新生成' : '生成今日推荐'}
        style={styles.fab}
        onPress={handleGeneratePlan}
        loading={generating}
        disabled={generating}
      />

      {/* 确认用餐弹窗 - Apple 风格动画 */}
      <AnimatedModal
        visible={pendingConfirm !== null}
        onDismiss={() => setPendingConfirm(null)}
        contentContainerStyle={styles.confirmModal}
      >
        <Text style={styles.confirmTitle}>确认用餐</Text>
        <Text style={styles.confirmMessage}>
          确认已完成
          {pendingConfirm?.mealType === 'breakfast' ? '早餐' : 
           pendingConfirm?.mealType === 'lunch' ? '午餐' : '晚餐'}
          ？
        </Text>
        <View style={styles.confirmDetails}>
          <Text style={styles.confirmDishes}>
            {pendingConfirm?.option.dishes.map(d => d.name).join(' + ')}
          </Text>
          <Text style={styles.confirmPrice}>
            ¥{pendingConfirm?.option.totalPrice.toFixed(0)}
          </Text>
        </View>
        <Text style={styles.confirmHint}>
          确认后将从本月预算中扣除此金额
        </Text>
        <View style={styles.confirmActions}>
          <PressableScale 
            onPress={() => setPendingConfirm(null)} 
            style={styles.confirmButtonWrapper}
          >
            <View style={[styles.confirmButtonInner, styles.confirmButtonOutlined]}>
              <Text style={styles.confirmButtonTextOutlined}>取消</Text>
            </View>
          </PressableScale>
          <PressableScale 
            onPress={confirmMealConsumption} 
            style={styles.confirmButtonWrapper}
          >
            <View style={[styles.confirmButtonInner, styles.confirmButtonContained]}>
              <Text style={styles.confirmButtonTextContained}>确认</Text>
            </View>
          </PressableScale>
        </View>
      </AnimatedModal>

      {/* 菜品详情弹窗 */}
      {detailModal && (
        <MealDetailModal
          visible={detailModal.visible}
          onDismiss={() => setDetailModal(null)}
          mealType={detailModal.mealType}
          option={detailModal.option}
          availableDishes={getAvailableDishes()}
          onReplaceDish={handleReplaceDish}
          onConfirm={handleDetailConfirm}
        />
      )}

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={2000}
        style={styles.snackbar}
        wrapperStyle={styles.snackbarWrapper}
      >
        {snackbarMessage}
      </Snackbar>
    </View>
  );
};

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  greetingCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
  },
  greetingText: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
    letterSpacing: -0.3,
    marginBottom: spacing.xs,
  },
  greetingDate: {
    ...typography.subhead,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  greetingTip: {
    ...typography.footnote,
    color: colors.text.tertiary,
    fontStyle: 'italic',
  },
  dateText: {
    ...typography.footnote,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  // 骨架屏样式
  skeletonContainer: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  skeletonCard: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.lg,
    width: '100%',
    maxWidth: 500,
    alignSelf: 'center',
  },
  skeletonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  skeletonTitle: {
    width: 80,
    height: 20,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceSecondary,
  },
  skeletonBadge: {
    width: 60,
    height: 16,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceSecondary,
  },
  skeletonOptions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  skeletonOption: {
    flex: 1,
    height: 88,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSecondary,
  },
  skeletonButton: {
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSecondary,
  },
  loadingText: {
    marginTop: spacing.lg,
    ...typography.subhead,
    color: colors.text.secondary,
  },
  emptyContainer: {
    paddingVertical: spacing.xxxl * 2,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.lg,
  },
  emptyText: {
    ...typography.title3,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  emptySubtext: {
    ...typography.subhead,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  emptyButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  emptyButtonText: {
    ...typography.subhead,
    fontWeight: '600',
    color: colors.surface,
  },
  nutritionCard: {
    backgroundColor: colors.successSubtle,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
  },
  nutritionTitle: {
    ...typography.headline,
    color: colors.success,
    marginBottom: spacing.sm,
  },
  nutritionText: {
    ...typography.subhead,
    color: colors.success,
    lineHeight: 22,
  },
  // 本周历史
  weekHistoryToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
  },
  weekHistoryToggleText: {
    ...typography.subhead,
    color: colors.text.primary,
    fontWeight: '600',
  },
  weekHistoryArrow: {
    ...typography.caption1,
    color: colors.accent,
  },
  weekHistoryContainer: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  weekHistoryEmpty: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  weekHistoryEmptyText: {
    ...typography.footnote,
    color: colors.text.tertiary,
  },
  weekHistoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.separator,
  },
  weekHistoryLeft: {
    flex: 1,
  },
  weekHistoryMeal: {
    ...typography.subhead,
    color: colors.text.primary,
    fontWeight: '500',
  },
  weekHistoryDate: {
    ...typography.caption1,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  weekHistoryCost: {
    ...typography.headline,
    color: colors.accent,
  },
  bottomPadding: {
    height: 100,
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    backgroundColor: colors.accent,
    borderRadius: radius.xl,
  },
  confirmModal: {
    backgroundColor: colors.surface,
    padding: spacing.xl,
    borderRadius: radius.lg,
  },
  confirmTitle: {
    ...typography.title2,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  confirmMessage: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  confirmDetails: {
    backgroundColor: colors.surfaceSecondary,
    padding: spacing.lg,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  confirmDishes: {
    ...typography.headline,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  confirmPrice: {
    fontSize: 28,
    fontWeight: '600',
    color: colors.accent,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  confirmHint: {
    ...typography.caption1,
    color: colors.text.tertiary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  confirmButtonWrapper: {
    flex: 1,
  },
  confirmButtonInner: {
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonOutlined: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  confirmButtonContained: {
    backgroundColor: colors.accent,
  },
  confirmButtonTextOutlined: {
    ...typography.subhead,
    fontWeight: '600',
    color: colors.text.primary,
  },
  confirmButtonTextContained: {
    ...typography.subhead,
    fontWeight: '600',
    color: colors.surface,
  },
  snackbar: {
    marginBottom: spacing.lg,
  },
  snackbarWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    pointerEvents: 'box-none',
  },
});

export default HomeScreen;

