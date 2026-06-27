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
  referenceImageUrls?: string[];
  size?: string;
  n?: number;
}

export interface TryOnParams {
  model?: string;
  personImageUrl: string;
  topGarmentUrl?: string;
  bottomGarmentUrl?: string;
  resolution?: number;
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
    image_url?: string;
    message?: string;
    code?: string;
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
): Promise<{ taskId: string; results?: string[] }> {
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

/** 多模态端点（推荐组）— 同步模式，直接返回结果图片 URL */
async function createMultimodalTask(
  params: ModelGenParams,
  config: ModelConfig
): Promise<{ taskId: string; results?: string[] }> {
  const { mode, prompt, referenceImageUrl, referenceImageUrls, size, n = 1 } = params;

  // Build content array: images first, then text
  const content: Record<string, unknown>[] = [];

  if (mode === "image-to-image") {
    // Support both single referenceImageUrl (backward compat) and array referenceImageUrls
    const urls = referenceImageUrls?.length
      ? referenceImageUrls
      : referenceImageUrl
        ? [referenceImageUrl]
        : [];
    for (const url of urls) {
      if (url) content.push({ image: url });
    }
  }

  content.push({ text: prompt });

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
    },
  };

  // 先尝试异步模式
  let res = await fetch(MULTIMODAL_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "Content-Type": "application/json",
      "X-DashScope-Async": "enable",
    },
    body: JSON.stringify(body),
  });

  let data: CreateTaskResponse = await res.json();

  // 异步不支持则回退同步
  if (data.code === "AccessDenied" && data.message?.includes("asynchronous")) {
    console.log("[dashscope] 异步不可用，回退同步模式");

    res = await fetch(MULTIMODAL_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const syncData = await res.json();

    // 同步返回格式: { output: { choices: [{ message: { content: [{ image: "url" }] } }] } }
    if (syncData.code && syncData.code !== "0" && syncData.message) {
      throw new Error(`[${syncData.code}] ${syncData.message}`);
    }

    const choices = syncData?.output?.choices;
    if (choices?.length) {
      const results = choices.flatMap((c: any) => {
        const contents = c?.message?.content || [];
        return contents
          .filter((item: any) => item.image)
          .map((item: any) => item.image as string);
      });

      if (results.length) {
        console.log("[dashscope] 同步生成成功:", { model: config.id, count: results.length });
        return { taskId: `sync-${Date.now()}`, results };
      }
    }

    throw new Error("同步模式未返回图片");
  }

  if (data.code && data.code !== "0" && data.message) {
    throw new Error(`[${data.code}] ${data.message}`);
  }

  if (!data.output?.task_id) {
    throw new Error("创建任务失败：未返回 task_id");
  }

  console.log("[dashscope] 异步任务已创建:", {
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
    model = "aitryon-plus",
    personImageUrl,
    topGarmentUrl,
    bottomGarmentUrl,
    resolution = 1024,
    restoreFace = true,
  } = params;

  if (!["aitryon-plus", "aitryon"].includes(model)) {
    throw new Error(`不支持的试衣模型: ${model}，可选: aitryon-plus / aitryon`);
  }

  const body = {
    model,
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

  // aitryon-plus returns output.image_url (single), other APIs return output.results[].url
  const results: string[] = [];
  if (output?.image_url) {
    results.push(output.image_url);
  }
  if (output?.results) {
    for (const r of output.results) {
      if (r.url) results.push(r.url);
    }
  }

  // 构建详细错误信息
  let message: string | undefined;
  if (status === "FAILED") {
    const raw = JSON.stringify(output);
    message = `失败 | DashScope返回: ${raw.substring(0, 600)}`;
  }

  return { status, results, message };
}
