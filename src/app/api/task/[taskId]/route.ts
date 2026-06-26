/**
 * GET /api/task/[taskId]
 * 查询 DashScope 异步任务结果（通用，适用所有 async API）
 */
import { NextResponse } from "next/server";
import { queryTask } from "@/lib/dashscope";

export async function GET(
  _request: Request,
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

    const result = await queryTask(taskId);

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
