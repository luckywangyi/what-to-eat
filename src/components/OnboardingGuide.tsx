import React, {useState, useMemo} from 'react';
import {View, StyleSheet, Dimensions} from 'react-native';
import {Text} from 'react-native-paper';
import {PressableScale} from './PressableScale';
import {typography, spacing, radius, ThemeColors} from '../theme';
import {useAppTheme} from '../context/ThemeContext';

const {width: SCREEN_WIDTH} = Dimensions.get('window');

interface OnboardingStep {
  emoji: string;
  title: string;
  description: string;
}

const steps: OnboardingStep[] = [
  {
    emoji: '👋',
    title: '欢迎使用「今天吃什么」',
    description: '智能饮食规划助手，帮你合理安排每日三餐，让预算花得更值',
  },
  {
    emoji: '🏪',
    title: '添加食堂菜单',
    description: '在「菜单管理」中添加你常去的食堂和菜品，支持拍照 AI 识别快速录入',
  },
  {
    emoji: '💰',
    title: '设置月度预算',
    description: '在「预算管理」中设置每月伙食费，AI 会根据剩余预算智能分配每日用餐方案',
  },
  {
    emoji: '🤖',
    title: '配置 AI 并开始使用',
    description: '在「设置」中填写你的 AI API Key，然后回到首页一键生成每日推荐，开始愉快的用餐体验吧',
  },
];

interface OnboardingGuideProps {
  onComplete: () => void;
}

export const OnboardingGuide: React.FC<OnboardingGuideProps> = ({onComplete}) => {
  const {colors} = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [currentStep, setCurrentStep] = useState(0);
  const isLast = currentStep === steps.length - 1;

  const handleNext = () => {
    if (isLast) {
      onComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const step = steps[currentStep];

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.emoji}>{step.emoji}</Text>
        <Text style={styles.title}>{step.title}</Text>
        <Text style={styles.description}>{step.description}</Text>
      </View>

      {/* 步骤指示器 */}
      <View style={styles.dots}>
        {steps.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i === currentStep && styles.dotActive,
            ]}
          />
        ))}
      </View>

      {/* 操作按钮 */}
      <View style={styles.actions}>
        {!isLast && (
          <PressableScale onPress={handleSkip} style={styles.skipButton}>
            <Text style={styles.skipText}>跳过</Text>
          </PressableScale>
        )}
        <PressableScale onPress={handleNext} style={styles.nextButton}>
          <Text style={styles.nextText}>{isLast ? '开始使用' : '下一步'}</Text>
        </PressableScale>
      </View>
    </View>
  );
};

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl * 2,
  },
  content: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 64,
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    letterSpacing: -0.3,
  },
  description: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: SCREEN_WIDTH * 0.75,
  },
  dots: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xxxl,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  dotActive: {
    backgroundColor: colors.accent,
    width: 24,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingBottom: spacing.xxxl * 2,
    width: '100%',
  },
  skipButton: {
    flex: 1,
    paddingVertical: spacing.md + 2,
    borderRadius: radius.md,
    alignItems: 'center',
    backgroundColor: colors.surfaceSecondary,
  },
  skipText: {
    ...typography.subhead,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  nextButton: {
    flex: 2,
    paddingVertical: spacing.md + 2,
    borderRadius: radius.md,
    alignItems: 'center',
    backgroundColor: colors.accent,
  },
  nextText: {
    ...typography.subhead,
    fontWeight: '600',
    color: colors.surface,
  },
});

export default OnboardingGuide;
