<template>
  <div class="file-list-section">
    <!-- 控制与分页栏 (对标截图浮岛操作排布) -->
    <div class="list-control-header">
      <!-- 左侧搜索与视图模式切换 -->
      <div class="header-left-tools">
        <!-- 搜索输入框 -->
        <el-input
          v-model="searchKeyword"
          placeholder="搜索已上传图片/文件名..."
          clearable
          size="default"
          style="width: 260px"
        >
          <template #prefix>🔍</template>
        </el-input>

        <!-- 视图模式切换 (网格 / 表格) -->
        <div class="view-mode-toggle">
          <button
            class="mode-btn"
            :class="{ 'is-active': viewMode === 'grid' }"
            @click="viewMode = 'grid'"
            title="网格平铺卡片视图"
          >
            ▦ 网格
          </button>
          <button
            class="mode-btn"
            :class="{ 'is-active': viewMode === 'table' }"
            @click="viewMode = 'table'"
            title="详细表格视图"
          >
            ☰ 列表
          </button>
        </div>

        <span class="total-badge">共 {{ filteredList.length }} 项</span>
      </div>

      <!-- 右侧操作与分页 -->
      <div class="header-right-tools">
        <el-select v-model="pageSize" size="small" style="width: 95px">
          <el-option :value="12" label="12项/页" />
          <el-option :value="24" label="24项/页" />
          <el-option :value="48" label="48项/页" />
        </el-select>

        <el-pagination
          v-model:current-page="currentPage"
          :page-size="pageSize"
          :total="filteredList.length"
          layout="prev, pager, next"
          small
        />

        <el-button
          v-if="activeTab === 'remote'"
          type="primary"
          plain
          size="small"
          :loading="isLoadingRemote"
          @click="handleRefreshRemote"
        >
          🔄 实时刷新
        </el-button>
        <el-button
          v-else-if="historyList.length > 0"
          type="danger"
          plain
          size="small"
          @click="handleClearHistory"
        >
          清空历史
        </el-button>
      </div>
    </div>

    <!-- 列表展示区域 -->
    <div class="list-content-area" v-loading="isLoadingRemote && activeTab === 'remote'">
      <!-- 空数据状态 -->
      <div v-if="paginatedList.length === 0" class="empty-state">
        <template v-if="activeTab === 'remote' && !isCurrentReady">
          <div class="empty-icon">🔑</div>
          <div class="empty-text">
            当前云厂商【{{ currentMeta.name }}】尚未配置或凭证已失效
          </div>
          <p class="empty-subtip" style="font-size: 13px; color: #94a3b8; margin-top: 6px;">
            请先前往配置其 Access Key、Secret Key 与 Bucket 存储空间参数
          </p>
          <el-button
            type="primary"
            size="default"
            @click="activeTab = 'config'"
            style="margin-top: 14px; border-radius: 8px"
          >
            ⚙️ 立即前往配置【{{ currentMeta.name }}】
          </el-button>
        </template>
        <template v-else>
          <div class="empty-icon">📭</div>
          <div class="empty-text">
            {{
              searchKeyword
                ? '没有找到匹配的图片文件'
                : activeTab === 'history'
                ? '暂无上传历史记录，去上传区传一张试试吧~'
                : '当前存储空间此目录下暂无文件或尚未拉取'
            }}
          </div>
          <el-button
            v-if="activeTab === 'remote'"
            type="primary"
            size="small"
            @click="handleRefreshRemote"
            style="margin-top: 14px"
          >
            从 S3 存储桶拉取文件
          </el-button>
        </template>
      </div>

      <!-- 模式一：网格卡片视图 (Grid Mode) -->
      <div v-else-if="viewMode === 'grid'" class="files-grid-container">
        <div v-for="item in paginatedList" :key="item.key" class="file-grid-card">
          <!-- 缩略图区域 -->
          <div class="card-thumb-wrap" @click="handlePreviewImage(item.url)">
            <img
              :src="item.url"
              :alt="item.name"
              class="card-img"
              loading="lazy"
              @error="onImageError"
            />
            <div class="card-mask">
              <span class="zoom-text">🔍 预览大图</span>
            </div>
            <!-- 压缩标签 -->
            <span
              v-if="'isCompressed' in item && item.isCompressed"
              class="compressed-badge"
              title="已通过前端智能压缩"
            >
              已压缩
            </span>
          </div>

          <!-- 卡片信息区 -->
          <div class="card-info-wrap">
            <div class="card-filename" :title="item.name">{{ item.name }}</div>
            <div class="card-meta-row">
              <span class="file-size">{{ formatBytes(item.size) }}</span>
              <span class="file-time">{{
                'uploadTime' in item ? formatDateTime(item.uploadTime) : formatDateTime(item.lastModified)
              }}</span>
            </div>

            <!-- 卡片快捷操作按钮组 -->
            <div class="card-actions-bar">
              <el-button
                type="primary"
                size="small"
                @click="handleCopyUrl(item)"
                class="btn-copy-link"
              >
                复制外链
              </el-button>

              <el-dropdown trigger="hover" @command="(cmd: string) => handleCopySpecific(item, cmd)">
                <el-button size="small" type="info" plain class="btn-dropdown-format">
                  格式 ▾
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="raw">复制 原始链接</el-dropdown-item>
                    <el-dropdown-item command="markdown">复制 Markdown</el-dropdown-item>
                    <el-dropdown-item command="html">复制 HTML 标签</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>

              <el-button
                type="danger"
                link
                size="small"
                @click="handleDelete(item)"
                class="btn-del-file"
                title="删除"
              >
                🗑️
              </el-button>
            </div>
          </div>
        </div>
      </div>

      <!-- 模式二：详细表格视图 (Table Mode) -->
      <div v-else class="files-table-wrapper">
        <table class="custom-table">
          <thead>
            <tr>
              <th width="70">缩略图</th>
              <th>文件名 / 对象 Key</th>
              <th width="120">大小</th>
              <th width="180">时间</th>
              <th width="200" style="text-align: right">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in paginatedList" :key="item.key">
              <td>
                <div class="table-thumb" @click="handlePreviewImage(item.url)">
                  <img
                    :src="item.url"
                    :alt="item.name"
                    class="thumb-img"
                    loading="lazy"
                    @error="onImageError"
                  />
                </div>
              </td>
              <td>
                <div class="table-name-cell">
                  <span class="main-name" :title="item.name">{{ item.name }}</span>
                  <span class="sub-key" :title="item.key">{{ item.key }}</span>
                </div>
              </td>
              <td>
                <div class="table-size-cell">
                  <span>{{ formatBytes(item.size) }}</span>
                  <span
                    v-if="'isCompressed' in item && item.isCompressed"
                    class="compress-tag"
                  >
                    已压缩 ({{ formatBytes(item.compressedSize || item.size) }})
                  </span>
                </div>
              </td>
              <td>
                <span class="time-text">
                  {{ 'uploadTime' in item ? formatDateTime(item.uploadTime) : formatDateTime(item.lastModified) }}
                </span>
              </td>
              <td>
                <div class="table-action-group">
                  <el-button type="primary" link size="small" @click="handleCopyUrl(item)">
                    复制链接
                  </el-button>
                  <el-dropdown trigger="hover" @command="(cmd: string) => handleCopySpecific(item, cmd)">
                    <el-button link size="small" type="info">▾</el-button>
                    <template #dropdown>
                      <el-dropdown-menu>
                        <el-dropdown-item command="raw">复制 原始链接</el-dropdown-item>
                        <el-dropdown-item command="markdown">复制 Markdown</el-dropdown-item>
                        <el-dropdown-item command="html">复制 HTML 标签</el-dropdown-item>
                      </el-dropdown-menu>
                    </template>
                  </el-dropdown>
                  <el-button type="danger" link size="small" @click="handleDelete(item)">
                    {{ activeTab === 'history' ? '移除' : '删除' }}
                  </el-button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 全屏大图预览 -->
    <el-image-viewer
      v-if="showImageViewer"
      :url-list="previewList"
      :initial-index="0"
      @close="showImageViewer = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { ElMessageBox } from 'element-plus';
