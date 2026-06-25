/**
 * GET /api/task/[taskId]
 * 查询虚拟模特异步任务的结果
 */
import { NextResponse } from "next/server";
import { queryVirtualModelTask } from "@/lib/dashscope";

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

    const result = await queryVirtualModelTask(taskId);

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
