// AI Service Layer - Multi-platform AI image generation with in-memory + CloudBase sync

import { type Model, type Garment, type TryOnResult, defaultModels, defaultGarments, defaultResults } from "./mock-data";
import { MODEL_CONFIGS, DEFAULT_MODEL, getModelConfig, TRYON_MODEL_CONFIGS, DEFAULT_TRYON_MODEL, ASPECT_RATIO_SIZE_MAP } from "./constants";
import { buildModelPrompt } from "./prompt-builder";
import type { ModelFormFields } from "./types";

// ---- In-memory store (synced to CloudBase on server) ----
let models: Model[] = [...defaultModels];
let garments: Garment[] = [...defaultGarments];
let results: TryOnResult[] = [...defaultResults];
interface TrashItem<T> { item: T; deletedAt: string; type: string; }
let trash: TrashItem<any>[] = [];

// Hydrate from CloudBase on server startup (client silently skips)
if (typeof window === "undefined") {
  let loaded = false;
  async function loadFromCloudBase(retries = 5) {
    for (let i = 0; i < retries; i++) {
      try {
        const r = await fetch("http://127.0.0.1:3000/api/data/load");
        const d = await r.json();
        if (d.success && d.data) {
          models = d.data.models?.length ? d.data.models : models;
          garments = d.data.garments?.length ? d.data.garments : garments;
          results = d.data.results?.length ? d.data.results : results;
          trash = d.data.trash || [];
          loaded = true;
          // Also reset idCounter to avoid conflicts
          const allIds = [...models, ...garments, ...results].map((x: any) => x.id || "").filter(Boolean);
          const maxNum = allIds.reduce((max: number, id: string) => {
            const n = parseInt(id.match(/\d+$/)?.[0] || "0"); return n > max ? n : max;
          }, 100);
          idCounter = maxNum;
          console.log(`[db] 从 CloudBase 加载: ${models.length}M ${garments.length}G ${results.length}R`);
          return;
        }
      } catch {}
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  loadFromCloudBase();
}

let idCounter = 100;
function generateId(prefix: string): string { return `${prefix}-${++idCounter}`; }

const POLL_INTERVAL = 2000;
const MAX_POLL_TIME = 5 * 60 * 1000;

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
    if (!data.success) throw new Error(data.message || "查询任务失败");
    if (data.status === "SUCCEEDED") return data.results as string[];
    if (data.status === "FAILED") throw new Error(data.message || "任务执行失败");
    await new Promise((r) => setTimeout(r, POLL_INTERVAL));
  }
  throw new Error("任务超时：生成时间超过 5 分钟");
}

function absoluteUrl(path: string): string {
  if (!path) return path;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  if (typeof window !== "undefined") return `${window.location.origin}${path}`;
  return `http://8.134.18.54${path}`;
}

function mapIdentity(ageRange: string, skinTone: string, bodyType: string): ModelFormFields {
  const ageMap: Record<string, string> = { "18-22":"teenager","22-25":"youth","25-30":"youth","30-35":"middle-aged","35-40":"middle-aged","40-50":"elderly" };
  const raceMap: Record<string, string> = { "白皙":"european","自然":"european","小麦色":"asian","古铜色":"european","深色":"asian","乌木色":"european" };
  const bodyMap: Record<string, string> = { "纤细":"slim","匀称":"standard","运动型":"muscular","曲线型":"curvy","丰满":"curvy" };
  return { gender:"", age:ageMap[ageRange]||"youth", race:raceMap[skinTone]||"asian", bodySize:bodyMap[bodyType]||"standard", identity:"", scene:"studio", pose:"standing" };
}

// ---- AI_MODELS ----
export const AI_MODELS = MODEL_CONFIGS.map(m=>({ id:m.id,name:m.name,provider:"DashScope",description:m.description,quality:m.maxResolution.includes("4096")?"ultra-hd":"high",speed:m.group==="lightweight"?"fast":"medium",recommended:m.id===DEFAULT_MODEL,supportsImageToImage:m.supportsImageToImage,maxImages:m.maxImages }));
export const TRYON_MODELS = TRYON_MODEL_CONFIGS.map(m=>({ id:m.id,name:m.name,provider:m.provider,description:m.description,quality:m.quality,recommended:m.recommended }));

// ---- Data CRUD (reads from CloudBase via API, writes push to memory + API) ----

