/**
 * POST /api/try-on
 * 创建虚拟试衣任务（aitryon-plus / aitryon）
 */
import { NextResponse } from "next/server";
import { createTryOnTask } from "@/lib/dashscope";

const VALID_RESOLUTIONS = [-1, 1024, 1280];

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

    const resNum = resolution !== undefined ? Number(resolution) : 1024;
    if (resolution !== undefined && !VALID_RESOLUTIONS.includes(resNum)) {
      return NextResponse.json(
        { success: false, message: `无效的分辨率: ${resolution}，支持 -1 / 1024 / 1280` },
        { status: 400 }
      );
    }

    // ---- 调用 ----

    const { taskId } = await createTryOnTask({
      model: model || "aitryon-plus",
      personImageUrl,
      topGarmentUrl: topGarmentUrl || undefined,
      bottomGarmentUrl: bottomGarmentUrl || undefined,
      resolution: resNum,
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
