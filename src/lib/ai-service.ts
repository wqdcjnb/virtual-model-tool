// AI Service Layer - Real DashScope API integration
// Uses wan2.7 / qwen-image for model generation, aitryon-plus / aitryon for virtual try-on

import {
  type Model,
  type Garment,
  type TryOnResult,
  defaultModels,
  defaultGarments,
  defaultResults,
} from "./mock-data";
import {
  MODEL_CONFIGS,
  DEFAULT_MODEL,
  getModelConfig,
  TRYON_MODEL_CONFIGS,
  DEFAULT_TRYON_MODEL,
  ASPECT_RATIO_SIZE_MAP,
} from "./constants";
import { buildModelPrompt } from "./prompt-builder";
import type { ModelFormFields } from "./types";

// ---- In-memory store (in production, use a database) ----

let models = [...defaultModels];
let garments = [...defaultGarments];
let results = [...defaultResults];

let idCounter = 100;
const generateId = (prefix: string) => `${prefix}-${++idCounter}`;

// ---- Helper: polling ----

const POLL_INTERVAL = 2000;
const MAX_POLL_TIME = 5 * 60 * 1000; // 5 minutes max

async function pollTask(taskId: string): Promise<string[]> {
  const startTime = Date.now();

  while (Date.now() - startTime < MAX_POLL_TIME) {
    const res = await fetch(`/api/task/${taskId}`);
    const data = await res.json();

    if (!data.success) {
      throw new Error(data.message || "查询任务失败");
    }

    if (data.status === "SUCCEEDED") {
      return data.results as string[];
    }

    if (data.status === "FAILED") {
      throw new Error(data.message || "任务执行失败");
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
  }

  throw new Error("任务超时：生成时间超过 5 分钟");
}

// ---- AI_MODELS (DashScope model generation models) ----

export const AI_MODELS = MODEL_CONFIGS.map((m) => ({
  id: m.id,
  name: m.name,
  provider: "DashScope",
  description: m.description,
  quality: m.maxResolution.includes("4096") ? "ultra-hd" : "high",
  speed: m.group === "lightweight" ? "fast" : "medium",
  recommended: m.id === DEFAULT_MODEL,
  supportsImageToImage: m.supportsImageToImage,
  maxImages: m.maxImages,
}));

// ---- TRYON_MODELS (DashScope virtual try-on models) ----

export const TRYON_MODELS = TRYON_MODEL_CONFIGS.map((m) => ({
  id: m.id,
  name: m.name,
  provider: m.provider,
  description: m.description,
  quality: m.quality,
  recommended: m.recommended,
}));

// ---- Helpers to map between old and new params ----

function mapIdentity(ageRange: string, skinTone: string, bodyType: string): ModelFormFields {
  const ageMap: Record<string, string> = {
    "18-22": "teenager",
    "22-25": "youth",
    "25-30": "youth",
    "30-35": "middle-aged",
    "35-40": "middle-aged",
    "40-50": "elderly",
  };

  const raceMap: Record<string, string> = {
    "白皙": "european",
    "自然": "european",
    "小麦色": "asian",
    "古铜色": "european",
    "深色": "asian",
    "乌木色": "european",
  };

  const bodyMap: Record<string, string> = {
    "纤细": "slim",
    "匀称": "standard",
    "运动型": "muscular",
    "曲线型": "curvy",
    "丰满": "curvy",
  };

  return {
    gender: "",
    age: ageMap[ageRange] || "youth",
    race: raceMap[skinTone] || "asian",
    bodySize: bodyMap[bodyType] || "standard",
    identity: "",
    scene: "studio",
    pose: "standing",
  };
}

// ---- Public API ----

/**
 * Generate a new AI model using DashScope wan2.7 / qwen-image
 */
export async function generateModel(params: {
  gender: string;
  ageRange: string;
  skinTone: string;
  bodyType: string;
  hairStyle: string;
  additionalPrompt?: string;
  modelId?: string;
  mode?: string;
  referenceImageUrl?: string | null;
  refPrompt?: string;
  aspectRatio?: string;
  quantity?: number;
}): Promise<Model> {
  const fields = mapIdentity(params.ageRange, params.skinTone, params.bodyType);
  fields.gender = params.gender || "";

  let prompt = buildModelPrompt(fields);

  if (params.hairStyle) {
    prompt += `, ${params.hairStyle} hair`;
  }
  if (params.additionalPrompt) {
    prompt += `, ${params.additionalPrompt}`;
  }

  const selectedModel = params.modelId || DEFAULT_MODEL;
  const config = getModelConfig(selectedModel);
  const genMode = params.mode || "text-to-image";
  const ratio = params.aspectRatio || "3:4";
  const size = ASPECT_RATIO_SIZE_MAP[ratio] || config?.maxResolution || "1024*1024";

  // Call real API
  const body: Record<string, unknown> = {
    model: selectedModel,
    mode: genMode,
    prompt: prompt.trim(),
    size,
    n: params.quantity || 1,
  };

  if (genMode === "image-to-image" && params.referenceImageUrl) {
    body.referenceImageUrl = params.referenceImageUrl;
    if (params.refPrompt) {
      body.prompt = `${prompt.trim()}. ${params.refPrompt}`;
    }
  }

  const res = await fetch("/api/generate-model", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!data.success) throw new Error(data.message);

  // Poll for result
  const imageUrls = await pollTask(data.taskId);
  const imageUrl = imageUrls[0];
  if (!imageUrl) throw new Error("未获取到生成结果");

  const id = generateId("model");
  const genderLabel =
    params.gender === "female"
      ? "woman"
      : params.gender === "male"
        ? "man"
        : "person";

  const model: Model = {
    id,
    name: `Model-${models.length + 1}`,
    gender: params.gender as Model["gender"],
    ageRange: params.ageRange,
    skinTone: params.skinTone,
    bodyType: params.bodyType,
    hairStyle: params.hairStyle,
    imageUrl,
    prompt: `${params.skinTone} skin ${genderLabel}, ${params.ageRange}, ${params.bodyType}, ${params.hairStyle}${params.additionalPrompt ? `, ${params.additionalPrompt}` : ""}`,
    createdAt: new Date().toISOString(),
  };

  models.push(model);
  return model;
}

/**
 * Generate a virtual try-on result using DashScope aitryon-plus
 */
export async function generateTryOn(params: {
  modelId: string;
  garmentIds: string[];
  aiModel?: string;
  tryOnModel?: string;
  resolution?: string;
  aspectRatio?: string;
}): Promise<TryOnResult> {
  const model = models.find((m) => m.id === params.modelId);
  const selectedGarments = garments.filter((g) =>
    params.garmentIds.includes(g.id)
  );

  if (!model) throw new Error("Model not found");
  if (selectedGarments.length === 0) throw new Error("No garments selected");

  // Map garment categories to API params
  const topGarment = selectedGarments.find(
    (g) => g.category === "top" || g.category === "dress" || g.category === "outerwear"
  );
  const bottomGarment = selectedGarments.find(
    (g) => g.category === "bottom"
  );

  const res = await fetch("/api/try-on", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: params.tryOnModel || DEFAULT_TRYON_MODEL,
      personImageUrl: model.imageUrl,
      topGarmentUrl: topGarment?.imageUrl || undefined,
      bottomGarmentUrl: bottomGarment?.imageUrl || undefined,
      resolution: params.resolution === "4096 x 4096" ? "2K" : "1K",
      restoreFace: true,
    }),
  });

  const data = await res.json();
  if (!data.success) throw new Error(data.message);

  // Poll for result
  const imageUrls = await pollTask(data.taskId);
  const imageUrl = imageUrls[0];
  if (!imageUrl) throw new Error("未获取到试衣结果");

  const id = generateId("result");

  const result: TryOnResult = {
    id,
    modelId: params.modelId,
    garmentIds: params.garmentIds,
    imageUrl,
    modelName: model.name,
    garmentNames: selectedGarments.map((g) => g.name),
    aiModel: params.tryOnModel || DEFAULT_TRYON_MODEL,
    resolution: params.resolution || "2048 x 2048",
    createdAt: new Date().toISOString(),
  };

  results.push(result);
  return result;
}

/**
 * List all models
 */
export async function listModels(): Promise<Model[]> {
  return [...models].reverse();
}

/**
 * List all garments
 */
export async function listGarments(category?: string): Promise<Garment[]> {
  if (category) {
    return garments.filter((g) => g.category === category);
  }
  return [...garments].reverse();
}

/**
 * List all try-on results
 */
export async function listResults(): Promise<TryOnResult[]> {
  return [...results].reverse();
}

/**
 * Upload a garment
 */
export async function uploadGarment(params: {
  name: string;
  category: Garment["category"];
  color: string;
  style: string;
  imageUrl: string;
}): Promise<Garment> {
  const id = generateId("garment");
  const garment: Garment = {
    id,
    name: params.name,
    category: params.category,
    color: params.color,
    style: params.style,
    imageUrl: params.imageUrl,
    createdAt: new Date().toISOString(),
  };

  garments.push(garment);
  return garment;
}

/**
 * Get stats for dashboard
 */
export async function getStats() {
  return {
    totalModels: models.length,
    totalGarments: garments.length,
    totalResults: results.length,
    recentResults: results.slice(-6).reverse(),
  };
}
