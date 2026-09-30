/**
 * 简储 (JianChu) - TypeScript 类型定义
 */

// 支持的主流 S3 兼容云存储服务商
export type StorageProvider = 'qiniu' | 'minio' | 'aws' | 'r2' | 'aliyun' | 'tencent';

// 云存储厂商元数据描述
export interface ProviderMeta {
  id: StorageProvider;
  name: string;
  tag: string;
  icon: string;
  color: string;
  defaultEndpoint: string;
  defaultRegion: string;
  description: string;
}

// 单个云厂商 Token 与 S3 详细配置接口
export interface TokenConfig {
  provider: StorageProvider;
  accessKey: string;
  secretKey: string;
  bucket: string;
  endpoint: string;
  region: string;
  domain: string; // 自定义CDN访问域名，如 https://img.wlmworld.top
  prefix: string; // 资源前缀，如 image
  scope: string; // 资源Scope，默认 default
  urlTemplate: string; // 链接模板，支持 ${domain}、${prefix}、${scope}、${name}、${key}
  expireTime: string; // 过期时间字符串，如 2026-09-30 00:00:00
  saveAccount: boolean; // 是否本地保存账号到 localStorage
  forcePathStyle?: boolean; // 是否开启路径风格（七牛云、MinIO推荐开启）
}

// 链接格式类型
export type UrlFormat = 'raw' | 'markdown' | 'html';

// 视图模式：卡片网格 / 列表表格
export type ViewMode = 'grid' | 'table';

// 工作区当前激活的主标签页
export type ActiveTab = 'config' | 'upload' | 'remote' | 'history';

// 上传历史记录项（保存在 localStorage）
export interface UploadRecord {
  id: string; // uuid
  name: string; // 原始文件名
  key: string; // S3对象Key
  url: string; // 生成的访问链接
  size: number; // 文件大小（字节）
  compressedSize?: number; // 压缩后大小
  isCompressed?: boolean; // 是否进行了压缩
  mimeType: string;
  uploadTime: string; // 上传时间
  provider: StorageProvider;
}

// 远端 S3 文件项
export interface RemoteFileItem {
  key: string;
  name: string;
  size: number;
  lastModified?: string;
  url: string;
  etag?: string;
}
