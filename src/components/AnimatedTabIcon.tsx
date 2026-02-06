/**
 * AnimatedTabIcon - Apple 风格 Tab 图标动画组件
 * 
 * 选中时轻微放大，过渡平滑自然
 */

import React, {useEffect} from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {appleSoftSpring, tabAnimationValues} from '../utils/animations';

interface AnimatedTabIconProps {
  name: string;
  size?: number;
  color: string;
  focused: boolean;
}

const AnimatedIcon = Animated.createAnimatedComponent(Icon);

export const AnimatedTabIcon: React.FC<AnimatedTabIconProps> = ({
  name,
  size = 24,
  color,
  focused,
}) => {
  const scale = useSharedValue(focused ? tabAnimationValues.activeScale : tabAnimationValues.inactiveScale);

  useEffect(() => {
    scale.value = withSpring(
      focused ? tabAnimationValues.activeScale : tabAnimationValues.inactiveScale,
      appleSoftSpring
    );
  }, [focused]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{scale: scale.value}],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Icon name={name} size={size} color={color} />
    </Animated.View>
  );
};

export default AnimatedTabIcon;