async function fetchColl(coll: string, category?: string): Promise<any[]> {
  const qs = category ? `?coll=${coll}&category=${category}` : `?coll=${coll}`;
  const r = await fetch(`/api/data/list${qs}`); const d = await r.json();
  return d.success ? d.data : [];
}

export async function listModels(): Promise<Model[]> {
  if (typeof window !== "undefined") return fetchColl("models");
  return [...models].reverse();
}
export async function listGarments(category?: string): Promise<Garment[]> {
  if (typeof window !== "undefined") return fetchColl("garments", category);
  const all = category ? garments.filter(g => g.category === category) : garments;
  return [...all].reverse();
}
export async function listResults(): Promise<TryOnResult[]> {
  if (typeof window !== "undefined") return fetchColl("results");
  return [...results].reverse();
}

const FEMALE_NAMES = ["Emily","Sophia","Olivia","Ava","Isabella","Mia","Charlotte","Amelia","Harper","Evelyn","Luna","Aria","Ella","Nova","Stella","Zoe","Iris","Hazel","Willow","Chloe","Emma","Grace","Lily","Aurora","Violet"];
const MALE_NAMES = ["Liam","Noah","Oliver","James","Elijah","William","Henry","Lucas","Benjamin","Theodore","Kai","Leo","Ezra","Finn","Milo","Arlo","Jude","Atlas","Felix","Jasper","Ethan","Jack","Owen","Caleb","Ryan"];

function randomName(gender: string): string {
  const list = gender === "female" ? FEMALE_NAMES : gender === "male" ? MALE_NAMES : [...FEMALE_NAMES, ...MALE_NAMES];
  return list[Math.floor(Math.random() * list.length)];
}

export async function addModel(params: { name?: string; gender: string; imageUrl: string }): Promise<Model> {
  const m: Model = { id:generateId("model"), name:params.name?.trim()||randomName(params.gender), gender:params.gender as Model["gender"], ageRange:"", skinTone:"", bodyType:"", hairStyle:"", imageUrl:params.imageUrl, prompt:"", createdAt:new Date().toISOString() };
  models.push(m);
  await syncToCloudBase("models", m);
  return m;
}
export async function updateModelName(id: string, newName: string): Promise<void> {
  const m = models.find(x=>x.id===id);
  if(m) { m.name = newName; }
  await syncToCloudBase("models-update", { id, name: newName });
}
async function findFullItem(type: string, id: string): Promise<any> {
  const arr = type==="model"?models:type==="garment"?garments:results;
  const found = arr.find((x:any)=>x.id===id);
  if (found) return found;
  // Try CloudBase on client
  if (typeof window !== "undefined") {
    try {
      const coll = type==="model"?"models":type==="garment"?"garments":"results";
      const all = await fetchColl(coll);
      return all.find((x:any)=>x.id===id) || {id};
    } catch {}
  }
  return {id};
}

export async function deleteModel(id: string): Promise<void> {
  const item = await findFullItem("model", id);
  const idx = models.findIndex(x=>x.id===id); if(idx>=0) models.splice(idx,1);
  await syncToCloudBase("delete", { type:"model", id, item });
}
export async function deleteGarment(id: string): Promise<void> {
  const item = await findFullItem("garment", id);
  const idx = garments.findIndex(x=>x.id===id); if(idx>=0) garments.splice(idx,1);
  await syncToCloudBase("delete", { type:"garment", id, item });
}
export async function deleteResult(id: string): Promise<void> {
  const item = await findFullItem("result", id);
  const idx = results.findIndex(x=>x.id===id); if(idx>=0) results.splice(idx,1);
  await syncToCloudBase("delete", { type:"result", id, item });
}
export async function uploadGarment(params: { name:string; category:Garment["category"]; color:string; style:string; imageUrl:string }): Promise<Garment> {
  const g: Garment = { id:generateId("garment"), name:params.name, category:params.category, color:params.color, style:params.style, imageUrl:params.imageUrl, createdAt:new Date().toISOString() };
  garments.push(g);
  await syncToCloudBase("garments", g);
  return g;
}

