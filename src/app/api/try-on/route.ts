/**
 * POST /api/try-on
 * 创建虚拟试衣任务（aitryon-plus / aitryon）
 */
import { NextResponse } from "next/server";
import { createTryOnTask } from "@/lib/dashscope";

const VALID_RESOLUTIONS = ["1K", "2K"];

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      model,
      personImageUrl,
      topGarmentUrl,
      bottomGarmentUrl,
      resolution,
      restoreFace,
    } = body;

    // ---- 校验 ----

    if (!personImageUrl) {
      return NextResponse.json(
        { success: false, message: "请上传人物照片" },
        { status: 400 }
      );
    }

    if (!topGarmentUrl && !bottomGarmentUrl) {
      return NextResponse.json(
        { success: false, message: "请至少上传一张服装图片（上装或下装）" },
        { status: 400 }
      );
    }

    if (resolution && !VALID_RESOLUTIONS.includes(resolution)) {
      return NextResponse.json(
        { success: false, message: `无效的分辨率: ${resolution}，支持 1K / 2K` },
        { status: 400 }
      );
    }

    // ---- 调用 ----

    const { taskId } = await createTryOnTask({
      model: model || "aitryon-plus",
      personImageUrl,
      topGarmentUrl: topGarmentUrl || undefined,
      bottomGarmentUrl: bottomGarmentUrl || undefined,
      resolution: resolution || "1K",
      restoreFace: restoreFace !== undefined ? Boolean(restoreFace) : true,
    });

    console.log("[try-on] 任务已创建:", {
      model: model || "aitryon-plus",
      hasPerson: !!personImageUrl,
      hasTop: !!topGarmentUrl,
      hasBottom: !!bottomGarmentUrl,
      taskId,
    });

    return NextResponse.json({ success: true, taskId });
  } catch (err: any) {
    console.error("创建试衣任务失败:", err);
    return NextResponse.json(
      { success: false, message: err.message || "创建任务失败" },
      { status: 500 }
    );
  }
}
