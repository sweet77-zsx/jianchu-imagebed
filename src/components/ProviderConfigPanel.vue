<template>
  <div class="provider-config-panel">
    <!-- 顶部厂商概览卡片 (对标截图浮岛设计) -->
    <div class="panel-header-card">
      <div class="header-left">
        <span class="provider-big-icon">{{ currentMeta.icon }}</span>
        <div class="provider-meta-info">
          <div class="title-row">
            <h2 class="provider-heading">{{ currentMeta.name }}</h2>
            <span class="provider-tag-badge">{{ currentMeta.tag }}</span>
            <span
              class="status-pill"
              :class="`status-${currentProviderStatus}`"
            >
              <span class="dot"></span>
              {{ statusText }}
            </span>
          </div>
          <p class="provider-desc">{{ currentMeta.description }}</p>
        </div>
      </div>

      <!-- 右侧快速操作按钮组 -->
      <div class="header-right-actions">
        <el-button
          v-if="activeUploadProvider !== currentProvider"
          type="primary"
          plain
          size="default"
          @click="handleSetAsDefault"
          title="将此云厂商设为默认上传存储桶"
        >
          设为默认上传源
        </el-button>
        <span v-else class="active-default-pill">
          ✓ 当前默认上传源
        </span>

        <el-button
          type="success"
          size="default"
          :loading="isTesting"
          @click="handleTestCurrentConnection"
        >
          连通性测试
        </el-button>
      </div>
    </div>

    <!-- 主配置表单卡片 -->
    <div class="panel-form-card">
      <el-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-width="110px"
        label-position="right"
        class="custom-modern-form"
      >
        <div class="form-grid-layout">
          <!-- 1. Access Key -->
          <el-form-item label="Access Key" prop="accessKey">
            <el-input
              v-model="formData.accessKey"
              :placeholder="`请输入 ${currentMeta.name} Access Key / API 账号`"
              clearable
            />
          </el-form-item>

          <!-- 2. Secret Key -->
          <el-form-item label="Secret Key" prop="secretKey">
            <el-input
              v-model="formData.secretKey"
              type="password"
              show-password
              :placeholder="`请输入 ${currentMeta.name} Secret Key / 密钥`"
              clearable
            />
          </el-form-item>

          <!-- 3. Bucket 空间名称 -->
          <el-form-item label="Bucket 空间" prop="bucket">
            <el-input
              v-model="formData.bucket"
              :placeholder="`请输入 ${currentMeta.name} 存储桶/空间名称`"
              clearable
            />
          </el-form-item>

          <!-- 4. 服务端点 Endpoint -->
          <el-form-item label="服务端点" prop="endpoint">
            <div class="endpoint-input-group">
              <el-input
                v-model="formData.endpoint"
                :placeholder="`例如: ${currentMeta.defaultEndpoint || 'https://s3.region.amazonaws.com'}`"
                clearable
              />
              <el-select
                v-if="currentProvider === 'qiniu'"
                v-model="selectedQiniuRegion"
                placeholder="切换七牛区域"
                style="width: 140px; margin-left: 8px"
                @change="onQiniuRegionSelect"
              >
                <el-option label="华东(浙江)" value="s3-cn-east-1" />
                <el-option label="华东(浙江2)" value="s3-cn-east-2" />
                <el-option label="华北(河北)" value="s3-cn-north-1" />
                <el-option label="华南(广东)" value="s3-cn-south-1" />
                <el-option label="北美(洛杉矶)" value="s3-us-north-1" />
                <el-option label="亚太(新加坡)" value="s3-ap-southeast-1" />
              </el-select>
            </div>
            <div v-if="formData.forcePathStyle" class="path-style-tip">
              已启用路径风格 (Path-Style)，直连网关以彻底避免 SSL 通配符证书及 DNS 问题
            </div>
          </el-form-item>

          <!-- 5. 存储区域 Region -->
          <el-form-item label="存储区域" prop="region">
            <el-input
              v-model="formData.region"
              placeholder="例如: cn-east-1 或 us-east-1"
              clearable
            />
          </el-form-item>

          <!-- 6. 自定义 CDN 域名 -->
          <el-form-item label="访问域名" prop="domain">
            <el-input
              v-model="formData.domain"
              placeholder="例如: https://img.yourdomain.com"
              clearable
            />
          </el-form-item>

          <!-- 7. 资源前缀 -->
          <el-form-item label="资源前缀" prop="prefix">
            <el-input
              v-model="formData.prefix"
              placeholder="默认: image"
              clearable
            />
          </el-form-item>

          <!-- 8. 资源 Scope -->
          <el-form-item label="资源Scope" prop="scope">
            <el-input
              v-model="formData.scope"
              placeholder="默认: default"
              clearable
            />
          </el-form-item>
        </div>

        <!-- 9. 资源外链模板与实时预览 (高亮红色，对标原设计) -->
        <el-form-item label="外链生成预览">
          <div class="url-preview-box">
            <div class="rendered-url">{{ previewUrl }}</div>
            <el-input
              v-model="formData.urlTemplate"
              size="small"
              placeholder="${domain}/${prefix}/${scope}/${name}"
              style="margin-top: 6px"
            >
              <template #prepend>链接模板</template>
            </el-input>
            <div class="template-tags-hint">
              支持变量：<code>${domain}</code>、<code>${prefix}</code>、<code>${scope}</code>、<code>${name}</code>、<code>${key}</code>
            </div>
          </div>
        </el-form-item>

        <!-- 10. 过期时间 -->
        <el-form-item label="过期时间" prop="expireTime">
          <div class="expire-row">
            <el-date-picker
              v-model="formData.expireTime"
              type="datetime"
              placeholder="选择过期时间"
              format="YYYY-MM-DD HH:mm:ss"
              value-format="YYYY-MM-DD HH:mm:ss"
              style="width: 220px"
            />
            <el-button-group class="quick-expire-group">
              <el-button size="small" @click="setQuickExpire(30)">+30天</el-button>
              <el-button size="small" @click="setQuickExpire(365)">+1年</el-button>
              <el-button size="small" @click="setQuickExpire(3650)">长期有效</el-button>
            </el-button-group>
          </div>
        </el-form-item>

        <!-- 11. 路径风格与持久化选项 -->
        <div class="form-checkbox-row">
          <el-checkbox v-model="formData.forcePathStyle">
            强制路径风格 (Force Path-Style)
          </el-checkbox>
          <el-checkbox v-model="formData.saveAccount">
            本地持久化保存账号 (存入浏览器 localStorage)
          </el-checkbox>
        </div>

        <!-- 底部提交操作行 -->
        <div class="form-bottom-actions">
          <el-button
            type="primary"
            class="btn-save-provider"
            @click="handleSaveConfig"
          >
            保存并应用当前配置
          </el-button>
          <el-button @click="handleResetDefault">
            重置为初始模版
          </el-button>
        </div>
      </el-form>

      <!-- 查看当前厂商生效 JSON 配置 (折叠面板) -->
      <div class="config-json-collapse">
        <el-collapse>
          <el-collapse-item title="▼ 查看生效配置 JSON" name="1">
            <pre class="json-code-box"><code>{{ effectiveConfigJson }}</code></pre>
          </el-collapse-item>
        </el-collapse>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue';
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus';
import { useStorage } from '../composables/useStorage';
import { PROVIDERS_META, createDefaultConfig } from '../utils/providers';
import { renderUrlTemplate } from '../utils/format';
import { s3AdapterInstance } from '../services/s3Adapter';
import type { TokenConfig } from '../types';

