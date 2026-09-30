import { ref, reactive, watch, computed } from 'vue';
import { v4 as uuidv4 } from 'uuid';
import { ElMessage } from 'element-plus';
import type {
  TokenConfig,
  UploadRecord,
  RemoteFileItem,
  UrlFormat,
  StorageProvider,
  ActiveTab,
  ViewMode,
} from '../types';
import { s3AdapterInstance } from '../services/s3Adapter';
import { compressImage } from '../utils/compress';
import { getFileExt, formatOutputUrl } from '../utils/format';
import { copyToClipboard } from '../utils/clipboard';
import { PROVIDERS_META, createDefaultConfig } from '../utils/providers';

const STORAGE_KEYS = {
  MULTI_CONFIGS: 'jianchu_multi_configs',
  LEGACY_CONFIG: 'p_oss_token_config',
  ACTIVE_PROVIDER: 'jianchu_active_provider',
  HISTORY: 'jianchu_upload_history',
  LEGACY_HISTORY: 'p_oss_upload_history',
  AUTO_COPY: 'jianchu_auto_copy',
  URL_FORMAT: 'jianchu_url_format',
  ENABLE_COMPRESS: 'jianchu_enable_compress',
  VIEW_MODE: 'jianchu_view_mode',
};

// 初始化各云厂商配置映射表
const initialConfigs: Record<StorageProvider, TokenConfig> = {
  qiniu: createDefaultConfig('qiniu'),
  minio: createDefaultConfig('minio'),
  aws: createDefaultConfig('aws'),
  r2: createDefaultConfig('r2'),
  aliyun: createDefaultConfig('aliyun'),
  tencent: createDefaultConfig('tencent'),
};

// 全局多厂商配置响应式对象
const multiConfigs = reactive<Record<StorageProvider, TokenConfig>>({ ...initialConfigs });

// 当前左侧正在查看/编辑的厂商
const currentProvider = ref<StorageProvider>('qiniu');

// 当前激活用于上传的默认存储厂商
const activeUploadProvider = ref<StorageProvider>('qiniu');

// 工作区当前激活的主标签：'config' | 'upload' | 'remote' | 'history'
const activeTab = ref<ActiveTab>('upload');

// 视图模式：'grid' 卡片网格 | 'table' 详细列表
const viewMode = ref<ViewMode>('grid');

// 搜索关键词
const searchKeyword = ref<string>('');

// 控制栏设置
const autoCopy = ref<boolean>(true);
const urlFormat = ref<UrlFormat>('raw');
const enableCompress = ref<boolean>(true);

// 上传进度与状态
const isUploading = ref<boolean>(false);
const uploadProgress = ref<number>(0);
const uploadingFilename = ref<string>('');

// 数据列表
const historyList = ref<UploadRecord[]>([]);
const remoteList = ref<RemoteFileItem[]>([]);
const isLoadingRemote = ref<boolean>(false);

// 弹窗状态
const isHelpModalVisible = ref<boolean>(false);

/**
 * 校验过期时间字符串是否已失效
 */
export function checkIsExpired(expireTimeStr: string): boolean {
  if (!expireTimeStr) return false;
  const targetDate = new Date(expireTimeStr.replace(/-/g, '/'));
  if (isNaN(targetDate.getTime())) return false;
  return Date.now() > targetDate.getTime();
}

/**
 * 获取某个厂商的配置完整度与连通状态
 */
export function getProviderStatus(provider: StorageProvider): 'ready' | 'expired' | 'unconfigured' {
  const cfg = multiConfigs[provider];
  if (!cfg || !cfg.accessKey || !cfg.secretKey || !cfg.bucket) {
    return 'unconfigured';
  }
  if (checkIsExpired(cfg.expireTime)) {
    return 'expired';
  }
  return 'ready';
}

/**
 * 当前查看厂商的配置响应式代理
 */
const currentConfig = computed(() => {
  return multiConfigs[currentProvider.value];
});

/**
 * 当前查看厂商的连通状态
 */
const currentProviderStatus = computed(() => {
  return getProviderStatus(currentProvider.value);
});

/**
 * 初始化全局存储与配置状态
 */
