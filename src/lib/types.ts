// ============================================================
// 共享类型定义
// ============================================================

/** Tab 页 */
export type ActiveTab = "model" | "tryon";

/** 生成模式 */
export type GenerationMode = "text-to-image" | "image-to-image";

/** 模型分组 */
export type ModelGroup = "recommended" | "lightweight";

/** 模型平台 */
export type ModelPlatform = "dashscope" | "cqt" | "openrouter" | "wuyinkeji";

/** 模型端点类型 */
export type ModelEndpoint = "multimodal-generation" | "text2image" | "cqt-nano" | "cqt-flux";

/** 单个模型配置 */
export interface ModelConfig {
  id: string;
  name: string;
  group: ModelGroup;
  platform: ModelPlatform;
  endpoint: ModelEndpoint;
  maxResolution: string;
  maxImages: number;
  supportsImageToImage: boolean;
  description: string;
}

/** 模特生成表单结构化字段 */
export interface ModelFormFields {
  gender: string;
  age: string;
  race: string;
  bodySize: string;
  identity: string;
  scene: string;
  pose: string;
}

/** 任务状态 */
export type TaskStatus = "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED";

/** API 通用响应 */
export interface ApiSuccessResponse {
  success: true;
  [key: string]: unknown;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
}

export type ApiResponse = ApiSuccessResponse | ApiErrorResponse;
