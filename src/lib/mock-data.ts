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
  createdAt: string;
}

export const AI_MODELS = [
  {
    id: 'flux-1-pro',
    name: 'FLUX.1 Pro',
    provider: 'Black Forest Labs',
    description: '当前最强写实人像生成模型，皮肤纹理和光影效果极佳',
    quality: 'ultra-hd',
    speed: 'medium',
    recommended: true,
  },
  {
    id: 'sd-35-large',
    name: 'Stable Diffusion 3.5 Large',
    provider: 'Stability AI',
    description: '优秀的通用图像生成模型，人像质量高，支持精细控制',
    quality: 'high',
    speed: 'fast',
    recommended: false,
  },
  {
    id: 'idm-vton',
    name: 'IDM-VTON',
    provider: 'Yisol',
    description: '当前最佳虚拟试衣专用模型，服装贴合度和真实感最强',
    quality: 'ultra-hd',
    speed: 'medium',
    recommended: true,
  },
  {
    id: 'catvton',
    name: 'CatVTON',
    provider: 'Zhuanzhuang',
    description: '轻量高效的试衣模型，速度快且效果稳定',
    quality: 'high',
    speed: 'fast',
    recommended: false,
  },
];

export const defaultModels: Model[] = [
  {
    id: 'model-1',
    name: 'Sophia',
    gender: 'female',
    ageRange: '20-25',
    skinTone: '白皙',
    bodyType: '纤细',
    hairStyle: '长棕发',
    imageUrl: '/images/models/female-1.jpg',
    prompt: 'Young woman model, light skin, long brown hair, slim build, elegant pose',
    createdAt: '2024-06-25T10:00:00Z',
  },
  {
    id: 'model-2',
    name: 'Marcus',
    gender: 'male',
    ageRange: '25-30',
    skinTone: '小麦色',
    bodyType: '匀称',
    hairStyle: '短黑发',
    imageUrl: '/images/models/male-1.jpg',
    prompt: 'Young man model, medium tan skin, short black hair, athletic build, confident pose',
    createdAt: '2024-06-25T11:00:00Z',
  },
  {
    id: 'model-3',
    name: 'Aisha',
    gender: 'female',
    ageRange: '22-28',
    skinTone: '深色',
    bodyType: '曲线型',
    hairStyle: '短卷发',
    imageUrl: '/images/models/female-2.jpg',
    prompt: 'Young woman model, dark skin, short curly hair, curvy build, graceful pose',
    createdAt: '2024-06-25T12:00:00Z',
  },
];

export const defaultGarments: Garment[] = [
  {
    id: 'garment-1',
    name: '经典白色T恤',
    category: 'top',
    color: '白色',
    style: '休闲',
    imageUrl: '/images/garments/tshirt-white.jpg',
    createdAt: '2024-06-25T10:00:00Z',
  },
  {
    id: 'garment-2',
    name: '经典蓝色牛仔裤',
    category: 'bottom',
    color: '蓝色',
    style: '休闲',
    imageUrl: '/images/garments/jeans-blue.jpg',
    createdAt: '2024-06-25T10:30:00Z',
  },
  {
    id: 'garment-3',
    name: '优雅小黑裙',
    category: 'dress',
    color: '黑色',
    style: '正式',
    imageUrl: '/images/garments/dress-black.jpg',
    createdAt: '2024-06-25T11:00:00Z',
  },
  {
    id: 'garment-4',
    name: '白色运动鞋',
    category: 'shoes',
    color: '白色',
    style: '运动',
    imageUrl: '/images/garments/sneakers-white.jpg',
    createdAt: '2024-06-25T11:30:00Z',
  },
];

export const defaultResults: TryOnResult[] = [
  {
    id: 'result-1',
    modelId: 'model-1',
    garmentIds: ['garment-1', 'garment-2'],
    imageUrl: '/images/results/result-1.jpg',
    modelName: 'Sophia',
    garmentNames: ['经典白色T恤', '经典蓝色牛仔裤'],
    aiModel: 'IDM-VTON',
    resolution: '2048 x 2048',
    createdAt: '2024-06-25T14:00:00Z',
  },
  {
    id: 'result-2',
    modelId: 'model-2',
    garmentIds: ['garment-1', 'garment-2', 'garment-4'],
    imageUrl: '/images/results/result-2.jpg',
    modelName: 'Marcus',
    garmentNames: ['经典白色T恤', '经典蓝色牛仔裤', '白色运动鞋'],
    aiModel: 'IDM-VTON',
    resolution: '2048 x 2048',
    createdAt: '2024-06-25T14:30:00Z',
  },
  {
    id: 'result-3',
    modelId: 'model-3',
    garmentIds: ['garment-3'],
    imageUrl: '/images/results/result-3.jpg',
    modelName: 'Aisha',
    garmentNames: ['优雅小黑裙'],
    aiModel: 'FLUX.1 Pro',
    resolution: '2048 x 2048',
    createdAt: '2024-06-25T15:00:00Z',
  },
];

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