export function initGlobalStorage() {
  // 1. 读取控制栏与视图模式偏好
  const cachedAutoCopy = localStorage.getItem(STORAGE_KEYS.AUTO_COPY);
  if (cachedAutoCopy !== null) autoCopy.value = cachedAutoCopy === 'true';

  const cachedUrlFormat = localStorage.getItem(STORAGE_KEYS.URL_FORMAT) as UrlFormat | null;
  if (cachedUrlFormat && ['raw', 'markdown', 'html'].includes(cachedUrlFormat)) {
    urlFormat.value = cachedUrlFormat;
  }

  const cachedEnableCompress = localStorage.getItem(STORAGE_KEYS.ENABLE_COMPRESS);
  if (cachedEnableCompress !== null) enableCompress.value = cachedEnableCompress === 'true';

  const cachedViewMode = localStorage.getItem(STORAGE_KEYS.VIEW_MODE) as ViewMode | null;
  if (cachedViewMode && ['grid', 'table'].includes(cachedViewMode)) {
    viewMode.value = cachedViewMode;
  }

  // 2. 读取当前激活上传的厂商
  const cachedActive = localStorage.getItem(STORAGE_KEYS.ACTIVE_PROVIDER) as StorageProvider | null;
  if (cachedActive && multiConfigs[cachedActive]) {
    activeUploadProvider.value = cachedActive;
    currentProvider.value = cachedActive;
  }

  // 3. 读取多厂商配置 (包含从旧版单配置无缝迁移)
  const cachedMulti = localStorage.getItem(STORAGE_KEYS.MULTI_CONFIGS);
  if (cachedMulti) {
    try {
      const parsed = JSON.parse(cachedMulti);
      Object.keys(parsed).forEach((k) => {
        const key = k as StorageProvider;
        if (multiConfigs[key]) {
          Object.assign(multiConfigs[key], parsed[key]);
          if (key === 'qiniu' || key === 'minio') {
            multiConfigs[key].forcePathStyle = true;
          }
        }
      });
    } catch (e) {
      console.error('解析多厂商配置失败:', e);
    }
  } else {
    // 兼容迁移旧版的单配置
    const legacy = localStorage.getItem(STORAGE_KEYS.LEGACY_CONFIG);
    if (legacy) {
      try {
        const parsedLegacy = JSON.parse(legacy) as TokenConfig;
        const provider = parsedLegacy.provider || 'qiniu';
        if (multiConfigs[provider]) {
          Object.assign(multiConfigs[provider], parsedLegacy);
          multiConfigs[provider].forcePathStyle = true;
        }
      } catch (e) {
        console.error('迁移旧版配置失败:', e);
      }
    }
  }

  // 4. 读取上传历史记录
  const cachedHistory =
    localStorage.getItem(STORAGE_KEYS.HISTORY) || localStorage.getItem(STORAGE_KEYS.LEGACY_HISTORY);
  if (cachedHistory) {
    try {
      historyList.value = JSON.parse(cachedHistory) || [];
    } catch (e) {
      console.error('解析上传历史记录失败:', e);
      historyList.value = [];
    }
  }

  // 5. 初始化 S3 客户端为当前默认激活厂商
  syncS3ClientWithProvider(activeUploadProvider.value);
}

/**
 * 将 S3 客户端同步为指定厂商的配置
 */
export function syncS3ClientWithProvider(provider: StorageProvider): boolean {
  const cfg = multiConfigs[provider];
  if (!cfg) return false;

  const isConfigured = Boolean(cfg.accessKey && cfg.secretKey && cfg.bucket);
  const isExpired = checkIsExpired(cfg.expireTime);

  if (isConfigured && !isExpired) {
    return s3AdapterInstance.init(cfg);
  }
  return false;
}

// 自动持久化设置变更
watch(autoCopy, (val) => localStorage.setItem(STORAGE_KEYS.AUTO_COPY, String(val)));
watch(urlFormat, (val) => localStorage.setItem(STORAGE_KEYS.URL_FORMAT, val));
watch(enableCompress, (val) => localStorage.setItem(STORAGE_KEYS.ENABLE_COMPRESS, String(val)));
watch(viewMode, (val) => localStorage.setItem(STORAGE_KEYS.VIEW_MODE, val));
watch(activeUploadProvider, (val) => localStorage.setItem(STORAGE_KEYS.ACTIVE_PROVIDER, val));

