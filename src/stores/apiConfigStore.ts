import {create} from 'zustand';
import {ApiConfig} from '../types';
import * as db from '../services/dbService';

// API 提供商配置
export const API_PROVIDERS = {
  qwen: {
    name: '通义千问 (Qwen)',
    baseUrl: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
    defaultModel: 'qwen-turbo',
    models: ['qwen-turbo', 'qwen-plus', 'qwen-max'],
  },
  tongyi: {
    name: '通义千问 (兼容OpenAI)',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    defaultModel: 'qwen-turbo',
    models: ['qwen-turbo', 'qwen-plus', 'qwen-max'],
  },
  custom: {
    name: '自定义 API',
    baseUrl: '',
    defaultModel: '',
    models: [],
  },
};

interface ApiConfigState {
  config: ApiConfig;
  isLoading: boolean;
  error: string | null;
  isConfigured: boolean;

  // 加载/保存配置
  loadConfig: () => Promise<void>;
  saveConfig: (config: ApiConfig) => Promise<void>;
  
  // 测试连接
  testConnection: () => Promise<boolean>;
  
  // 清除错误
  clearError: () => void;
}

export const useApiConfigStore = create<ApiConfigState>((set, get) => ({
  config: {
    provider: 'qwen',
    apiKey: '',
    baseUrl: API_PROVIDERS.qwen.baseUrl,
    model: API_PROVIDERS.qwen.defaultModel,
  },
  isLoading: false,
  error: null,
  isConfigured: false,

  loadConfig: async () => {
    set({isLoading: true, error: null});
    try {
      const config = await db.getApiConfig();
      const isConfigured = !!config.apiKey;
      set({config, isConfigured, isLoading: false});
    } catch (error) {
      set({error: '加载 API 配置失败', isLoading: false});
      console.error('Error loading API config:', error);
    }
  },

  saveConfig: async (config: ApiConfig) => {
    set({isLoading: true, error: null});
    try {
      await db.saveApiConfig(config);
      const isConfigured = !!config.apiKey;
      set({config, isConfigured, isLoading: false});
    } catch (error) {
      set({error: '保存 API 配置失败', isLoading: false});
      console.error('Error saving API config:', error);
    }
  },

  testConnection: async () => {
    const {config} = get();
    if (!config.apiKey) {
      set({error: '请先配置 API Key'});
      return false;
    }

    set({isLoading: true, error: null});
    try {
      // 根据提供商选择测试方式
      if (config.provider === 'qwen') {
        // 通义千问原生 API
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
                {role: 'user', content: '你好'}
              ]
            }
          }),
        });

        if (!response.ok) {
          throw new Error(`API 请求失败: ${response.status}`);
        }

        set({isLoading: false});
        return true;
      } else if (config.provider === 'tongyi') {
        // OpenAI 兼容模式
        const response = await fetch(config.baseUrl || API_PROVIDERS.tongyi.baseUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: config.model || 'qwen-turbo',
            messages: [
              {role: 'user', content: '你好'}
            ],
            max_tokens: 10,
          }),
        });

        if (!response.ok) {
          throw new Error(`API 请求失败: ${response.status}`);
        }

        set({isLoading: false});
        return true;
      } else {
        // 自定义 API - 简单测试
        if (!config.baseUrl) {
          throw new Error('请配置 API 地址');
        }
        
        const response = await fetch(config.baseUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: config.model || 'gpt-3.5-turbo',
            messages: [
              {role: 'user', content: '你好'}
            ],
            max_tokens: 10,
          }),
        });

        if (!response.ok) {
          throw new Error(`API 请求失败: ${response.status}`);
        }

        set({isLoading: false});
        return true;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'API 连接测试失败';
      set({error: message, isLoading: false});
      console.error('Error testing API connection:', error);
      return false;
    }
  },

  clearError: () => set({error: null}),
}));
