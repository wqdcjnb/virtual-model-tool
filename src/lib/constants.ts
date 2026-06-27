// ============================================================
// 常量：下拉选项、比例映射、状态标签、模型配置
// ============================================================
import type { ModelConfig } from "./types";

// ============================================================
// 模型配置表
// ============================================================

export const MODEL_CONFIGS: ModelConfig[] = [
  {
    id: "aitryon-plus",
    name: "AI 试衣 Plus",
    group: "recommended",
    platform: "dashscope",
    endpoint: "multimodal-generation",
    maxResolution: "1920*1080",
    maxImages: 1,
    supportsImageToImage: false,
    description: "真实虚拟试衣，人物换装不换脸",
  },
  {
    id: "nano-banana-pro",
    name: "Nano Banana Pro",
    group: "recommended",
    platform: "cqt",
    endpoint: "cqt-nano",
    maxResolution: "1024*1024",
    maxImages: 4,
    supportsImageToImage: true,
    description: "CQT 快速高质量",
  },
  {
    id: "wan2.7-image-pro",
    name: "Wan2.7 Pro",
    group: "recommended",
    platform: "dashscope",
    endpoint: "multimodal-generation",
    maxResolution: "4096*4096",
    maxImages: 4,
    supportsImageToImage: true,
    description: "DashScope 旗舰 4K",
  },
  {
    id: "qwen-image-2.0-pro",
    name: "Qwen-Image Pro",
    group: "recommended",
    platform: "dashscope",
    endpoint: "multimodal-generation",
    maxResolution: "2048*2048",
    maxImages: 6,
    supportsImageToImage: true,
    description: "DashScope Qwen 6张",
  },
  {
    id: "flux-1.1-pro:stable",
    name: "FLUX 1.1 Pro",
    group: "recommended",
    platform: "openrouter",
    endpoint: "multimodal-generation",
    maxResolution: "1024x1024",
    maxImages: 1,
    supportsImageToImage: true,
    description: "先锋图生模型，细节丰富色彩生动",
  },
  {
    id: "gpt-image-2",
    name: "GPT Image 2",
    group: "recommended",
    platform: "openrouter",
    endpoint: "multimodal-generation",
    maxResolution: "2048x2048",
    maxImages: 1,
    supportsImageToImage: true,
    description: "OpenAI 最新图生模型",
  },
  {
    id: "grok-imagine-image-pro",
    name: "Grok Imagine Pro",
    group: "recommended",
    platform: "openrouter",
    endpoint: "multimodal-generation",
    maxResolution: "2048x2048",
    maxImages: 1,
    supportsImageToImage: true,
    description: "Elon Musk 最新图生模型",
  },
];

/** 默认模型 */
export const DEFAULT_MODEL = "aitryon-plus";

/** 根据 ID 查找模型配置 */
export function getModelConfig(id: string): ModelConfig | undefined {
  return MODEL_CONFIGS.find((m) => m.id === id);
}

/** 获取分组后的模型选项（用于 <optgroup>） */
export function getGroupedModelOptions(): {
  group: string;
  label: string;
  models: ModelConfig[];
}[] {
  return [
    {
      group: "recommended",
      label: "推荐 — 支持文生图+图生图",
      models: MODEL_CONFIGS.filter((m) => m.group === "recommended"),
    },
    {
      group: "lightweight",
      label: "轻量 — 纯文生图",
      models: MODEL_CONFIGS.filter((m) => m.group === "lightweight"),
    },
  ];
}

// ============================================================
// 出图比例选项
// ============================================================

export const ASPECT_RATIOS = [
  { value: "3:4", label: "3:4 (竖版)" },
  { value: "1:1", label: "1:1 (正方形)" },
  { value: "4:3", label: "4:3 (横版)" },
  { value: "9:16", label: "9:16 (竖版全屏)" },
  { value: "16:9", label: "16:9 (横版全屏)" },
];