export function useStorage() {
  /**
   * 保存当前厂商的配置
   */
  const saveProviderConfig = (provider: StorageProvider, newConfig: TokenConfig) => {
    Object.assign(multiConfigs[provider], newConfig);

    // 检查是否过期
    const isExpired = checkIsExpired(newConfig.expireTime);
    if (isExpired) {
      ElMessage.warning('警告：设定的过期时间早于当前时间，凭证已被标记为过期！');
    } else {
      // 若当前编辑的正是默认上传厂商，立即同步客户端
      if (provider === activeUploadProvider.value) {
        syncS3ClientWithProvider(provider);
      }
      ElMessage.success(`【${PROVIDERS_META.find((p) => p.id === provider)?.name}】配置已成功保存！`);
    }

    // 持久化到 localStorage
    persistMultiConfigs();
  };

  /**
   * 将多厂商配置持久化保存
   */
  const persistMultiConfigs = () => {
    // 过滤出勾选了本地保存账号的厂商
    const toSave: Partial<Record<StorageProvider, TokenConfig>> = {};
    (Object.keys(multiConfigs) as StorageProvider[]).forEach((p) => {
      if (multiConfigs[p].saveAccount) {
        toSave[p] = multiConfigs[p];
      }
    });
    localStorage.setItem(STORAGE_KEYS.MULTI_CONFIGS, JSON.stringify(toSave));
  };

  /**
   * 将某个厂商设为当前默认上传厂商
   */
  const setAsActiveUploadProvider = (provider: StorageProvider) => {
    activeUploadProvider.value = provider;
    syncS3ClientWithProvider(provider);
    const meta = PROVIDERS_META.find((p) => p.id === provider);
    ElMessage.success(`已将【${meta?.name}】设为默认上传存储！`);
  };

  /**
   * 切换左侧正在查看的厂商
   */
  const switchCurrentProvider = (provider: StorageProvider) => {
    currentProvider.value = provider;
    // 顺带如果远端列表打开中，重新按新厂商拉取
    if (activeTab.value === 'remote') {
      loadRemoteFiles();
    }
  };

  /**
   * 核心文件上传业务流程
   */
  const uploadFileProcess = async (rawFile: File): Promise<UploadRecord | null> => {
    const uploadProvider = activeUploadProvider.value;
    const cfg = multiConfigs[uploadProvider];
    const meta = PROVIDERS_META.find((p) => p.id === uploadProvider);

    // 检查凭证有效性
    const status = getProviderStatus(uploadProvider);
    if (status !== 'ready') {
      ElMessage.error(`当前默认上传厂商【${meta?.name}】尚未配置完整或凭证已过期，请先配置！`);
      currentProvider.value = uploadProvider;
      activeTab.value = 'config';
      return null;
    }

    // 确保 S3 客户端加载的是上传厂商的配置
    syncS3ClientWithProvider(uploadProvider);

    try {
      isUploading.value = true;
      uploadProgress.value = 0;
      uploadingFilename.value = rawFile.name;

      // 1. 如果开启了压缩，执行前端图片压缩
      let targetFile = rawFile;
      let isCompressed = false;
      let originalSize = rawFile.size;
      let finalSize = rawFile.size;

      if (enableCompress.value) {
        const compressResult = await compressImage(rawFile);
        targetFile = compressResult.file;
        isCompressed = compressResult.isCompressed;
        originalSize = compressResult.originalSize;
        finalSize = compressResult.compressedSize;
      }

      // 2. 使用 uuid 生成唯一文件名，保持扩展名
      const ext = getFileExt(rawFile.name) || '.png';
      const uniqueId = uuidv4();
      const uniqueFileName = `${uniqueId}${ext}`;

      // 3. 拼接 S3 对象 Key
      const cleanPrefix = cfg.prefix ? cfg.prefix.replace(/^\/+|\/+$/g, '') : '';
      const cleanScope = cfg.scope ? cfg.scope.replace(/^\/+|\/+$/g, '') : '';

      let key = '';
      if (cleanPrefix && cleanScope) {
        key = `${cleanPrefix}/${cleanScope}/${uniqueFileName}`;
      } else if (cleanPrefix) {
        key = `${cleanPrefix}/${uniqueFileName}`;
      } else {
        key = uniqueFileName;
      }

      // 4. 调用 S3 上传接口，实时更新进度
      const { url } = await s3AdapterInstance.uploadFile(targetFile, key, (percent) => {
        uploadProgress.value = percent;
      });

      // 5. 生成记录并保存
      const record: UploadRecord = {
        id: uniqueId,
        name: rawFile.name,
        key,
        url,
        size: originalSize,
        compressedSize: isCompressed ? finalSize : undefined,
        isCompressed,
        mimeType: rawFile.type || 'image/png',
        uploadTime: new Date().toISOString(),
        provider: uploadProvider,
      };

      historyList.value.unshift(record);
      if (historyList.value.length > 300) {
        historyList.value = historyList.value.slice(0, 300);
      }
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(historyList.value));

      // 6. 如果开启了自动复制，格式化并写入剪贴板
      if (autoCopy.value) {
        const formattedUrl = formatOutputUrl(url, rawFile.name, urlFormat.value);
        await copyToClipboard(formattedUrl, false);
        ElMessage.success('上传成功，外链已自动复制到剪贴板！');
      } else {
        ElMessage.success('上传成功！');
      }

      return record;
    } catch (err: any) {
      console.error('上传文件流程出错:', err);
      return null;
    } finally {
      isUploading.value = false;
      uploadProgress.value = 0;
      uploadingFilename.value = '';
    }
  };

  /**
   * 刷新远端文件列表 (按当前查看的厂商)
   * @param silent 是否静默刷新（若凭证未就绪时不弹窗打扰）
   */
  const loadRemoteFiles = async (silent = false) => {
    const provider = currentProvider.value;
    const cfg = multiConfigs[provider];
    const meta = PROVIDERS_META.find((p) => p.id === provider);

    const status = getProviderStatus(provider);
    if (status !== 'ready') {
      if (!silent) {
        ElMessage.warning(`【${meta?.name}】尚未配置或凭证已过期`);
      }
      return;
    }

    try {
      isLoadingRemote.value = true;
      syncS3ClientWithProvider(provider);
      const files = await s3AdapterInstance.listFiles(cfg.prefix);
      remoteList.value = files;
    } catch (error: any) {
      console.error('拉取远端文件失败:', error);
    } finally {
      isLoadingRemote.value = false;
    }
  };

  /**
   * 删除本地上传历史项
   */
  const removeHistoryItem = (id: string) => {
    historyList.value = historyList.value.filter((item) => item.id !== id);
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(historyList.value));
    ElMessage.success('本地记录已删除');
  };

  /**
   * 清空本地上传历史
   */
  const clearAllHistory = () => {
    historyList.value = [];
    localStorage.removeItem(STORAGE_KEYS.HISTORY);
    ElMessage.success('已清空全部本地历史');
  };

  /**
   * 删除远端 S3 文件
   */
  const deleteRemoteFile = async (key: string) => {
    try {
      syncS3ClientWithProvider(currentProvider.value);
      await s3AdapterInstance.deleteFile(key);
      remoteList.value = remoteList.value.filter((item) => item.key !== key);
    } catch (e) {
      // 异常已在内部处理
    }
  };

  return {
    multiConfigs,
    currentProvider,
    activeUploadProvider,
    currentConfig,
    currentProviderStatus,
    activeTab,
    viewMode,
    searchKeyword,
    autoCopy,
    urlFormat,
    enableCompress,
    isUploading,
    uploadProgress,
    uploadingFilename,
    historyList,
    remoteList,
    isLoadingRemote,
    isHelpModalVisible,
    saveProviderConfig,
    setAsActiveUploadProvider,
    switchCurrentProvider,
    uploadFileProcess,
    loadRemoteFiles,
    removeHistoryItem,
    clearAllHistory,
    deleteRemoteFile,
  };
}
