/**
 * ======================================================================================
 * 【安全与架构重要声明】
 * 1. 本项目为纯前端方案，Access Key / Secret Key 及上传历史均保存在浏览器本地 localStorage，
 *    仅限个人本地自用，禁止公网部署，以防存储凭证泄漏！
 * 2. 使用任何 S3 兼容对象存储桶，必须提前在存储控制台配置 Bucket CORS 跨域策略，
 *    否则浏览器前端直接调用 PUT/GET/DELETE 会被同源策略拦截并报错 Failed to fetch。
 * 3. 七牛云对象存储必须开启并使用 S3 兼容网关（原生 Kodo 接口不适用本程序）。
 * ======================================================================================
 */

import { createApp } from 'vue';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import zhCn from 'element-plus/es/locale/lang/zh-cn';

import App from './App.vue';
import './style.css';

const app = createApp(App);

app.use(ElementPlus, {
  locale: zhCn,
});

app.mount('#app');
