# AI Virtual Try-On Studio v1

AI 驱动的虚拟试衣平台。选择模特 + 服装 → AI 自动换衣，支持多平台多模型。

## 快速开始

```bash
pnpm install
pnpm dev          # → http://localhost:5000
pnpm build        # 生产构建
pnpm start        # 生产启动
```

## 项目结构

```
src/
├── app/
│   ├── layout.tsx                  # 根布局（侧边栏 + 移动端汉堡菜单）
│   ├── globals.css                 # 全局样式 + Tailwind v4
│   ├── page.tsx                    # 首页仪表盘
│   ├── studio/page.tsx             # 虚拟试衣工作室（核心）
│   ├── models/page.tsx             # AI 模特库
│   ├── garments/page.tsx           # 服装库
│   ├── gallery/page.tsx            # 作品画廊
│   ├── recycle/page.tsx            # 回收站
│   └── api/
│       ├── generate-model/route.ts    # POST 图片生成（多平台分发）
│       ├── try-on/route.ts            # POST 虚拟试衣（aitryon-plus）
│       ├── upload/route.ts            # POST 图片上传到 CloudBase
│       ├── file/[...path]/route.ts    # GET CloudBase 文件代理
│       ├── data/list/route.ts         # GET 单表查询
│       ├── data/load/route.ts         # GET 全部数据
│       ├── data/store/route.ts        # POST 数据持久化
│       ├── task/[taskId]/route.ts     # GET 异步任务轮询
│       └── uploads/[filename]/route.ts
├── components/
│   ├── sidebar.tsx                 # 桌面侧边栏 + 模型选择器
│   └── mobile-sidebar.tsx          # 移动端汉堡菜单
├── lib/
│   ├── ai-service.ts               # 核心业务逻辑 + 数据 CRUD
│   ├── dashscope.ts                # DashScope API（Wan2.7 / Qwen）
│   ├── openrouter.ts               # LLM Relay API（GPT Image 2）
│   ├── n1n.ts                      # n1n Gemini API
│   ├── cloudbase.ts                # CloudBase SDK（纯服务端）
│   ├── constants.ts                # 模型配置 + 比例映射
│   ├── types.ts                    # TypeScript 类型
│   ├── prompt-builder.ts           # 结构化字段 → 英文 prompt
│   ├── mock-data.ts                # 数据接口定义
│   ├── download.ts                 # 图片下载工具
│   └── utils.ts                    # cn() 工具函数
└── hooks/
    └── use-mobile.ts               # 移动端检测
```

## 核心功能

| 页面 | 路由 | 说明 |
|------|------|------|
| **工作台** | `/` | 数据统计、快捷操作 |
| **试衣工作室** | `/studio` | 选模特 + 服装 → AI 换衣 |
| **模特库** | `/models` | AI 生成 / 上传模特 |
| **服装库** | `/garments` | 上传服装素材 |
| **作品画廊** | `/gallery` | 浏览下载作品 |
| **回收站** | `/recycle` | 7 天恢复期 |

## AI 模型

| 模型 | 平台 | 分辨率 | 多图换衣 |
|------|------|--------|---------|
| Wan2.7 Pro | DashScope | 4096×4096 | ✅ |
| Qwen-Image Pro | DashScope | 2048×2048 | ✅ |
| GPT Image 2 | LLM Relay | 1024×1536 | ✅ |
| Gemini 3 Pro Image | n1n | 1024×1024 | ✅ |

所有模型自动保持人物面貌、姿势、背景不变，仅替换服装。

## 输出规格

- **比例**: 1:1 / 3:4 / 4:3 / 9:16 / 16:9
- **数量**: 1-4 张
- **存储**: CloudBase 云存储 + 数据库

## 环境变量

```bash
DASHSCOPE_API_KEY=xxx       # 阿里云 DashScope
OPENROUTER_API_KEY=xxx      # LLM Relay
N1N_API_KEY=xxx             # n1n Gemini
CLOUDBASE_ENV_ID=xxx        # CloudBase 环境 ID
TENCENTCLOUD_SECRETID=xxx   # 腾讯云密钥
TENCENTCLOUD_SECRETKEY=xxx  # 腾讯云密钥
```

## 技术栈

| 层 | 技术 |
|----|------|
| 框架 | Next.js 16.1 (App Router + Turbopack) |
| UI | React 19 + Tailwind CSS v4 |
| 图标 | Lucide React |
| AI | DashScope / LLM Relay / n1n |
| 存储 | CloudBase（云存储 + NoSQL 数据库） |
| 图片 | sharp |
| 包管理 | pnpm |
| 部署 | PM2 + Nginx |

## 部署

```bash
# 服务器上
cd /opt/virtual-model-tool
git pull && pnpm install && pnpm build && pm2 restart virtual-tryon
```

Nginx 反向代理 `127.0.0.1:3000`。
