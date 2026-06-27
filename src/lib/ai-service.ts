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

// Recycle bin — soft-deleted items with deletion timestamp
interface TrashItem<T> { item: T; deletedAt: string; type: string; }
let trash: TrashItem<any>[] = [];

let idCounter = 100;
const generateId = (prefix: string) => `${prefix}-${++idCounter}`;

// ---- Helper: polling ----

const POLL_INTERVAL = 2000;
const MAX_POLL_TIME = 5 * 60 * 1000; // 5 minutes max

async function pollTask(taskId: string, platform?: string, group?: string): Promise<string[]> {
  const startTime = Date.now();
  const params = new URLSearchParams();
  if (platform) params.set("platform", platform);
  if (group) params.set("group", group || "");
  const query = params.toString();
  const url = `/api/task/${taskId}${query ? "?" + query : ""}`;

  while (Date.now() - startTime < MAX_POLL_TIME) {
    const res = await fetch(url);
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

// ---- Helpers ----

/** Convert relative URLs to absolute so external APIs can access them */
function absoluteUrl(path: string): string {
  if (!path) return path;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  // Client-side: use current origin; server-side fallback
  if (typeof window !== "undefined") return `${window.location.origin}${path}`;
  return `http://8.134.18.54${path}`;
}

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
  customName?: string;
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

  // 同步模式直接有结果，跳过轮询
  let imageUrls: string[];
  if (data.results?.length) {
    imageUrls = data.results;
  } else if (data.taskId) {
    imageUrls = await pollTask(data.taskId, data.platform, data.group);
  } else {
    throw new Error("未获取到任务 ID 或结果");
  }
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
    name: params.customName?.trim() || `Model-${models.length + 1}`,
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
 * Generate a virtual try-on result using CQT Nano Banana Pro (图生图模式)
 */
export async function generateTryOn(params: {
  modelId: string;
  garmentIds: string[];
  aiModel?: string;
  genModel?: string;
  resolution?: string;
  aspectRatio?: string;
  quantity?: number;
  prompt?: string;
}): Promise<TryOnResult & { imageUrls?: string[] }> {
  const model = models.find((m) => m.id === params.modelId);
  const selectedGarments = garments.filter((g) =>
    params.garmentIds.includes(g.id)
  );

  if (!model) throw new Error("Model not found");
  if (!params.prompt) throw new Error("请输入描述文字");

  const selectedModel = params.genModel || "wan2.7-image-pro";
  const n = Math.min(params.quantity || 1, 4);
  const config = getModelConfig(selectedModel);

  // Map aspect ratio to size (DashScope uses * separator)
  const ratio = params.aspectRatio || "3:4";
  const sizeMap: Record<string, string> = {
    "1:1": "2048*2048",
    "3:4": "1536*2048",
    "4:3": "2048*1536",
    "9:16": "1080*1920",
    "16:9": "1920*1080",
  };
  const sizeMapX: Record<string, string> = {
    "1:1": "1024x1024",
    "3:4": "1024x1536",
    "4:3": "1536x1024",
    "9:16": "1024x1792",
    "16:9": "1792x1024",
  };
  const size = config?.platform === "dashscope"
    ? (sizeMap[ratio] || "2048*2048")
    : (sizeMapX[ratio] || config?.maxResolution || "1024x1024");

  // Build reference images: model first, then selected garments
  const referenceImageUrls: string[] = [absoluteUrl(model.imageUrl)];
  for (const g of selectedGarments) {
    referenceImageUrls.push(absoluteUrl(g.imageUrl));
  }

  // Always enforce person/scene/pose preservation
  const fullPrompt = `${params.prompt.trim()}。必须严格保持原图中人物的面貌、姿势、背景完全不变，仅替换服装，照片级真实感。`;

  const res = await fetch("/api/generate-model", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: selectedModel,
      mode: "image-to-image",
      prompt: fullPrompt,
      referenceImageUrl: absoluteUrl(model.imageUrl),
      referenceImageUrls,
      size,
      n,
    }),
  });

  const data = await res.json();
  if (!data.success) throw new Error(data.message);

  // Get results
  let allUrls: string[];
  if (data.results?.length) {
    // OpenRouter/n1n returns raw base64 — convert to data URL
    allUrls = data.results.map((r: string) =>
      r.startsWith("data:") || r.startsWith("http") ? r : `data:image/png;base64,${r}`
    );
  } else if (data.taskId) {
    allUrls = await pollTask(data.taskId, data.platform || "dashscope", data.group);
  } else {
    throw new Error("未获取到任务ID或结果");
  }
  if (!allUrls.length) throw new Error("未获取到试衣结果");

  const id = generateId("result");

  const result: TryOnResult & { imageUrls?: string[] } = {
    id,
    modelId: params.modelId,
    garmentIds: params.garmentIds,
    imageUrl: allUrls[0],
    imageUrls: allUrls,
    modelName: model.name,
    garmentNames: selectedGarments.map((g) => g.name),
    aiModel: selectedModel,
    resolution: size.replace("*", " x "),
    prompt: params.prompt,
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

// ---- CRUD: Models ----

const RANDOM_NAMES = [
  "Emily", "Sophia", "Olivia", "Ava", "Isabella", "Mia", "Charlotte", "Amelia", "Harper", "Evelyn",
  "Liam", "Noah", "Oliver", "James", "Elijah", "William", "Henry", "Lucas", "Benjamin", "Theodore",
  "Luna", "Aria", "Ella", "Nova", "Stella", "Zoe", "Iris", "Hazel", "Willow", "Chloe",
  "Kai", "Leo", "Ezra", "Finn", "Milo", "Arlo", "Jude", "Atlas", "Felix", "Jasper",
];

function randomName(): string {
  return RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)];
}

