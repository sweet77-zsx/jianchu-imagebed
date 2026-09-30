import imageCompression from 'browser-image-compression';

export interface CompressResult {
  file: File;
  isCompressed: boolean;
  originalSize: number;
  compressedSize: number;
}

/**
 * 使用 browser-image-compression 对图片进行纯前端无损/有损智能压缩
 * 规则要求：限制最大 1MB，长边最大 1920 像素
 * @param file 原始图片文件
 * @returns 压缩结果及体积数据
 */
export async function compressImage(file: File): Promise<CompressResult> {
  const originalSize = file.size;

  // 如果不是图片，或者为 SVG/GIF 动图，跳过压缩以免丢失动态特性或损坏矢量图
  const isImage = file.type.startsWith('image/');
  const isGifOrSvg = file.type === 'image/gif' || file.type === 'image/svg+xml';

  if (!isImage || isGifOrSvg) {
    return {
      file,
      isCompressed: false,
      originalSize,
      compressedSize: originalSize,
    };
  }

  // 压缩配置选项
  const options = {
    maxSizeMB: 1, // 限制最大 1MB
    maxWidthOrHeight: 1920, // 长边最大 1920 像素
    useWebWorker: true,
    fileType: file.type,
  };

  try {
    const compressedBlob = await imageCompression(file, options);
    // 转换为新的 File 对象，保持原有文件名
    const compressedFile = new File([compressedBlob], file.name, {
      type: file.type,
      lastModified: Date.now(),
    });

    const isCompressed = compressedFile.size < originalSize;
    return {
      file: isCompressed ? compressedFile : file,
      isCompressed,
      originalSize,
      compressedSize: isCompressed ? compressedFile.size : originalSize,
    };
  } catch (error) {
    console.warn('图片压缩失败，自动降级使用原文件上传:', error);
    return {
      file,
      isCompressed: false,
      originalSize,
      compressedSize: originalSize,
    };
  }
}
