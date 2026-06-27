/**
 * POST /api/generate-model
 * 创建模特生成任务（文生图 / 图生图）
 * 支持多平台：DashScope + CQT AI + OpenRouter
 */
import { NextResponse } from "next/server";
import { createModelGenerationTask } from "@/lib/dashscope";
import { createCQTModelTask } from "@/lib/cqt";
import { generateImage } from "@/lib/openrouter";
import { getModelConfig } from "@/lib/constants";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      model,
      mode,
      prompt,
      referenceImageUrl,
      referenceImageUrls,
      size,
      n,
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

    if (!prompt || !prompt.trim()) {
      return NextResponse.json(
        { success: false, message: "请输入形象描述" },
        { status: 400 }
      );
    }

    if (mode === "image-to-image") {
      if (!config.supportsImageToImage) {
        return NextResponse.json(
          { success: false, message: `${config.name} 不支持图生图` },
          { status: 400 }
        );
      }
      if (!referenceImageUrl && (!referenceImageUrls || referenceImageUrls.length === 0)) {
        return NextResponse.json(
          { success: false, message: "图生图模式请上传参考图" },
          { status: 400 }
        );
      }
    }

    const safeN = Math.min(Math.max(n || 1, 1), config.maxImages);

    // ---- OpenRouter 平台 ----
    if (config.platform === "openrouter") {
      const { results } = await generateImage({
        model: config.id,
        prompt: prompt.trim(),
        referenceImageUrl: referenceImageUrl || undefined,
      });
      console.log("[generate-model] OpenRouter:", { model, count: results.length });
      return NextResponse.json({ success: true, results, platform: "openrouter" });
    }

    // ---- CQT 平台 ----
    if (config.platform === "cqt") {
      const group = config.endpoint === "cqt-flux" ? "flux" : "nano";
      const { taskId } = await createCQTModelTask({
        group,
        model: config.id,
        prompt: prompt.trim(),
        imageUrl: referenceImageUrl || undefined,
        n: safeN,
        size: size || config.maxResolution,
      });

      console.log("[generate-model] CQT 任务:", { model, group, taskId });
      return NextResponse.json({ success: true, taskId, platform: "cqt", group });
    }

    // ---- DashScope 平台 ----
    const result = await createModelGenerationTask({
      model,
      mode: mode || "text-to-image",
      prompt: prompt.trim(),
      referenceImageUrl: referenceImageUrl || undefined,
      referenceImageUrls: referenceImageUrls || undefined,
      size: size || config.maxResolution,
      n: safeN,
    });

    // 同步模式直接返回结果
    if (result.results?.length) {
      return NextResponse.json({ success: true, results: result.results, platform: "dashscope" });
    }

    console.log("[generate-model] DashScope 异步任务:", { model, taskId: result.taskId });
    return NextResponse.json({ success: true, taskId: result.taskId, platform: "dashscope" });
  } catch (err: any) {
    console.error("创建模特生成任务失败:", err);
    return NextResponse.json(
      { success: false, message: err.message || "创建任务失败" },
      { status: 500 }
    );
  }
}
