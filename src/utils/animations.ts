/**
 * Apple 风格动画配置工具库
 * 
 * 动画原则：
 * - 微妙、平静、自然（类似 Apple iOS）
 * - 短时长，无夸张动作
 * - 结合淡入淡出 + 轻微缩放或垂直移动
 * - 优先使用 ease-out 或高阻尼弹簧
 * - 无弹跳或 Material 风格动画
 */

import {Easing} from 'react-native-reanimated';

// ============================================
// Apple 风格 Spring 配置（高阻尼、无过冲）
// ============================================

export const appleSpring = {
  damping: 20,
  stiffness: 300,
  mass: 0.8,
};

// 更柔和的弹簧（用于更平静的动画）
export const appleSoftSpring = {
  damping: 25,
  stiffness: 200,
  mass: 1,
};

// 快速弹簧（用于触摸反馈）
export const appleQuickSpring = {
  damping: 18,
  stiffness: 400,
  mass: 0.6,
};

// ============================================
// Apple 风格 Timing 配置
// ============================================

// iOS 标准缓动曲线
export const appleEasing = Easing.bezier(0.25, 0.1, 0.25, 1);

// iOS ease-out 曲线
export const appleEaseOut = Easing.bezier(0, 0, 0.2, 1);

// iOS ease-in-out 曲线
export const appleEaseInOut = Easing.bezier(0.42, 0, 0.58, 1);

// 标准动画时长
export const appleTiming = {
  duration: 220,
  easing: appleEasing,
};

// 快速动画时长
export const appleQuickTiming = {
  duration: 150,
  easing: appleEaseOut,
};

// 慢速动画时长（用于页面过渡）
export const appleSlowTiming = {
  duration: 300,
  easing: appleEasing,
};

// ============================================
// 动画数值常量
// ============================================

// Modal 动画
export const modalAnimationValues = {
  initialScale: 0.96,
  finalScale: 1,
  initialTranslateY: 8,
  finalTranslateY: 0,
  backdropOpacity: 0.3,
};

// 按钮触摸反馈
export const pressAnimationValues = {
  pressedScale: 0.98,
  pressedOpacity: 0.9,
  normalScale: 1,
  normalOpacity: 1,
};

// Tab 图标动画
export const tabAnimationValues = {
  activeScale: 1.05,
  inactiveScale: 1,
};

// ============================================
// 动画时长常量（毫秒）
// ============================================

export const durations = {
  instant: 100,
  quick: 150,
  normal: 220,
  slow: 300,
  pageTransition: 250,
};
