/**
 * PressableScale - Apple 风格触摸反馈组件
 * 
 * 交互效果：
 * - 按下：轻微缩小 (0.98) + 降低透明度
 * - 释放：平滑恢复
 * - 无 ripple 或波浪效果
 * 
 * 触感应柔和、自然，非玩乐风格
 */

import React from 'react';
import {Pressable, PressableProps, StyleProp, ViewStyle} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import {appleQuickSpring, pressAnimationValues} from '../utils/animations';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface PressableScaleProps extends Omit<PressableProps, 'style'> {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** 按下时的缩放比例，默认 0.98 */
  pressedScale?: number;
  /** 按下时的透明度，默认 0.9 */
  pressedOpacity?: number;
  /** 是否禁用动画效果 */
  disableAnimation?: boolean;
}

export const PressableScale: React.FC<PressableScaleProps> = ({
  children,
  style,
  pressedScale = pressAnimationValues.pressedScale,
  pressedOpacity = pressAnimationValues.pressedOpacity,
  disableAnimation = false,
  disabled,
  onPressIn,
  onPressOut,
  ...props
}) => {
  const pressed = useSharedValue(false);

  const animatedStyle = useAnimatedStyle(() => {
    if (disableAnimation || disabled) {
      return {};
    }

    return {
      transform: [
        {
          scale: withSpring(
            pressed.value ? pressedScale : pressAnimationValues.normalScale,
            appleQuickSpring
          ),
        },
      ],
      opacity: withSpring(
        pressed.value ? pressedOpacity : pressAnimationValues.normalOpacity,
        appleQuickSpring
      ),
    };
  });

  const handlePressIn = (event: any) => {
    pressed.value = true;
    onPressIn?.(event);
  };

  const handlePressOut = (event: any) => {
    pressed.value = false;
    onPressOut?.(event);
  };

  return (
    <AnimatedPressable
      style={[style, animatedStyle]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      {...props}
    >
      {children}
    </AnimatedPressable>
  );
};

export default PressableScale;
