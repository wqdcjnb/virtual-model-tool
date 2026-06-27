/**
 * 无尽科技 API 客户端
 * 提交: POST /api/async/image_gpt
 * 查询: GET /api/async/detail?id=xxx
 */
const BASE = "https://api.wuyinkeji.com/api/async";
const POLL_INTERVAL = 5000;

function apiKey() {
  const key = process.env.WUYINKEJI_API_KEY;
  if (!key) throw new Error("未配置 WUYINKEJI_API_KEY 环境变量");
  return key;
}

export interface WuyinkejiParams {
  prompt: string;
  size?: string;
  referenceImageUrls?: string[];
}

interface SubmitResponse {
  code: number;
  msg: string;
  data: { id: string; count: string };
}

interface DetailResponse {
  code: number;
  msg: string;
  data: {
    task_id: string;
    status: number; // 0 = processing, 2 = done
    result: string[] | null;
    message: string;
  };
}

/**
 * Submit an image generation task, returns task ID
 */
export async function submitImageTask(params: WuyinkejiParams): Promise<string> {
  const body: Record<string, unknown> = {
    prompt: params.prompt,
    size: params.size || "1:1",
  };
  if (params.referenceImageUrls?.length) {
    body.urls = params.referenceImageUrls;
  }

  const res = await fetch(`${BASE}/image_gpt`, {
    method: "POST",
    headers: {
      Authorization: apiKey(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data: SubmitResponse = await res.json();
  if (data.code !== 200) {
    throw new Error(`[无尽科技] ${data.msg || "提交任务失败"}`);
  }

  console.log("[无尽科技] 任务已提交:", { taskId: data.data.id });
  return data.data.id;
}

/**
 * Query task status and results
 */
export async function queryImageTask(taskId: string): Promise<DetailResponse["data"]> {
  const res = await fetch(`${BASE}/detail?id=${encodeURIComponent(taskId)}`, {
    headers: { Authorization: apiKey() },
  });

  const data: DetailResponse = await res.json();
  if (data.code !== 200) {
    throw new Error(`[无尽科技] ${data.msg || "查询任务失败"}`);
  }

  return data.data;
}

/**
 * Poll until task completes, returns image URLs
 */
export async function pollImageTask(taskId: string): Promise<string[]> {
  while (true) {
    const detail = await queryImageTask(taskId);

    if (detail.status === 2) {
      const urls = detail.result || [];
      if (!urls.length) throw new Error("无尽科技任务完成但未返回图片");
      console.log("[无尽科技] 图片生成成功:", { count: urls.length });
      return urls;
    }

    if (detail.status === undefined || detail.status < 0) {
      throw new Error(detail.message || "无尽科技任务失败");
    }

    await new Promise((r) => setTimeout(r, POLL_INTERVAL));
  }
}