// Recycle bin
const RECYCLE_DAYS = 7;
export async function listTrash(): Promise<{model:any[];garment:any[];result:any[]}> {
  if (typeof window !== "undefined") {
    const items = await fetchColl("trash");
    return {
      model: items.filter((t:any)=>t.type==="model").map((t:any)=>t.item),
      garment: items.filter((t:any)=>t.type==="garment").map((t:any)=>t.item),
      result: items.filter((t:any)=>t.type==="result").map((t:any)=>t.item),
    };
  }
  const cutoff = new Date(Date.now()-RECYCLE_DAYS*86400000).toISOString();
  trash = trash.filter(t=>t.deletedAt>cutoff);
  return { model:trash.filter(t=>t.type==="model").map(t=>t.item), garment:trash.filter(t=>t.type==="garment").map(t=>t.item), result:trash.filter(t=>t.type==="result").map(t=>t.item) };
}
export async function restoreTrashItem(type:string, id:string): Promise<void> {
  // Get full item from CloudBase
  let item: any = null;
  if (typeof window !== "undefined") {
    const items = await fetchColl("trash");
    const entry = items.find((t:any) => t.type === type && t.item?.id === id);
    item = entry?.item;
  }
  if (!item) {
    const idx = trash.findIndex(t=>t.type===type&&t.item.id===id);
    if (idx===-1) throw new Error("Trash item not found");
    item = trash.splice(idx,1)[0].item;
  }
  if(type==="model") models.push(item); else if(type==="garment") garments.push(item); else results.push(item);
  await syncToCloudBase("restore", { type, item, id });
}
export async function permDeleteTrashItem(type:string, id:string): Promise<void> {
  trash = trash.filter(t=>!(t.type===type&&t.item.id===id));
  await syncToCloudBase("perm-delete", { type, id });
}
export async function emptyTrash(): Promise<number> { const c=trash.length; trash=[]; await syncToCloudBase("empty-trash"); return c; }
export async function cleanupOldResults(days:number=RECYCLE_DAYS): Promise<number> {
  const cutoff = new Date(Date.now()-days*86400000).toISOString();
  const before = trash.length + results.length;
  trash = trash.filter(t=>t.deletedAt>cutoff);
  results = results.filter(r=>r.createdAt>cutoff);
  return before - trash.length - results.length;
}

// ---- AI Generation ----

export async function generateModel(params: {
  gender:string; ageRange:string; skinTone:string; bodyType:string; hairStyle:string;
  additionalPrompt?:string; modelId?:string; mode?:string; referenceImageUrl?:string|null;
  refPrompt?:string; aspectRatio?:string; quantity?:number; customName?:string;
}): Promise<Model> {
  const fields = mapIdentity(params.ageRange, params.skinTone, params.bodyType);
  fields.gender = params.gender || "";
  let prompt = buildModelPrompt(fields);
  if(params.hairStyle) prompt += `, ${params.hairStyle} hair`;
  if(params.additionalPrompt) prompt += `, ${params.additionalPrompt}`;
  const selModel = params.modelId || DEFAULT_MODEL;
  const config = getModelConfig(selModel);
  const size = ASPECT_RATIO_SIZE_MAP[params.aspectRatio||"3:4"] || config?.maxResolution || "1024*1024";
  const body: Record<string,unknown> = { model:selModel, mode:params.mode||"text-to-image", prompt:prompt.trim(), size, n:params.quantity||1 };
  if(params.mode==="image-to-image" && params.referenceImageUrl) { body.referenceImageUrl = params.referenceImageUrl; if(params.refPrompt) body.prompt = `${prompt.trim()}. ${params.refPrompt}`; }
  const res = await fetch("/api/generate-model", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(body) });
  const data = await res.json(); if(!data.success) throw new Error(data.message);
  let imageUrls: string[];
  if(data.results?.length) { imageUrls = data.results; }
  else if(data.taskId) { imageUrls = await pollTask(data.taskId, data.platform, data.group); }
  else { throw new Error("未获取到任务 ID 或结果"); }
  const imageUrl = imageUrls[0]; if(!imageUrl) throw new Error("未获取到生成结果");
  const genderLabel = params.gender==="female"?"woman":params.gender==="male"?"man":"person";
  const model: Model = { id:generateId("model"), name:params.customName?.trim()||randomName(params.gender), gender:params.gender as Model["gender"], ageRange:params.ageRange, skinTone:params.skinTone, bodyType:params.bodyType, hairStyle:params.hairStyle, imageUrl, prompt:`${params.skinTone} skin ${genderLabel}, ${params.ageRange}, ${params.bodyType}, ${params.hairStyle}${params.additionalPrompt?`, ${params.additionalPrompt}`:""}`, createdAt:new Date().toISOString() };
  models.push(model);
  await syncToCloudBase("models", model);
  return model;
}

