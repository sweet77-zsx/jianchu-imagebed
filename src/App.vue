<template>
  <div class="cockpit-app-root">
    <!-- 左侧云厂商切换与功能侧边栏 (对标参考截图) -->
    <CockpitSidebar />

    <!-- 右侧主工作台区域 -->
    <div class="cockpit-main-area">
      <!-- 顶部工作台导航条 (对标参考截图顶部结构) -->
      <header class="cockpit-top-bar">
        <!-- 左侧标题与厂商切换 -->
        <div class="bar-left-section">
          <div class="current-provider-chip" @click="activeTab = 'config'" title="点击前往配置">
            <span class="chip-icon">{{ currentMeta.icon }}</span>
            <span class="chip-name">{{ currentMeta.name }}</span>
            <span class="chip-tag">{{ currentMeta.tag }}</span>
          </div>
          <span class="divider">/</span>
          <h1 class="page-title">{{ tabTitle }}</h1>
        </div>

        <!-- 中间浮岛式胶囊 Tab 切换栏 (100% 对齐截图设计) -->
        <div class="floating-capsule-tabs">
          <button
            class="capsule-tab-item"
            :class="{ 'is-active': activeTab === 'upload' }"
            @click="activeTab = 'upload'"
          >
            <span class="tab-icon">📤</span>
            <span class="tab-text">极速上传</span>
          </button>
          <button
            class="capsule-tab-item"
            :class="{ 'is-active': activeTab === 'config' }"
            @click="activeTab = 'config'"
          >
            <span class="tab-icon">🔑</span>
            <span class="tab-text">Token 配置</span>
          </button>
          <button
            class="capsule-tab-item"
            :class="{ 'is-active': activeTab === 'remote' }"
            @click="switchToRemoteTab"
          >
            <span class="tab-icon">☁️</span>
            <span class="tab-text">远端存储桶</span>
          </button>
          <button
            class="capsule-tab-item"
            :class="{ 'is-active': activeTab === 'history' }"
            @click="activeTab = 'history'"
          >
            <span class="tab-icon">📊</span>
            <span class="tab-text">本地历史</span>
          </button>
        </div>

        <!-- 右侧状态与版本标签 (对标截图) -->
        <div class="bar-right-section">
          <div class="security-hint-capsule" title="纯前端本地自用，无后端中转">
            <span class="hint-tag">安全</span>
            <span class="hint-text">AK/SK 本地存储 · 纯前端直传</span>
          </div>

          <div
            class="active-upload-badge"
            :title="`当前默认上传云存储：${activeUploadMeta.name}`"
            @click="jumpToUpload"
          >
            <span class="status-green-dot"></span>
            <span>默认: {{ activeUploadMeta.name }}</span>
          </div>
        </div>
      </header>

      <!-- 工作台主内容区 -->
      <main class="cockpit-content-container">
        <!-- 视图 1：Token 与多厂商配置面板 -->
        <transition name="fade-fast" mode="out-in">
          <div v-if="activeTab === 'config'" key="config" class="tab-content-wrap">
            <ProviderConfigPanel />
          </div>

          <!-- 视图 2：极速图片上传区域 -->
          <div v-else-if="activeTab === 'upload'" key="upload" class="tab-content-wrap">
            <UploadArea />
          </div>

          <!-- 视图 3/4：远端存储桶浏览 / 本地上传历史 -->
          <div v-else key="files" class="tab-content-wrap">
            <FileList />
          </div>
        </transition>
      </main>

      <!-- 底部微版权 -->
      <footer class="cockpit-footer">
        <span>简储 (JianChu) · 纯静态多云 S3 图床 · 仅限个人自用</span>
      </footer>
    </div>

    <!-- CORS 跨域配置帮助弹窗 -->
    <HelpModal />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import CockpitSidebar from './components/CockpitSidebar.vue';
import ProviderConfigPanel from './components/ProviderConfigPanel.vue';
import UploadArea from './components/UploadArea.vue';
import FileList from './components/FileList.vue';
import HelpModal from './components/HelpModal.vue';
import { useStorage, initGlobalStorage } from './composables/useStorage';
import { PROVIDERS_META } from './utils/providers';

