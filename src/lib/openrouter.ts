/**
 * OpenRouter API 客户端 — 统一 AI 网关
 * 端点: POST https://openrouter.ai/api/v1/chat/completions
 * 文档: https://openrouter.ai/docs
 */
import type { TaskStatus } from "./types";

const BASE = "https://llm-api.net/v1";
const SITE_URL = "http://8.134.18.54";
const SITE_NAME = "AI Virtual Try-On Studio";

function apiKey() {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("未配置 OPENROUTER_API_KEY 环境变量");
  return key;
}

export interface OpenRouterParams {
  model: string;
  prompt: string;
  referenceImageUrl?: string;
}

interface ORResponse {
  id?: string;
  error?: { message: string; code?: number };
  choices?: {
    message?: {
      content?: unknown;
      images?: { image_url?: { url: string } }[];
    };
  }[];
}

export async function generateImage(params: OpenRouterParams): Promise<{ results: string[] }> {
  const { model, prompt, referenceImageUrl } = params;

  // Build messages — multimodal if reference image provided
  const content: unknown[] = [{ type: "text", text: prompt }];
  if (referenceImageUrl) {
    content.unshift({
      type: "image_url",
      image_url: { url: referenceImageUrl },
    });
  }

  const res = await fetch(`${BASE}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "Content-Type": "application/json",
      "HTTP-Referer": SITE_URL,
      "X-Title": SITE_NAME,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content }],
      max_tokens: 4096,
    }),
  });

  const data: ORResponse = await res.json();

  if (data.error) {
    throw new Error(`[OpenRouter ${data.error.code}] ${data.error.message}`);
  }

  // Extract image URLs from response
  const results: string[] = [];
  const choice = data.choices?.[0];
  const msg = choice?.message;

  // Check for images array
  if (msg?.images) {
    for (const img of msg.images) {
      const url = img?.image_url?.url;
      if (url) results.push(url);
    }
  }

  // Check for content containing image URLs (base64 or url)
  if (!results.length && typeof msg?.content === "string") {
    // Try to extract URLs from markdown content
    const matches = msg.content.match(/!\[.*?\]\((https?:\/\/[^)]+)\)/g);
    if (matches) {
      for (const m of matches) {
        const url = m.match(/\((https?:\/\/[^)]+)\)/)?.[1];
        if (url) results.push(url);
      }
    }
    // Check for data URLs (base64)
    if (!results.length && msg.content.startsWith("data:image")) {
      results.push(msg.content);
    }
  }

  if (!results.length) {
    // Return the full content as a fallback for debugging
    const snippet = JSON.stringify(msg).substring(0, 300);
    throw new Error(`OpenRouter 未返回图片 | response: ${snippet}`);
  }

  console.log("[openrouter] 图片生成成功:", { model, count: results.length });
  return { results };
}
