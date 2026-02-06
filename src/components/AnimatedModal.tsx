/**
 * AnimatedModal - Apple 风格模态弹窗组件
 * 
 * 入场动画：
 * - 淡入 (opacity: 0 → 1)
 * - 缩放 (scale: 0.96 → 1.0)
 * - 轻微上移 (translateY: 8 → 0)
 * 
 * 出场动画：
 * - 淡出
 * - 缩小
 * 
 * 背景：
 * - 低透明度遮罩 (opacity: 0.3)
 * - 无重度模糊或深色覆盖
 */

import React, {useEffect} from 'react';
import {
  StyleSheet,
  Pressable,
  Dimensions,
  StyleProp,
  ViewStyle,
} from 'react-native';
import {Portal} from 'react-native-paper';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
  interpolate,
} from 'react-native-reanimated';
import {
  appleTiming,
  appleSpring,
  modalAnimationValues,
} from '../utils/animations';

const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} = Dimensions.get('window');

interface AnimatedModalProps {
  visible: boolean;
  onDismiss: () => void;
  children: React.ReactNode;
  /** 内容容器样式 */
  contentContainerStyle?: StyleProp<ViewStyle>;
  /** 是否允许点击背景关闭，默认 true */
  dismissable?: boolean;
}

export const AnimatedModal: React.FC<AnimatedModalProps> = ({
  visible,
  onDismiss,
  children,
  contentContainerStyle,
  dismissable = true,
}) => {
  const progress = useSharedValue(0);
  const isVisible = useSharedValue(false);

  useEffect(() => {
    if (visible) {
      isVisible.value = true;
      progress.value = withSpring(1, appleSpring);
    } else {
      progress.value = withTiming(0, appleTiming, (finished) => {
        if (finished) {
          runOnJS(setHidden)();
        }
      });
    }
  }, [visible]);

  const setHidden = () => {
    isVisible.value = false;
  };

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      {
        scale: interpolate(
          progress.value,
          [0, 1],
          [modalAnimationValues.initialScale, modalAnimationValues.finalScale]
        ),
      },
      {
        translateY: interpolate(
          progress.value,
          [0, 1],
          [modalAnimationValues.initialTranslateY, modalAnimationValues.finalTranslateY]
        ),
      },
    ],
  }));

  const handleBackdropPress = () => {
    if (dismissable) {
      onDismiss();
    }
  };

  // 不渲染不可见的 modal
  if (!visible && progress.value === 0) {
    return null;
  }

  return (
    <Portal>
      {/* 背景遮罩 */}
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        <Pressable style={styles.backdropPressable} onPress={handleBackdropPress} />
      </Animated.View>

      {/* 内容容器 */}
      <Animated.View style={styles.contentWrapper} pointerEvents="box-none">
        <Animated.View style={[styles.contentContainer, contentStyle]}>
          <Pressable onPress={() => {}}>
            <Animated.View style={[styles.content, contentContainerStyle]}>
              {children}
            </Animated.View>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Portal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  backdropPressable: {
    flex: 1,
  },
  contentWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    width: SCREEN_WIDTH - 40,
    maxHeight: SCREEN_HEIGHT * 0.85,
  },
  content: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
  },
});

export default AnimatedModal;
