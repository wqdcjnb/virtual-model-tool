/**
 * CQT AI API 客户端
 * 端点: https://api.cqtai.com
 *
 * 提交: POST /api/cqt/generator/{group}
 * 查询: GET /api/cqt/info/{group}?id={taskId}
 *
 * model group 可选: nano / flux
 */
import type { TaskStatus } from "./types";

const BASE_URL = "https://api.cqtai.com";
const POLL_INTERVAL = 5000; // CQT 建议 5 秒轮询

function apiKey() {
  const key = process.env.CQT_API_KEY;
  if (!key) throw new Error("未配置 CQT_API_KEY 环境变量");
  return key;
}

// ============================================================
// 接口定义
// ============================================================

export interface CQTGenParams {
  /** 模型 group: nano 或 flux */
  group: "nano" | "flux";
  /** 具体模型 ID（nano-banana-pro / flux-kontext-max 等） */
  model: string;
  /** 文生图 prompt */
  prompt: string;
  /** 图生图参考图 URL */
  imageUrl?: string;
  /** 出图数量 1-4 */
  n?: number;
  /** 尺寸，如 "1024x1024" */
  size?: string;
}

export interface CQTTaskResult {
  status: TaskStatus;
  /** 生成图片 URL 列表 */
  results: string[];
  message?: string;
}

// ---- API 响应 ----

interface CQTResponse {
  code: number;
  msg?: string;
  data?: unknown;
}

interface CQTInfoResult {
  status: string;
  images?: { url: string }[];
  errorMsg?: string;
}

// ============================================================
// 提交生成任务
// ============================================================

export async function createCQTModelTask(
  params: CQTGenParams
): Promise<{ taskId: string }> {
  const { group, model, prompt, imageUrl, n = 1, size } = params;

  const body: Record<string, unknown> = {
    model,
    prompt,
    numImages: n,
  };
  if (imageUrl) body.imageUrl = imageUrl;
  if (size) body.size = size;

  const res = await fetch(`${BASE_URL}/api/cqt/generator/${group}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data: CQTResponse = await res.json();

  if (data.code !== 200) {
    throw new Error(`[CQT ${data.code}] ${data.msg || "请求失败"}`);
  }

  const taskId = data.data as string;
  if (!taskId) {
    throw new Error("CQT 任务创建失败：未返回 taskId");
  }

  console.log("[CQT] 任务已创建:", { group, model, taskId });
  return { taskId };
}

// ============================================================
// 查询任务结果
// ============================================================

export async function queryCQTTask(
  group: "nano" | "flux",
  taskId: string
): Promise<CQTTaskResult> {
  const res = await fetch(
    `${BASE_URL}/api/cqt/info/${group}?id=${taskId}`,
    {
      headers: {
        Authorization: `Bearer ${apiKey()}`,
      },
    }
  );

  const data: CQTResponse = await res.json();

  if (data.code !== 200) {
    throw new Error(`[CQT ${data.code}] ${data.msg || "查询失败"}`);
  }

  const info = data.data as CQTInfoResult;
  const status = (info.status?.toUpperCase() || "PENDING") as TaskStatus;
  const results =
    info.images
      ?.map((img: { url: string }) => img.url)
      .filter(Boolean) || [];

  return {
    status,
    results,
    message:
      status === "FAILED" ? info.errorMsg || "任务执行失败，请重试" : undefined,
  };
}

/**
 * 轮询直到任务完成或失败
 */
export async function pollCQTTask(
  group: "nano" | "flux",
  taskId: string,
  maxWaitMs: number = 5 * 60 * 1000
): Promise<string[]> {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const result = await queryCQTTask(group, taskId);
    if (result.status === "SUCCEEDED") return result.results;
    if (result.status === "FAILED") throw new Error(result.message || "CQT 生成失败");
    await new Promise((r) => setTimeout(r, POLL_INTERVAL));
  }
  throw new Error("CQT 任务超时（超过 5 分钟）");
}
