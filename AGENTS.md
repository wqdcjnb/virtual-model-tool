# AGENTS.md

AI 编码助手操作指南。

## 项目概述

AI 虚拟试衣工作室 — 多模型多平台的换衣平台。Next.js 16 + Tailwind v4 + CloudBase。

## 关键架构决策

- `src/lib/ai-service.ts` — 核心业务逻辑，客户端和服务端共用。数据通过 `/api/data/list` / `/api/data/store` 持久化到 CloudBase
- `src/lib/cloudbase.ts` — 纯服务端 SDK，**禁止从客户端组件导入**
- `src/lib/openrouter.ts` — LLM Relay (GPT Image 2)，`/v1/images/edits` + `images[{image_url}]` 格式
- `src/lib/n1n.ts` — n1n Gemini，`/v1/chat/completions` + 多模态 content
- `src/lib/dashscope.ts` — 阿里云 DashScope，multimodal-generation 端点
- 图片存储：CloudBase 云存储，`getTempFileURL` 获取 CDN URL

## 模型配置

编辑 `src/lib/constants.ts` 的 `MODEL_CONFIGS` 数组添加新模型。`platform` 字段决定分发到哪个 API 客户端。

当前平台：`dashscope` | `openrouter` | `n1n`

## 环境变量

- `DASHSCOPE_API_KEY` — 阿里云
- `OPENROUTER_API_KEY` — LLM Relay
- `N1N_API_KEY` — n1n Gemini
- `CLOUDBASE_ENV_ID` / `TENCENTCLOUD_SECRETID` / `TENCENTCLOUD_SECRETKEY` — 腾讯云

## 部署

```bash
pnpm build && pm2 restart virtual-tryon --update-env
```

服务器路径：`/opt/virtual-model-tool`，端口 3000，Nginx 反向代理。

## 禁止操作

- **禁止**从客户端组件 `import` cloudbase.ts 或任何依赖 `@cloudbase/node-sdk` 的模块
- **禁止**在 `.env.local` 外暴露 API 密钥
- **禁止**直接操作服务器文件系统存储图片（已迁移到 CloudBase）
