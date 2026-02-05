import {
  Dish,
  UserPreference,
  DailyMealPlan,
  MealRecommendation,
  MealOption,
  ApiConfig,
  RecommendationRequest,
  MealType,
  DishCategory,
  ParsedDish,
  ImageRecognitionResult,
  DISH_CATEGORY_LABELS,
  NUTRITION_TAG_LABELS,
  MEAL_TYPE_LABELS,
} from '../types';
import {API_PROVIDERS} from '../stores/apiConfigStore';

// 视觉模型 API 地址
const QWEN_VL_API_URL = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation';

// 构建菜品列表文本
function formatDishList(dishes: Dish[]): string {
  const grouped: Record<string, Dish[]> = {};
  
  dishes.forEach(dish => {
    const category = DISH_CATEGORY_LABELS[dish.category] || dish.category;
    if (!grouped[category]) {
      grouped[category] = [];
    }
    grouped[category].push(dish);
  });

  let result = '';
  Object.entries(grouped).forEach(([category, categoryDishes]) => {
    result += `\n【${category}】\n`;
    categoryDishes.forEach(dish => {
      const tags = dish.nutritionTags.map(t => NUTRITION_TAG_LABELS[t]).join('、');
      result += `- ${dish.name}: ¥${dish.price}${tags ? ` (${tags})` : ''}\n`;
    });
  });

  return result;
}

// 构建偏好描述
function formatPreferences(prefs: UserPreference): string {
  const parts: string[] = [];
  
  if (prefs.spicyLevel !== 'none') {
    const levels = {mild: '微辣', medium: '中辣', hot: '重辣'};
    parts.push(`口味偏好：${levels[prefs.spicyLevel] || '不限'}`);
  } else {
    parts.push('口味偏好：不吃辣');
  }
  
  if (prefs.dietGoal !== 'none') {
    const goals = {lose_weight: '减脂', gain_muscle: '增肌', maintain: '维持体重'};
    parts.push(`饮食目标：${goals[prefs.dietGoal]}`);
  }
  
  if (prefs.isVegetarian) {
    parts.push('素食主义者');
  }
  
  if (prefs.isHalal) {
    parts.push('清真饮食');
  }
  
  if (prefs.excludedFoods.length > 0) {
    parts.push(`禁忌食物：${prefs.excludedFoods.join('、')}`);
  }

  return parts.join('\n');
}

// 构建 AI Prompt
function buildPrompt(request: RecommendationRequest): string {
  const {dailyBudget, availableDishes, preferences, recentDishes, date} = request;
  
  // 计算各餐预算
  const breakfastBudget = Math.floor(dailyBudget * preferences.mealBudgetRatio.breakfast * 100) / 100;
  const lunchBudget = Math.floor(dailyBudget * preferences.mealBudgetRatio.lunch * 100) / 100;
  const dinnerBudget = Math.floor(dailyBudget * preferences.mealBudgetRatio.dinner * 100) / 100;

  return `你是一个智能饮食规划助手，请根据以下信息为用户规划 ${date} 的三餐。

【预算约束】
- 今日总预算：¥${dailyBudget}
- 建议分配：早餐 ¥${breakfastBudget}，午餐 ¥${lunchBudget}，晚餐 ¥${dinnerBudget}
- 重要：每餐总价必须在建议预算范围内

【可选菜品】
${formatDishList(availableDishes)}

【用户偏好】
${formatPreferences(preferences)}

【近期已吃（请尽量避免重复）】
${recentDishes.length > 0 ? recentDishes.join('、') : '无'}

【输出要求】
请严格按照以下JSON格式输出，不要输出其他内容：

{
  "breakfast": {
    "options": [
      {"id": "A", "dishes": ["菜品名1", "菜品名2"], "totalPrice": 5.5},
      {"id": "B", "dishes": ["菜品名3"], "totalPrice": 4.0},
      {"id": "C", "dishes": ["菜品名4", "菜品名5"], "totalPrice": 6.0}
    ]
  },
  "lunch": {
    "options": [
      {"id": "A", "dishes": ["菜品名"], "totalPrice": 12.0},
      {"id": "B", "dishes": ["菜品名"], "totalPrice": 10.0},
      {"id": "C", "dishes": ["菜品名"], "totalPrice": 11.0}
    ]
  },
  "dinner": {
    "options": [
      {"id": "A", "dishes": ["菜品名"], "totalPrice": 10.0},
      {"id": "B", "dishes": ["菜品名"], "totalPrice": 9.0},
      {"id": "C", "dishes": ["菜品名"], "totalPrice": 8.0}
    ]
  },
  "nutritionSummary": "今日营养建议：蛋白质充足，建议多吃蔬菜补充膳食纤维"
}

要求：
1. 每餐提供3个选项(A/B/C)，价格从高到低排列
2. 菜品名必须从可选菜品列表中选择
3. 每餐搭配要合理（主食+菜品+可选汤/饮品）
4. 尽量做到营养均衡、口味多样
5. 避免连续推荐相同菜品`;
}

