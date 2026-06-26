# AI Virtual Try-On Studio

AI 驱动的虚拟模特生成与虚拟试衣平台，基于 Next.js 16 + shadcn/ui + 阿里云 DashScope API。

## 快速开始

```bash
# 安装依赖（必须用 pnpm）
pnpm install

# 启动开发服务器
pnpm dev
# → http://localhost:5000

# 构建生产版本
pnpm build

# 启动生产服务器
pnpm start
```

## 项目结构

```
src/
├── app/
│   ├── layout.tsx                     # 根布局（侧边栏导航）
│   ├── page.tsx                       # 首页仪表盘
│   ├── globals.css                    # 全局样式 + shadcn 主题变量
│   ├── studio/page.tsx                # 虚拟试衣工作室（核心）
│   ├── models/page.tsx                # AI 模特工坊
│   ├── garments/page.tsx              # 服装库
│   ├── gallery/page.tsx               # 作品画廊
│   └── api/
│       ├── generate-model/route.ts    # POST 模特生成（文生图 + 图生图）
│       ├── try-on/route.ts            # POST 虚拟试衣
│       ├── upload/route.ts            # POST 图片上传
│       ├── task/[taskId]/route.ts     # GET 任务轮询
│       └── uploads/[filename]/route.ts # GET 静态图片服务
├── components/
│   ├── ui/                            # shadcn/ui 组件（62 个）
│   └── sidebar.tsx                    # 侧边栏导航
├── lib/
│   ├── dashscope.ts                   # DashScope API 客户端
│   ├── ai-service.ts                  # AI 服务层
│   ├── constants.ts                   # 模型配置 + 选项常量
│   ├── types.ts                       # TypeScript 类型
│   ├── prompt-builder.ts              # 结构化字段 → 英文 prompt
│   ├── mock-data.ts                   # 演示数据类型定义
│   └── utils.ts                       # cn() 工具函数
└── hooks/
    └── use-mobile.ts                  # 移动端检测
public/images/
    ├── models/                        # 模特图片
    ├── garments/                      # 服装图片
    └── results/                       # 试衣结果图片
```

## 核心功能

| 页面 | 路由 | 说明 |
|------|------|------|
| **工作台** | `/` | 数据统计、快捷操作、最近作品 |
| **试衣工作室** | `/studio` | 选模特 + 选服装 → AI 虚拟试衣 |
| **模特工坊** | `/models` | AI 生成模特（性别/年龄/肤色/体型/发型） |
| **服装库** | `/garments` | 浏览/上传服装 |
| **作品画廊** | `/gallery` | 浏览/下载历史作品 |

## AI 模型

### 模特生成（DashScope 多模型支持）

| 模型 | 说明 | 最大分辨率 | 图生图 |
|------|------|-----------|--------|
| Wan2.7 Pro | 旗舰版，4K 高清 | 4096×4096 | ✅ |
| Wan2.7 | 均衡版 | 2048×2048 | ✅ |
| Wan2.6 | 性价比之选 | 1440×1440 | ✅ |
| Qwen-Image Pro | 最多 6 张 | 2048×2048 | ✅ |
| Qwen-Image | 均衡版 | 2048×2048 | ✅ |
| Qwen-Image Max | 快速文生图 | 1664×928 | ❌ |
| Qwen-Image Plus | 轻量文生图 | 1664×928 | ❌ |
| Z-Image Turbo | 极速写实人像 | 2048×2048 | ❌ |
| Wan2.6 T2I | 经典文生图 | 1440×1440 | ❌ |

### 虚拟试衣

| 模型 | 说明 |
|------|------|
| aitryon-plus | DashScope AI 试衣 Plus 版，高清输出 |

## 输出规格

- **格式**: PNG
- **分辨率**: 1K / 2K 可选
- **比例**: 1:1 / 3:4 / 4:3 / 9:16 / 16:9
- **数量**: 最多 4 张（Qwen-Image 系列最多 6 张）

## API 路由

| 路由 | 方法 | 说明 |
|------|------|------|
| `/api/generate-model` | POST | 创建模特生成任务 |
| `/api/try-on` | POST | 创建虚拟试衣任务 |
| `/api/upload` | POST | 上传图片到服务器 |
| `/api/task/[taskId]` | GET | 查询异步任务结果 |
| `/api/uploads/[filename]` | GET | 提供静态图片文件 |

## 环境变量

```bash
# .env.local（已 gitignore）
DASHSCOPE_API_KEY=你的阿里云 DashScope API Key
```

从 [阿里云 DashScope](https://dashscope.aliyun.com) 获取 API Key。

## 技术栈

| 层 | 技术 |
|----|------|
| 框架 | Next.js 16.1 (App Router) |
| UI | React 19 + shadcn/ui (Radix UI) |
| 样式 | Tailwind CSS v4 + 暗色主题 |
| 表单 | React Hook Form + Zod |
| 图标 | Lucide React |
| AI | 阿里云 DashScope API |
| 图片 | sharp |
| 包管理 | pnpm |
| 语言 | TypeScript |

## 开发规范

- **必须使用 pnpm**（已配置 preinstall 强制检查）
- **优先使用 shadcn/ui 组件**，位于 `src/components/ui/`
- **使用 `@/` 路径别名**导入模块（指向 `src/`）
- **API 路由**统一放在 `src/app/api/`
- **新页面**在 `src/app/` 下创建文件夹 + `page.tsx`
