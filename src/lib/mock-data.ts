// Mock data for the virtual try-on demo
// In production, this data would come from a database

export interface Model {
  id: string;
  name: string;
  gender: 'female' | 'male' | 'non-binary';
  ageRange: string;
  skinTone: string;
  bodyType: string;
  hairStyle: string;
  imageUrl: string;
  prompt: string;
  createdAt: string;
}

export interface Garment {
  id: string;
  name: string;
  category: 'top' | 'bottom' | 'dress' | 'shoes' | 'accessories' | 'outerwear';
  color: string;
  style: string;
  imageUrl: string;
  createdAt: string;
}

export interface TryOnResult {
  id: string;
  modelId: string;
  garmentIds: string[];
  imageUrl: string;
  modelName: string;
  garmentNames: string[];
  aiModel: string;
  resolution: string;
  prompt?: string;
  createdAt: string;
}

// AI_MODELS & TRYON_MODELS are exported from ai-service.ts (DashScope real models)
// import { AI_MODELS, TRYON_MODELS } from '@/lib/ai-service'

export const defaultModels: Model[] = [];

export const defaultGarments: Garment[] = [];

export const defaultResults: TryOnResult[] = [];

export const CATEGORY_LABELS: Record<string, string> = {
  top: '上装',
  bottom: '下装',
  dress: '连衣裙',
  shoes: '鞋履',
  accessories: '配饰',
  outerwear: '外套',
};

export const SKIN_TONES = ['白皙', '自然', '小麦色', '古铜色', '深色', '乌木色'];
export const BODY_TYPES = ['纤细', '匀称', '运动型', '曲线型', '丰满'];
export const HAIR_STYLES = ['短直发', '短卷发', '中长直发', '中长卷发', '长直发', '长卷发', '编发', '光头'];
export const AGE_RANGES = ['18-22', '22-25', '25-30', '30-35', '35-40', '40-50'];