const { currentProvider, activeUploadProvider, activeTab, loadRemoteFiles } = useStorage();

const currentMeta = computed(() => {
  return PROVIDERS_META.find((p) => p.id === currentProvider.value) || PROVIDERS_META[0];
});

const activeUploadMeta = computed(() => {
  return PROVIDERS_META.find((p) => p.id === activeUploadProvider.value) || PROVIDERS_META[0];
});

const tabTitle = computed(() => {
  switch (activeTab.value) {
    case 'config':
      return 'Token 与参数配置';
    case 'upload':
      return '图片极速上传';
    case 'remote':
      return '远端存储桶文件浏览';
    case 'history':
      return '本地历史上传记录';
    default:
      return '控制台';
  }
});

const switchToRemoteTab = () => {
  activeTab.value = 'remote';
  loadRemoteFiles();
};

const jumpToUpload = () => {
  activeTab.value = 'upload';
};

onMounted(() => {
  initGlobalStorage();
});
</script>

<style scoped>
.cockpit-app-root {
  display: flex;
  min-height: 100vh;
  width: 100%;
  background: linear-gradient(135deg, #f0fdf4 0%, #f0f9ff 50%, #f8fafc 100%);
  color: #0f172a;
}

/* 右侧主工作区 */
.cockpit-main-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  height: 100vh;
  overflow-y: auto;
}

/* 顶部工作台顶栏 */
.cockpit-top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 32px;
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(226, 232, 240, 0.8);
  position: sticky;
  top: 0;
  z-index: 50;
  gap: 16px;
  flex-wrap: wrap;
}

.bar-left-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.current-provider-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  background-color: #f1f5f9;
  padding: 6px 12px;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid #e2e8f0;
}

.current-provider-chip:hover {
  background-color: #e0f2fe;
  border-color: #0284c7;
}

.chip-icon {
  font-size: 16px;
}

.chip-name {
  font-size: 14px;
  font-weight: 700;
  color: #1e293b;
}

.chip-tag {
  font-size: 11px;
  color: #64748b;
  background: #ffffff;
  padding: 1px 6px;
  border-radius: 4px;
}

.divider {
  color: #cbd5e1;
  font-size: 15px;
}

.page-title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
}

/* 浮岛式胶囊 Tab (对标参考截图) */
.floating-capsule-tabs {
  display: flex;
  align-items: center;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  padding: 4px 6px;
  border-radius: 30px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.04);
  gap: 4px;
}

.capsule-tab-item {
  display: flex;
  align-items: center;
  gap: 8px;
  background: transparent;
  border: none;
  padding: 8px 18px;
  border-radius: 22px;
  font-size: 14px;
  font-weight: 500;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s ease;
}

.capsule-tab-item:hover {
  color: #0284c7;
}

.capsule-tab-item.is-active {
  background-color: #0284c7;
  color: #ffffff;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(2, 132, 199, 0.3);
}

.tab-icon {
  font-size: 15px;
}

/* 顶部右侧徽标 */
.bar-right-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.security-hint-capsule {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 13px;
}

.hint-tag {
  background: #e0f2fe;
  color: #0284c7;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 7px;
  border-radius: 10px;
}

.hint-text {
  color: #64748b;
}

.active-upload-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  background-color: #ecfdf5;
  border: 1px solid #a7f3d0;
  color: #059669;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.active-upload-badge:hover {
  background-color: #d1fae5;
}

.status-green-dot {
  width: 8px;
  height: 8px;
  background-color: #10b981;
  border-radius: 50%;
  box-shadow: 0 0 6px rgba(16, 185, 129, 0.6);
}

/* 主内容区 */
.cockpit-content-container {
  flex: 1;
  padding: 28px 36px;
  max-width: 1400px;
  width: 100%;
  margin: 0 auto;
}

.tab-content-wrap {
  width: 100%;
}

.cockpit-footer {
  text-align: center;
  padding: 16px 0 24px;
  font-size: 11px;
  color: #94a3b8;
  margin-top: auto;
}

.fade-fast-enter-active,
.fade-fast-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.fade-fast-enter-from {
  opacity: 0;
  transform: translateY(4px);
}

.fade-fast-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
