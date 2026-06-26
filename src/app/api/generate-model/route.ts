/**
 * POST /api/generate-model
 * 创建模特生成任务（文生图 / 图生图）
 * 根据模型自动选择端点：multimodal-generation 或 text2image
 */
import { NextResponse } from "next/server";
import { createModelGenerationTask } from "@/lib/dashscope";
import { getModelConfig } from "@/lib/constants";

const VALID_SIZES = [
  "1024*1024", "960*1280", "1280*960",
  "720*1280", "1280*720",
  "1440*1440", "2048*2048", "4096*4096",
  "1664*928",
];

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      model,
      mode,
      prompt,
      referenceImageUrl,
      size,
      n,
      negativePrompt,
    } = body;

    // ---- 校验 ----

    if (!model) {
      return NextResponse.json(
        { success: false, message: "请选择 AI 模型" },
        { status: 400 }
      );
    }

    const config = getModelConfig(model);
    if (!config) {
      return NextResponse.json(
        { success: false, message: `无效的模型: ${model}` },
        { status: 400 }
      );
    }

    if (mode !== "text-to-image" && mode !== "image-to-image") {
      return NextResponse.json(
        { success: false, message: `无效的生成模式: ${mode}` },
        { status: 400 }
      );
    }

    if (!prompt || !prompt.trim()) {
      return NextResponse.json(
        { success: false, message: "请输入形象描述" },
        { status: 400 }
      );
    }

    if (mode === "image-to-image") {
      if (!config.supportsImageToImage) {
        return NextResponse.json(
          { success: false, message: `${config.name} 不支持图生图模式，请切换模型` },
          { status: 400 }
        );
      }
      if (!referenceImageUrl) {
        return NextResponse.json(
          { success: false, message: "图生图模式请上传参考图" },
          { status: 400 }
        );
      }
    }

    if (size && !VALID_SIZES.includes(size)) {
      return NextResponse.json(
        { success: false, message: `无效的尺寸: ${size}` },
        { status: 400 }
      );
    }

    // ---- 调用 ----

    const { taskId } = await createModelGenerationTask({
      model,
      mode,
      prompt: prompt.trim(),
      referenceImageUrl: referenceImageUrl || undefined,
      size: size || config.maxResolution,
      n: Math.min(Math.max(n || 1, 1), config.maxImages),
      negativePrompt: negativePrompt || undefined,
    });

    console.log("[generate-model] 任务已创建:", {
      model,
      mode,
      taskId,
    });

    return NextResponse.json({ success: true, taskId });
  } catch (err: any) {
    console.error("创建模特生成任务失败:", err);
    return NextResponse.json(
      { success: false, message: err.message || "创建任务失败" },
      { status: 500 }
    );
  }
}
