/**
 * n1n Gemini API 客户端
 * 图像生成: POST /v1/chat/completions (OpenAI 兼容，输出图片)
 */
const BASE = "https://llm-api.net/v1";

function apiKey() {
  const key = process.env.N1N_API_KEY;
  if (!key) throw new Error("未配置 N1N_API_KEY 环境变量");
  return key;
}

export interface N1NGenParams {
  model: string;
  prompt: string;
  referenceImageUrls?: string[];
  size?: string;
}

interface ChatResponse {
  choices?: Array<{
    message?: {
      content?: string; // markdown image ![image](data:...)
    };
  }>;
  error?: { message: string; code?: string };
}

/**
 * Generate image via chat completions (Gemini outputs image in markdown)
 */
export async function generateImageN1N(params: N1NGenParams): Promise<{ results: string[] }> {
  const { model, prompt, referenceImageUrls, size } = params;

  // Build multimodal content: reference images + text prompt
  const content: unknown[] = [];

  if (referenceImageUrls?.length) {
    console.log(`[n1n] 下载 ${referenceImageUrls.length} 张参考图...`);
    for (const url of referenceImageUrls) {
      try {
        const res = await fetch(url);
        if (!res.ok) continue;
        const buffer = Buffer.from(await res.arrayBuffer());
        const mimeType = res.headers.get("content-type") || "image/png";
        const b64 = buffer.toString("base64");
        content.push({
          type: "image_url",
          image_url: { url: `data:${mimeType};base64,${b64}` },
        });
      } catch (e) {
        console.warn(`[n1n] 下载参考图失败: ${url}`);
      }
    }
    console.log(`[n1n] 参考图已嵌入, ${content.length} 张`);
  }

  content.push({ type: "text", text: prompt });

  // Add explicit size instruction to prompt
  let finalPrompt = prompt;
  if (size) {
    const [w, h] = size.split("x");
    finalPrompt = `${prompt}\n\nCRITICAL: Output image MUST be exactly ${w}x${h} pixels. Do NOT output square images. The aspect ratio must be ${w}:${h}.`;
  }

  const body = {
    model,
    messages: [
      {
        role: "user",
        content: referenceImageUrls?.length ? content : finalPrompt,
      },
    ],
    max_tokens: 4096,
  };

  const res = await fetch(`${BASE}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data: ChatResponse = await res.json();

  if (data.error) {
    throw new Error(`[n1n ${data.error.code}] ${data.error.message}`);
  }

  const contentStr = data.choices?.[0]?.message?.content || "";
  if (!contentStr) {
    throw new Error(`n1n 未返回内容 | response: ${JSON.stringify(data).substring(0, 300)}`);
  }

  // Extract base64 images from markdown: ![image](data:image/...;base64,...)
  const results: string[] = [];
  const imgRegex = /!\[.*?\]\((data:image\/[^;]+;base64,[^)]+)\)/g;
  let match;
  while ((match = imgRegex.exec(contentStr)) !== null) {
    results.push(match[1]);
  }

  if (!results.length) {
    throw new Error(`n1n 未返回图片 | content: ${contentStr.substring(0, 300)}`);
  }

  console.log("[n1n] 图片生成成功:", { model, count: results.length });
  return { results };
}
