/**
 * 图片处理工具函数
 */

import {launchCamera, launchImageLibrary, ImagePickerResponse, Asset} from 'react-native-image-picker';
import {Platform} from 'react-native';

// 图片选择选项
const imagePickerOptions = {
  mediaType: 'photo' as const,
  maxWidth: 1920,
  maxHeight: 1920,
  quality: 0.8 as const,
  includeBase64: true,
};

/**
 * 从相机拍照
 */
export async function takePhoto(): Promise<{
  success: boolean;
  base64?: string;
  uri?: string;
  error?: string;
}> {
  return new Promise((resolve) => {
    launchCamera(imagePickerOptions, (response: ImagePickerResponse) => {
      if (response.didCancel) {
        resolve({success: false, error: '用户取消'});
        return;
      }
      
      if (response.errorCode) {
        resolve({
          success: false,
          error: response.errorMessage || `错误: ${response.errorCode}`,
        });
        return;
      }
      
      const asset = response.assets?.[0];
      if (asset?.base64) {
        resolve({
          success: true,
          base64: asset.base64,
          uri: asset.uri,
        });
      } else {
        resolve({success: false, error: '无法获取图片数据'});
      }
    });
  });
}

/**
 * 从相册选择图片
 */
export async function pickImageFromGallery(): Promise<{
  success: boolean;
  base64?: string;
  uri?: string;
  error?: string;
}> {
  return new Promise((resolve) => {
    launchImageLibrary(imagePickerOptions, (response: ImagePickerResponse) => {
      if (response.didCancel) {
        resolve({success: false, error: '用户取消'});
        return;
      }
      
      if (response.errorCode) {
        resolve({
          success: false,
          error: response.errorMessage || `错误: ${response.errorCode}`,
        });
        return;
      }
      
      const asset = response.assets?.[0];
      if (asset?.base64) {
        resolve({
          success: true,
          base64: asset.base64,
          uri: asset.uri,
        });
      } else {
        resolve({success: false, error: '无法获取图片数据'});
      }
    });
  });
}

/**
 * 检查图片大小是否符合要求
 * @param base64 Base64 编码的图片
 * @param maxSizeMB 最大大小（MB）
 */
export function checkImageSize(base64: string, maxSizeMB: number = 2): boolean {
  // Base64 字符串长度约为原始大小的 4/3
  const sizeInBytes = (base64.length * 3) / 4;
  const sizeInMB = sizeInBytes / (1024 * 1024);
  return sizeInMB <= maxSizeMB;
}

/**
 * 获取图片的 MIME 类型
 */
export function getImageMimeType(base64: string): string {
  // 检查 Base64 前缀来确定类型
  if (base64.startsWith('/9j/')) {
    return 'image/jpeg';
  } else if (base64.startsWith('iVBOR')) {
    return 'image/png';
  } else if (base64.startsWith('R0lGOD')) {
    return 'image/gif';
  } else if (base64.startsWith('UklGR')) {
    return 'image/webp';
  }
  return 'image/jpeg'; // 默认
}

/**
 * 格式化 Base64 为 Data URL
 */
export function formatBase64ToDataUrl(base64: string): string {
  const mimeType = getImageMimeType(base64);
  return `data:${mimeType};base64,${base64}`;
}

/**
 * 估算图片大小（MB）
 */
export function estimateImageSize(base64: string): number {
  const sizeInBytes = (base64.length * 3) / 4;
  return Math.round((sizeInBytes / (1024 * 1024)) * 100) / 100;
}
