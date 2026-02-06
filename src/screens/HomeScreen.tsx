import React, {useEffect, useState, useCallback} from 'react';
import {View, ScrollView, StyleSheet, RefreshControl, Alert} from 'react-native';
import {Text, Button, ActivityIndicator, Snackbar, FAB} from 'react-native-paper';
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
import {generateRecommendation} from '../services/aiService';
import {MealOption, MealType, Dish} from '../types';
import {colors, typography, spacing, radius} from '../theme';

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
  const [detailModal, setDetailModal] = useState<{
    visible: boolean;
    mealType: MealType;
    option: MealOption;
  } | null>(null);

  const {settings, loadSettings, getDailyBudget, getRemainingBudget, getRemainingDays, addConsumption} = useBudgetStore();
  const {preferences, loadPreferences} = usePreferenceStore();
  const {dishes, loadDishes, getAvailableDishes} = useMenuStore();
  const {todayPlan, loadTodayPlan, savePlan, loadRecentPlans, getRecentDishNames, recordConsumption} = usePlanStore();
  const {config, loadConfig, isConfigured} = useApiConfigStore();

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

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* 预算概览 */}
        <BudgetProgress
          dailyBudget={dailyBudget}
          spent={getTodaySpent()}
          remaining={remainingBudget}
          remainingDays={remainingDays}
        />

        {/* 今日餐单 */}
        {generating ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" />
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
            <Text style={styles.emptyText}>今日还没有生成推荐</Text>
            <Text style={styles.emptySubtext}>
              {dishes.length === 0
                ? '请先添加食堂菜单'
                : !isConfigured
                ? '请先配置 API Key'
                : '点击下方按钮生成今日推荐'}
            </Text>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  dateText: {
    ...typography.footnote,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  loadingContainer: {
    paddingVertical: spacing.xxxl * 2,
    alignItems: 'center',
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
