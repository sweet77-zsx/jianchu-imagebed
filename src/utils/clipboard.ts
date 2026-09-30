import { ElMessage } from 'element-plus';

/**
 * 将指定文本复制到系统剪贴板
 * 优先使用现代化 navigator.clipboard API，兼容降级使用 document.execCommand
 * @param text 要复制的文本内容
 * @param showToast 是否弹出复制成功的轻提示，默认为 true
 */
export async function copyToClipboard(text: string, showToast = true): Promise<boolean> {
  if (!text) {
    if (showToast) ElMessage.warning('复制内容为空');
    return false;
  }

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      if (showToast) ElMessage.success('链接已复制到剪贴板');
      return true;
    }
  } catch (err) {
    console.warn('navigator.clipboard 复制失败，尝试降级方案:', err);
  }

  // 降级使用 textarea + execCommand
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    textArea.style.top = '-9999px';
    textArea.setAttribute('readonly', '');
    document.body.appendChild(textArea);
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);

    if (successful) {
      if (showToast) ElMessage.success('链接已复制到剪贴板');
      return true;
    } else {
      throw new Error('execCommand 返回 false');
    }
  } catch (fallbackErr) {
    console.error('降级复制依然失败:', fallbackErr);
    if (showToast) ElMessage.error('复制失败，请手动选中复制');
    return false;
  }
}