// 解析 AI 响应
function parseAIResponse(
  responseText: string,
  availableDishes: Dish[],
  dailyBudget: number,
  preferences: UserPreference,
  date: string
): DailyMealPlan | null {
  try {
    // 尝试从响应中提取 JSON
    let jsonStr = responseText;
    
    // 如果响应包含 markdown 代码块，提取其中的 JSON
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }
    
    // 尝试直接解析
    const parsed = JSON.parse(jsonStr);
    
    // 创建菜品名称到菜品对象的映射
    const dishMap = new Map<string, Dish>();
    availableDishes.forEach(dish => {
      dishMap.set(dish.name, dish);
    });

    // 转换各餐推荐
    const convertMeal = (mealData: any, mealType: MealType): MealRecommendation => {
      const budgetRatio = preferences.mealBudgetRatio[mealType];
      const suggestedBudget = Math.floor(dailyBudget * budgetRatio * 100) / 100;
      
      const options: MealOption[] = (mealData.options || []).map((opt: any) => {
        const dishes: Dish[] = [];
        let totalPrice = 0;
        
        (opt.dishes || []).forEach((dishName: string) => {
          const dish = dishMap.get(dishName);
          if (dish) {
            dishes.push(dish);
            totalPrice += dish.price;
          }
        });
        
        return {
          optionId: opt.id as 'A' | 'B' | 'C',
          dishes,
          totalPrice: opt.totalPrice || totalPrice,
        };
      });

      return {
        mealType,
        suggestedBudget,
        options,
      };
    };

    const breakfast = convertMeal(parsed.breakfast, 'breakfast');
    const lunch = convertMeal(parsed.lunch, 'lunch');
    const dinner = convertMeal(parsed.dinner, 'dinner');

    // 计算总花费（使用每餐第一个选项）
    const totalCost = 
      (breakfast.options[0]?.totalPrice || 0) +
      (lunch.options[0]?.totalPrice || 0) +
      (dinner.options[0]?.totalPrice || 0);

    return {
      date,
      dailyBudget,
      breakfast,
      lunch,
      dinner,
      totalCost,
      nutritionSummary: parsed.nutritionSummary || '营养均衡，请合理搭配',
      createdAt: Date.now(),
    };
  } catch (error) {
    console.error('Error parsing AI response:', error);
    console.error('Response text:', responseText);
    return null;
  }
}

