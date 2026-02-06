import React, {useState} from 'react';
import {View, StyleSheet, Image, Alert} from 'react-native';
import {
  Portal,
  Modal,
  Text,
  Button,
  ActivityIndicator,
  SegmentedButtons,
  Snackbar,
} from 'react-native-paper';
import {ParsedDish, ApiConfig} from '../types';
import {takePhoto, pickImageFromGallery, estimateImageSize} from '../utils/image';
import {recognizeMenuFromImage} from '../services/aiService';
import {RecognizedDishList} from './RecognizedDishList';

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
    const result = await takePhoto();
    if (result.success && result.base64) {
      processImage(result.base64, result.uri);
    } else if (result.error && result.error !== '用户取消') {
      showMessage(result.error);
    }
  };

  // 处理从相册选择
  const handlePickFromGallery = async () => {
    const result = await pickImageFromGallery();
    if (result.success && result.base64) {
      processImage(result.base64, result.uri);
    } else if (result.error && result.error !== '用户取消') {
      showMessage(result.error);
    }
  };

  // 处理图片
  const processImage = async (base64: string, uri?: string) => {
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
        <Button
          mode="contained"
          icon="camera"
          onPress={handleTakePhoto}
          style={styles.actionButton}
        >
          拍照
        </Button>
        <Button
          mode="outlined"
          icon="image"
          onPress={handlePickFromGallery}
          style={styles.actionButton}
        >
          从相册选择
        </Button>
      </View>

      {/* API 费用提示 */}
      <Text style={styles.feeHint}>
        注意：每次识别约消耗 0.01 元 API 费用
      </Text>

      {/* 取消按钮 */}
      <Button mode="text" onPress={handleDismiss} style={styles.cancelButton}>
        取消
      </Button>
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
      
      <Button mode="text" onPress={handleBackToSelect} style={styles.cancelButton}>
        取消
      </Button>
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
    <Portal>
      <Modal
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
      </Modal>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
      >
        {snackbarMessage}
      </Snackbar>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modal: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 12,
    maxHeight: '80%',
  },
  modalFullHeight: {
    height: '85%',
    marginVertical: 40,
  },
  content: {
    padding: 20,
  },
  previewContent: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  modeSelector: {
    marginBottom: 8,
  },
  modeHint: {
    fontSize: 12,
    color: '#888',
    marginBottom: 20,
  },
  buttonContainer: {
    gap: 12,
    marginBottom: 16,
  },
  actionButton: {
    paddingVertical: 4,
  },
  feeHint: {
    fontSize: 12,
    color: '#FF9800',
    textAlign: 'center',
    marginBottom: 8,
  },
  cancelButton: {
    marginTop: 8,
  },
  previewImage: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    marginBottom: 16,
    resizeMode: 'cover',
  },
  loader: {
    marginVertical: 20,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});

export default PhotoImportModal;