export async function generateTryOn(params: {
  modelId:string; garmentIds:string[]; aiModel?:string; genModel?:string;
  resolution?:string; aspectRatio?:string; quantity?:number; prompt?:string;
}): Promise<TryOnResult & { imageUrls?: string[] }> {
  let model: Model | undefined;
  let allGarments: Garment[] = [];
  if (typeof window !== "undefined") {
    const [modelsData, garmentsData] = await Promise.all([fetchColl("models"), fetchColl("garments")]);
    model = modelsData.find((m: any) => m.id === params.modelId);
    allGarments = garmentsData;
  }
  if (!model) model = models.find(m => m.id === params.modelId);
  if (!allGarments.length) allGarments = garments;
  const selGarments = allGarments.filter((g: any) => params.garmentIds.includes(g.id));
  if(!model) throw new Error("Model not found");
  if(!params.prompt) throw new Error("请输入描述文字");
  const selModel = params.genModel || "wan2.7-image-pro";
  const n = Math.min(params.quantity||1, 4);
  const config = getModelConfig(selModel);
  const ratio = params.aspectRatio || "3:4";
  const sizeMap: Record<string,string> = { "1:1":"2048*2048","3:4":"1536*2048","4:3":"2048*1536","9:16":"1080*1920","16:9":"1920*1080" };
  const sizeMapX: Record<string,string> = { "1:1":"1024x1024","3:4":"1024x1536","4:3":"1536x1024","9:16":"1024x1792","16:9":"1792x1024" };
  const size = config?.platform==="dashscope" ? (sizeMap[ratio]||"2048*2048") : (sizeMapX[ratio]||config?.maxResolution||"1024x1024");
  const refUrls: string[] = [absoluteUrl(model.imageUrl)];
  for(const g of selGarments) refUrls.push(absoluteUrl(g.imageUrl));
  const fullPrompt = `${params.prompt.trim()}。必须严格保持原图中人物的面貌、姿势、背景完全不变，仅替换服装，照片级真实感。`;
  const res = await fetch("/api/generate-model", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ model:selModel, mode:"image-to-image", prompt:fullPrompt, referenceImageUrl:absoluteUrl(model.imageUrl), referenceImageUrls:refUrls, size, n }) });
  const data = await res.json(); if(!data.success) throw new Error(data.message);
  let allUrls: string[];
  if(data.results?.length) { allUrls = data.results.map((r:string)=>r.startsWith("data:")||r.startsWith("http")?r:`data:image/png;base64,${r}`); }
  else if(data.taskId) { allUrls = await pollTask(data.taskId, data.platform||"dashscope", data.group); }
  else { throw new Error("未获取到任务ID或结果"); }
  if(!allUrls.length) throw new Error("未获取到试衣结果");
  const result: TryOnResult & { imageUrls?: string[] } = { id:generateId("result"), modelId:params.modelId, garmentIds:params.garmentIds, imageUrl:allUrls[0], imageUrls:allUrls, modelName:model.name, garmentNames:selGarments.map(g=>g.name), aiModel:selModel, resolution:size.replace("*"," x "), prompt:params.prompt, createdAt:new Date().toISOString() };
  results.push(result);
  await syncToCloudBase("results", result);
  return result;
}

export async function getStats() {
  if (typeof window !== "undefined") {
    const [modelsData, garmentsData, resultsData] = await Promise.all([
      fetchColl("models"), fetchColl("garments"), fetchColl("results"),
    ]);
    return {
      totalModels: modelsData.length,
      totalGarments: garmentsData.length,
      totalResults: resultsData.length,
      recentResults: resultsData.slice(-6).reverse(),
    };
  }
  return {
    totalModels: models.length,
    totalGarments: garments.length,
    totalResults: results.length,
    recentResults: results.slice(-6).reverse(),
  };
}

// ---- CloudBase sync (fire-and-forget server-side calls) ----
async function syncToCloudBase(action: string, data?: any) {
  try {
    const res = await fetch("/api/data/store", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, data }),
    });
    const r = await res.json();
    if (!r.success) console.warn("[sync] CloudBase sync failed:", action);
  } catch { /* silent failure */ }
}