const {
  multiConfigs,
  currentProvider,
  activeUploadProvider,
  currentProviderStatus,
  saveProviderConfig,
  setAsActiveUploadProvider,
} = useStorage();

const formRef = ref<FormInstance | null>(null);
const isTesting = ref(false);
const selectedQiniuRegion = ref('s3-cn-east-1');

// 当前厂商元数据
const currentMeta = computed(() => {
  return PROVIDERS_META.find((p) => p.id === currentProvider.value) || PROVIDERS_META[0];
});

// 本地编辑表单数据
const formData = reactive<TokenConfig>({ ...createDefaultConfig('qiniu') });

// 当左侧切换厂商时，将当前厂商数据同步到表单
watch(
  currentProvider,
  (val) => {
    const target = multiConfigs[val];
    if (target) {
      Object.assign(formData, target);
      if (val === 'qiniu' || val === 'minio') {
        formData.forcePathStyle = true;
      }
    }
  },
  { immediate: true }
);

// 连通状态文案
const statusText = computed(() => {
  if (currentProviderStatus.value === 'ready') return '凭证有效';
  if (currentProviderStatus.value === 'expired') return 'Token已过期';
  return '未配置完整';
});

// 实时预览外链
const previewUrl = computed(() => {
  const tpl = formData.urlTemplate || '${domain}/${prefix}/${scope}/${name}';
  return renderUrlTemplate(tpl, {
    domain: formData.domain || 'https://img.wlmworld.top',
    prefix: formData.prefix || 'image',
    scope: formData.scope || 'default',
    name: 'beef929a-f3c6-48e9-b7e7-e98e22985b5d.svg',
    key: `${formData.prefix || 'image'}/${formData.scope || 'default'}/beef929a-f3c6-48e9-b7e7-e98e22985b5d.svg`,
  });
});

