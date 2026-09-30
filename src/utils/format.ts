import type { UrlFormat } from '../types';

/**
 * 获取文件后缀扩展名（包含小圆点，如 .jpg）
 */
export function getFileExt(filename: string): string {
  if (!filename) return '';
  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1) return '';
  return filename.substring(lastDot).toLowerCase();
}

/**
 * 格式化字节大小为易读字符串（B, KB, MB, GB）
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 B';
  if (!bytes || isNaN(bytes)) return '-';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * 格式化时间戳或日期字符串为 YYYY-MM-DD HH:mm:ss
 */
export function formatDateTime(dateInput?: string | number | Date): string {
  if (!dateInput) return '-';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);

  const pad = (n: number) => (n < 10 ? '0' + n : String(n));
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  const seconds = pad(d.getSeconds());

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * 链接模板渲染：支持 ${domain}、${key}、${prefix}、${scope}、${name} 变量替换
 * 会自动处理连续多余的斜杠，并保证协议前缀正确
 */
export function renderUrlTemplate(
  template: string,
  params: { domain: string; prefix: string; scope?: string; name: string; key?: string }
): string {
  let { domain, prefix, scope = '', name, key } = params;

  // 去除 domain 末尾的 /
  domain = (domain || '').trim().replace(/\/+$/, '');
  // 去除 prefix 前后的 /
  prefix = (prefix || '').trim().replace(/^\/+|\/+$/g, '');
  // 去除 scope 前后的 /
  scope = (scope || '').trim().replace(/^\/+|\/+$/g, '');
  // 去除 name 前面的 /
  name = (name || '').trim().replace(/^\/+/, '');
  // 去除 key 前面的 /
  const cleanKey = (key || '').trim().replace(/^\/+/, '');

  let res = template || '${domain}/${prefix}/${scope}/${name}';

  // 1. 如果存在实际 S3 对象完整 Key，优先对模板中的路径组合进行精确替换，防止目录重叠或重复拼接
  if (cleanKey) {
    if (res.includes('${key}')) {
      res = res.replace(/\$\{key\}/g, cleanKey);
    }
    // 匹配常规路径组合并直接替换为真实的 cleanKey
    if (res.includes('${prefix}/${scope}/${name}')) {
      res = res.replace(/\$\{prefix\}\/\$\{scope\}\/\$\{name\}/g, cleanKey);
    }
    if (res.includes('${prefix}/${name}')) {
      res = res.replace(/\$\{prefix\}\/\$\{name\}/g, cleanKey);
    }
  }

  // 2. 如果模板中没有显式写 ${scope}，但配置了有效 scope，且未使用完整的 key 替换，
  // 并且模板中使用了 ${prefix}，且 prefix 末尾未包含 scope，才补充 ${scope}
  if (!res.includes('${scope}') && scope) {
    if (res.includes('${prefix}') && !prefix.endsWith(scope) && !prefix.endsWith(`/${scope}`)) {
      res = res.replace(/\$\{prefix\}/g, `${prefix}/${scope}`);
    }
  }

  res = res.replace(/\$\{domain\}/g, domain);
  res = res.replace(/\$\{prefix\}/g, prefix);
  res = res.replace(/\$\{scope\}/g, scope);
  res = res.replace(/\$\{name\}/g, name);

  // 清洗中间可能产生的多次连续斜杠（但保留 http:// 或 https://）
  res = res.replace(/([^:])\/+/g, '$1/');

  return res;
}

/**
 * 根据所选链接格式（raw / markdown / html）生成对应输出文本
 */
export function formatOutputUrl(url: string, name: string, format: UrlFormat): string {
  const cleanName = name || 'image';
  switch (format) {
    case 'markdown':
      return `![${cleanName}](${url})`;
    case 'html':
      return `<img src="${url}" alt="${cleanName}" />`;
    case 'raw':
    default:
      return url;
  }
}
