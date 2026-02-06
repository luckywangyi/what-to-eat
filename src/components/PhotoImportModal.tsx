import React, {useState} from 'react';
import {View, StyleSheet, Image, Alert} from 'react-native';
import {
  Portal,
  Text,
  ActivityIndicator,
  SegmentedButtons,
  Snackbar,
} from 'react-native-paper';
import {ParsedDish, ApiConfig} from '../types';
import {takePhoto, pickImageFromGallery, estimateImageSize} from '../utils/image';
import {recognizeMenuFromImage} from '../services/aiService';
import {RecognizedDishList} from './RecognizedDishList';
import {AnimatedModal} from './AnimatedModal';
import {PressableScale} from './PressableScale';
import {colors, typography, spacing, radius} from '../theme';

type ImportMode = 'preview' | 'quick';
type Step = 'select' | 'recognizing' | 'preview';

interface PhotoImportModalProps {
  visible: boolean;
  onDismiss: () => void;
  onImport: (dishes: ParsedDish[]) => Promise<void>;
  apiConfig: ApiConfig;
}

export const PhotoImportModal: React.FC<PhotoImportModalProps> = ({
  visible,
  onDismiss,
  onImport,
  apiConfig,
}) => {
  const [step, setStep] = useState<Step>('select');
  const [importMode, setImportMode] = useState<ImportMode>('preview');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [recognizedDishes, setRecognizedDishes] = useState<ParsedDish[]>([]);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  // 重置状态
  const resetState = () => {
    setStep('select');
    setImageUri(null);
    setImageBase64(null);
    setRecognizedDishes([]);
    setIsRecognizing(false);
    setError(null);
  };

  // 关闭弹窗
  const handleDismiss = () => {
    resetState();
    onDismiss();
  };

  // 显示消息
  const showMessage = (message: string) => {
    setSnackbarMessage(message);
    setSnackbarVisible(true);
  };

  // 处理拍照
  const handleTakePhoto = async () => {
    try {
      const result = await takePhoto();
      if (result.success && result.base64) {
        processImage(result.base64, result.uri);
      } else if (result.error && result.error !== '用户取消') {
        showMessage(result.error);
      }
    } catch (error) {
      console.error('拍照失败:', error);
      showMessage('拍照失败，请检查相机权限');
    }
  };

  // 处理从相册选择
  const handlePickFromGallery = async () => {
    try {
      const result = await pickImageFromGallery();
      if (result.success && result.base64) {
        processImage(result.base64, result.uri);
      } else if (result.error && result.error !== '用户取消') {
        showMessage(result.error);
      }
    } catch (error) {
      console.error('选择图片失败:', error);
      showMessage('选择图片失败，请检查存储权限');
    }
  };

  // 处理图片
  const processImage = async (base64: string, uri?: string) => {
    try {
      // 检查图片大小
      const sizeMB = estimateImageSize(base64);
      if (sizeMB > 4) {
        showMessage(`图片过大 (${sizeMB.toFixed(1)}MB)，请选择较小的图片`);
        return;
      }

      setImageBase64(base64);
      setImageUri(uri || null);
      setStep('recognizing');
      setIsRecognizing(true);
      setError(null);

      // 调用识别 API
      const result = await recognizeMenuFromImage(base64, apiConfig);
      
      setIsRecognizing(false);

      if (result.success && result.dishes && result.dishes.length > 0) {
        setRecognizedDishes(result.dishes);
        
        if (importMode === 'quick') {
          // 快速模式：直接导入
          await handleQuickImport(result.dishes);
        } else {
          // 预览模式：显示结果列表
          setStep('preview');
        }
      } else {
        setError(result.error || '识别失败');
        setStep('select');
        showMessage(result.error || '未能识别菜单内容');
      }
    } catch (error) {
      console.error('处理图片失败:', error);
      setIsRecognizing(false);
      setStep('select');
      showMessage('处理图片时出错，请重试');
    }
  };

  // 快速导入
  const handleQuickImport = async (dishes: ParsedDish[]) => {
    try {
      await onImport(dishes);
      showMessage(`成功导入 ${dishes.length} 个菜品`);
      handleDismiss();
    } catch (err) {
      showMessage('导入失败，请重试');
      setStep('select');
    }
  };

  // 确认导入（预览模式）
  const handleConfirmImport = async (selectedDishes: ParsedDish[]) => {
    try {
      await onImport(selectedDishes);
      showMessage(`成功导入 ${selectedDishes.length} 个菜品`);
      handleDismiss();
    } catch (err) {
      showMessage('导入失败，请重试');
    }
  };

  // 返回选择步骤
  const handleBackToSelect = () => {
    setStep('select');
    setImageUri(null);
    setImageBase64(null);
    setRecognizedDishes([]);
  };

  // 渲染选择步骤
  const renderSelectStep = () => (
    <View style={styles.content}>
      <Text style={styles.title}>拍照导入菜单</Text>
      <Text style={styles.subtitle}>
        拍摄或选择食堂菜单照片，AI 将自动识别菜品信息
      </Text>

      {/* 导入模式选择 */}
      <Text style={styles.label}>导入模式</Text>
      <SegmentedButtons
        value={importMode}
        onValueChange={v => setImportMode(v as ImportMode)}
        buttons={[
          {value: 'preview', label: '预览后导入'},
          {value: 'quick', label: '快速导入'},
        ]}
        style={styles.modeSelector}
      />

      {importMode === 'preview' && (
        <Text style={styles.modeHint}>
          识别后可以编辑、删除不需要的菜品再导入
        </Text>
      )}
      {importMode === 'quick' && (
        <Text style={styles.modeHint}>
          识别后直接导入所有菜品，可在菜单页面再修改
        </Text>
      )}

      {/* 图片选择按钮 */}
      <View style={styles.buttonContainer}>
        <PressableScale
          onPress={handleTakePhoto}
          style={[styles.actionButton, styles.actionButtonContained]}
        >
          <Text style={styles.actionButtonTextContained}>拍照</Text>
        </PressableScale>
        <PressableScale
          onPress={handlePickFromGallery}
          style={[styles.actionButton, styles.actionButtonOutlined]}
        >
          <Text style={styles.actionButtonTextOutlined}>从相册选择</Text>
        </PressableScale>
      </View>

      {/* API 费用提示 */}
      <Text style={styles.feeHint}>
        注意：每次识别约消耗 0.01 元 API 费用
      </Text>

      {/* 取消按钮 */}
      <PressableScale onPress={handleDismiss} style={styles.cancelButton}>
        <Text style={styles.cancelButtonText}>取消</Text>
      </PressableScale>
    </View>
  );

  // 渲染识别中步骤
  const renderRecognizingStep = () => (
    <View style={styles.content}>
      <Text style={styles.title}>正在识别...</Text>
      
      {imageUri && (
        <Image source={{uri: imageUri}} style={styles.previewImage} />
      )}
      
      <ActivityIndicator size="large" style={styles.loader} />
      <Text style={styles.loadingText}>
        AI 正在识别菜单内容，请稍候...
      </Text>
      
      <PressableScale onPress={handleBackToSelect} style={styles.cancelButton}>
        <Text style={styles.cancelButtonText}>取消</Text>
      </PressableScale>
    </View>
  );

  // 渲染预览步骤
  const renderPreviewStep = () => (
    <View style={styles.previewContent}>
      <RecognizedDishList
        dishes={recognizedDishes}
        onDishesChange={setRecognizedDishes}
        onConfirm={handleConfirmImport}
        onCancel={handleBackToSelect}
      />
    </View>
  );

  return (
    <>
      <AnimatedModal
        visible={visible}
        onDismiss={handleDismiss}
        contentContainerStyle={[
          styles.modal,
          step === 'preview' && styles.modalFullHeight,
        ]}
      >
        {step === 'select' && renderSelectStep()}
        {step === 'recognizing' && renderRecognizingStep()}
        {step === 'preview' && renderPreviewStep()}
      </AnimatedModal>

      <Portal>
        <Snackbar
          visible={snackbarVisible}
          onDismiss={() => setSnackbarVisible(false)}
          duration={3000}
        >
          {snackbarMessage}
        </Snackbar>
      </Portal>
    </>
  );
};

