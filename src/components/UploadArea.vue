<template>
  <div class="upload-section">
    <!-- 当前上传存储厂商状态卡片（适当放大、层级分明、信息全面） -->
    <div class="target-provider-banner">
      <div class="banner-left">
        <div class="provider-pill-avatar" :title="currentActiveMeta.name">
          {{ currentActiveMeta.icon }}
        </div>
        <div class="banner-provider-info">
          <div class="banner-target-title-row">
            <span class="banner-label">当前默认上传目标：</span>
            <span class="banner-target-name">{{ currentActiveMeta.name }}</span>
            <span v-if="isActiveReady" class="badge-status-ready">
              <span class="badge-dot-ready"></span>已就绪
            </span>
            <span v-else class="badge-status-warn">
              <span class="badge-dot-warn"></span>未配置完整
            </span>
          </div>
          <div class="banner-details-row">
            <span class="banner-detail-item">
              <span class="detail-label">存储桶:</span>
              <span class="detail-value">{{ currentActiveConfig.bucket || '未设置 Bucket' }}</span>
            </span>
            <span v-if="currentActiveConfig.prefix" class="banner-detail-item">
              <span class="detail-label">目录前缀:</span>
              <span class="detail-value">{{ currentActiveConfig.prefix }}</span>
            </span>
            <span v-if="currentActiveConfig.domain" class="banner-detail-item">
              <span class="detail-label">加速域名:</span>
              <span class="detail-value">{{ currentActiveConfig.domain }}</span>
            </span>
          </div>
        </div>
      </div>
      <div class="banner-right-actions">
        <button class="btn-switch-provider" @click="activeTab = 'config'" title="前往配置此厂商或切换默认存储源">
          <span class="action-icon">⚙️</span>
          <span>切换 / 配置云厂商</span>
        </button>
      </div>
    </div>

    <!-- 剪贴板快捷粘贴提示 -->
    <div class="paste-hint-text">
      <span>支持点击选择文件、拖拽至下方区域，或直接按下 </span>
      <kbd class="kbd-key">Ctrl</kbd> + <kbd class="kbd-key">V</kbd>
      <span> 极速粘贴直传</span>
    </div>

    <!-- 大尺寸虚线框上传区域 -->
    <div
      class="upload-dropzone"
      :class="{ 'is-dragover': isDragOver, 'is-uploading': isUploading }"
      @click="triggerFileInput"
      @dragover.prevent="onDragOver"
      @dragleave.prevent="onDragLeave"
      @drop.prevent="onDrop"
      tabindex="0"
      title="点击选择文件，或拖入图片，或直接 Ctrl+V 粘贴图片"
    >
      <!-- 隐藏的原生文件上传输入框 -->
      <input
        ref="fileInputRef"
        type="file"
        accept="image/*"
        multiple
        class="hidden-file-input"
        @change="handleFileChange"
      />

      <!-- 常态内容 -->
      <div v-if="!isUploading" class="dropzone-content">
        <!-- 云上传图标 -->
        <div class="cloud-icon-wrapper">
          <svg class="cloud-icon" viewBox="0 0 1024 1024" fill="currentColor">
            <path
              d="M768 448c-12.8-140.8-132.3-256-277.3-256-115.2 0-213.3 72.5-256 174.9C102.4 384 0 499.2 0 640c0 153.6 123.7 277.3 277.3 277.3h486.4C896 917.3 1002.7 810.7 1002.7 678.4c0-128-102.4-230.4-234.7-230.4z m-213.3 64v192h-85.4v-192h-128l170.7-170.7 170.7 170.7h-128z"
            />
          </svg>
        </div>

        <div class="dropzone-text">
          <span>拖拽图片到这里，或 </span>
          <span class="upload-trigger-link">点击选择本地图片</span>
        </div>

        <!-- 格式徽标条 -->
        <div class="supported-formats-pills">
          <span class="format-pill">JPG</span>
          <span class="format-pill">PNG</span>
          <span class="format-pill">WebP</span>
          <span class="format-pill">GIF</span>
          <span class="format-pill">SVG</span>
          <span class="format-pill">BMP</span>
          <span class="format-pill">AVIF</span>
        </div>

        <div class="sub-dropzone-tip">
          支持多图批量上传 · WebWorker 客户端本地轻量压缩 · 秒级直传到目标云存储
        </div>
      </div>

      <!-- 上传中进度状态 -->
      <div v-else class="upload-progress-content" @click.stop>
        <div class="uploading-spinner">
          <svg class="spinner-svg" viewBox="0 0 50 50">
            <circle
              class="path"
              cx="25"
              cy="25"
              r="20"
              fill="none"
              stroke-width="4"
            ></circle>
          </svg>
        </div>
        <div class="uploading-info">
          <div class="uploading-title">
            正在上传至 {{ currentActiveMeta.name }}：<span class="file-name">{{ uploadingFilename }}</span>
          </div>
          <div class="progress-bar-container">
            <div class="progress-bar-fill" :style="{ width: `${uploadProgress}%` }"></div>
          </div>
          <div class="progress-text">{{ uploadProgress }}%</div>
        </div>
      </div>
    </div>

    <!-- 上传控制栏 (适度放大) -->
    <div class="upload-controls">
      <!-- 自动复制开关 -->
      <div class="control-item capsule-item">
        <span class="control-label">自动复制外链</span>
        <el-switch
          v-model="autoCopy"
          active-color="#0284c7"
          inactive-color="#dcdfe6"
          size="default"
        />
      </div>

      <!-- 链接格式下拉框 -->
      <div class="control-item format-select-item">
        <el-select
          v-model="urlFormat"
          placeholder="链接格式"
          size="default"
          style="width: 160px"
        >
          <el-option label="原始链接 (Raw)" value="raw" />
          <el-option label="Markdown 格式" value="markdown" />
          <el-option label="HTML 标签" value="html" />
        </el-select>
      </div>

      <!-- 图片压缩开关 -->
      <div class="control-item capsule-item">
        <span class="control-label">WebWorker 压缩</span>
        <el-switch
          v-model="enableCompress"
          active-color="#0284c7"
          inactive-color="#dcdfe6"
          size="default"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { ElMessage } from 'element-plus';
