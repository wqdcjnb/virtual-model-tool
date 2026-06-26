# AI Virtual Try-On Studio

## 项目概览
AI驱动的虚拟试衣平台。支持AI模特生成、服装上传管理、全身虚拟试穿，输出高清图片。

## 技术栈
- **Framework**: Next.js 16 (App Router)
- **Core**: React 19
- **Language**: TypeScript 5
- **UI**: shadcn/ui (Radix UI) + Tailwind CSS 4
- **Icons**: Lucide React
- **Design**: 暗色主题 + 玫粉色时尚科技风

## 文件结构
```
src/
├── app/
│   ├── layout.tsx          # 根布局（侧边栏导航）
│   ├── page.tsx            # 首页仪表盘
│   ├── globals.css         # 全局样式
│   ├── studio/page.tsx     # 试衣工作室（核心功能）
│   ├── models/page.tsx     # 模特工坊（AI模特生成）
│   ├── garments/page.tsx   # 服装库（服装管理）
│   └── gallery/page.tsx    # 作品画廊（试衣结果）
├── components/
│   ├── ui/                 # shadcn/ui 组件
│   └── sidebar.tsx         # 侧边栏导航组件
└── lib/
    ├── mock-data.ts        # 演示数据（模特/服装/结果）
    ├── ai-service.ts       # AI服务层（模拟AI生成）
    └── utils.ts            # 工具函数
public/images/
    ├── models/             # 模特图片
    ├── garments/           # 服装图片
    └── results/            # 试衣结果图片
```

## 核心功能
1. **工作台** (`/`) - 数据概览、快捷操作、最近作品
2. **试衣工作室** (`/studio`) - 选择模特 + 选择服装 → AI生成试衣效果
3. **模特工坊** (`/models`) - AI生成模特（性别/年龄/肤色/体型/发型）
4. **服装库** (`/garments`) - 浏览/上传服装（上装/下装/连衣裙/鞋履/配饰）
5. **作品画廊** (`/gallery`) - 浏览/下载试衣作品

## AI模型集成说明
当前使用模拟数据演示。生产环境需集成：

### 模特生成（推荐）
| 模型 | 特点 | 适用场景 |
|------|------|----------|
| FLUX.1 Pro | 写实人像最强，细节丰富 | 高端时尚摄影 |
| Stable Diffusion 3.5 | 质量好，可控性强 | 通用模特生成 |
| DALL-E 3 | 理解力强，风格多样 | 创意风格模特 |

### 虚拟试衣（推荐）
| 模型 | 特点 | 适用场景 |
|------|------|----------|
| IDM-VTON | 当前效果最好，保真度高 | 高质量试衣 |
| CatVTON | 轻量高效，速度快 | 实时预览 |
| OOTDiffusion | 质量好，支持多种服装 | 通用试衣 |
| StableVITON | 稳定可靠 | 批量处理 |

### 集成方式
修改 `src/lib/ai-service.ts`，将模拟函数替换为真实API调用：
- `generateModel()` → 调用 FLUX/SD3.5 API
- `generateTryOn()` → 调用 IDM-VTON/CatVTON API
- `uploadGarment()` → 调用服装分割/预处理 API

## 关键设计决策
- **暗色主题**: 时尚科技感，突出图片展示效果
- **玫粉主色**: #f43f5e (rose-500)，时尚品牌调性
- **侧边栏导航**: 5个核心页面，图标+文字
- **卡片式布局**: 模特/服装/作品均以卡片展示
- **加载动画**: 模拟AI生成过程的骨架屏效果

## 高清输出
- 默认分辨率: 2048 x 2048
- 支持选择: 1024x1024 / 2048x2048 / 4096x4096
- 输出格式: JPEG 高清

## 开发命令
```bash
pnpm dev        # 启动开发服务器
pnpm build      # 构建生产版本
pnpm start      # 启动生产服务器
pnpm lint       # 代码检查
```