import { useStorage, getProviderStatus } from '../composables/useStorage';
import { PROVIDERS_META } from '../utils/providers';
import { formatBytes, formatDateTime, formatOutputUrl } from '../utils/format';
import { copyToClipboard } from '../utils/clipboard';
import type { UploadRecord, RemoteFileItem, UrlFormat } from '../types';

const {
  currentProvider,
  activeTab,
  viewMode,
  searchKeyword,
  historyList,
  remoteList,
  isLoadingRemote,
  urlFormat,
  loadRemoteFiles,
  removeHistoryItem,
  clearAllHistory,
  deleteRemoteFile,
} = useStorage();

const currentMeta = computed(() => {
  return PROVIDERS_META.find((p) => p.id === currentProvider.value) || PROVIDERS_META[0];
});

const isCurrentReady = computed(() => {
  return getProviderStatus(currentProvider.value) === 'ready';
});

const currentPage = ref(1);
const pageSize = ref(24);

const showImageViewer = ref(false);
const previewList = ref<string[]>([]);

// 过滤后的数据源
const filteredList = computed<(UploadRecord | RemoteFileItem)[]>(() => {
  const source = activeTab.value === 'history' ? historyList.value : remoteList.value;
  if (!searchKeyword.value.trim()) return source;
  const kw = searchKeyword.value.toLowerCase().trim();
  return source.filter(
    (item) => item.name.toLowerCase().includes(kw) || item.key.toLowerCase().includes(kw)
  );
});

// 分页切片
const paginatedList = computed<(UploadRecord | RemoteFileItem)[]>(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  const end = start + pageSize.value;
  return filteredList.value.slice(start, end);
});

const handleRefreshRemote = () => {
  loadRemoteFiles();
};

