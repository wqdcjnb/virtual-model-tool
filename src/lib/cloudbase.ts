/**
 * CloudBase 服务端 SDK 初始化
 * 仅在服务端使用（API Routes）
 *
 * 认证方式：SecretId + SecretKey（腾讯云 API 密钥）
 * SDK 自动从 TENCENTCLOUD_SECRETID / TENCENTCLOUD_SECRETKEY 环境变量读取
 */
import cloudbase from "@cloudbase/node-sdk";

if (!process.env.CLOUDBASE_ENV_ID) {
  throw new Error("缺少环境变量 CLOUDBASE_ENV_ID");
}

const app = cloudbase.init({
  env: process.env.CLOUDBASE_ENV_ID,
  secretId: process.env.TENCENTCLOUD_SECRETID,
  secretKey: process.env.TENCENTCLOUD_SECRETKEY,
});

export default app;