// 调用通义千问原生 API
async function callQwenAPI(prompt: string, config: ApiConfig): Promise<string> {
  const response = await fetch(config.baseUrl || API_PROVIDERS.qwen.baseUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model || 'qwen-turbo',
      input: {
        messages: [
          {
            role: 'system',
            content: '你是一个专业的饮食规划助手，擅长根据预算和偏好推荐合理的餐食搭配。请严格按照用户要求的JSON格式输出。'
          },
          {role: 'user', content: prompt}
        ]
      },
      parameters: {
        temperature: 0.7,
        max_tokens: 2000,
      }
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API 请求失败: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.output?.text || data.output?.choices?.[0]?.message?.content || '';
}

// 调用 OpenAI 兼容 API
async function callOpenAICompatibleAPI(prompt: string, config: ApiConfig): Promise<string> {
  const baseUrl = config.baseUrl || API_PROVIDERS.tongyi.baseUrl;
  
  const response = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model || 'qwen-turbo',
      messages: [
        {
          role: 'system',
          content: '你是一个专业的饮食规划助手，擅长根据预算和偏好推荐合理的餐食搭配。请严格按照用户要求的JSON格式输出。'
        },
        {role: 'user', content: prompt}
      ],
      temperature: 0.7,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API 请求失败: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

// 生成降级推荐（当预算不足时）
function generateDowngradedPlan(
  availableDishes: Dish[],
  dailyBudget: number,
  preferences: UserPreference,
  date: string
): DailyMealPlan {
  // 按价格排序
  const sortedDishes = [...availableDishes].sort((a, b) => a.price - b.price);
  
  // 过滤掉不符合偏好的菜品
  const filteredDishes = sortedDishes.filter(dish => {
    if (preferences.isVegetarian && dish.category === 'meat') return false;
    if (preferences.isHalal && !dish.nutritionTags.includes('halal')) return false;
    if (preferences.spicyLevel === 'none' && dish.nutritionTags.includes('spicy')) return false;
    if (preferences.excludedFoods.some(f => dish.name.includes(f))) return false;
    return true;
  });

  // 按分类分组
  const staples = filteredDishes.filter(d => d.category === 'staple');
  const mains = filteredDishes.filter(d => ['meat', 'vegetable'].includes(d.category));
  const others = filteredDishes.filter(d => ['soup', 'snack', 'drink'].includes(d.category));

  // 生成简单推荐
  const createMealOptions = (budget: number): MealOption[] => {
    const options: MealOption[] = [];
    
    // 选项 A: 主食 + 主菜
    if (staples.length > 0 && mains.length > 0) {
      const staple = staples[0];
      const main = mains.find(m => m.price + staple.price <= budget) || mains[0];
      options.push({
        optionId: 'A',
        dishes: [staple, main],
        totalPrice: staple.price + main.price,
      });
    }
    
    // 选项 B: 便宜组合
    if (staples.length > 0) {
      options.push({
        optionId: 'B',
        dishes: [staples[0]],
        totalPrice: staples[0].price,
      });
    }
    
    // 选项 C: 如果有其他选择
    if (others.length > 0 && staples.length > 0) {
      const staple = staples[0];
      const other = others[0];
      options.push({
        optionId: 'C',
        dishes: [staple, other],
        totalPrice: staple.price + other.price,
      });
    }

    return options.slice(0, 3);
  };

  const breakfastBudget = dailyBudget * preferences.mealBudgetRatio.breakfast;
  const lunchBudget = dailyBudget * preferences.mealBudgetRatio.lunch;
  const dinnerBudget = dailyBudget * preferences.mealBudgetRatio.dinner;

  return {
    date,
    dailyBudget,
    breakfast: {
      mealType: 'breakfast',
      suggestedBudget: breakfastBudget,
      options: createMealOptions(breakfastBudget),
    },
    lunch: {
      mealType: 'lunch',
      suggestedBudget: lunchBudget,
      options: createMealOptions(lunchBudget),
    },
    dinner: {
      mealType: 'dinner',
      suggestedBudget: dinnerBudget,
      options: createMealOptions(dinnerBudget),
    },
    totalCost: 0, // 需要重新计算
    nutritionSummary: '预算有限，建议选择经济实惠的搭配',
    createdAt: Date.now(),
  };
}

// 主要的推荐生成函数
export async function generateRecommendation(
  request: RecommendationRequest,
  config: ApiConfig
): Promise<{success: boolean; plan?: DailyMealPlan; error?: string}> {
  const {dailyBudget, availableDishes, preferences, date} = request;

  // 检查是否有可用菜品
  if (availableDishes.length === 0) {
    return {
      success: false,
      error: '没有可用的菜品，请先添加食堂菜单',
    };
  }

  // 检查 API 配置
  if (!config.apiKey) {
    return {
      success: false,
      error: '请先配置 API Key',
    };
  }

  try {
    // 构建 prompt
    const prompt = buildPrompt(request);
    
    // 调用 AI API
    let responseText: string;
    if (config.provider === 'qwen') {
      responseText = await callQwenAPI(prompt, config);
    } else {
      responseText = await callOpenAICompatibleAPI(prompt, config);
    }

    // 解析响应
    const plan = parseAIResponse(responseText, availableDishes, dailyBudget, preferences, date);
    
    if (plan) {
      return {success: true, plan};
    } else {
      // 解析失败，使用降级方案
      console.warn('AI response parsing failed, using fallback plan');
      const fallbackPlan = generateDowngradedPlan(availableDishes, dailyBudget, preferences, date);
      return {
        success: true,
        plan: fallbackPlan,
      };
    }
  } catch (error) {
    console.error('Error generating recommendation:', error);
    
    // API 调用失败，使用降级方案
    const fallbackPlan = generateDowngradedPlan(availableDishes, dailyBudget, preferences, date);
    return {
      success: true,
      plan: fallbackPlan,
      error: `AI 服务暂时不可用，已使用备用推荐方案: ${error instanceof Error ? error.message : '未知错误'}`,
    };
  }
}

// 刷新单餐推荐
export async function refreshMealRecommendation(
  currentPlan: DailyMealPlan,
  mealType: MealType,
  availableDishes: Dish[],
  preferences: UserPreference,
  config: ApiConfig
): Promise<{success: boolean; meal?: MealRecommendation; error?: string}> {
  const budgetRatio = preferences.mealBudgetRatio[mealType];
  const mealBudget = currentPlan.dailyBudget * budgetRatio;
  
  const prompt = `请为用户重新推荐今天的${MEAL_TYPE_LABELS[mealType]}，预算 ¥${mealBudget}。

可选菜品：
${formatDishList(availableDishes)}

用户偏好：
${formatPreferences(preferences)}

请输出JSON格式：
{
  "options": [
    {"id": "A", "dishes": ["菜品名"], "totalPrice": 10.0},
    {"id": "B", "dishes": ["菜品名"], "totalPrice": 8.0},
    {"id": "C", "dishes": ["菜品名"], "totalPrice": 6.0}
  ]
}`;

  try {
    let responseText: string;
    if (config.provider === 'qwen') {
      responseText = await callQwenAPI(prompt, config);
    } else {
      responseText = await callOpenAICompatibleAPI(prompt, config);
    }

    // 解析响应
    let jsonStr = responseText;
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }
    
    const parsed = JSON.parse(jsonStr);
    
    const dishMap = new Map<string, Dish>();
    availableDishes.forEach(dish => dishMap.set(dish.name, dish));

    const options: MealOption[] = (parsed.options || []).map((opt: any) => {
      const dishes: Dish[] = [];
      (opt.dishes || []).forEach((name: string) => {
        const dish = dishMap.get(name);
        if (dish) dishes.push(dish);
      });
      return {
        optionId: opt.id as 'A' | 'B' | 'C',
        dishes,
        totalPrice: opt.totalPrice,
      };
    });

    return {
      success: true,
      meal: {
        mealType,
        suggestedBudget: mealBudget,
        options,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `刷新推荐失败: ${error instanceof Error ? error.message : '未知错误'}`,
    };
  }
}

// ==================== 图片识别相关功能 ====================

// 生成临时 ID
const generateTempId = () => `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// 分类名称到 category 的映射
const CATEGORY_NAME_MAP: Record<string, DishCategory> = {
  '主食': 'staple',
  '荤菜': 'meat',
  '肉菜': 'meat',
  '素菜': 'vegetable',
  '蔬菜': 'vegetable',
  '汤类': 'soup',
  '汤': 'soup',
  '小吃': 'snack',
  '点心': 'snack',
  '饮品': 'drink',
  '饮料': 'drink',
  // 英文映射
  'staple': 'staple',
  'meat': 'meat',
  'vegetable': 'vegetable',
  'soup': 'soup',
  'snack': 'snack',
  'drink': 'drink',
};

// 解析分类字符串
function parseCategory(categoryStr: string): DishCategory {
  const normalized = categoryStr.trim().toLowerCase();
  
  // 先尝试精确匹配
  for (const [key, value] of Object.entries(CATEGORY_NAME_MAP)) {
    if (normalized === key.toLowerCase() || normalized.includes(key.toLowerCase())) {
      return value;
    }
  }
  
  // 默认分类
  return 'meat';
}

// 构建菜单识别 Prompt
function buildMenuRecognitionPrompt(): string {
  return `请仔细识别这张食堂/餐厅菜单照片中的所有菜品信息。

对于每个菜品，请提取：
1. 菜品名称（完整名称）
2. 价格（数字，单位为元）
3. 分类（从以下选项中选择：主食、荤菜、素菜、汤类、小吃、饮品）

注意事项：
- 如果菜品有多种规格/份量，请分别列出
- 如果看不清价格，请根据菜品类型估算合理价格
- 如果无法确定分类，根据菜品名称推断

请严格按照以下 JSON 格式输出，不要输出其他内容：

[
  {"name": "菜品名称", "price": 10.0, "category": "荤菜"},
  {"name": "菜品名称", "price": 5.0, "category": "素菜"}
]

如果图片中没有菜单内容或无法识别，请输出：
{"error": "无法识别菜单内容"}`;
}

// 调用 qwen-vl 视觉模型
async function callQwenVisionAPI(
  imageBase64: string,
  config: ApiConfig
): Promise<string> {
  const response = await fetch(QWEN_VL_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'qwen-vl-plus',
      input: {
        messages: [
          {
            role: 'user',
            content: [
              {
                image: `data:image/jpeg;base64,${imageBase64}`,
              },
              {
                text: buildMenuRecognitionPrompt(),
              },
            ],
          },
        ],
      },
      parameters: {
        max_tokens: 4000,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`视觉 API 请求失败: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  
  // 提取响应文本
  const output = data.output;
  if (output?.choices?.[0]?.message?.content) {
    // 多模态响应格式
    const content = output.choices[0].message.content;
    if (Array.isArray(content)) {
      // 找到文本内容
      const textContent = content.find((c: any) => c.text);
      return textContent?.text || '';
    }
    return content;
  }
  
  return output?.text || '';
}

// 解析视觉识别结果
function parseVisionResponse(responseText: string): ParsedDish[] {
  try {
    // 清理响应文本
    let jsonStr = responseText.trim();
    
    // 如果包含 markdown 代码块，提取其中的 JSON
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }
    
    // 尝试解析
    const parsed = JSON.parse(jsonStr);
    
    // 检查是否是错误响应
    if (parsed.error) {
      console.warn('Vision API returned error:', parsed.error);
      return [];
    }
    
    // 如果不是数组，尝试获取数组字段
    const dishArray = Array.isArray(parsed) ? parsed : parsed.dishes || parsed.items || [];
    
    // 转换为 ParsedDish 格式
    const dishes: ParsedDish[] = dishArray
      .filter((item: any) => item.name && typeof item.price !== 'undefined')
      .map((item: any) => ({
        id: generateTempId(),
        name: String(item.name).trim(),
        price: parseFloat(item.price) || 0,
        category: parseCategory(item.category || 'meat'),
        selected: true, // 默认选中
      }));
    
    return dishes;
  } catch (error) {
    console.error('Error parsing vision response:', error);
    console.error('Response text:', responseText);
    return [];
  }
}

/**
 * 从图片识别菜单内容
 * @param imageBase64 Base64 编码的图片（不包含 data:image 前缀）
 * @param config API 配置
 */
export async function recognizeMenuFromImage(
  imageBase64: string,
  config: ApiConfig
): Promise<ImageRecognitionResult> {
  // 检查 API 配置
  if (!config.apiKey) {
    return {
      success: false,
      error: '请先配置 API Key',
    };
  }

  try {
    // 调用视觉 API
    const responseText = await callQwenVisionAPI(imageBase64, config);
    
    if (!responseText) {
      return {
        success: false,
        error: '未能获取识别结果',
        rawResponse: '',
      };
    }

    // 解析响应
    const dishes = parseVisionResponse(responseText);
    
    if (dishes.length === 0) {
      return {
        success: false,
        error: '未能识别出菜品信息，请确保图片清晰且包含菜单内容',
        rawResponse: responseText,
      };
    }

    return {
      success: true,
      dishes,
      rawResponse: responseText,
    };
  } catch (error) {
    console.error('Error recognizing menu from image:', error);
    return {
      success: false,
      error: `识别失败: ${error instanceof Error ? error.message : '未知错误'}`,
    };
  }
}
