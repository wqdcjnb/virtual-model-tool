/**
 * 阿里云 DashScope API 客户端
 * 万相-虚拟模特：wanx-virtualmodel / virtualmodel-v2
 * 文档：https://help.aliyun.com/zh/model-studio/virtual-model
 *
 * 重要：仅限"中国内地（北京）"地域
 */

const BASE_URL = "https://dashscope.aliyuncs.com/api/v1/services";
const TASK_URL = "https://dashscope.aliyuncs.com/api/v1/tasks";

function apiKey() {
  const key = process.env.DASHSCOPE_API_KEY;
  if (!key) throw new Error("未配置 DASHSCOPE_API_KEY 环境变量");
  return key;
}

// ============================================================
// 类型定义
// ============================================================

export type ModelVersion = "wanx-virtualmodel" | "virtualmodel-v2";
export type ShortSideSize = "512" | "1024" | "2048";
export type AspectRatio =
  | "1:1"
  | "3:4"
  | "4:3"
  | "9:16"
  | "16:9"
  | "1:2"
  | "2:1";

/** 创建任务参数 */
export interface VirtualModelParams {
  /** 原始模特图 URL（必填） */
  baseImageUrl: string;
  /** 蒙版图 URL - 标记需要保留的服装区域（必填） */
  maskImageUrl: string;
  /** 全身形象描述，中英文均可（必填） */
  prompt: string;
  /** 人像面部描述（必填） */
  facePrompt: string;
  /** 背景参考图 URL（可选） */
  backgroundImageUrl?: string;
  /** 模型版本 */
  model: ModelVersion;
  /** 生成图片短边尺寸 */
  shortSideSize: ShortSideSize;
  /** 生成图片数量，1-4 */
  n?: number;
  /** V2: 生成图片宽高比 */
  aspectRatio?: AspectRatio;
  /** V2: 背景参考图权重 0.0-1.0 */
  backgroundWeight?: number;
  /** V2: 输入是否人台图（false=真人，true=人台） */
  realPerson?: boolean;
}

/** 任务状态 */
export type TaskStatus = "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED";

/** 任务查询结果 */
export interface TaskResult {
  status: TaskStatus;
  /** 生成结果图片 URL 列表 */
  results: string[];
  /** 失败时的错误信息 */
  message?: string;
}

/** 创建任务 API 响应 */
interface CreateTaskResponse {
  output?: {
    task_id?: string;
    task_status?: TaskStatus;
  };
  code?: string;
  message?: string;
}

/** 查询任务 API 响应 */
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
// API 函数
// ============================================================

/**
 * 创建虚拟模特生成任务（异步）
 * POST /api/v1/services/aigc/virtualmodel/generation
 */
export async function createVirtualModelTask(
  params: VirtualModelParams
): Promise<{ taskId: string }> {
  const {
    baseImageUrl,
    maskImageUrl,
    prompt,
    facePrompt,
    backgroundImageUrl,
    model,
    shortSideSize,
    n = 1,
    aspectRatio,
    backgroundWeight,
    realPerson,
  } = params;

  const body: Record<string, unknown> = {
    model,
    input: {
      base_image_url: baseImageUrl,
      mask_image_url: maskImageUrl,
      prompt,
      face_prompt: facePrompt,
      ...(backgroundImageUrl
        ? { background_image_url: backgroundImageUrl }
        : {}),
    },
    parameters: {
      short_side_size: shortSideSize,
      n,
      ...(model === "virtualmodel-v2" && aspectRatio
        ? { aspect_ratio: aspectRatio }
        : {}),
      ...(model === "virtualmodel-v2" && backgroundWeight !== undefined
        ? { background_weight: backgroundWeight }
        : {}),
      ...(model === "virtualmodel-v2" && realPerson !== undefined
        ? { realPerson }
        : {}),
    },
  };

  const res = await fetch(
    `${BASE_URL}/aigc/virtualmodel/generation`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey()}`,
        "Content-Type": "application/json",
        "X-DashScope-Async": "enable",
      },
      body: JSON.stringify(body),
    }
  );

  const data: CreateTaskResponse = await res.json();

  if (data.code && data.message) {
    throw new Error(`[${data.code}] ${data.message}`);
  }

  if (!data.output?.task_id) {
    throw new Error("创建任务失败：未返回 task_id");
  }

  return { taskId: data.output.task_id };
}

/**
 * 查询虚拟模特任务结果
 * GET /api/v1/tasks/{task_id}
 */
export async function queryVirtualModelTask(
  taskId: string
): Promise<TaskResult> {
  const res = await fetch(`${TASK_URL}/${taskId}`, {
    headers: {
      Authorization: `Bearer ${apiKey()}`,
    },
  });

  const data: QueryTaskResponse = await res.json();

  if (data.code && data.message) {
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
    message: status === "FAILED" ? "任务执行失败，请检查输入参数后重试" : undefined,
  };
}
