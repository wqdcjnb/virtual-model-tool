# DESIGN.md - AI Virtual Try-On Studio

## 项目与用户画像
- 面向时尚行业从业者和电商运营者的AI虚拟试衣平台
- 支持AI模特生成、服装上传、全身虚拟试穿

## 品牌与视觉方向
- 风格：现代时尚科技感，暗色调为主
- 情绪：专业、高端、创新
- 参考：时尚杂志 + 科技产品界面的融合

## Design Tokens

### 色彩
- 背景色：zinc-950 (#09090b) 深邃黑
- 表面色：zinc-900 (#18181b) 深灰
- 卡片色：zinc-800/50 半透明深灰
- 边框色：zinc-800 微妙边框
- 主文字：zinc-50 近白
- 副文字：zinc-400 灰色
- 主强调色：rose-500 (#f43f5e) 时尚粉
- 副强调色：violet-500 (#8b5cf6) 科技紫
- 成功色：emerald-500
- 警告色：amber-500

### 字体
- 标题：PingFang SC / Inter, 600-700 weight
- 正文：PingFang SC / Inter, 400 weight
- 数据：JetBrains Mono (等宽)

### 圆角
- 卡片：rounded-xl (12px)
- 按钮：rounded-lg (8px)
- 输入框：rounded-md (6px)
- 头像：rounded-full

### 阴影
- 卡片：shadow-lg with subtle glow
- 悬浮：shadow-xl with accent glow
- 按钮：shadow-md

### 动效
- 页面切换：fade + slide (300ms ease)
- 卡片悬浮：scale(1.02) + shadow glow (200ms)
- 加载动画：pulse + shimmer
- 按钮点击：scale(0.98) (100ms)

## 布局与响应式
- 侧边栏导航：固定左侧，宽240px（桌面端），移动端收起为汉堡菜单
- 主内容区：自适应宽度，最大1400px
- 网格布局：响应式列数（桌面4列，平板2列，手机1列）
- 间距：统一使用 4px 基准网格

## 组件规范
- 模特卡片：竖版图片 + 底部信息栏（名称、属性标签）
- 服装卡片：方形图片 + 分类标签 + 名称
- 试衣结果卡片：竖版图片 + 底部模特/服装信息
- 选择态：边框高亮 + 缩放效果
- 加载态：骨架屏 shimmer 动画