import { useStorage, getProviderStatus } from '../composables/useStorage';
import { PROVIDERS_META } from '../utils/providers';

const {
  activeUploadProvider,
  multiConfigs,
  activeTab,
  autoCopy,
  urlFormat,
  enableCompress,
  isUploading,
  uploadProgress,
  uploadingFilename,
  uploadFileProcess,
} = useStorage();

const fileInputRef = ref<HTMLInputElement | null>(null);
const isDragOver = ref(false);

const currentActiveMeta = computed(() => {
  return PROVIDERS_META.find((p) => p.id === activeUploadProvider.value) || PROVIDERS_META[0];
});

const currentActiveConfig = computed(() => {
  return multiConfigs[activeUploadProvider.value];
});

const isActiveReady = computed(() => {
  return getProviderStatus(activeUploadProvider.value) === 'ready';
});

// 唤起文件选择窗口
const triggerFileInput = () => {
  if (isUploading.value) return;
  fileInputRef.value?.click();
};

// 处理本地选择的文件
const handleFileChange = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  const files = target.files;
  if (!files || files.length === 0) return;

  await uploadMultipleFiles(Array.from(files));

  if (fileInputRef.value) {
    fileInputRef.value.value = '';
  }
};

const onDragOver = () => {
  if (!isUploading.value) isDragOver.value = true;
};

const onDragLeave = () => {
  isDragOver.value = false;
};

const onDrop = async (event: DragEvent) => {
  isDragOver.value = false;
  if (isUploading.value) return;

  const files = event.dataTransfer?.files;
  if (!files || files.length === 0) return;

  await uploadMultipleFiles(Array.from(files));
};

