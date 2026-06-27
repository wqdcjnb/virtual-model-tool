# AI Virtual Try-On Studio

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
│   ├── layout.tsx                      # 根布局（侧边栏 + 移动端汉堡菜单）
│   ├── page.tsx                        # 首页仪表盘
│   ├── globals.css                     # 全局样式 + Tailwind v4
│   ├── studio/page.tsx                 # 虚拟试衣工作室（核心）
│   ├── models/page.tsx                 # AI 模特工坊
│   ├── garments/page.tsx               # 服装库
│   ├── gallery/page.tsx                # 作品画廊
│   └── api/
│       ├── generate-model/route.ts     # POST 图片生成（多平台）
│       ├── try-on/route.ts             # POST 虚拟试衣（aitryon-plus）
│       ├── upload/route.ts             # POST 图片上传
│       ├── task/[taskId]/route.ts      # GET 异步任务轮询
│       └── uploads/[filename]/route.ts # GET 静态图片服务
├── components/
│   ├── sidebar.tsx                     # 桌面端侧边栏
│   └── mobile-sidebar.tsx              # 移动端汉堡菜单 + 侧边栏滑出
├── lib/
│   ├── ai-service.ts                   # AI 服务层（核心业务逻辑）
│   ├── dashscope.ts                    # DashScope API（Wan2.7 / Qwen）
│   ├── openrouter.ts                   # LLM Relay API（GPT Image 2）
│   ├── n1n.ts                          # n1n Gemini API（Gemini 3 Pro Image）
│   ├── cqt.ts                          # CQT API
│   ├── constants.ts                    # 模型配置 + 比例选项
│   ├── types.ts                        # TypeScript 类型
│   ├── prompt-builder.ts               # 结构化字段 → 英文 prompt
│   ├── mock-data.ts                    # 数据类型定义
│   ├── download.ts                     # 图片下载工具
│   └── utils.ts                        # cn() 工具函数
└── hooks/
    └── use-mobile.ts                   # 移动端检测
```

## 核心功能

| 页面 | 路由 | 说明 |
|------|------|------|
| **工作台** | `/` | 数据统计、快捷操作、最近作品 |
| **试衣工作室** | `/studio` | 选模特 + 选服装 → AI 虚拟换衣 |
| **模特工坊** | `/models` | AI 生成模特 |
| **服装库** | `/garments` | 浏览/上传服装 |
| **作品画廊** | `/gallery` | 浏览/下载历史作品 |

## 可用 AI 模型

| 模型 | 平台 | 最大分辨率 | 图生图 | 多图换衣 |
|------|------|-----------|--------|---------|
| Wan2.7 Pro | DashScope | 4096×4096 | ✅ | ✅ |
| Qwen-Image Pro | DashScope | 2048×2048 | ✅ | ✅ |
| GPT Image 2 | LLM Relay | 1024×1536 | ✅ | ✅ |
| Gemini 3 Pro Image | n1n | 1024×1024 | ✅ | ✅ |

所有模型均支持多图输入换衣（模特图 + 服装图），自动保持人物面貌、姿势、背景不变。

## 输出规格

- **格式**: PNG
- **比例**: 1:1 / 3:4 / 4:3 / 9:16 / 16:9
- **数量**: 1-4 张

## API 路由

| 路由 | 方法 | 说明 |
|------|------|------|
| `/api/generate-model` | POST | 创建图片生成任务（多平台分发） |
| `/api/try-on` | POST | 创建虚拟试衣任务（aitryon-plus） |
| `/api/upload` | POST | 上传图片到服务器 |
| `/api/task/[taskId]` | GET | 查询异步任务结果 |
| `/api/uploads/[filename]` | GET | 提供静态图片文件 |

## 环境变量

```bash
# .env.local（已 gitignore）
DASHSCOPE_API_KEY=xxx       # 阿里云 DashScope（Wan2.7 / Qwen）
OPENROUTER_API_KEY=xxx      # LLM Relay（GPT Image 2）
N1N_API_KEY=xxx             # n1n（Gemini 3 Pro Image）
CQT_API_KEY=xxx             # CQT AI
```

## 技术栈

| 层 | 技术 |
|----|------|
| 框架 | Next.js 16.1 (App Router + Turbopack) |
| UI | React 19 + Tailwind CSS v4 + 暗色主题 |
| 图标 | Lucide React |
| AI | DashScope / LLM Relay / n1n / CQT 多平台 |
| 图片处理 | sharp |
| 包管理 | pnpm |
| 语言 | TypeScript |

## 移动端

手机访问自动切换为标签页布局（模特 / 预览 / 服装），顶部汉堡菜单可打开侧边栏导航。

## 部署

服务器：`/opt/virtual-model-tool`

```bash
cd /opt/virtual-model-tool
git pull && pnpm install && pnpm build && pm2 restart virtual-tryon
```

Nginx 反向代理 `127.0.0.1:3000`，域名 `ai-wqd.fun`。