const handleClearHistory = () => {
  ElMessageBox.confirm('确定要清空全部本地上传历史吗？此操作不会删除远端 S3 文件。', '清空确认', {
    type: 'warning',
    confirmButtonText: '确定清空',
    cancelButtonText: '取消',
  }).then(() => {
    clearAllHistory();
  });
};

const handleCopyUrl = (item: UploadRecord | RemoteFileItem) => {
  const formatted = formatOutputUrl(item.url, item.name, urlFormat.value);
  copyToClipboard(formatted);
};

const handleCopySpecific = (item: UploadRecord | RemoteFileItem, format: string) => {
  const formatted = formatOutputUrl(item.url, item.name, format as UrlFormat);
  copyToClipboard(formatted);
};

const handlePreviewImage = (url: string) => {
  previewList.value = [url];
  showImageViewer.value = true;
};

const handleDelete = (item: UploadRecord | RemoteFileItem) => {
  if (activeTab.value === 'history') {
    ElMessageBox.confirm(`确定从本地历史中移除「${item.name}」吗？`, '移除记录', {
      type: 'info',
      confirmButtonText: '移除',
      cancelButtonText: '取消',
    }).then(() => {
      const record = item as UploadRecord;
      removeHistoryItem(record.id);
    });
  } else {
    ElMessageBox.confirm(
      `警告：此操作将直接调用 S3 接口永久删除远端对象「${item.key}」，不可恢复！是否继续？`,
      '删除远端 S3 文件',
      {
        type: 'warning',
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        confirmButtonClass: 'el-button--danger',
      }
    ).then(async () => {
      await deleteRemoteFile(item.key);
    });
  }
};

const onImageError = (e: Event) => {
  const target = e.target as HTMLImageElement;
  target.src =
    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 60 60"><rect width="60" height="60" fill="%23f1f5f9"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="10" fill="%2394a3b8">暂无预览</text></svg>';
};
</script>

<style scoped>
.file-list-section {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 控制栏 */
.list-control-header {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 12px 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
}

.header-left-tools {
  display: flex;
  align-items: center;
  gap: 12px;
}

.view-mode-toggle {
  display: flex;
  background-color: #f1f5f9;
  border-radius: 8px;
  padding: 2px;
}

.mode-btn {
  background: transparent;
  border: none;
  font-size: 12px;
  color: #64748b;
  padding: 4px 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.mode-btn.is-active {
  background-color: #ffffff;
  color: #0284c7;
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.total-badge {
  font-size: 12px;
  color: #94a3b8;
  font-weight: 500;
}

.header-right-tools {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* 网格卡片模式 */
.files-grid-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
}

.file-grid-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.02);
  display: flex;
  flex-direction: column;
  transition: transform 0.2s, box-shadow 0.2s;
}

.file-grid-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.06);
  border-color: #cbd5e1;
}

.card-thumb-wrap {
  width: 100%;
  height: 140px;
  background-color: #f8fafc;
  position: relative;
  cursor: pointer;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.25s;
}

.card-thumb-wrap:hover .card-img {
  transform: scale(1.06);
}

.card-mask {
  position: absolute;
  inset: 0;
  background-color: rgba(15, 23, 42, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
}

.card-thumb-wrap:hover .card-mask {
  opacity: 1;
}

.zoom-text {
  color: #ffffff;
  font-size: 12px;
  font-weight: 600;
  background: rgba(0, 0, 0, 0.5);
  padding: 4px 10px;
  border-radius: 20px;
}

.compressed-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  background-color: #10b981;
  color: #ffffff;
  font-size: 9px;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 600;
}

.card-info-wrap {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.card-filename {
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-meta-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
  color: #94a3b8;
}

.card-actions-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
}

.btn-copy-link {
  flex: 1;
}

.btn-del-file {
  color: #ef4444 !important;
  font-size: 14px;
}

/* 列表表格模式 */
.files-table-wrapper {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow-x: auto;
}

.custom-table {
  width: 100%;
  border-collapse: collapse;
}

.custom-table th {
  padding: 12px 16px;
  font-size: 12px;
  color: #64748b;
  font-weight: 600;
  background-color: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  text-align: left;
}

.custom-table td {
  padding: 12px 16px;
  border-bottom: 1px solid #f1f5f9;
  font-size: 13px;
  color: #334155;
  vertical-align: middle;
}

.table-thumb {
  width: 44px;
  height: 44px;
  border-radius: 6px;
  overflow: hidden;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  cursor: pointer;
}

.thumb-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.table-name-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-width: 320px;
}

.main-name {
  font-weight: 600;
  color: #0f172a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sub-key {
  font-size: 11px;
  color: #94a3b8;
  font-family: monospace;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.compress-tag {
  font-size: 10px;
  color: #10b981;
  background-color: #ecfdf5;
  padding: 1px 4px;
  border-radius: 3px;
}

.table-action-group {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 0;
  color: #94a3b8;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 8px;
}

.empty-text {
  font-size: 14px;
}
</style>
