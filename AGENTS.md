# AI Virtual Try-On Studio

## 项目概览
AI 驱动的虚拟模特生成与试衣平台。支持 9 种 AI 模型生成模特、服装上传管理、全身虚拟试穿，输出高清 PNG 图片。

## 技术栈
- **Framework**: Next.js 16 (App Router)
- **Core**: React 19
- **Language**: TypeScript 5
- **UI**: shadcn/ui (Radix UI) + Tailwind CSS 4
- **Icons**: Lucide React
- **Design**: 暗色主题 + 玫粉色时尚科技风
- **AI API**: 阿里云 DashScope（wan2.7 / qwen-image / aitryon-plus）

## 文件结构
```
src/
├── app/
│   ├── layout.tsx                    # 根布局（侧边栏导航）
│   ├── page.tsx                      # 首页仪表盘
│   ├── globals.css                   # 全局样式
│   ├── studio/page.tsx               # 试衣工作室（核心功能）
│   ├── models/page.tsx               # 模特工坊（AI模特生成）
│   ├── garments/page.tsx             # 服装库（服装管理）
│   ├── gallery/page.tsx              # 作品画廊（试衣结果）
│   └── api/
│       ├── generate-model/route.ts   # POST 模特生成
│       ├── try-on/route.ts           # POST 虚拟试衣
│       ├── upload/route.ts           # POST 图片上传
│       ├── task/[taskId]/route.ts    # GET 异步任务查询
│       └── uploads/[filename]/route.ts # GET 图片服务
├── components/
│   ├── ui/                           # shadcn/ui 组件（62 个）
│   └── sidebar.tsx                   # 侧边栏导航组件
├── lib/
│   ├── dashscope.ts                  # DashScope API 客户端
│   ├── ai-service.ts                 # AI 服务层（真实 API 调用）
│   ├── constants.ts                  # 模型配置表 + 下拉选项
│   ├── types.ts                      # TypeScript 类型定义
│   ├── prompt-builder.ts             # 结构化字段 → prompt
│   ├── mock-data.ts                  # 演示数据类型定义
│   └── utils.ts                      # cn() 工具函数
└── hooks/
    └── use-mobile.ts                 # 响应式检测 hook
```

## 核心功能
1. **工作台** (`/`) - 数据概览、快捷操作、最近作品
2. **试衣工作室** (`/studio`) - 选择模特 + 选择服装 → AI 虚拟试衣（aitryon-plus）
3. **模特工坊** (`/models`) - AI 生成模特（性别/年龄/肤色/体型/发型），支持 9 种模型
4. **服装库** (`/garments`) - 浏览/上传服装（上装/下装/连衣裙/鞋履/配饰/外套）
5. **作品画廊** (`/gallery`) - 浏览/下载历史作品

## AI 模型集成

### 模特生成 — 阿里云 DashScope
| 模型 | 端点 | 最大分辨率 | 最大张数 | 支持图生图 |
|------|------|-----------|---------|-----------|
| wan2.7-image-pro | multimodal-generation | 4096×4096 | 4 | ✅ |
| wan2.7-image | multimodal-generation | 2048×2048 | 4 | ✅ |
| wan2.6-image | multimodal-generation | 1440×1440 | 4 | ✅ |
| qwen-image-2.0-pro | multimodal-generation | 2048×2048 | 6 | ✅ |
| qwen-image-2.0 | multimodal-generation | 2048×2048 | 6 | ✅ |
| qwen-image-max | text2image | 1664×928 | 1 | ❌ |
| qwen-image-plus | text2image | 1664×928 | 1 | ❌ |
| z-image-turbo | text2image | 2048×2048 | 1 | ❌ |
| wan2.6-t2i | text2image | 1440×1440 | 4 | ❌ |

### 虚拟试衣 — 阿里云 DashScope
| 模型 | 端点 | 说明 |
|------|------|------|
| aitryon-plus | image2image/image-synthesis | AI 试衣 Plus 版，高清输出 |

### 集成方式
已在 `src/lib/dashscope.ts` 中实现：
- `createModelGenerationTask()` — 根据模型自动选择 multimodal-generation 或 text2image 端点
- `createTryOnTask()` — 调用 aitryon-plus API
- `queryTask()` — 通用异步任务轮询

`src/lib/ai-service.ts` 中的 `generateModel()` 和 `generateTryOn()` 已对接真实 API。

## 关键设计决策
- **暗色主题**: 时尚科技感，突出图片展示效果
- **玫粉主色**: #f43f5e (rose-500)，时尚品牌调性
- **侧边栏导航**: 5 个核心页面，图标 + 文字
- **卡片式布局**: 模特/服装/作品均以卡片展示
- **多模型选择**: 用户可在推荐组（支持图生图）和轻量组（纯文生图）之间切换

## 图片输出
- 格式: **PNG**
- 默认分辨率: 1024×1024（最高 4K）
- 输出比例: 1:1 / 3:4 / 4:3 / 9:16 / 16:9
- 出图数量: 1-4 张（部分模型最多 6 张）

## 开发命令
```bash
pnpm dev         # 启动开发服务器（端口 5000）
pnpm build       # 构建生产版本
pnpm start       # 启动生产服务器
pnpm lint        # 代码检查
```

## 环境变量
```bash
DASHSCOPE_API_KEY=你的阿里云 DashScope API Key
```
