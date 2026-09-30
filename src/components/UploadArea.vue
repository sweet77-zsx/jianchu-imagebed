<template>
  <div class="upload-section">
    <!-- 当前上传存储厂商状态提示条 -->
    <div class="target-provider-banner">
      <div class="banner-left">
        <span class="provider-pill-icon">{{ currentActiveMeta.icon }}</span>
        <span class="banner-label">当前上传目标：</span>
        <span class="banner-target-name">{{ currentActiveMeta.name }} ({{ currentActiveConfig.bucket || '未设Bucket' }})</span>
        <span v-if="isActiveReady" class="badge-status-ready">已就绪</span>
        <span v-else class="badge-status-warn">未配置完整</span>
      </div>
      <button class="btn-switch-provider" @click="activeTab = 'config'">
        ⚙ 切换/配置存储厂商
      </button>
    </div>

    <!-- 上方提示文字 -->
    <div class="paste-hint-text">
      你也可以点击此处，然后粘贴你要上传的图片 (Ctrl + V)
    </div>

    <!-- 大虚线框上传区域 -->
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
          <span>拖动文件到这里或 </span>
          <span class="upload-trigger-link">点击上传</span>
        </div>
        <div class="sub-dropzone-tip">支持 JPG、PNG、GIF、WebP、SVG 等多种格式，自动前端图片无损压缩</div>
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

    <!-- 上传控制栏 -->
    <div class="upload-controls">
      <!-- 自动复制开关 -->
      <div class="control-item capsule-item">
        <span class="control-label">自动复制外链</span>
        <el-switch
          v-model="autoCopy"
          active-color="#0284c7"
          inactive-color="#dcdfe6"
          size="small"
        />
      </div>

      <!-- 链接格式下拉框 -->
      <div class="control-item format-select-item">
        <el-select
          v-model="urlFormat"
          placeholder="链接格式"
          size="default"
          style="width: 140px"
        >
          <el-option label="原始链接 (Raw)" value="raw" />
          <el-option label="Markdown" value="markdown" />
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
          size="small"
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

/* 目标云存储条 */
.target-provider-banner {
  width: 100%;
  max-width: 760px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 10px 16px;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
}

.banner-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.provider-pill-icon {
  font-size: 16px;
}

.banner-label {
  font-size: 13px;
  color: #64748b;
}

.banner-target-name {
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
}

.badge-status-ready {
  font-size: 10px;
  background-color: #ecfdf5;
  color: #059669;
  border: 1px solid #a7f3d0;
  padding: 1px 6px;
  border-radius: 10px;
  font-weight: 500;
}

.badge-status-warn {
  font-size: 10px;
  background-color: #fff7ed;
  color: #c2410c;
  border: 1px solid #fed7aa;
  padding: 1px 6px;
  border-radius: 10px;
  font-weight: 500;
}

.btn-switch-provider {
  background: transparent;
  border: 1px solid #e2e8f0;
  color: #0284c7;
  font-size: 12px;
  font-weight: 500;
  padding: 4px 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-switch-provider:hover {
  background-color: #f0f9ff;
  border-color: #0284c7;
}

.paste-hint-text {
  font-size: 14px;
  font-weight: 600;
  color: #334155;
  margin-bottom: 12px;
}

/* 虚线上传区 */
.upload-dropzone {
  width: 100%;
  max-width: 760px;
  height: 220px;
  background: #ffffff;
  border: 2px dashed #cbd5e1;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.25s ease-in-out;
  position: relative;
  outline: none;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
}

.upload-dropzone:hover {
  border-color: #0284c7;
  background-color: #f8fafc;
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(2, 132, 199, 0.08);
}

.upload-dropzone.is-dragover {
  border-color: #0284c7;
  background-color: #f0f9ff;
  transform: scale(1.01);
  box-shadow: 0 8px 24px rgba(2, 132, 199, 0.16);
}

.hidden-file-input {
  display: none;
}

.dropzone-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  pointer-events: none;
}

.cloud-icon-wrapper {
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  transition: color 0.2s, transform 0.2s;
}

.upload-dropzone:hover .cloud-icon-wrapper {
  color: #0284c7;
  transform: translateY(-3px);
}

.cloud-icon {
  width: 56px;
  height: 56px;
}

.dropzone-text {
  font-size: 14px;
  color: #475569;
}

.upload-trigger-link {
  color: #0284c7;
  font-weight: 600;
  text-decoration: underline;
  cursor: pointer;
}

.sub-dropzone-tip {
  font-size: 11px;
  color: #94a3b8;
}

/* 进度显示 */
.upload-progress-content {
  width: 80%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
}

.uploading-spinner {
  width: 40px;
  height: 40px;
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
  gap: 8px;
}

.uploading-title {
  font-size: 13px;
  color: #475569;
  max-width: 90%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-name {
  color: #0f172a;
  font-weight: 600;
}

.progress-bar-container {
  width: 100%;
  height: 6px;
  background-color: #e2e8f0;
  border-radius: 3px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #0284c7, #10b981);
  border-radius: 3px;
  transition: width 0.2s ease;
}

.progress-text {
  font-size: 12px;
  color: #64748b;
  font-weight: 600;
}

/* 控制栏 */
.upload-controls {
  margin-top: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  flex-wrap: wrap;
}

.control-item {
  display: flex;
  align-items: center;
}

.capsule-item {
  background-color: #ffffff;
  border: 1px solid #e2e8f0;
  padding: 5px 12px;
  border-radius: 20px;
  gap: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
}

.control-label {
  font-size: 12px;
  color: #0284c7;
  font-weight: 600;
}
</style>
