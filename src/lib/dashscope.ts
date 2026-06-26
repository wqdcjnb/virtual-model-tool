/**
 * 阿里云 DashScope API 客户端
 *
 * 模特生成：wan2.7 / qwen-image / z-image 等多模型
 *   端点1（推荐组）：POST /api/v1/services/aigc/multimodal-generation/generation
 *   端点2（轻量组）：POST /api/v1/services/aigc/text2image/image-synthesis
 * 虚拟试衣：aitryon-plus
 *   端点：POST /api/v1/services/aigc/image2image/image-synthesis
 *
 * 任务查询（通用）：GET /api/v1/tasks/{task_id}
 */
import { getModelConfig } from "./constants";
import type { ModelConfig } from "./types";

const TASK_URL = "https://dashscope.aliyuncs.com/api/v1/tasks";
const MULTIMODAL_URL =
  "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation";
const TEXT2IMG_URL =
  "https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis";
const TRYON_URL =
  "https://dashscope.aliyuncs.com/api/v1/services/aigc/image2image/image-synthesis";

function apiKey() {
  const key = process.env.DASHSCOPE_API_KEY;
  if (!key) throw new Error("未配置 DASHSCOPE_API_KEY 环境变量");
  return key;
}

// ============================================================
// 类型定义
// ============================================================

export type TaskStatus = "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED";

export interface TaskResult {
  status: TaskStatus;
  results: string[];
  message?: string;
}

// ---- API 请求参数 ----

export interface ModelGenParams {
  model: string;
  mode: "text-to-image" | "image-to-image";
  prompt: string;
  negativePrompt?: string;
  referenceImageUrl?: string;
  size?: string;
  n?: number;
}

export interface TryOnParams {
  personImageUrl: string;
  topGarmentUrl?: string;
  bottomGarmentUrl?: string;
  resolution?: string;
  restoreFace?: boolean;
}

// ---- API 响应 shape ----

interface CreateTaskResponse {
  output?: {
    task_id?: string;
    task_status?: TaskStatus;
  };
  code?: string;
  message?: string;
}

interface QueryTaskResponse {
  output?: {
    task_id?: string;
    task_status?: TaskStatus;
    results?: { url?: string }[];
  };
  code?: string;
  message?: string;
}

// ============================================================
// 创建模特生成任务
// ============================================================

/**
 * 根据模型配置自动选择端点：
 *   multimodal-generation → 推荐组（支持文生图+图生图）
 *   text2image             → 轻量组（纯文生图）
 */
export async function createModelGenerationTask(
  params: ModelGenParams
): Promise<{ taskId: string }> {
  const config = getModelConfig(params.model);
  if (!config) {
    throw new Error(`未知模型: ${params.model}`);
  }

  if (config.endpoint === "multimodal-generation") {
    return createMultimodalTask(params, config);
  } else {
    return createText2ImageTask(params, config);
  }
}

/** 多模态端点（推荐组） */
async function createMultimodalTask(
  params: ModelGenParams,
  config: ModelConfig
): Promise<{ taskId: string }> {
  const { mode, prompt, referenceImageUrl, size, n = 1 } = params;

  // 构建 messages content 数组
  const content: Record<string, unknown>[] = [
    { text: prompt },
  ];

  if (mode === "image-to-image" && referenceImageUrl) {
    content.unshift({ image: referenceImageUrl });
  }

  const body = {
    model: config.id,
    input: {
      messages: [
        {
          role: "user",
          content,
        },
      ],
    },
    parameters: {
      size: size || config.maxResolution,
      n: Math.min(n, config.maxImages),
      thinking_mode: "disabled",
    },
  };

  const res = await fetch(MULTIMODAL_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "Content-Type": "application/json",
      "X-DashScope-Async": "enable",
    },
    body: JSON.stringify(body),
  });

  const data: CreateTaskResponse = await res.json();

  if (data.code && data.code !== "0" && data.message) {
    throw new Error(`[${data.code}] ${data.message}`);
  }

  if (!data.output?.task_id) {
    throw new Error("创建任务失败：未返回 task_id");
  }

  console.log("[dashscope] 多模态任务已创建:", {
    model: config.id,
    taskId: data.output.task_id,
  });
  return { taskId: data.output.task_id };
}

/** 传统文生图端点（轻量组） */
async function createText2ImageTask(
  params: ModelGenParams,
  config: ModelConfig
): Promise<{ taskId: string }> {
  const { prompt, negativePrompt, size, n = 1 } = params;

  const body: Record<string, unknown> = {
    model: config.id,
    input: {
      prompt,
      ...(negativePrompt ? { negative_prompt: negativePrompt } : {}),
    },
    parameters: {
      size: size || config.maxResolution,
      n: Math.min(n, config.maxImages),
    },
  };

  const res = await fetch(TEXT2IMG_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "Content-Type": "application/json",
      "X-DashScope-Async": "enable",
    },
    body: JSON.stringify(body),
  });

  const data: CreateTaskResponse = await res.json();

  if (data.code && data.code !== "0" && data.message) {
    throw new Error(`[${data.code}] ${data.message}`);
  }

  if (!data.output?.task_id) {
    throw new Error("创建任务失败：未返回 task_id");
  }

  console.log("[dashscope] 文生图任务已创建:", {
    model: config.id,
    taskId: data.output.task_id,
  });
  return { taskId: data.output.task_id };
}

// ============================================================
// 创建虚拟试衣任务（aitryon-plus）
// ============================================================

export async function createTryOnTask(
  params: TryOnParams
): Promise<{ taskId: string }> {
  const {
    personImageUrl,
    topGarmentUrl,
    bottomGarmentUrl,
    resolution = "1K",
    restoreFace = true,
  } = params;

  const body = {
    model: "aitryon-plus",
    input: {
      person_image_url: personImageUrl,
      ...(topGarmentUrl ? { top_garment_url: topGarmentUrl } : {}),
      ...(bottomGarmentUrl
        ? { bottom_garment_url: bottomGarmentUrl }
        : {}),
    },
    parameters: {
      resolution,
      restore_face: restoreFace,
    },
  };

  const res = await fetch(TRYON_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "Content-Type": "application/json",
      "X-DashScope-Async": "enable",
    },
    body: JSON.stringify(body),
  });

  const data: CreateTaskResponse = await res.json();

  if (data.code && data.code !== "0" && data.message) {
    throw new Error(`[${data.code}] ${data.message}`);
  }

  if (!data.output?.task_id) {
    throw new Error("创建试衣任务失败：未返回 task_id");
  }

  console.log("[dashscope] 试衣任务已创建:", data.output.task_id);
  return { taskId: data.output.task_id };
}

// ============================================================
// 通用任务查询
// ============================================================

export async function queryTask(taskId: string): Promise<TaskResult> {
  const res = await fetch(`${TASK_URL}/${taskId}`, {
    headers: {
      Authorization: `Bearer ${apiKey()}`,
    },
  });

  const data: QueryTaskResponse = await res.json();

  if (data.code && data.code !== "0" && data.message) {
    throw new Error(`[${data.code}] ${data.message}`);
  }

  const output = data.output;
  const status = output?.task_status || "PENDING";
  const results =
    output?.results
      ?.map((r: { url?: string }) => r.url)
      .filter(Boolean) as string[] || [];

  return {
    status,
    results,
    message:
      status === "FAILED" ? "任务执行失败，请检查输入参数后重试" : undefined,
  };
}
