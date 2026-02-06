import React, {useEffect, useState, useCallback} from 'react';
import {View, ScrollView, StyleSheet, RefreshControl} from 'react-native';
import {Text, Button, ActivityIndicator, Snackbar, FAB} from 'react-native-paper';
import {useFocusEffect} from '@react-navigation/native';
import {MealCard} from '../components/MealCard';
import {BudgetProgress} from '../components/BudgetProgress';
import {useBudgetStore} from '../stores/budgetStore';
import {usePreferenceStore} from '../stores/preferenceStore';
import {useMenuStore} from '../stores/menuStore';
import {usePlanStore} from '../stores/planStore';
import {useApiConfigStore} from '../stores/apiConfigStore';
import {generateRecommendation} from '../services/aiService';
import {MealOption} from '../types';

export const HomeScreen: React.FC = () => {
  const [refreshing, setRefreshing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarVisible, setSnackbarVisible] = useState(false);

  const {settings, loadSettings, getDailyBudget, getRemainingBudget, getRemainingDays} = useBudgetStore();
  const {preferences, loadPreferences} = usePreferenceStore();
  const {dishes, loadDishes, getAvailableDishes} = useMenuStore();
  const {todayPlan, loadTodayPlan, savePlan, loadRecentPlans, getRecentDishNames} = usePlanStore();
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
    // 可以记录用户选择
    console.log(`Selected ${mealType} option ${option.optionId}`);
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
          spent={todayPlan?.totalCost || 0}
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
            />
            
            <MealCard
              meal={todayPlan.lunch}
              onSelectOption={(opt) => handleSelectOption('lunch', opt)}
            />
            
            <MealCard
              meal={todayPlan.dinner}
              onSelectOption={(opt) => handleSelectOption('dinner', opt)}
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

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
      >
        {snackbarMessage}
      </Snackbar>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  dateText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  nutritionCard: {
    backgroundColor: '#E8F5E9',
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  nutritionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2E7D32',
    marginBottom: 8,
  },
  nutritionText: {
    fontSize: 14,
    color: '#388E3C',
    lineHeight: 20,
  },
  bottomPadding: {
    height: 80,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
});

export default HomeScreen;
