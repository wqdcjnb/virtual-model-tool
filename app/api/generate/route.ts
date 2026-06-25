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
const VALID_RATIOS: AspectRatio[] = [
  "1:1",
  "3:4",
  "4:3",
  "9:16",
  "16:9",
  "1:2",
  "2:1",
];

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      baseImageUrl,
      maskImageUrl,
      prompt,
      facePrompt,
      backgroundImageUrl,
      model,
      shortSideSize,
      n,
      aspectRatio,
      backgroundWeight,
      realPerson,
    } = body;

    // ---- 必填校验 ----
    if (!baseImageUrl) {
      return NextResponse.json(
        { success: false, message: "请上传模特图" },
        { status: 400 }
      );
    }
    if (!maskImageUrl) {
      return NextResponse.json(
        { success: false, message: "请上传蒙版图" },
        { status: 400 }
      );
    }
    if (!prompt || !prompt.trim()) {
      return NextResponse.json(
        { success: false, message: "请输入全身形象描述 prompt" },
        { status: 400 }
      );
    }
    if (!facePrompt || !facePrompt.trim()) {
      return NextResponse.json(
        { success: false, message: "请输入面部描述 face_prompt" },
        { status: 400 }
      );
    }
    if (!model || !VALID_MODELS.includes(model as ModelVersion)) {
      return NextResponse.json(
        {
          success: false,
          message: `无效的模型版本: ${model}，可选: ${VALID_MODELS.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // ---- 参数校验 ----
    const validSizes = model === "wanx-virtualmodel" ? V1_SIZES : V2_SIZES;
    if (shortSideSize && !validSizes.includes(shortSideSize as ShortSideSize)) {
      return NextResponse.json(
        {
          success: false,
          message: `${model} 的 short_side_size 只能为: ${validSizes.join(", ")}`,
        },
        { status: 400 }
      );
    }

    if (
      aspectRatio &&
      !VALID_RATIOS.includes(aspectRatio as AspectRatio)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: `无效的 aspect_ratio: ${aspectRatio}`,
        },
        { status: 400 }
      );
    }

    // ---- 调用 API ----
    const { taskId } = await createVirtualModelTask({
      baseImageUrl,
      maskImageUrl,
      prompt: prompt.trim(),
      facePrompt: facePrompt.trim(),
      backgroundImageUrl: backgroundImageUrl || undefined,
      model: model as ModelVersion,
      shortSideSize: (shortSideSize || "1024") as ShortSideSize,
      n: Math.min(Math.max(n || 1, 1), 4),
      ...(model === "virtualmodel-v2" && aspectRatio
        ? { aspectRatio: aspectRatio as AspectRatio }
        : {}),
      ...(model === "virtualmodel-v2" && backgroundWeight !== undefined
        ? { backgroundWeight: Number(backgroundWeight) }
        : {}),
      ...(model === "virtualmodel-v2" && realPerson !== undefined
        ? { realPerson: Boolean(realPerson) }
        : {}),
    });

    console.log("[generate] 任务已创建，taskId:", taskId);

    return NextResponse.json({ success: true, taskId });
  } catch (err: any) {
    console.error("创建任务失败:", err);
    return NextResponse.json(
      { success: false, message: err.message || "创建任务失败，请重试" },
      { status: 500 }
    );
  }
}
