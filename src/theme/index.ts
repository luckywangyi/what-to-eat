/**
 * Apple 风格设计系统
 * 低饱和度、平静、现代的视觉语言
 * 支持多主题切换
 */

// 主题类型定义
export type ThemeMode = 'light' | 'warm' | 'cool' | 'green';

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceSecondary: string;
  text: {
    primary: string;
    secondary: string;
    tertiary: string;
  };
  accent: string;
  accentSubtle: string;
  accentLight: string;
  border: string;
  separator: string;
  success: string;
  successSubtle: string;
  warning: string;
  warningSubtle: string;
  error: string;
  errorSubtle: string;
}

// 主题配置
export const themes: Record<ThemeMode, { name: string; colors: ThemeColors }> = {
  // 默认浅色主题
  light: {
    name: '经典白',
    colors: {
      background: '#F5F5F7',
      surface: '#FFFFFF',
      surfaceSecondary: '#F2F2F7',
      text: {
        primary: '#1C1C1E',
        secondary: '#8E8E93',
        tertiary: '#AEAEB2',
      },
      accent: '#007AFF',
      accentSubtle: 'rgba(0,122,255,0.08)',
      accentLight: 'rgba(0,122,255,0.15)',
      border: 'rgba(60,60,67,0.12)',
      separator: 'rgba(60,60,67,0.08)',
      success: '#34C759',
      successSubtle: 'rgba(52,199,89,0.12)',
      warning: '#FF9500',
      warningSubtle: 'rgba(255,149,0,0.12)',
      error: '#FF3B30',
      errorSubtle: 'rgba(255,59,48,0.12)',
    },
  },
  // 暖色主题
  warm: {
    name: '暖阳橙',
    colors: {
      background: '#FDF8F3',
      surface: '#FFFCF8',
      surfaceSecondary: '#F9F3EC',
      text: {
        primary: '#2C2420',
        secondary: '#8B7355',
        tertiary: '#B8A48C',
      },
      accent: '#E07020',
      accentSubtle: 'rgba(224,112,32,0.10)',
      accentLight: 'rgba(224,112,32,0.18)',
      border: 'rgba(139,115,85,0.15)',
      separator: 'rgba(139,115,85,0.08)',
      success: '#5D9A3E',
      successSubtle: 'rgba(93,154,62,0.12)',
      warning: '#E08820',
      warningSubtle: 'rgba(224,136,32,0.12)',
      error: '#D45A4A',
      errorSubtle: 'rgba(212,90,74,0.12)',
    },
  },
  // 冷色主题 - 明显蓝调
  cool: {
    name: '静谧蓝',
    colors: {
      background: '#E8EEF6',
      surface: '#F0F4FB',
      surfaceSecondary: '#DAE3F0',
      text: {
        primary: '#1B2640',
        secondary: '#506580',
        tertiary: '#8295AE',
      },
      accent: '#4068C8',
      accentSubtle: 'rgba(64,104,200,0.12)',
      accentLight: 'rgba(64,104,200,0.20)',
      border: 'rgba(60,85,120,0.18)',
      separator: 'rgba(60,85,120,0.10)',
      success: '#2A8A6A',
      successSubtle: 'rgba(42,138,106,0.14)',
      warning: '#C08A20',
      warningSubtle: 'rgba(192,138,32,0.14)',
      error: '#D04848',
      errorSubtle: 'rgba(208,72,72,0.14)',
    },
  },
  // 清新绿主题
  green: {
    name: '清新绿',
    colors: {
      background: '#F4F9F5',
      surface: '#FAFFFE',
      surfaceSecondary: '#EDF5EF',
      text: {
        primary: '#1A2A1C',
        secondary: '#5A7A5F',
        tertiary: '#8AAA90',
      },
      accent: '#2A9A50',
      accentSubtle: 'rgba(42,154,80,0.10)',
      accentLight: 'rgba(42,154,80,0.18)',
      border: 'rgba(90,122,95,0.15)',
      separator: 'rgba(90,122,95,0.08)',
      success: '#2A9A50',
      successSubtle: 'rgba(42,154,80,0.12)',
      warning: '#C0A030',
      warningSubtle: 'rgba(192,160,48,0.12)',
      error: '#D05545',
      errorSubtle: 'rgba(208,85,69,0.12)',
    },
  },
};

// 当前激活的颜色（默认使用 light）
export let colors: ThemeColors = themes.light.colors;

// 更新当前主题颜色
export const setThemeColors = (mode: ThemeMode) => {
  colors = themes[mode].colors;
};

// 排版系统 - SF Pro 风格
export const typography = {
  // 大标题
  largeTitle: {
    fontSize: 34,
    fontWeight: '700' as const,
    lineHeight: 41,
    letterSpacing: 0.37,
  },
  // 标题层级
  title1: {
    fontSize: 28,
    fontWeight: '700' as const,
    lineHeight: 34,
    letterSpacing: 0.36,
  },
  title2: {
    fontSize: 22,
    fontWeight: '700' as const,
    lineHeight: 28,
    letterSpacing: 0.35,
  },
  title3: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 25,
    letterSpacing: 0.38,
  },
  // 正文层级
  headline: {
    fontSize: 17,
    fontWeight: '600' as const,
    lineHeight: 22,
    letterSpacing: -0.41,
  },
  body: {
    fontSize: 17,
    fontWeight: '400' as const,
    lineHeight: 22,
    letterSpacing: -0.41,
  },
  callout: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 21,
    letterSpacing: -0.32,
  },
  subhead: {
    fontSize: 15,
    fontWeight: '400' as const,
    lineHeight: 20,
    letterSpacing: -0.24,
  },
  // 辅助文字
  footnote: {
    fontSize: 13,
    fontWeight: '400' as const,
    lineHeight: 18,
    letterSpacing: -0.08,
  },
  caption1: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
    letterSpacing: 0,
  },
  caption2: {
    fontSize: 11,
    fontWeight: '400' as const,
    lineHeight: 13,
    letterSpacing: 0.07,
  },
};

// 间距系统
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

// 圆角系统
export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};

// 阴影系统（极简使用）
export const shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  subtle: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
};

// 导出默认主题对象
export const theme = {
  colors,
  typography,
  spacing,
  radius,
  shadows,
};

export default theme;