export async function addModel(params: {
  name?: string;
  gender: string;
  imageUrl: string;
}): Promise<Model> {
  const id = generateId('model');
  const model: Model = {
    id,
    name: params.name?.trim() || randomName(),
    gender: params.gender as Model['gender'],
    ageRange: '',
    skinTone: '',
    bodyType: '',
    hairStyle: '',
    imageUrl: params.imageUrl,
    prompt: '',
    createdAt: new Date().toISOString(),
  };
  models.push(model);
  return model;
}

export async function updateModelName(id: string, newName: string): Promise<void> {
  const m = models.find((x) => x.id === id);
  if (!m) throw new Error("Model not found");
  m.name = newName;
}

export async function deleteModel(id: string): Promise<void> {
  const idx = models.findIndex((x) => x.id === id);
  if (idx === -1) throw new Error("Model not found");
  const [item] = models.splice(idx, 1);
  trash.push({ item, deletedAt: new Date().toISOString(), type: 'model' });
  // Also soft-delete results referencing this model
  const related = results.filter((r) => r.modelId === id);
  for (const r of related) {
    const ri = results.findIndex((x) => x.id === r.id);
    if (ri !== -1) {
      const [riItem] = results.splice(ri, 1);
      trash.push({ item: riItem, deletedAt: new Date().toISOString(), type: 'result' });
    }
  }
}

// ---- CRUD: Garments ----

export async function deleteGarment(id: string): Promise<void> {
  const idx = garments.findIndex((x) => x.id === id);
  if (idx === -1) throw new Error("Garment not found");
  const [item] = garments.splice(idx, 1);
  trash.push({ item, deletedAt: new Date().toISOString(), type: 'garment' });
  // Soft-delete results referencing this garment
  const related = results.filter((r) => r.garmentIds.includes(id));
  for (const r of related) {
    const ri = results.findIndex((x) => x.id === r.id);
    if (ri !== -1) {
      const [riItem] = results.splice(ri, 1);
      trash.push({ item: riItem, deletedAt: new Date().toISOString(), type: 'result' });
    }
  }
}

// ---- CRUD: Results ----

export async function deleteResult(id: string): Promise<void> {
  const idx = results.findIndex((x) => x.id === id);
  if (idx === -1) throw new Error("Result not found");
  const [item] = results.splice(idx, 1);
  trash.push({ item, deletedAt: new Date().toISOString(), type: 'result' });
}

// ---- Recycle Bin ----

const RECYCLE_DAYS = 7;

export async function listTrash(): Promise<{ model: any[]; garment: any[]; result: any[] }> {
  // Clean expired items first
  const cutoff = new Date(Date.now() - RECYCLE_DAYS * 24 * 60 * 60 * 1000).toISOString();
  trash = trash.filter((t) => t.deletedAt > cutoff);

  return {
    model: trash.filter((t) => t.type === 'model').map((t) => t.item),
    garment: trash.filter((t) => t.type === 'garment').map((t) => t.item),
    result: trash.filter((t) => t.type === 'result').map((t) => t.item),
  };
}

export async function restoreTrashItem(type: string, id: string): Promise<void> {
  const idx = trash.findIndex((t) => t.type === type && t.item.id === id);
  if (idx === -1) throw new Error("Item not found in trash");
  const { item } = trash.splice(idx, 1)[0];
  if (type === 'model') models.push(item);
  else if (type === 'garment') garments.push(item);
  else if (type === 'result') results.push(item);
}

export async function permDeleteTrashItem(type: string, id: string): Promise<void> {
  trash = trash.filter((t) => !(t.type === type && t.item.id === id));
}

export async function emptyTrash(): Promise<number> {
  const count = trash.length;
  trash = [];
  return count;
}

/** Auto-clean expired trash + results. Called on gallery load. */
export async function cleanupOldResults(days: number = RECYCLE_DAYS): Promise<number> {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const before = trash.length + results.length;
  trash = trash.filter((t) => t.deletedAt > cutoff);
  results = results.filter((r) => r.createdAt > cutoff);
  return before - trash.length - results.length;
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
