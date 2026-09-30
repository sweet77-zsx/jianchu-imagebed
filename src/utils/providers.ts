import type { ProviderMeta, StorageProvider, TokenConfig } from '../types';

export const PROVIDERS_META: ProviderMeta[] = [
  {
    id: 'qiniu',
    name: '七牛云',
    tag: 'S3兼容网关',
    icon: '⚡',
    color: '#0ea5e9',
    defaultEndpoint: 'https://s3-cn-east-1.qiniucs.com',
    defaultRegion: 'cn-east-1',
    description: '国内老牌高可用对象存储，须开启 S3 兼容网关并使用路径风格',
  },
  {
    id: 'minio',
    name: 'MinIO',
    tag: '私有化部署',
    icon: '🦤',
    color: '#e11d48',
    defaultEndpoint: 'http://localhost:9000',
    defaultRegion: 'us-east-1',
    description: '高性能自建开源对象存储，自动开启 forcePathStyle 兼容',
  },
  {
    id: 'aws',
    name: 'AWS S3',
    tag: '全球标杆',
    icon: '🟧',
    color: '#f97316',
    defaultEndpoint: '',
    defaultRegion: 'us-east-1',
    description: '亚马逊云全球标准 S3，支持任意区域及官方端点',
  },
  {
    id: 'r2',
    name: 'Cloudflare R2',
    tag: '0 出网流费',
    icon: '⛅',
    color: '#f59e0b',
    defaultEndpoint: '',
    defaultRegion: 'auto',
    description: 'Cloudflare 出网免费对象存储，完美兼容 S3 客户端',
  },
  {
    id: 'aliyun',
    name: '阿里云 OSS',
    tag: '国内主流',
    icon: '🟠',
    color: '#ff6a00',
    defaultEndpoint: '',
    defaultRegion: 'oss-cn-hangzhou',
    description: '阿里云海量对象存储，支持 S3 兼容协议挂载',
  },
  {
    id: 'tencent',
    name: '腾讯云 COS',
    tag: '国内主流',
    icon: '🔵',
    color: '#0052d9',
    defaultEndpoint: '',
    defaultRegion: 'ap-guangzhou',
    description: '腾讯云稳定安全存储，全面兼容 AWS S3 常用 API',
  },
];

// 根据厂商 ID 获取默认配置
export function createDefaultConfig(provider: StorageProvider): TokenConfig {
  const meta = PROVIDERS_META.find((p) => p.id === provider) || PROVIDERS_META[0];
  return {
    provider,
    accessKey: '',
    secretKey: '',
    bucket: '',
    endpoint: meta.defaultEndpoint,
    region: meta.defaultRegion,
    domain: '',
    prefix: 'image',
    scope: 'default',
    urlTemplate: '${domain}/${prefix}/${scope}/${name}',
    expireTime: '2026-09-30 00:00:00',
    saveAccount: true,
    forcePathStyle: provider === 'qiniu' || provider === 'minio',
  };
}