const uploadMultipleFiles = async (files: File[]) => {
  const imageFiles = files.filter((f) => f.type.startsWith('image/'));

  if (imageFiles.length === 0) {
    ElMessage.warning('请选择图片文件进行上传！');
    return;
  }

  for (let i = 0; i < imageFiles.length; i++) {
    const file = imageFiles[i];
    await uploadFileProcess(file);
  }
};

const handlePaste = async (event: ClipboardEvent) => {
  if (isUploading.value) return;

  const clipboardData = event.clipboardData;
  if (!clipboardData || !clipboardData.items) return;

  const items = clipboardData.items;
  const filesToUpload: File[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.kind === 'file' && item.type.startsWith('image/')) {
      const file = item.getAsFile();
      if (file) {
        const renamedFile =
          file.name && file.name !== 'image.png'
            ? file
            : new File([file], `paste_${Date.now()}.png`, { type: file.type });
        filesToUpload.push(renamedFile);
      }
    }
  }

  if (filesToUpload.length > 0) {
    event.preventDefault();
    await uploadMultipleFiles(filesToUpload);
  }
};

onMounted(() => {
  window.addEventListener('paste', handlePaste);
});

onUnmounted(() => {
  window.removeEventListener('paste', handlePaste);
});
</script>

<style scoped>
.upload-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
}

/* 目标云存储条（适当放大比例，更具控制台视觉张力） */
.target-provider-banner {
  width: 100%;
  max-width: 960px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 16px 22px;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 3px 12px rgba(0, 0, 0, 0.03);
  transition: all 0.2s ease;
  gap: 16px;
  flex-wrap: wrap;
}

.banner-left {
  display: flex;
  align-items: center;
  gap: 14px;
  flex: 1;
  min-width: 280px;
}

.provider-pill-avatar {
  width: 48px;
  height: 48px;
  font-size: 26px;
  border-radius: 12px;
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  border: 1px solid #bae6fd;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 2px 6px rgba(2, 132, 199, 0.12);
}

.banner-provider-info {
  display: flex;
  flex-direction: column;
  gap: 5px;
  flex: 1;
}

.banner-target-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.banner-label {
  font-size: 13.5px;
  color: #64748b;
  font-weight: 500;
}

.banner-target-name {
  font-size: 17px;
  font-weight: 700;
  color: #0f172a;
}

