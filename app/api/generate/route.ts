/**
 * POST /api/generate
 * 创建虚拟模特生成任务（异步），返回 taskId 供前端轮询
 */
import { NextResponse } from "next/server";
import {
  createVirtualModelTask,
  type ModelVersion,
  type ShortSideSize,
  type AspectRatio,
} from "@/lib/dashscope";

const VALID_MODELS: ModelVersion[] = ["wanx-virtualmodel", "virtualmodel-v2"];
const V1_SIZES: ShortSideSize[] = ["512", "1024"];
const V2_SIZES: ShortSideSize[] = ["1024", "2048"];

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      baseUrl,
      maskUrl,
      prompt,
      facePrompt,
      backgroundUrl,
      model,
      shortSideSize,
      n,
      aspectRatio,
      realPerson,
    } = body;

    // 校验必填
    if (!baseUrl) {
      return NextResponse.json(
        { success: false, message: "请上传输入图" },
        { status: 400 }
      );
    }
    if (!prompt || !prompt.trim()) {
      return NextResponse.json(
        { success: false, message: "请输入全身形象描述" },
        { status: 400 }
      );
    }
    if (!facePrompt || !facePrompt.trim()) {
      return NextResponse.json(
        { success: false, message: "请输入面部描述" },
        { status: 400 }
      );
    }
    if (!model || !VALID_MODELS.includes(model as ModelVersion)) {
      return NextResponse.json(
        { success: false, message: `无效的模型版本: ${model}` },
        { status: 400 }
      );
    }

    const validSizes = model === "wanx-virtualmodel" ? V1_SIZES : V2_SIZES;
    if (shortSideSize && !validSizes.includes(shortSideSize as ShortSideSize)) {
      return NextResponse.json(
        { success: false, message: `${model} short_side_size 仅支持 ${validSizes.join(", ")}` },
        { status: 400 }
      );
    }

    const { taskId } = await createVirtualModelTask({
      baseImageUrl: baseUrl,
      maskImageUrl: maskUrl || baseUrl, // 兜底：无蒙版时用原图
      prompt: prompt.trim(),
      facePrompt: facePrompt.trim(),
      backgroundImageUrl: backgroundUrl || undefined,
      model: model as ModelVersion,
      shortSideSize: (shortSideSize || "1024") as ShortSideSize,
      n: Math.min(Math.max(n || 1, 1), 4),
      aspectRatio: aspectRatio as AspectRatio | undefined,
      realPerson: realPerson !== undefined ? Boolean(realPerson) : undefined,
    });

    console.log("[generate] 任务已创建:", taskId);
    return NextResponse.json({ success: true, taskId });
  } catch (err: any) {
    console.error("创建任务失败:", err);
    return NextResponse.json(
      { success: false, message: err.message || "创建任务失败" },
      { status: 500 }
    );
  }
}
