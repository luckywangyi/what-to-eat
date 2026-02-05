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
import {
  SpicyLevel,
  DietGoal,
  SPICY_LEVEL_LABELS,
  DIET_GOAL_LABELS,
} from '../types';

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

  useFocusEffect(
    useCallback(() => {
      loadPreferences();
      loadConfig();
    }, [])
  );

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
    const newValue = Math.max(0.1, Math.min(0.6, current[meal] + delta));
    
    // 计算差值并分配给其他餐次
    const diff = newValue - current[meal];
    const others = ['breakfast', 'lunch', 'dinner'].filter(m => m !== meal) as ('breakfast' | 'lunch' | 'dinner')[];
    
    const newRatio = {
      ...current,
      [meal]: newValue,
    };
    
    // 按比例调整其他餐次
    const otherTotal = others.reduce((sum, m) => sum + current[m], 0);
    others.forEach(m => {
      newRatio[m] = current[m] - (diff * current[m] / otherTotal);
    });
    
    await setMealBudgetRatio(newRatio);
  };

  return (
    <ScrollView style={styles.container}>
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

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
      >
        {snackbarMessage}
      </Snackbar>
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
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    marginTop: 8,
  },
  segmentedButtons: {
    marginBottom: 16,
  },
  input: {
    marginBottom: 12,
  },
  apiActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    marginBottom: 4,
  },
  divider: {
    marginVertical: 16,
  },
  addFoodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  foodInput: {
    flex: 1,
  },
  excludedFoodsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  excludedChip: {
    marginBottom: 4,
  },
  emptyText: {
    color: '#888',
    fontStyle: 'italic',
  },
  ratioRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  ratioLabel: {
    fontSize: 16,
    color: '#333',
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
  },
  bottomPadding: {
    height: 40,
  },
});

export default SettingsScreen;
