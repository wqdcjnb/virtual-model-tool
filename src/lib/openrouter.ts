/**
 * n1n API 客户端
 * 图生: POST /v1/images/generations (DALL-E 格式)
 * 文档: https://n1n.ai
 */
const BASE = "https://api.n1n.ai/v1";

function apiKey() {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("未配置 OPENROUTER_API_KEY 环境变量");
  return key;
}

export interface OpenRouterParams {
  model: string;
  prompt: string;
  referenceImageUrl?: string;
  size?: string;
  n?: number;
}

interface ImgGenResponse {
  data?: { url?: string; b64_json?: string }[];
  error?: { message: string; code?: string };
}

export async function generateImage(params: OpenRouterParams): Promise<{ results: string[] }> {
  const { model, prompt, referenceImageUrl, size = "1024x1024", n = 1 } = params;

  const body: Record<string, unknown> = {
    model,
    prompt,
    size,
    n,
  };
  if (referenceImageUrl) body.image = referenceImageUrl;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120_000);

  try {
    const res = await fetch(`${BASE}/images/generations`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
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

    console.log("[n1n] 图片生成成功:", { model, count: results.length });
    return { results };
  } finally {
    clearTimeout(timeout);
  }
}
