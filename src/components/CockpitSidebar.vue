<template>
  <aside class="cockpit-sidebar">
    <!-- 顶部主操作按钮（对标参考截图的蓝色更新大按钮） -->
    <div class="sidebar-top-action">
      <button class="btn-sidebar-primary" @click="handlePrimaryAction" title="快速上传或更新凭证">
        <span class="btn-icon">⚡</span>
        <span class="btn-text">{{ activeTab === 'upload' ? '更新凭证' : '快速上传' }}</span>
      </button>
    </div>

    <!-- 品牌标志 -->
    <div class="sidebar-brand">
      <div class="brand-logo-wrap">
        <img src="/favicon.svg" alt="简储 Logo" class="brand-svg-logo" />
      </div>
      <div class="brand-info">
        <div class="brand-name">简储 Cockpit</div>
        <div class="brand-desc">纯静态多云 S3 图床</div>
      </div>
    </div>

    <!-- 导航菜单区域 -->
    <div class="sidebar-nav-scroll">
      <!-- 分组标题：云存储厂商切换（核心需求：支持同时设置多个云厂商的token，通过左边进行切换查看） -->
      <div class="nav-section-title">
        <span>云存储厂商 (S3)</span>
        <span class="provider-count">{{ PROVIDERS_META.length }}</span>
      </div>

      <div class="providers-menu-list">
        <div
          v-for="provider in PROVIDERS_META"
          :key="provider.id"
          class="provider-menu-item"
          :class="{
            'is-active': currentProvider === provider.id,
            'is-default-upload': activeUploadProvider === provider.id,
          }"
          @click="onSelectProvider(provider.id)"
          :title="`${provider.name} - 点击切换查看或配置`"
        >
          <!-- 厂商图标 -->
          <span class="provider-icon">{{ provider.icon }}</span>

          <!-- 厂商名称与标签 -->
          <div class="provider-label-wrap">
            <div class="provider-title">
              <span class="name-text">{{ provider.name }}</span>
              <span v-if="activeUploadProvider === provider.id" class="badge-active-tag">默认</span>
            </div>
            <span class="provider-tag-sub">{{ provider.tag }}</span>
          </div>

          <!-- 连通性状态指示圆点 -->
          <div class="status-indicator" :title="getStatusTitle(provider.id)">
            <span
              class="status-dot"
              :class="`dot-${getProviderStatus(provider.id)}`"
            ></span>
          </div>
        </div>
      </div>

      <!-- 快速导航入口 -->
      <div class="nav-section-title" style="margin-top: 24px">
        <span>工作台快捷入口</span>
      </div>

      <div class="quick-nav-list">
        <div
          class="quick-nav-item"
          :class="{ 'is-active': activeTab === 'upload' }"
          @click="activeTab = 'upload'"
        >
          <span class="nav-item-icon">📤</span>
          <span class="nav-item-text">极速上传区域</span>
        </div>
        <div
          class="quick-nav-item"
          :class="{ 'is-active': activeTab === 'remote' }"
          @click="switchToRemoteTab"
        >
          <span class="nav-item-icon">☁️</span>
          <span class="nav-item-text">远端存储桶浏览</span>
        </div>
        <div
          class="quick-nav-item"
          :class="{ 'is-active': activeTab === 'history' }"
          @click="activeTab = 'history'"
        >
          <span class="nav-item-icon">📊</span>
          <span class="nav-item-text">本地上传历史 ({{ historyList.length }})</span>
        </div>
      </div>
    </div>

    <!-- 底部功能区域（对标截图的 2FA管理、日志、设置） -->
    <div class="sidebar-footer">
      <a class="footer-link-item" href="javascript:void(0)" @click="openCorsHelp" title="查看跨域配置教程">
        <span class="footer-icon">🛡️</span>
        <span class="footer-text">CORS 跨域配置指南</span>
      </a>
      <a
        class="footer-link-item"
        href="https://github.com/sweet77-zsx/jianchu-imagebed"
        target="_blank"
        rel="noopener noreferrer"
        title="查看开源仓库"
      >
        <span class="footer-icon">
          <svg height="15" width="15" viewBox="0 0 16 16" fill="currentColor">
            <path
              d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"
            />
          </svg>
        </span>
        <span class="footer-text">GitHub 仓库</span>
      </a>
      <div class="footer-version-tag">
        <span>简储 Cockpit v1.0.0</span>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { useStorage, getProviderStatus } from '../composables/useStorage';
import { PROVIDERS_META } from '../utils/providers';
import type { StorageProvider } from '../types';

