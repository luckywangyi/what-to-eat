import React, {useState, useCallback, useMemo} from 'react';
import {View, ScrollView, StyleSheet, Alert, Share} from 'react-native';
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
import {typography, spacing, radius, themes, ThemeMode, ThemeColors} from '../theme';
import {useAppTheme} from '../context/ThemeContext';
import {PressableScale} from '../components/PressableScale';
import {AnimatedModal} from '../components/AnimatedModal';
import {exportAllData, importAllData} from '../services/dbService';

export const SettingsScreen: React.FC = () => {
  const theme = useTheme();
  const {colors} = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [newExcludedFood, setNewExcludedFood] = useState('');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [customUrlInput, setCustomUrlInput] = useState('');
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importText, setImportText] = useState('');
  const [isExporting, setIsExporting] = useState(false);

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

      {/* 数据备份与恢复 */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionLabel}>数据管理</Text>
          <Text style={styles.backupHint}>
            导出所有食堂、菜品和消费记录数据，或从备份文件恢复
          </Text>
          <View style={styles.backupActions}>
            <PressableScale 
              style={styles.backupButton}
              onPress={async () => {
                setIsExporting(true);
                try {
                  const data = await exportAllData();
                  await Share.share({
                    message: data,
                    title: '今天吃什么 - 数据备份',
                  });
                  setSnackbarMessage('数据导出成功');
                  setSnackbarVisible(true);
                } catch (error) {
                  console.error('Export error:', error);
                  setSnackbarMessage('导出失败');
                  setSnackbarVisible(true);
                } finally {
                  setIsExporting(false);
                }
              }}
              disabled={isExporting}
            >
              <Text style={styles.backupButtonText}>
                {isExporting ? '导出中...' : '📤 导出数据'}
              </Text>
            </PressableScale>
            <PressableScale 
              style={styles.restoreButton}
              onPress={() => {
                setImportText('');
                setImportModalVisible(true);
              }}
            >
              <Text style={styles.restoreButtonText}>📥 导入恢复</Text>
            </PressableScale>
          </View>
        </Card.Content>
      </Card>

      <View style={styles.bottomPadding} />
    </ScrollView>

    {/* 导入数据弹窗 */}
    <AnimatedModal
      visible={importModalVisible}
      onDismiss={() => setImportModalVisible(false)}
      contentContainerStyle={styles.importModal}
    >
      <Text style={styles.importTitle}>导入数据</Text>
      <Text style={styles.importHint}>粘贴之前导出的 JSON 备份数据</Text>
      <TextInput
        mode="outlined"
        multiline
        numberOfLines={6}
        value={importText}
        onChangeText={setImportText}
        placeholder='{"version":1, ...}'
        style={styles.importInput}
      />
      <View style={styles.importActions}>
        <PressableScale
          style={styles.importCancel}
          onPress={() => setImportModalVisible(false)}
        >
          <Text style={styles.importCancelText}>取消</Text>
        </PressableScale>
        <PressableScale
          style={styles.importConfirm}
          onPress={async () => {
            if (!importText.trim()) {
              setSnackbarMessage('请粘贴备份数据');
              setSnackbarVisible(true);
              return;
            }
            Alert.alert(
              '确认导入',
              '导入将覆盖现有的食堂和菜品数据，确定继续？',
              [
                {text: '取消', style: 'cancel'},
                {
                  text: '确认导入',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      const result = await importAllData(importText.trim());
                      setImportModalVisible(false);
                      setSnackbarMessage(`导入成功：${result.canteens} 个食堂，${result.dishes} 个菜品，${result.records} 条记录`);
                      setSnackbarVisible(true);
                    } catch (error: any) {
                      setSnackbarMessage(`导入失败：${error.message || '数据格式错误'}`);
                      setSnackbarVisible(true);
                    }
                  },
                },
              ]
            );
          }}
        >
          <Text style={styles.importConfirmText}>导入</Text>
        </PressableScale>
      </View>
    </AnimatedModal>

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

const createStyles = (colors: ThemeColors) => StyleSheet.create({
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
  // 数据备份
  backupHint: {
    ...typography.caption1,
    color: colors.text.tertiary,
    marginBottom: spacing.md,
    lineHeight: 18,
  },
  backupActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  backupButton: {
    flex: 1,
    backgroundColor: colors.accent,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  backupButtonText: {
    ...typography.subhead,
    fontWeight: '600',
    color: colors.surface,
  },
  restoreButton: {
    flex: 1,
    backgroundColor: colors.surfaceSecondary,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  restoreButtonText: {
    ...typography.subhead,
    fontWeight: '600',
    color: colors.text.primary,
  },
  // 导入弹窗
  importModal: {
    backgroundColor: colors.surface,
    padding: spacing.xl,
    borderRadius: radius.lg,
  },
  importTitle: {
    ...typography.title3,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  importHint: {
    ...typography.caption1,
    color: colors.text.tertiary,
    marginBottom: spacing.md,
  },
  importInput: {
    backgroundColor: colors.surface,
    maxHeight: 150,
    marginBottom: spacing.md,
    fontSize: 12,
  },
  importActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  importCancel: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  importCancelText: {
    ...typography.subhead,
    fontWeight: '600',
    color: colors.text.primary,
  },
  importConfirm: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    backgroundColor: colors.accent,
  },
  importConfirmText: {
    ...typography.subhead,
    fontWeight: '600',
    color: colors.surface,
  },
});

export default SettingsScreen;
