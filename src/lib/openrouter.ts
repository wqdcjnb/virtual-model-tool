/**
 * n1n API 客户端
 * 图生: POST /v1/images/generations (DALL-E 格式)
 * 文档: https://n1n.ai
 */
const BASE = "https://llmrelay.site/v1";

function apiKey() {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("未配置 OPENROUTER_API_KEY 环境变量");
  return key;
}

export interface OpenRouterParams {
  model: string;
  prompt: string;
  referenceImageUrl?: string;
  referenceImageUrls?: string[];
  size?: string;
  n?: number;
}

interface ImgGenResponse {
  data?: { url?: string; b64_json?: string }[];
  error?: { message: string; code?: string };
}

const MAX_RETRIES = 3;
const RETRY_DELAY = 3000;
const FETCH_TIMEOUT = 90_000;

async function fetchWithRetry(url: string, options: RequestInit, retries = MAX_RETRIES): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } catch (err: any) {
    if (retries > 1 && (err.name === "TimeoutError" || err.code === "ETIMEDOUT" || err.message?.includes("fetch failed"))) {
      const delay = RETRY_DELAY * (MAX_RETRIES - retries + 1);
      console.log(`[n1n] 超时重试 (${MAX_RETRIES - retries + 1}/${MAX_RETRIES - 1}), ${delay}ms 后重试...`);
      await new Promise((r) => setTimeout(r, delay));
      return fetchWithRetry(url, options, retries - 1);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

async function generateImageOnce(params: OpenRouterParams): Promise<{ results: string[] }> {
  const { model, prompt, referenceImageUrl, referenceImageUrls, size = "1024x1024", n = 1 } = params;

  // Collect all reference images (model + garments)
  const allRefUrls = referenceImageUrls?.length
    ? referenceImageUrls
    : referenceImageUrl
      ? [referenceImageUrl]
      : [];

  const isEdit = allRefUrls.length > 0;
  const endpoint = isEdit ? `${BASE}/images/edits` : `${BASE}/images/generations`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey()}`,
    "Content-Type": "application/json",
  };

  const bodyObj: Record<string, unknown> = { model, prompt, size, n, quality: "high" };
  if (isEdit) {
    console.log(`[n1n] edits 端点, ${allRefUrls.length} 张参考图`);
    bodyObj.images = allRefUrls.map((url) => ({ image_url: url }));
  }

  const res = await fetchWithRetry(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(bodyObj),
  });

  const data: ImgGenResponse = await res.json();

  if (data.error) {
    throw new Error(`[n1n ${data.error.code}] ${data.error.message}`);
  }

  const results: string[] = (data.data || [])
    .map((d) => d.url || d.b64_json)
    .filter(Boolean) as string[];

  if (!results.length) {
    throw new Error(`n1n 未返回图片 | response: ${JSON.stringify(data).substring(0, 200)}`);
  }

  return { results };
}

export async function generateImage(params: OpenRouterParams): Promise<{ results: string[] }> {
  const tryOnce = async (attempt: number): Promise<{ results: string[] }> => {
    try {
      const result = await generateImageOnce(params);
      console.log("[n1n] 图片生成成功:", { model: params.model, count: result.results.length });
      return result;
    } catch (err: any) {
      if (attempt > 1) {
        console.log(`[n1n] 失败重试 (${3 - attempt + 1}/2)...`);
        await new Promise((r) => setTimeout(r, 2000));
        return tryOnce(attempt - 1);
      }
      throw err;
    }
  };
  return tryOnce(3);
}
