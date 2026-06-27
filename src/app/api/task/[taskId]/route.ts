/**
 * GET /api/task/[taskId]
 * 查询异步任务结果（DashScope + CQT 通用）
 */
import { NextResponse } from "next/server";
import { queryTask as queryDashScopeTask } from "@/lib/dashscope";
import { queryCQTTask } from "@/lib/cqt";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;

    if (!taskId) {
      return NextResponse.json(
        { success: false, message: "缺少 taskId" },
        { status: 400 }
      );
    }

    // 通过 query param 区分：?platform=cqt&group=flux
    const url = new URL(request.url);
    const platform = url.searchParams.get("platform") || "dashscope";

    if (platform === "cqt") {
      const group = (url.searchParams.get("group") || "flux") as "nano" | "flux";
      const result = await queryCQTTask(group, taskId);
      return NextResponse.json({
        success: true,
        status: result.status,
        results: result.results,
        message: result.message,
      });
    }

    // DashScope
    const result = await queryDashScopeTask(taskId);
    return NextResponse.json({
      success: true,
      status: result.status,
      results: result.results,
      message: result.message,
    });
  } catch (err: any) {
    console.error("查询任务失败:", err);
    return NextResponse.json(
      { success: false, message: err.message || "查询任务失败" },
      { status: 500 }
    );
  }
}
