<div align="center">

<img src="./public/favicon.svg" alt="简储 Logo" width="100" height="100" />

# 简储 (JianChu)

**轻量 · 极简 · 纯静态 S3 兼容对象存储图床**

零后端服务架构 · 浏览器前端直连 S3 · 本地凭证安全存储 · 智能 WebWorker 压缩

[![Vue 3](https://img.shields.io/badge/Vue-3.5-brightgreen.svg?style=flat-square&logo=vue.js)](https://vuejs.org/)
[![Vite](https://img.shields.io/badge/Vite-8.3-646CFF.svg?style=flat-square&logo=vite)](https://vitejs.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-blue.svg?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Element Plus](https://img.shields.io/badge/Element%20Plus-2.14-409EFF.svg?style=flat-square&logo=element-plus)](https://element-plus.org/)
[![License](https://img.shields.io/badge/License-MIT-orange.svg?style=flat-square)](./LICENSE)

[在线仓库](https://github.com/sweet77-zsx/jianchu-imagebed) · [功能特性](#-功能特性) · [快速上手](#-快速上手) · [存储桶配置指南](#-存储桶配置指南) · [常见问题排查](#-常见问题排查)

</div>

---

## 📖 项目简介

**简储 (JianChu)** 是一款专门针对个人自用场景打造的纯前端静态 S3 图床。无需租用任何服务器或编写后端接口，浏览器前端直接调用 S3 协议 API（支持 **七牛云 S3 兼容网关**、**自建 MinIO**、**AWS S3**、**Cloudflare R2** 等所有 S3 兼容对象存储服务）。

所有用户凭证（AK/SK）、上传历史均严格持久化保存在当前浏览器的 `localStorage` 中，既保护了私有隐私，又实现了零服务器成本的个人图片管理。

---

## 🌟 功能特性

- 🚀 **纯静态零后端**：基于 Vite + Vue3 + TS，打包后仅为纯静态 HTML/CSS/JS 文件，可使用 GitHub Pages、Vercel、Cloudflare Pages 或本地直接双击预览。
- ⚡ **三种便捷上传方式**：
  - **点击选择**：支持唤起本地窗口，多图批量连选；
  - **拖拽上传**：拖动图片至大虚线区域，松手即刻上传；
  - **全局 Ctrl+V 粘贴**：全局捕获剪贴板截图或复制的图片，一键粘贴秒传。
- 🗜️ **智能前端压缩**：内置 `browser-image-compression` 引擎，基于原生 Web Worker 异步处理，长边自动限制 ≤ 1920px，体积限制 ≤ 1MB，省流提速无卡顿。
- 🔗 **外链自动复制与格式转换**：
  - 上传成功后自动格式化并写入剪贴板；
  - 支持 **原始链接 (Raw)**、**Markdown (`![]()`)**、**HTML (`<img />`)** 快速切换。
- 📂 **双 Tab 文件管理**：
  - **Tab 1: 历史上传记录**：读取本地 localStorage 缓存，展示压缩比、上传时间，支持本地删除或清空；
  - **Tab 2: 远端存储桶文件列表**：实时调用 S3 `ListObjectsV2` 接口拉取指定目录文件，支持分页查看、大图全屏预览与远端安全删除。
- 🔑 **多云 S3 适配与智能区域探测**：
  - 完美适配七牛云 S3 网关、MinIO、AWS S3 等；
  - 自动开启 **路径风格 (Path-Style)** 规避通配符 SSL 证书报错；
  - 提供 **「智能一键区域探测」**，自动并发识别存储桶所属物理区域并一键纠正切换。
- 🧩 **全参数链接模板引擎**：支持 `${domain}`、`${prefix}`、`${scope}`、`${name}`、`${key}` 占位符自由组合与实时预览。

---

## ⚠️ 重要安全与使用约束

> [!WARNING]
> **仅限个人自用，禁止公网无保护部署！**
> 1. 本项目为**纯前端架构**，您的 Access Key 与 Secret Key 均保存在本地浏览器的 `localStorage` 中。**严禁部署到任何不受信任的公共公网环境**，防止他人通过浏览器控制台提取您的密钥！
> 2. 浏览器直接调用 S3 存储桶 API（PUT/GET/DELETE）时，**必须提前在对象存储控制台配置 Bucket CORS 跨域规则**，否则浏览器会触发同源策略直接拦截报错。
> 3. 七牛云必须使用官方提供的 **S3 兼容网关**（原生 Kodo 接口不适用于本程序）。

---

## 🚀 快速上手

### 1. 环境准备
确保本机已安装 Node.js (推荐 v18+ 或更高版本)。

### 2. 克隆项目并安装依赖
```bash
git clone https://github.com/sweet77-zsx/jianchu-imagebed.git
cd jianchu-imagebed
npm install
```

### 3. 启动本地开发服务
```bash
npm run dev
```
打开浏览器访问：`http://localhost:5173/`

### 4. 生产环境打包构建
```bash
npm run build
```
打包生成的高性能纯静态产物位于 `dist/` 目录，可使用 Nginx、Caddy 或任意静态托管服务运行。

---

## 🛠️ 存储桶配置指南

### 1. 跨域规则 (CORS) 配置【必须配置】

纯前端直接调用 S3，浏览器在发送上传 `PUT` 请求前会自动发送 `OPTIONS` 跨域预检请求。请在您的存储桶管理控制台中添加跨域规则：

#### 七牛云 (Kodo)：
1. 登录七牛云控制台 → 进入 **【对象存储 Kodo】** → 点击你的存储空间；
2. 切换至 **【空间设置】** 标签页 → 找到 **【跨域资源共享 (CORS)】** → 点击 **【添加规则】**；
3. 按照如下参数配置并保存：

| 配置项 | 填写值 | 说明 |
| :--- | :--- | :--- |
| **来源 (AllowedOrigins)** | `*` | 允许所有来源（或填 `http://localhost:5173`） |
| **允许 Methods** | 勾选 `PUT, POST, GET, DELETE, HEAD` | **⚠️ 重点：务必勾选 PUT，文件直传为 PUT 请求** |
| **允许 Headers** | `*` | 允许全部请求头 |
| **暴露 Headers** | `ETag, x-amz-request-id, x-amz-id-2` | 允许前端读取返回的 ETag 标头 |
| **缓存时间** | `3600` | 跨域预检缓存 1 小时 |

#### AWS S3 / MinIO / Cloudflare R2：
在存储桶 Permissions 的 CORS 配置中填入如下 JSON：
```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["PUT", "POST", "GET", "HEAD", "DELETE"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": ["ETag", "x-amz-request-id", "x-amz-id-2"],
    "MaxAgeSeconds": 3600
  }
]
```

---

### 2. Token 弹窗参数填写说明

点击页面右上角 **【更新 Token】** 弹窗，按需填写如下字段：

- **存储服务**：根据实际情况单选 `七牛云 (S3网关)`、`MinIO` 或 `AWS S3`。
- **Access Key / Secret Key**：对象存储账号的 API 密钥（七牛云在控制台右上角头像 →【密钥管理】中获取）。
- **Bucket**：您的存储空间名称（例如 `wlm-store`）。
- **服务端点 (Endpoint)**：
  - **七牛云对应区域 S3 网关**（已内置下拉框快捷选择）：
    - 华东-浙江（z0）：`https://s3-cn-east-1.qiniucs.com`
    - 华东-浙江2（z0）：`https://s3-cn-east-2.qiniucs.com`
    - 华北-河北（z1）：`https://s3-cn-north-1.qiniucs.com`
    - 华南-广东（z2）：`https://s3-cn-south-1.qiniucs.com`
    - 北美-洛杉矶（na0）：`https://s3-us-north-1.qiniucs.com`
    - 亚太-新加坡（as0）：`https://s3-ap-southeast-1.qiniucs.com`
  - **MinIO**：默认 `http://localhost:9000` 或自建反向代理域名。
  - **AWS S3**：可留空直连或自定义 S3 端点。
- **域名 (自定义 CDN 访问域名)**：
  - 填入用于公开访问下载图片的加速域名，例如 `https://img.yourdomain.com`。
- **资源前缀 / Scope**：
  - 资源前缀：如 `image`
  - 资源Scope：如 `default`
- **资源链接模板**：
  - 默认模板：`${domain}/${prefix}/${scope}/${name}`
  - 解析效果示例：`https://img.yourdomain.com/image/default/uuid.png`

---

## ❓ 常见问题排查

<details>
<summary><b>1. 上传报错：存储桶未配置 CORS 跨域策略，或 Endpoint 服务地址不可达？</b></summary>

- **检查所属区域**：确认存储空间的实际物理区域与所填 Endpoint 一致（例如空间建在华南，不能填华东端点）。可点击 Token 弹窗顶部的 **「🔄 点我更新」** 启动智能区域探测一键纠正。
- **检查 CORS 设置**：确保存储桶已添加跨域规则，且 **Methods 中勾选了 `PUT`**。
- **切勿将 CDN 域名填入「服务端点」**：服务端点必须是 S3 兼容网关，CDN 域名只填在「域名」一栏。
</details>

<details>
<summary><b>2. 报错：readableStream.getReader is not a function？</b></summary>

本系统底层已内置解决该问题：在浏览器端直接使用 `Uint8Array` 纯内存二进制流传输，彻底绕过 ReadableStream 兼容性缺陷。
</details>

<details>
<summary><b>3. 报错：ERR_CERT_COMMON_NAME_INVALID 证书无效？</b></summary>

七牛云官方 SSL 证书为 `*.qiniucs.com` 单通配符证书。如果使用默认的虚拟主机风格，会生成四级域名触发浏览器拦截。本系统已默认强制开启 **路径风格 (forcePathStyle)**，直连标准域名，彻底避免证书无效报错。
</details>

---

## 📁 目录结构

```
jianchu-imagebed/
├── public/
│   ├── favicon.svg          # 简储专属矢量 SVG 徽标
│   └── logo.png             # 简储高清品牌图标
├── src/
│   ├── assets/              # 资源文件
│   ├── components/          # Vue 组件
│   │   ├── Header.vue       # 顶部导航与品牌状态栏
│   │   ├── UploadArea.vue   # 大虚线上传区与控制栏
│   │   ├── FileList.vue     # 本地上传历史与远端存储桶文件列表
│   │   ├── TokenModal.vue   # Token 凭证配置与智能区域探测弹窗
│   │   └── HelpModal.vue    # CORS 跨域与 S3 配置教程弹窗
│   ├── composables/         # 组合式状态管理
│   │   └── useStorage.ts    # Token 配置、全局状态持久化
│   ├── services/            # S3 底层适配服务
│   │   └── s3Adapter.ts     # AWS SDK v3 二进制直传、列表拉取、文件删除
│   ├── types/               # TypeScript 类型定义
│   │   └── index.ts
│   ├── utils/               # 工具类
│   │   ├── clipboard.ts     # 剪贴板复制工具
│   │   ├── compress.ts      # browser-image-compression 图片压缩
│   │   └── format.ts        # 链接模板渲染与格式化
│   ├── App.vue              # 根组件
│   ├── main.ts              # 入口文件（含安全声明）
│   └── style.css            # 全局现代极简样式
├── index.html               # HTML 模版
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## 📄 License

本项目采用 [MIT License](./LICENSE) 协议开源。