.badge-status-ready {
  font-size: 11px;
  background-color: #ecfdf5;
  color: #059669;
  border: 1px solid #a7f3d0;
  padding: 2px 8px;
  border-radius: 12px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.badge-dot-ready {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: #10b981;
  box-shadow: 0 0 6px rgba(16, 185, 129, 0.8);
}

.badge-status-warn {
  font-size: 11px;
  background-color: #fff7ed;
  color: #c2410c;
  border: 1px solid #fed7aa;
  padding: 2px 8px;
  border-radius: 12px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.badge-dot-warn {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: #f97316;
}

.banner-details-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.banner-detail-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #64748b;
}

.detail-label {
  color: #94a3b8;
}

.detail-value {
  color: #0284c7;
  font-weight: 600;
  background: #f0f9ff;
  padding: 1px 6px;
  border-radius: 4px;
  border: 1px solid #e0f2fe;
}

.banner-right-actions {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.btn-switch-provider {
  background: #f8fafc;
  border: 1px solid #cbd5e1;
  color: #0284c7;
  font-size: 13px;
  font-weight: 600;
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
}

.btn-switch-provider:hover {
  background-color: #f0f9ff;
  border-color: #0284c7;
  color: #0369a1;
  transform: translateY(-1px);
  box-shadow: 0 3px 8px rgba(2, 132, 199, 0.15);
}

/* 快捷键提示条 */
.paste-hint-text {
  font-size: 14.5px;
  font-weight: 600;
  color: #334155;
  margin: 16px 0 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  flex-wrap: wrap;
}

.kbd-key {
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 700;
  color: #1e293b;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-bottom: 2px solid #94a3b8;
  padding: 2px 7px;
  border-radius: 5px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

/* 大虚线框上传区域（适当放大、视觉更震撼、交互更直观） */
.upload-dropzone {
  width: 100%;
  max-width: 960px;
  min-height: 330px;
  background: linear-gradient(180deg, #ffffff 0%, #fbfcfe 100%);
  border: 2px dashed #94a3b8;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  outline: none;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.02);
  padding: 32px 20px;
}

.upload-dropzone:hover {
  border-color: #0284c7;
  background-color: #f8fafc;
  transform: translateY(-2px);
  box-shadow: 0 10px 28px rgba(2, 132, 199, 0.12);
}

.upload-dropzone.is-dragover {
  border-color: #0284c7;
  background-color: #f0f9ff;
  transform: scale(1.015);
  box-shadow: 0 12px 32px rgba(2, 132, 199, 0.2);
}

.hidden-file-input {
  display: none;
}

.dropzone-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  pointer-events: none;
  text-align: center;
}

.cloud-icon-wrapper {
  width: 90px;
  height: 90px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  border-radius: 50%;
  background: #f1f5f9;
  transition: all 0.25s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
}

.upload-dropzone:hover .cloud-icon-wrapper {
  color: #0284c7;
  background: #e0f2fe;
  transform: translateY(-4px) scale(1.05);
}

.cloud-icon {
  width: 68px;
  height: 68px;
}

.dropzone-text {
  font-size: 19px;
  font-weight: 600;
  color: #1e293b;
}

.upload-trigger-link {
  color: #0284c7;
  font-weight: 700;
  text-decoration: underline;
  cursor: pointer;
}

/* 格式徽标条 */
.supported-formats-pills {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex-wrap: wrap;
}

.format-pill {
  font-size: 11px;
  font-weight: 700;
  color: #475569;
  background-color: #f1f5f9;
  padding: 2px 8px;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
}

.sub-dropzone-tip {
  font-size: 13px;
  color: #64748b;
  max-width: 600px;
  line-height: 1.5;
}

/* 进度显示 */
.upload-progress-content {
  width: 85%;
  max-width: 600px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.uploading-spinner {
  width: 52px;
  height: 52px;
}

.spinner-svg {
  animation: rotate 1.6s linear infinite;
  width: 100%;
  height: 100%;
}

.spinner-svg .path {
  stroke: #0284c7;
  stroke-linecap: round;
  animation: dash 1.4s ease-in-out infinite;
}

@keyframes rotate {
  100% {
    transform: rotate(360deg);
  }
}

@keyframes dash {
  0% {
    stroke-dasharray: 1, 150;
    stroke-dashoffset: 0;
  }
  50% {
    stroke-dasharray: 90, 150;
    stroke-dashoffset: -35;
  }
  100% {
    stroke-dasharray: 90, 150;
    stroke-dashoffset: -124;
  }
}

.uploading-info {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.uploading-title {
  font-size: 14.5px;
  color: #475569;
  max-width: 90%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-name {
  color: #0f172a;
  font-weight: 700;
}

.progress-bar-container {
  width: 100%;
  height: 8px;
  background-color: #e2e8f0;
  border-radius: 4px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #0284c7, #10b981);
  border-radius: 4px;
  transition: width 0.2s ease;
}

.progress-text {
  font-size: 14px;
  color: #0284c7;
  font-weight: 700;
}

/* 控制栏 */
.upload-controls {
  margin-top: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  flex-wrap: wrap;
}

.control-item {
  display: flex;
  align-items: center;
}

.capsule-item {
  background-color: #ffffff;
  border: 1px solid #e2e8f0;
  padding: 7px 16px;
  border-radius: 24px;
  gap: 10px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.03);
}

.control-label {
  font-size: 13.5px;
  color: #0284c7;
  font-weight: 600;
}
</style>