const styles = StyleSheet.create({
  modal: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
  },
  modalFullHeight: {
    height: '85%',
  },
  content: {
    padding: spacing.xl,
  },
  previewContent: {
    flex: 1,
  },
  title: {
    ...typography.title2,
    textAlign: 'center',
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.subhead,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  label: {
    ...typography.footnote,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  modeSelector: {
    marginBottom: spacing.sm,
  },
  modeHint: {
    ...typography.caption1,
    color: colors.text.tertiary,
    marginBottom: spacing.xl,
  },
  buttonContainer: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  actionButton: {
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonContained: {
    backgroundColor: colors.accent,
  },
  actionButtonOutlined: {
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionButtonTextContained: {
    ...typography.subhead,
    fontWeight: '600',
    color: colors.surface,
  },
  actionButtonTextOutlined: {
    ...typography.subhead,
    fontWeight: '600',
    color: colors.text.primary,
  },
  feeHint: {
    ...typography.caption1,
    color: colors.warning,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  cancelButton: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  cancelButtonText: {
    ...typography.subhead,
    color: colors.accent,
  },
  previewImage: {
    width: '100%',
    height: 150,
    borderRadius: radius.md,
    marginBottom: spacing.lg,
    resizeMode: 'cover',
  },
  loader: {
    marginVertical: spacing.xl,
  },
  loadingText: {
    ...typography.subhead,
    color: colors.text.secondary,
    textAlign: 'center',
  },
});

export default PhotoImportModal;
