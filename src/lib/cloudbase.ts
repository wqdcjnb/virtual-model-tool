/**
 * CloudBase 服务端 SDK 初始化
 * 仅在服务端使用（API Routes）
 */
import cloudbase from "@cloudbase/node-sdk";

if (!process.env.CLOUDBASE_ENV_ID) {
  throw new Error("缺少环境变量 CLOUDBASE_ENV_ID");
}

const app = cloudbase.init({
  env: process.env.CLOUDBASE_ENV_ID,
  secretId: process.env.TENCENTCLOUD_SECRETID,
  secretKey: process.env.TENCENTCLOUD_SECRETKEY,
});

export const db = app.database();

// Collection helpers
export const MODEL_COLL = "models";
export const GARMENT_COLL = "garments";
export const RESULT_COLL = "results";
export const TRASH_COLL = "trash";

/**
 * Get all documents from a collection
 */
export async function getAll(collection: string): Promise<any[]> {
  const res = await db.collection(collection).limit(1000).get();
  return res.data || [];
}

/**
 * Get a document by ID
 */
export async function getById(collection: string, id: string): Promise<any | null> {
  const res = await db.collection(collection).where({ id }).limit(1).get();
  return res.data?.[0] || null;
}

/**
 * Insert a document
 */
export async function insert(collection: string, doc: any): Promise<void> {
  await db.collection(collection).add(doc);
}

/**
 * Update a document by ID
 */
export async function updateById(collection: string, id: string, updates: any): Promise<void> {
  await db.collection(collection).where({ id }).update(updates);
}

/**
 * Delete a document by ID
 */
export async function deleteById(collection: string, id: string): Promise<void> {
  await db.collection(collection).where({ id }).remove();
}

/**
 * Delete documents matching a condition
 */
export async function deleteWhere(collection: string, condition: any): Promise<void> {
  await db.collection(collection).where(condition).remove();
}

/**
 * Count documents
 */
export async function count(collection: string): Promise<number> {
  const res = await db.collection(collection).count();
  return res.total || 0;
}

export default app;