// 格式化输出 JSON
const effectiveConfigJson = computed(() => {
  return JSON.stringify(
    {
      provider: formData.provider,
      bucket: formData.bucket,
      endpoint: formData.endpoint,
      region: formData.region,
      domain: formData.domain,
      prefix: formData.prefix,
      scope: formData.scope,
      urlTemplate: formData.urlTemplate,
      forcePathStyle: formData.forcePathStyle,
      expireTime: formData.expireTime,
    },
    null,
    2
  );
});

// 表单验证规则
const formRules: FormRules = {
  accessKey: [{ required: true, message: '请输入 Access Key', trigger: 'blur' }],
  secretKey: [{ required: true, message: '请输入 Secret Key', trigger: 'blur' }],
  bucket: [{ required: true, message: '请输入 Bucket 空间名称', trigger: 'blur' }],
};

const onQiniuRegionSelect = (regionVal: string) => {
  formData.endpoint = `https://${regionVal}.qiniucs.com`;
  formData.region = regionVal.replace('s3-', '');
  formData.forcePathStyle = true;
};

const setQuickExpire = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const pad = (n: number) => (n < 10 ? '0' + n : String(n));
  formData.expireTime = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} 23:59:59`;
};

// 设为默认上传源
const handleSetAsDefault = () => {
  handleSaveConfig();
  setAsActiveUploadProvider(currentProvider.value);
};

// 保存当前厂商配置
const handleSaveConfig = async () => {
  if (!formRef.value) return;
  await formRef.value.validate((valid) => {
    if (valid) {
      saveProviderConfig(currentProvider.value, { ...formData });
    } else {
      ElMessage.warning('请检查必填项是否填写完整');
    }
  });
};

// 重置当前厂商配置
const handleResetDefault = () => {
  Object.assign(formData, createDefaultConfig(currentProvider.value));
  ElMessage.info('已恢复为初始模版');
};

// 测试当前厂商连通性 (带智能七牛多区域探测)
const handleTestCurrentConnection = async () => {
  if (!formData.accessKey || !formData.secretKey || !formData.bucket) {
    ElMessage.warning('请先完整填写 Access Key、Secret Key 与 Bucket 空间名');
    return;
  }

  isTesting.value = true;
  try {
    s3AdapterInstance.init(formData);
    ElMessage.info(`正在连接测试【${currentMeta.value.name}】...`);
    const res = await s3AdapterInstance.testConnection();

    if (res.success) {
      ElMessage.success(res.message);
      return;
    }

    // 若七牛云失败，启动区域智能探测
    if (currentProvider.value === 'qiniu') {
      const QINIU_LIST = [
        { label: '华东(浙江)', region: 'cn-east-1', endpoint: 'https://s3-cn-east-1.qiniucs.com' },
        { label: '华东(浙江2)', region: 'cn-east-2', endpoint: 'https://s3-cn-east-2.qiniucs.com' },
        { label: '华北(河北)', region: 'cn-north-1', endpoint: 'https://s3-cn-north-1.qiniucs.com' },
        { label: '华南(广东)', region: 'cn-south-1', endpoint: 'https://s3-cn-south-1.qiniucs.com' },
        { label: '北美(洛杉矶)', region: 'us-north-1', endpoint: 'https://s3-us-north-1.qiniucs.com' },
        { label: '亚太(新加坡)', region: 'ap-southeast-1', endpoint: 'https://s3-ap-southeast-1.qiniucs.com' },
      ];

      for (const item of QINIU_LIST) {
        if (item.endpoint === formData.endpoint) continue;

        s3AdapterInstance.init({
          ...formData,
          region: item.region,
          endpoint: item.endpoint,
          forcePathStyle: true,
        });

        const testRes = await s3AdapterInstance.testConnection();
        if (testRes.success) {
          ElMessageBox.confirm(
            `智能匹配成功！检测到您的空间「${formData.bucket}」位于【${item.label} (${item.region})】。<br/>是否立即自动将端点切换为：<br/><code>${item.endpoint}</code>？`,
            '空间所属区域自动识别',
            {
              dangerouslyUseHTMLString: true,
              confirmButtonText: '一键切换并保存',
              cancelButtonText: '取消',
              type: 'success',
            }
          ).then(() => {
            formData.region = item.region;
            formData.endpoint = item.endpoint;
            selectedQiniuRegion.value = `s3-${item.region}`;
            formData.forcePathStyle = true;
            saveProviderConfig(currentProvider.value, { ...formData });
            ElMessage.success(`已切换至【${item.label}】并自动保存！`);
          });
          return;
        }
      }
      s3AdapterInstance.init(formData);
    }

    ElMessage.error(res.message);
  } finally {
    isTesting.value = false;
  }
};
</script>

<style scoped>
.provider-config-panel {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

/* 顶部概览卡片 */
.panel-header-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 18px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.02);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.provider-big-icon {
  font-size: 32px;
  width: 52px;
  height: 52px;
  border-radius: 12px;
  background-color: #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: center;
}

.provider-meta-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.title-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.provider-heading {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
}

.provider-tag-badge {
  font-size: 11px;
  color: #0284c7;
  background-color: #e0f2fe;
  padding: 2px 8px;
  border-radius: 6px;
  font-weight: 500;
}

.status-pill {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 20px;
  font-weight: 500;
}

.status-pill .dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.status-ready {
  background-color: #ecfdf5;
  color: #059669;
}
.status-ready .dot {
  background-color: #10b981;
}

.status-expired {
  background-color: #fffbeb;
  color: #d97706;
}
.status-expired .dot {
  background-color: #f59e0b;
}

.status-unconfigured {
  background-color: #f1f5f9;
  color: #64748b;
}
.status-unconfigured .dot {
  background-color: #94a3b8;
}

.provider-desc {
  margin: 0;
  font-size: 12px;
  color: #64748b;
}

.header-right-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.active-default-pill {
  font-size: 12px;
  color: #059669;
  background-color: #ecfdf5;
  border: 1px solid #a7f3d0;
  padding: 6px 14px;
  border-radius: 8px;
  font-weight: 600;
}

/* 主表单卡片 */
.panel-form-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.02);
}

.form-grid-layout {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0 20px;
}

@media (max-width: 900px) {
  .form-grid-layout {
    grid-template-columns: 1fr;
  }
}

.endpoint-input-group {
  display: flex;
  width: 100%;
}

.path-style-tip {
  font-size: 11px;
  color: #10b981;
  margin-top: 4px;
  line-height: 1.4;
}

/* 外链预览框 */
.url-preview-box {
  width: 100%;
  background-color: #fafbfc;
  border: 1px solid #eef2f6;
  border-radius: 8px;
  padding: 10px 14px;
}

.rendered-url {
  color: #ef4444;
  font-weight: 600;
  font-size: 13px;
  word-break: break-all;
  font-family: Consolas, Monaco, monospace;
}

.template-tags-hint {
  font-size: 11px;
  color: #64748b;
  margin-top: 6px;
}

.template-tags-hint code {
  color: #0284c7;
  background: #e0f2fe;
  padding: 1px 4px;
  border-radius: 3px;
}

.expire-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.form-checkbox-row {
  display: flex;
  align-items: center;
  gap: 24px;
  margin: 16px 0 24px 110px;
}

.form-bottom-actions {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-left: 110px;
  margin-bottom: 20px;
}

.btn-save-provider {
  padding: 10px 28px;
  font-weight: 600;
}

/* JSON 折叠 */
.config-json-collapse {
  border-top: 1px solid #f1f5f9;
  padding-top: 12px;
}

:deep(.el-collapse) {
  border: none;
}

:deep(.el-collapse-item__header) {
  font-size: 13px;
  color: #64748b;
  border-bottom: none;
  height: 36px;
}

.json-code-box {
  background-color: #0f172a;
  color: #e2e8f0;
  border-radius: 8px;
  padding: 14px;
  font-family: Consolas, Monaco, monospace;
  font-size: 12px;
  line-height: 1.5;
  max-height: 200px;
  overflow-y: auto;
  margin: 0;
}
</style>
