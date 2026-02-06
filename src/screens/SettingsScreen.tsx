import React, {useState, useCallback} from 'react';
import {View, ScrollView, StyleSheet, Alert} from 'react-native';
import {
  Text,
  Card,
  TextInput,
  Button,
  Switch,
  Chip,
  Divider,
  List,
  SegmentedButtons,
  Snackbar,
  useTheme,
} from 'react-native-paper';
import {useFocusEffect} from '@react-navigation/native';
import {usePreferenceStore} from '../stores/preferenceStore';
import {useApiConfigStore, API_PROVIDERS} from '../stores/apiConfigStore';
import {useThemeStore} from '../stores/themeStore';
import {
  SpicyLevel,
  DietGoal,
  SPICY_LEVEL_LABELS,
  DIET_GOAL_LABELS,
} from '../types';
import {colors, typography, spacing, radius, themes, ThemeMode} from '../theme';
import {PressableScale} from '../components/PressableScale';

export const SettingsScreen: React.FC = () => {
  const theme = useTheme();
  const [newExcludedFood, setNewExcludedFood] = useState('');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [customUrlInput, setCustomUrlInput] = useState('');
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  const {
    preferences,
    loadPreferences,
    setSpicyLevel,
    setDietGoal,
    setVegetarian,
    setHalal,
    addExcludedFood,
    removeExcludedFood,
    setMealBudgetRatio,
  } = usePreferenceStore();

  const {
    config,
    loadConfig,
    saveConfig,
    testConnection,
    isConfigured,
  } = useApiConfigStore();

  const {currentTheme, setTheme, loadTheme} = useThemeStore();

  useFocusEffect(
    useCallback(() => {
      loadPreferences();
      loadConfig();
      loadTheme();
    }, [])
  );

  // 切换主题
  const handleThemeChange = async (mode: ThemeMode) => {
    await setTheme(mode);
    setSnackbarMessage(`已切换到「${themes[mode].name}」主题`);
    setSnackbarVisible(true);
  };

  // 同步 API Key 输入框
  React.useEffect(() => {
    setApiKeyInput(config.apiKey || '');
    setCustomUrlInput(config.baseUrl || '');
  }, [config]);

  // 添加禁忌食物
  const handleAddExcludedFood = async () => {
    if (!newExcludedFood.trim()) return;
    await addExcludedFood(newExcludedFood.trim());
    setNewExcludedFood('');
  };

  // 保存 API 配置
  const handleSaveApiConfig = async () => {
    await saveConfig({
      ...config,
      apiKey: apiKeyInput.trim(),
      baseUrl: config.provider === 'custom' ? customUrlInput.trim() : undefined,
    });
    setSnackbarMessage('API 配置已保存');
    setSnackbarVisible(true);
  };

  // 测试 API 连接
  const handleTestConnection = async () => {
    if (!apiKeyInput.trim()) {
      setSnackbarMessage('请先输入 API Key');
      setSnackbarVisible(true);
      return;
    }

    setIsTesting(true);
    
    // 先保存配置
    await saveConfig({
      ...config,
      apiKey: apiKeyInput.trim(),
      baseUrl: config.provider === 'custom' ? customUrlInput.trim() : undefined,
    });

    const success = await testConnection();
    
    setSnackbarMessage(success ? 'API 连接成功！' : 'API 连接失败，请检查配置');
    setSnackbarVisible(true);
    setIsTesting(false);
  };

  // 切换 API 提供商
  const handleProviderChange = async (provider: string) => {
    const providerConfig = API_PROVIDERS[provider as keyof typeof API_PROVIDERS];
    await saveConfig({
      ...config,
      provider: provider as 'qwen' | 'tongyi' | 'custom',
      baseUrl: providerConfig.baseUrl,
      model: providerConfig.defaultModel,
    });
  };

  // 调整餐次预算比例
  const handleRatioChange = async (meal: 'breakfast' | 'lunch' | 'dinner', delta: number) => {
    const current = preferences.mealBudgetRatio;
    // 允许设置为0，最大100%
    const newValue = Math.max(0, Math.min(1, current[meal] + delta));
    
    // 计算差值并分配给其他餐次
    const diff = newValue - current[meal];
    const others = ['breakfast', 'lunch', 'dinner'].filter(m => m !== meal) as ('breakfast' | 'lunch' | 'dinner')[];
    
    const newRatio = {
      ...current,
      [meal]: newValue,
    };
    
    // 按比例调整其他餐次
    const otherTotal = others.reduce((sum, m) => sum + current[m], 0);
    if (otherTotal > 0) {
      others.forEach(m => {
        newRatio[m] = Math.max(0, current[m] - (diff * current[m] / otherTotal));
      });
    } else {
      // 如果其他餐次都是0，平均分配差值
      others.forEach(m => {
        newRatio[m] = Math.max(0, -diff / others.length);
      });
    }
    
    await setMealBudgetRatio(newRatio);
  };

  return (
  <View style={styles.container}>
    <ScrollView style={styles.scrollView}>
      {/* 主题设置 */}
      <Card style={styles.card}>
        <Card.Title 
          title="主题设置" 
          subtitle={`当前：${themes[currentTheme].name}`}
        />
        <Card.Content>
          <View style={styles.themeGrid}>
            {(Object.keys(themes) as ThemeMode[]).map((mode) => (
              <PressableScale
                key={mode}
                onPress={() => handleThemeChange(mode)}
                style={[
                  styles.themeOption,
                  currentTheme === mode && styles.themeOptionSelected,
                ]}
              >
                <View 
                  style={[
                    styles.themePreview, 
                    {backgroundColor: themes[mode].colors.background}
                  ]}
                >
                  <View 
                    style={[
                      styles.themePreviewInner, 
                      {backgroundColor: themes[mode].colors.surface}
                    ]}
                  >
                    <View 
                      style={[
                        styles.themeAccent, 
                        {backgroundColor: themes[mode].colors.accent}
                      ]} 
                    />
                  </View>
                </View>
                <Text style={[
                  styles.themeName,
                  currentTheme === mode && styles.themeNameSelected,
                ]}>
                  {themes[mode].name}
                </Text>
              </PressableScale>
            ))}
          </View>
        </Card.Content>
      </Card>

      {/* API 配置 */}
      <Card style={styles.card}>
        <Card.Title 
          title="AI 服务配置" 
          subtitle={isConfigured ? '已配置' : '未配置'}
        />
        <Card.Content>
          <Text style={styles.sectionLabel}>选择服务商</Text>
          <SegmentedButtons
            value={config.provider}
            onValueChange={handleProviderChange}
            buttons={[
              {value: 'qwen', label: '通义千问'},
              {value: 'tongyi', label: 'OpenAI兼容'},
              {value: 'custom', label: '自定义'},
            ]}
            style={styles.segmentedButtons}
          />

          <TextInput
            label="API Key"
            value={apiKeyInput}
            onChangeText={setApiKeyInput}
            mode="outlined"
            secureTextEntry
            style={styles.input}
            right={<TextInput.Icon icon="eye" />}
          />

          {config.provider === 'custom' && (
            <TextInput
              label="API 地址"
              value={customUrlInput}
              onChangeText={setCustomUrlInput}
              mode="outlined"
              placeholder="https://api.example.com/v1/chat/completions"
              style={styles.input}
            />
          )}

          <View style={styles.apiActions}>
            <Button
              mode="outlined"
              onPress={handleTestConnection}
              loading={isTesting}
              disabled={isTesting}
            >
              测试连接
            </Button>
            <Button
              mode="contained"
              onPress={handleSaveApiConfig}
            >
              保存配置
            </Button>
          </View>
        </Card.Content>
      </Card>

      {/* 口味偏好 */}
      <Card style={styles.card}>
        <Card.Title title="口味偏好" />
        <Card.Content>
          <Text style={styles.sectionLabel}>辣度偏好</Text>
          <View style={styles.chipRow}>
            {(Object.keys(SPICY_LEVEL_LABELS) as SpicyLevel[]).map(level => (
              <Chip
                key={level}
                selected={preferences.spicyLevel === level}
                onPress={() => setSpicyLevel(level)}
                style={styles.chip}
              >
                {SPICY_LEVEL_LABELS[level]}
              </Chip>
            ))}
          </View>

          <Divider style={styles.divider} />

          <Text style={styles.sectionLabel}>饮食目标</Text>
          <View style={styles.chipRow}>
            {(Object.keys(DIET_GOAL_LABELS) as DietGoal[]).map(goal => (
              <Chip
                key={goal}
                selected={preferences.dietGoal === goal}
                onPress={() => setDietGoal(goal)}
                style={styles.chip}
              >
                {DIET_GOAL_LABELS[goal]}
              </Chip>
            ))}
          </View>

          <Divider style={styles.divider} />

          <List.Item
            title="素食主义"
            description="只推荐素食菜品"
            right={() => (
              <Switch
                value={preferences.isVegetarian}
                onValueChange={setVegetarian}
              />
            )}
          />

          <List.Item
            title="清真饮食"
            description="只推荐清真菜品"
            right={() => (
              <Switch
                value={preferences.isHalal}
                onValueChange={setHalal}
              />
            )}
          />
        </Card.Content>
      </Card>

      {/* 禁忌食物 */}
      <Card style={styles.card}>
        <Card.Title title="禁忌食物" subtitle="不吃的食材或菜品" />
        <Card.Content>
          <View style={styles.addFoodRow}>
            <TextInput
              label="添加禁忌食物"
              value={newExcludedFood}
              onChangeText={setNewExcludedFood}
              mode="outlined"
              style={styles.foodInput}
              placeholder="如：香菜、葱"
            />
            <Button
              mode="contained"
              onPress={handleAddExcludedFood}
              disabled={!newExcludedFood.trim()}
            >
              添加
            </Button>
          </View>

          <View style={styles.excludedFoodsContainer}>
            {preferences.excludedFoods.length === 0 ? (
              <Text style={styles.emptyText}>暂无禁忌食物</Text>
            ) : (
              preferences.excludedFoods.map(food => (
                <Chip
                  key={food}
                  onClose={() => removeExcludedFood(food)}
                  style={styles.excludedChip}
                >
                  {food}
                </Chip>
              ))
            )}
          </View>
        </Card.Content>
      </Card>

      {/* 餐次预算比例 */}
      <Card style={styles.card}>
        <Card.Title title="餐次预算分配" subtitle="调整各餐预算占比" />
        <Card.Content>
          <View style={styles.ratioRow}>
            <Text style={styles.ratioLabel}>早餐</Text>
            <View style={styles.ratioControls}>
              <Button
                mode="text"
                compact
                onPress={() => handleRatioChange('breakfast', -0.05)}
              >
                -
              </Button>
              <Text style={styles.ratioValue}>
                {(preferences.mealBudgetRatio.breakfast * 100).toFixed(0)}%
              </Text>
              <Button
                mode="text"
                compact
                onPress={() => handleRatioChange('breakfast', 0.05)}
              >
                +
              </Button>
            </View>
          </View>

          <View style={styles.ratioRow}>
            <Text style={styles.ratioLabel}>午餐</Text>
            <View style={styles.ratioControls}>
              <Button
                mode="text"
                compact
                onPress={() => handleRatioChange('lunch', -0.05)}
              >
                -
              </Button>
              <Text style={styles.ratioValue}>
                {(preferences.mealBudgetRatio.lunch * 100).toFixed(0)}%
              </Text>
              <Button
                mode="text"
                compact
                onPress={() => handleRatioChange('lunch', 0.05)}
              >
                +
              </Button>
            </View>
          </View>

          <View style={styles.ratioRow}>
            <Text style={styles.ratioLabel}>晚餐</Text>
            <View style={styles.ratioControls}>
              <Button
                mode="text"
                compact
                onPress={() => handleRatioChange('dinner', -0.05)}
              >
                -
              </Button>
              <Text style={styles.ratioValue}>
                {(preferences.mealBudgetRatio.dinner * 100).toFixed(0)}%
              </Text>
              <Button
                mode="text"
                compact
                onPress={() => handleRatioChange('dinner', 0.05)}
              >
                +
              </Button>
            </View>
          </View>
        </Card.Content>
      </Card>

      <View style={styles.bottomPadding} />
    </ScrollView>

    <Snackbar
      visible={snackbarVisible}
      onDismiss={() => setSnackbarVisible(false)}
      duration={3000}
      style={styles.snackbar}
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
  snackbar: {
    marginBottom: spacing.xl,
  },
  card: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    elevation: 0,
    shadowOpacity: 0,
  },
  sectionLabel: {
    ...typography.footnote,
    fontWeight: '600',
    color: colors.text.secondary,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  segmentedButtons: {
    marginBottom: spacing.lg,
  },
  input: {
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
  },
  apiActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    marginBottom: spacing.xs,
    backgroundColor: colors.surfaceSecondary,
  },
  divider: {
    marginVertical: spacing.lg,
    backgroundColor: colors.separator,
  },
  addFoodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  foodInput: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  excludedFoodsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  excludedChip: {
    marginBottom: spacing.xs,
    backgroundColor: colors.errorSubtle,
  },
  emptyText: {
    ...typography.subhead,
    color: colors.text.tertiary,
  },
  ratioRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  ratioLabel: {
    ...typography.body,
    color: colors.text.primary,
  },
  ratioControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratioValue: {
    fontSize: 18,
    fontWeight: '600',
    minWidth: 50,
    textAlign: 'center',
    color: colors.text.primary,
  },
  bottomPadding: {
    height: spacing.xxxl,
  },
  themeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  themeOption: {
    width: '47%',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  themeOptionSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSubtle,
  },
  themePreview: {
    width: 60,
    height: 40,
    borderRadius: radius.sm,
    padding: 4,
    marginBottom: spacing.sm,
  },
  themePreviewInner: {
    flex: 1,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  themeAccent: {
    width: 20,
    height: 6,
    borderRadius: 3,
  },
  themeName: {
    ...typography.caption1,
    color: colors.text.secondary,
  },
  themeNameSelected: {
    color: colors.accent,
    fontWeight: '600',
  },
});

export default SettingsScreen;
