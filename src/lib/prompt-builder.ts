/**
 * PromptBuilder — 将结构化表单字段拼接为高质量英文 prompt
 * 纯函数，不含任何 UI 逻辑
 */
import type { ModelFormFields } from "./types";

const GENDER_MAP: Record<string, string> = {
  male: "male",
  female: "female",
};

const AGE_MAP: Record<string, string> = {
  teenager: "teenager",
  youth: "young adult",
  "middle-aged": "middle-aged",
  elderly: "elderly",
};

const RACE_MAP: Record<string, string> = {
  asian: "Asian",
  european: "European/American",
};

const BODY_MAP: Record<string, string> = {
  slim: "slim figure",
  standard: "standard build",
  curvy: "curvy figure",
  muscular: "muscular build",
};

const IDENTITY_MAP: Record<string, string> = {
  student: "student",
  office: "office worker",
  artist: "artist",
  athlete: "athlete",
};

const SCENE_MAP: Record<string, string> = {
  studio: "photo studio with clean professional lighting",
  street: "urban street with city atmosphere",
  park: "sunny park with green trees and natural light",
  beach: "beautiful beach with ocean view",
  office: "modern office interior",
  cafe: "cozy cafe with warm lighting",
  library: "quiet library with bookshelves",
  city: "bustling city street with skyscrapers",
  home: "cozy home interior with natural window light",
};

const POSE_MAP: Record<string, string> = {
  standing: "standing pose, full body shot, confident posture",
  sitting: "sitting pose, relaxed and natural",
  walking: "walking pose, natural movement, candid style",
  dynamic: "dynamic fashion pose, editorial style",
};

/**
 * 根据用户选择的结构化字段，构建完整的文生图 prompt
 */
export function buildModelPrompt(fields: ModelFormFields): string {
  const parts: string[] = [];

  // 人物描述
  const personParts: string[] = [];

  if (fields.age && AGE_MAP[fields.age]) {
    personParts.push(AGE_MAP[fields.age]);
  }
  if (fields.race && RACE_MAP[fields.race]) {
    personParts.push(RACE_MAP[fields.race]);
  }
  if (fields.gender && GENDER_MAP[fields.gender]) {
    personParts.push(GENDER_MAP[fields.gender]);
  }
  if (fields.bodySize && BODY_MAP[fields.bodySize]) {
    personParts.push(BODY_MAP[fields.bodySize]);
  }

  if (personParts.length > 0) {
    parts.push(personParts.join(", "));
  }

  // 身份
  if (fields.identity && IDENTITY_MAP[fields.identity]) {
    parts.push(`dressed as a ${IDENTITY_MAP[fields.identity]}`);
  }

  // 动作
  if (fields.pose && POSE_MAP[fields.pose]) {
    parts.push(POSE_MAP[fields.pose]);
  }

  // 场景
  if (fields.scene && SCENE_MAP[fields.scene]) {
    parts.push(`in a ${SCENE_MAP[fields.scene]}`);
  }

  // 如果没有选任何字段，使用默认描述
  if (parts.length === 0) {
    parts.push(
      "a fashion model, full body shot, photorealistic, professional lighting"
    );
  }

  // 收尾质量指令
  parts.push(
    "professional fashion photography, high detail, best quality, photorealistic, 8K"
  );

  return parts.join(", ");
}
