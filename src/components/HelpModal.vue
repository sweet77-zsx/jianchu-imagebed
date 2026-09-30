<template>
  <el-dialog
    v-model="isHelpModalVisible"
    title="S3 对象存储配置与 CORS 跨域配置指南"
    width="680px"
    class="help-dialog"
  >
    <div class="help-body">
      <el-alert
        title="重要安全提示"
        type="warning"
        description="本项目为纯前端方案，凭证存储在本地浏览器 localStorage，仅供个人自用。请勿公网部署以免泄露密钥；建议仅授予 S3 桶对应前缀的 PutObject/GetObject/DeleteObject 最小权限。"
        show-icon
        :closable="false"
        style="margin-bottom: 16px;"
      />

      <el-tabs v-model="activeTab">
        <!-- 标签1：CORS 跨域配置（最核心） -->
        <el-tab-pane label="Bucket CORS 跨域配置" name="cors">
          <div class="guide-section">
            <p class="guide-p">
              ⚠️ <b>为什么必须配置 CORS？</b><br />
              纯前端浏览器直接请求 S3 域名（PUT/GET/DELETE）属于跨域请求。如果存储桶未放行 CORS，浏览器会直接拦截请求并报错 <code>Failed to fetch</code>。
            </p>
            <div class="code-header">
              <span>推荐 CORS 跨域规则 JSON 配置：</span>
              <el-button type="primary" link size="small" @click="copyCorsJson">复制配置</el-button>
            </div>
            <pre class="code-block"><code>{{ corsJsonExample }}</code></pre>
            <div class="guide-note">
              <b>七牛云控制台配置路径与填写对照表：</b><br />
              1. 登录七牛云控制台 → 进入【对象存储 Kodo】→ 点击你的存储空间；<br />
              2. 切换到【空间设置】标签页 → 找到【跨域资源共享 (CORS)】→ 点击【设置】/【添加规则】；<br />
              3. 填写具体规则参数：
              <ul style="margin: 6px 0 0 16px;">
                <li><b>来源 (AllowedOrigins)</b>：填写 <code>*</code></li>
                <li><b>允许 Methods</b>：<span style="color: #f5222d; font-weight: bold;">务必勾选 PUT</span>，并勾选 <code>GET, POST, DELETE, HEAD</code></li>
                <li><b>允许 Headers</b>：填写 <code>*</code></li>
                <li><b>暴露 Headers (ExposeHeaders)</b>：填写 <code>ETag, x-amz-request-id, x-amz-id-2</code></li>
                <li><b>缓存时间 (MaxAgeSeconds)</b>：填写 <code>3600</code></li>
              </ul>
            </div>
          </div>
        </el-tab-pane>

        <!-- 标签2：七牛云 S3 网关 -->
        <el-tab-pane label="七牛云 S3 网关" name="qiniu">
          <div class="guide-section">
            <ol class="step-list">
              <li>
                <b>获取密钥：</b>登录七牛云控制台，点击右上角头像 → <b>密钥管理</b>，获取 AccessKey 和 SecretKey。
              </li>
              <li>
                <b>开启 S3 兼容网关：</b>进入“对象存储 Kodo”控制台，七牛云原生接口不适用纯前端，必须使用 S3 兼容端点：
                <ul>
                  <li>华东-浙江：<code>https://s3-cn-east-1.qiniucs.com</code></li>
                  <li>华北-河北：<code>https://s3-cn-north-1.qiniucs.com</code></li>
                  <li>华南-广东：<code>https://s3-cn-south-1.qiniucs.com</code></li>
                  <li>北美：<code>https://s3-us-north-1.qiniucs.com</code></li>
                </ul>
              </li>
              <li>
                <b>Bucket 与自定义域名：</b>填入你创建的空间名称，以及绑定的 CDN 加速域名（格式如 <code>https://cdn.example.com</code>）。
              </li>
            </ol>
          </div>
        </el-tab-pane>

        <!-- 标签3：MinIO -->
        <el-tab-pane label="MinIO 自建" name="minio">
          <div class="guide-section">
            <ol class="step-list">
              <li>
                <b>端点地址：</b>填写你的 MinIO API 服务地址，例如 <code>http://localhost:9000</code> 或公网反代域名。
              </li>
              <li>
                <b>Access / Secret Key：</b>在 MinIO Console 控制台的 <b>Access Keys</b> 中新建并获取。
              </li>
              <li>
                <b>forcePathStyle：</b>系统已自动为 MinIO 启用路径风格（如 <code>http://host:9000/bucket/...</code>），确保无需泛域名解析即可直接上传和访问。
              </li>
            </ol>
          </div>
        </el-tab-pane>

        <!-- 标签4：AWS S3 -->
        <el-tab-pane label="AWS S3" name="aws">
          <div class="guide-section">
            <ol class="step-list">
              <li>
                <b>IAM 凭证：</b>在 AWS IAM 中创建用户并附加 <code>AmazonS3FullAccess</code> 或限定 Bucket 的策略，生成 Access Key ID 与 Secret Access Key。
              </li>
              <li>
                <b>区域与端点：</b>Region 填写 Bucket 所在的区域代码（如 <code>us-east-1</code>、<code>ap-northeast-1</code>）。服务端点留空即可默认直连 AWS S3。
              </li>
            </ol>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>

    <template #footer>
      <div style="text-align: right">
        <el-button @click="isHelpModalVisible = false">关闭</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useStorage } from '../composables/useStorage';
import { copyToClipboard } from '../utils/clipboard';

const { isHelpModalVisible } = useStorage();
const activeTab = ref('cors');

const corsJsonExample = `[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["PUT", "POST", "GET", "HEAD", "DELETE"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": ["ETag", "x-amz-request-id", "x-amz-id-2"],
    "MaxAgeSeconds": 3600
  }
]`;

const copyCorsJson = () => {
  copyToClipboard(corsJsonExample);
};
</script>

<style scoped>
.help-body {
  font-size: 13px;
  line-height: 1.6;
  color: #4c5258;
}

.guide-section {
  padding: 4px 0;
}

.guide-p {
  margin: 0 0 10px;
}

.step-list {
  padding-left: 20px;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.code-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 10px;
  margin-bottom: 4px;
  font-weight: 500;
}

.code-block {
  background-color: #282c34;
  color: #abb2bf;
  padding: 12px 14px;
  border-radius: 6px;
  font-family: Consolas, Monaco, monospace;
  font-size: 12px;
  overflow-x: auto;
  margin: 0 0 14px;
}

.guide-note {
  background-color: #f8f9fa;
  border-left: 3px solid #409eff;
  padding: 8px 12px;
  font-size: 12px;
  color: #606266;
  line-height: 1.6;
}
</style>
