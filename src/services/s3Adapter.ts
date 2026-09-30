import {
  S3Client,
  ListObjectsV2Command,
  DeleteObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { ElMessage, ElMessageBox } from 'element-plus';
import type { TokenConfig, RemoteFileItem } from '../types';
import { renderUrlTemplate } from '../utils/format';

/**
 * 清洗并规范化 S3 服务端点 Endpoint
 */
export function normalizeEndpoint(rawEndpoint?: string, provider?: string): string | undefined {
  if (!rawEndpoint || !rawEndpoint.trim()) {
    if (provider === 'minio') return 'http://localhost:9000';
    if (provider === 'qiniu') return 'https://s3-cn-east-1.qiniucs.com';
    return undefined;
  }

  let endpoint = rawEndpoint.trim();

  // 如果没有协议前缀，自动补充
  if (!/^https?:\/\//i.test(endpoint)) {
    if (endpoint.includes('localhost') || endpoint.includes('127.0.0.1')) {
      endpoint = 'http://' + endpoint;
    } else {
      endpoint = 'https://' + endpoint;
    }
  }

  // 去除末尾的斜杠
  endpoint = endpoint.replace(/\/+$/, '');
  return endpoint;
}

/**
 * 封装统一的 S3 对象存储适配器
 * 支持 MinIO、七牛云 S3 兼容网关、AWS S3 等标准 S3 协议服务
 */
export class S3Adapter {
  private client: S3Client | null = null;
  private config: TokenConfig | null = null;

  /**
   * 使用配置初始化或重新初始化 S3 客户端
   */
  public init(config: TokenConfig): boolean {
    try {
      this.config = config;

      // 关键核心：七牛云 S3 网关官方 SSL 证书为 *.qiniucs.com 通配符证书，
      // 若使用 virtual-hosted style (forcePathStyle=false)，SDK 会拼出四级域名 bucket.s3-cn-east-1.qiniucs.com，
      // 导致浏览器报 ERR_CERT_COMMON_NAME_INVALID 证书无效，从而直接产生 Failed to fetch 跨域拦截错误！
      // 因此 MinIO 和 七牛云必须默认开启 forcePathStyle: true。
      let forcePathStyle = true;
      if (config.provider === 'aws') {
        forcePathStyle = Boolean(config.forcePathStyle);
      } else if (config.forcePathStyle !== undefined) {
        forcePathStyle = config.forcePathStyle;
      }

      // 规范化服务端点
      const endpoint = normalizeEndpoint(config.endpoint, config.provider);
      let region = config.region?.trim() || 'us-east-1';

      if (config.provider === 'qiniu' && !config.region) {
        region = 'cn-east-1';
      }

      this.client = new S3Client({
        region,
        endpoint,
        forcePathStyle,
        credentials: {
          accessKeyId: config.accessKey.trim(),
          secretAccessKey: config.secretKey.trim(),
        },
      });

      return true;
    } catch (error: any) {
      console.error('初始化 S3Client 失败:', error);
      ElMessage.error(`初始化存储客户端失败: ${error?.message || '未知错误'}`);
      this.client = null;
      return false;
    }
  }

  /**
   * 检查客户端是否已就绪
   */
  public isReady(): boolean {
    return Boolean(this.client && this.config?.bucket);
  }

  /**
   * 获取当前配置
   */
  public getConfig(): TokenConfig | null {
    return this.config;
  }

  /**
   * 获取有效的访问域名，优先使用自定义域名，若未配置则根据 Endpoint 与风格自动推导
   */
  public getEffectiveDomain(): string {
    if (this.config?.domain && this.config.domain.trim()) {
      return this.config.domain.trim();
    }
    if (!this.config) return '';
    const endpoint = (this.config.endpoint || '').trim().replace(/\/+$/, '');
    const bucket = (this.config.bucket || '').trim();
    if (!endpoint) return '';

    if (this.config.forcePathStyle) {
      return bucket ? `${endpoint}/${bucket}` : endpoint;
    }

    const cleanEndpoint = endpoint.replace(/^https?:\/\//, '');
    const protocol = endpoint.startsWith('http://') ? 'http://' : 'https://';
    return bucket ? `${protocol}${bucket}.${cleanEndpoint}` : endpoint;
  }

  /**
   * 弹出直观的 CORS / 网络连接排查弹窗
   */
  public showCorsDiagnosticHelp(originalError?: any) {
    const bucket = this.config?.bucket || 'your-bucket';
    const provider = this.config?.provider || 'qiniu';
    const endpoint = normalizeEndpoint(this.config?.endpoint, provider);

    const providerNames: Record<string, string> = {
      qiniu: '七牛云 Kodo',
      minio: 'MinIO 自建',
      aws: 'AWS S3',
    };

    ElMessageBox.alert(
      `<div style="font-size: 13px; line-height: 1.6; text-align: left;">
        <p style="color: #f56c6c; font-weight: 600; margin-bottom: 8px;">
          上传请求被浏览器底层拦截（Failed to fetch），常见原因有以下两点：
        </p>
        <ol style="padding-left: 20px; margin-bottom: 12px; color: #303133;">
          <li style="margin-bottom: 8px;">
            <b>存储桶未配置 CORS 跨域规则（最常见）：</b><br/>
            纯前端直接调用 S3 接口，浏览器会先发送 OPTIONS 预检请求。如果存储桶未放行跨域，会被直接拦截。<br/>
            <b>解决步骤（以 ${providerNames[provider] || '对象存储'} 为例）：</b><br/>
            1. 登录控制台，进入存储空间 <code>${bucket}</code>；<br/>
            2. 点击【空间设置】→【跨域资源共享 (CORS)】→【添加规则】；<br/>
            3. 设置 <b>来源 (AllowedOrigins)</b>：<code>*</code><br/>
            4. 设置 <b>允许方法 (Methods)</b>：勾选 <code>PUT, POST, GET, DELETE, HEAD</code><br/>
            5. 设置 <b>允许头部 (Headers)</b>：<code>*</code><br/>
            6. 设置 <b>暴露头部 (ExposeHeaders)</b>：<code>ETag, x-amz-request-id</code>
          </li>
          <li style="margin-bottom: 8px;">
            <b>服务端点 (Endpoint) 或 SSL 证书问题：</b><br/>
            当前请求端点为：<code>${endpoint}</code><br/>
            已为您自动开启 <b>路径风格 (forcePathStyle)</b> 规避通配符证书错误。请确认该地址在公网可直接访问。
          </li>
        </ol>
        <div style="background: #f8f9fa; border: 1px solid #e4e7ed; padding: 8px; border-radius: 4px; font-size: 12px; color: #606266;">
          技术日志: ${originalError?.message || 'TypeError: Failed to fetch'}
        </div>
      </div>`,
      'S3 上传连接与跨域诊断指南',
      {
        dangerouslyUseHTMLString: true,
        confirmButtonText: '我知道了，去配置 CORS',
      }
    );
  }

  /**
   * 测试存储桶连通性
   */
  public async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.client || !this.config) {
      return { success: false, message: '客户端尚未初始化' };
    }

    try {
      const command = new HeadBucketCommand({
        Bucket: this.config.bucket.trim(),
      });
      await this.client.send(command);
      return { success: true, message: '存储桶连接成功，凭证与跨域配置有效！' };
    } catch (error: any) {
      console.error('S3 连通性测试失败:', error);
      let errMsg = error?.message || '未知错误';
      if (error?.name === 'AccessDenied' || error?.$metadata?.httpStatusCode === 403) {
        errMsg = '访问被拒绝(403)，请核对 Access Key / Secret Key 是否正确或无权操作该桶';
      } else if (error?.name === 'NotFound' || error?.$metadata?.httpStatusCode === 404) {
        errMsg = `未找到指定的 Bucket「${this.config.bucket}」`;
      } else if (error?.message?.includes('Failed to fetch') || error?.name === 'TypeError') {
        errMsg = '网络请求失败：极大概率是该存储桶未配置 CORS 跨域策略，请在控制台添加 CORS 规则！';
        this.showCorsDiagnosticHelp(error);
      }
      return { success: false, message: errMsg };
    }
  }

  /**
   * 上传文件到 S3
   * 对小于 5MB 的图片优先使用标准 PutObjectCommand，兼容性最高，避免分片初始化在部分网关产生跨域异常；
   * 对大于 5MB 的大文件使用 @aws-sdk/lib-storage Upload 进行分片上传。
   * @param file 待上传的文件对象
   * @param key 目标 S3 对象 Key
   * @param onProgress 进度百分比回调 (0 - 100)
   */
  public async uploadFile(
    file: File,
    key: string,
    onProgress?: (percent: number) => void
  ): Promise<{ url: string; key: string }> {
    if (!this.client || !this.config) {
      throw new Error('S3 存储客户端未配置或未就绪，请先配置 Token');
    }

    const bucket = this.config.bucket.trim();

    try {
      onProgress?.(10);

      // 关键核心修复：浏览器端将 File 转换为 Uint8Array 纯二进制字节数组
      // 彻底消除 AWS SDK v3 在浏览器流适配层抛出的 "readableStream.getReader is not a function" 报错！
      const arrayBuffer = await file.arrayBuffer();
      const fileBytes = new Uint8Array(arrayBuffer);

      onProgress?.(30);

      // 对于图床场景（大部分图片均在 20MB 以内），直接使用 PutObject 上传，单次请求极其稳定且兼容器最高
      if (file.size <= 20 * 1024 * 1024) {
        const command = new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: fileBytes,
          ContentType: file.type || 'image/png',
          ContentLength: fileBytes.byteLength,
        });

        await this.client.send(command);
        onProgress?.(100);
      } else {
        // 超过 20MB 的超大文件使用分片上传
        const parallelUpload = new Upload({
          client: this.client,
          params: {
            Bucket: bucket,
            Key: key,
            Body: fileBytes,
            ContentType: file.type || 'image/png',
          },
          partSize: 5 * 1024 * 1024,
          leavePartsOnError: false,
        });

        parallelUpload.on('httpUploadProgress', (progress) => {
          if (progress.total && progress.loaded) {
            const percent = Math.min(100, Math.round((progress.loaded / progress.total) * 100));
            onProgress?.(percent);
          }
        });

        await parallelUpload.done();
        onProgress?.(100);
      }

      // 根据链接模板生成最终访问地址
      const keyParts = key.split('/');
      const filename = keyParts[keyParts.length - 1];

      const url = renderUrlTemplate(this.config.urlTemplate, {
        domain: this.getEffectiveDomain(),
        prefix: this.config.prefix,
        scope: this.config.scope,
        name: filename,
        key: key,
      });

      return { url, key };
    } catch (error: any) {
      console.error('S3 上传文件发生异常:', error);
      let userTip = error?.message || '上传失败';

      // 仅当确实是浏览器 Fetch 级别的网络/CORS 拦截时，才提示跨域
      const isFetchError =
        error?.message?.includes('Failed to fetch') ||
        error?.name === 'NetworkError' ||
        (error?.name === 'TypeError' && error?.message?.toLowerCase().includes('fetch'));

      if (isFetchError) {
        userTip = '上传失败：存储桶未配置 CORS 跨域策略，或 Endpoint 服务地址不可达！';
        ElMessage.error(userTip);
        this.showCorsDiagnosticHelp(error);
      } else if (error?.$metadata?.httpStatusCode === 403) {
        userTip = '上传失败：403 Forbidden，请核对 Access Key / Secret Key 是否正确或无权写入该桶';
        ElMessage.error(userTip);
      } else {
        ElMessage.error(`上传失败: ${userTip}`);
      }

      throw new Error(userTip);
    }
  }

  /**
   * 列出存储桶内的文件对象
   * @param prefix 前缀过滤
   * @param maxKeys 最多拉取的数量（默认 200 条）
   */
  public async listFiles(prefix?: string, maxKeys = 200): Promise<RemoteFileItem[]> {
    if (!this.client || !this.config) {
      throw new Error('S3 存储客户端未配置或未就绪');
    }

    try {
      const actualPrefix = prefix !== undefined ? prefix : this.config.prefix;
      const cleanPrefix = actualPrefix ? actualPrefix.replace(/^\/+/, '') : undefined;

      const command = new ListObjectsV2Command({
        Bucket: this.config.bucket.trim(),
        Prefix: cleanPrefix ? (cleanPrefix.endsWith('/') ? cleanPrefix : cleanPrefix + '/') : undefined,
        MaxKeys: maxKeys,
      });

      const response = await this.client.send(command);
      const items: RemoteFileItem[] = [];

      if (response.Contents) {
        for (const item of response.Contents) {
          if (!item.Key || item.Key.endsWith('/')) {
            continue;
          }

          const parts = item.Key.split('/');
          const filename = parts[parts.length - 1];

          const url = renderUrlTemplate(this.config.urlTemplate, {
            domain: this.getEffectiveDomain(),
            prefix: this.config.prefix,
            scope: this.config.scope,
            name: filename,
            key: item.Key,
          });

          items.push({
            key: item.Key,
            name: filename,
            size: item.Size || 0,
            lastModified: item.LastModified ? item.LastModified.toISOString() : undefined,
            url,
            etag: item.ETag,
          });
        }
      }

      items.sort((a, b) => {
        const timeA = a.lastModified ? new Date(a.lastModified).getTime() : 0;
        const timeB = b.lastModified ? new Date(b.lastModified).getTime() : 0;
        return timeB - timeA;
      });

      return items;
    } catch (error: any) {
      console.error('拉取 S3 文件列表失败:', error);
      let userTip = error?.message || '获取远端文件列表失败';
      if (error?.message?.includes('Failed to fetch') || error?.name === 'TypeError') {
        userTip = '获取文件失败：跨域报错，请确保存储桶已配置 CORS 规则！';
        ElMessage.error(userTip);
        this.showCorsDiagnosticHelp(error);
      } else {
        ElMessage.error(userTip);
      }
      throw new Error(userTip);
    }
  }

  /**
   * 从 S3 删除指定对象
   * @param key 对象Key
   */
  public async deleteFile(key: string): Promise<boolean> {
    if (!this.client || !this.config) {
      throw new Error('S3 存储客户端未配置或未就绪');
    }

    try {
      const command = new DeleteObjectCommand({
        Bucket: this.config.bucket.trim(),
        Key: key,
      });

      await this.client.send(command);
      ElMessage.success(`S3 文件「${key}」删除成功`);
      return true;
    } catch (error: any) {
      console.error('删除 S3 文件失败:', error);
      ElMessage.error(`删除失败: ${error?.message || '未知错误'}`);
      throw error;
    }
  }
}

// 导出全局单例适配器实例
export const s3AdapterInstance = new S3Adapter();