const {
  currentProvider,
  activeUploadProvider,
  activeTab,
  historyList,
  isHelpModalVisible,
  switchCurrentProvider,
  loadRemoteFiles,
} = useStorage();

const onSelectProvider = (provider: StorageProvider) => {
  switchCurrentProvider(provider);
};

const switchToRemoteTab = () => {
  activeTab.value = 'remote';
  loadRemoteFiles();
};

const handlePrimaryAction = () => {
  if (activeTab.value === 'upload') {
    activeTab.value = 'config';
  } else {
    activeTab.value = 'upload';
  }
};

const openCorsHelp = () => {
  isHelpModalVisible.value = true;
};

const getStatusTitle = (provider: StorageProvider) => {
  const status = getProviderStatus(provider);
  if (status === 'ready') return '凭证有效且已配置';
  if (status === 'expired') return 'Token 凭证已过期';
  return '未配置 AK/SK';
};
</script>

<style scoped>
.cockpit-sidebar {
  width: 250px;
  background-color: #f8fafc;
  border-right: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  height: 100vh;
  position: sticky;
  top: 0;
  flex-shrink: 0;
  user-select: none;
}

/* 顶部操作大按钮（对标参考截图） */
.sidebar-top-action {
  padding: 18px 16px 12px;
}

.btn-sidebar-primary {
  width: 100%;
  background: linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%);
  color: #ffffff;
  border: none;
  padding: 10px 16px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: 0 4px 12px rgba(14, 165, 233, 0.28);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.btn-sidebar-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(14, 165, 233, 0.38);
  background: linear-gradient(135deg, #38bdf8 0%, #1d4ed8 100%);
}

.btn-sidebar-primary:active {
  transform: translateY(0);
}

/* 品牌区 */
.sidebar-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 16px 16px;
  border-bottom: 1px solid #eef2f6;
}

.brand-logo-wrap {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
}

.brand-svg-logo {
  width: 26px;
  height: 26px;
}

.brand-name {
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: -0.2px;
}

.brand-desc {
  font-size: 11px;
  color: #64748b;
}

/* 滚动菜单 */
.sidebar-nav-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 14px 12px;
}

.nav-section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
  font-weight: 600;
  color: #94a3b8;
  padding: 0 8px 8px;
  letter-spacing: 0.4px;
  text-transform: uppercase;
}

.provider-count {
  background-color: #e2e8f0;
  color: #475569;
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 10px;
}

/* 云厂商列表 */
.providers-menu-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.provider-menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  border-radius: 9px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.provider-menu-item:hover {
  background-color: #f1f5f9;
}

/* 当前查看选中状态（对标参考截图的高亮蓝底胶囊） */
.provider-menu-item.is-active {
  background-color: #e0f2fe;
  color: #0284c7;
}

.provider-icon {
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
}

.provider-label-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.provider-title {
  display: flex;
  align-items: center;
  gap: 6px;
}

.name-text {
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.provider-menu-item.is-active .name-text {
  color: #0284c7;
}

.provider-tag-sub {
  font-size: 10px;
  color: #94a3b8;
  margin-top: 1px;
}

.badge-active-tag {
  font-size: 9px;
  background-color: #10b981;
  color: #ffffff;
  padding: 0 4px;
  border-radius: 4px;
  font-weight: 500;
  line-height: 14px;
}

/* 状态小圆点 */
.status-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}

.dot-ready {
  background-color: #10b981;
  box-shadow: 0 0 6px rgba(16, 185, 129, 0.4);
}

.dot-expired {
  background-color: #f59e0b;
}

.dot-unconfigured {
  background-color: #cbd5e1;
}

/* 快捷入口 */
.quick-nav-list {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.quick-nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 13px;
  color: #475569;
  cursor: pointer;
  transition: all 0.2s;
}

.quick-nav-item:hover {
  background-color: #f1f5f9;
  color: #1e293b;
}

.quick-nav-item.is-active {
  background-color: #e2e8f0;
  font-weight: 600;
  color: #0f172a;
}

.nav-item-icon {
  font-size: 15px;
}

/* 底部功能条 */
.sidebar-footer {
  padding: 14px 16px;
  border-top: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background-color: #f8fafc;
}

.footer-link-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #64748b;
  text-decoration: none;
  padding: 4px 6px;
  border-radius: 6px;
  transition: all 0.2s;
}

.footer-link-item:hover {
  background-color: #f1f5f9;
  color: #0284c7;
}

.footer-version-tag {
  font-size: 10px;
  color: #94a3b8;
  margin-top: 4px;
  text-align: center;
}
</style>