/** 比例 -> wan2.7 系列 size 字符串映射 */
export const ASPECT_RATIO_SIZE_MAP: Record<string, string> = {
  "1:1": "1024*1024",
  "3:4": "960*1280",
  "4:3": "1280*960",
  "9:16": "720*1280",
  "16:9": "1280*720",
};

/** 比例 -> text2image 端点 size 映射 */
export const ASPECT_RATIO_SIZE_MAP_T2I: Record<string, string> = {
  "1:1": "1024*1024",
  "3:4": "960*1280",
  "4:3": "1280*960",
  "9:16": "720*1280",
  "16:9": "1280*720",
};

// ============================================================
// 模特生成字段选项
// ============================================================

export const GENDER_OPTIONS = [
  { value: "", label: "不限" },
  { value: "male", label: "男" },
  { value: "female", label: "女" },
];

export const AGE_OPTIONS = [
  { value: "", label: "不限" },
  { value: "teenager", label: "青少年" },
  { value: "youth", label: "青年" },
  { value: "middle-aged", label: "中年" },
  { value: "elderly", label: "老年" },
];

export const RACE_OPTIONS = [
  { value: "", label: "不限" },
  { value: "asian", label: "亚洲" },
  { value: "european", label: "欧美" },
];

export const BODY_SIZE_OPTIONS = [
  { value: "", label: "不限" },
  { value: "slim", label: "纤细" },
  { value: "standard", label: "标准" },
  { value: "curvy", label: "丰满" },
  { value: "muscular", label: "肌肉" },
];

export const IDENTITY_OPTIONS = [
  { value: "", label: "不限" },
  { value: "student", label: "学生" },
  { value: "office", label: "上班族" },
  { value: "artist", label: "艺术家" },
  { value: "athlete", label: "运动员" },
];

export const SCENE_OPTIONS = [
  { value: "", label: "不限" },
  { value: "studio", label: "摄影棚" },
  { value: "street", label: "街景" },
  { value: "park", label: "公园" },
  { value: "beach", label: "海滩" },
  { value: "office", label: "办公室" },
  { value: "cafe", label: "咖啡馆" },
  { value: "library", label: "图书馆" },
  { value: "city", label: "城市" },
  { value: "home", label: "居家" },
];

export const POSE_OPTIONS = [
  { value: "", label: "不限" },
  { value: "standing", label: "站立" },
  { value: "sitting", label: "坐姿" },
  { value: "walking", label: "行走" },
  { value: "dynamic", label: "动态" },
];

export const QUANTITY_OPTIONS = [1, 2, 3, 4];

// ============================================================
// 任务状态标签
// ============================================================

export const STATUS_LABEL: Record<string, string> = {
  PENDING: "排队中...",
  RUNNING: "AI 生成中...",
  SUCCEEDED: "完成",
  FAILED: "失败",
};

// ============================================================
// 虚拟试衣模型配置
// ============================================================

export interface TryOnModelConfig {
  id: string;
  name: string;
  provider: string;
  description: string;
  quality: string;
  recommended: boolean;
}

export const TRYON_MODEL_CONFIGS: TryOnModelConfig[] = [
  {
    id: "aitryon-plus",
    name: "AI 试衣 Plus",
    provider: "DashScope",
    description: "高清虚拟试衣，服装贴合度最佳",
    quality: "ultra-hd",
    recommended: true,
  },
];

export const DEFAULT_TRYON_MODEL = "aitryon-plus";

export function getTryOnModelConfig(id: string): TryOnModelConfig | undefined {
  return TRYON_MODEL_CONFIGS.find((m) => m.id === id);
}

// ============================================================
// 虚拟试衣选项
// ============================================================

export const TRYON_RESOLUTIONS = [
  { value: "1024", label: "1024 (576×1024 标准)" },
  { value: "1280", label: "1280 (720×1280 高清)" },
  { value: "-1", label: "原图尺寸" },
];
