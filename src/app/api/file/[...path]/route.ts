/**
 * GET /api/file/:cloudPath
 * 从 CloudBase 云存储下载文件并返回（永久有效）
 */
import { NextResponse } from "next/server";
import app from "@/lib/cloudbase";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await params;
    const cloudPath = path.join("/");

    // 从 CloudBase 下载文件
    const result = await app.downloadFile({
      fileID: `cloud://${process.env.CLOUDBASE_ENV_ID}.7771-wqd-d9gb53fy5b6613e69-1323744964/${cloudPath}`,
    });

    // result.fileContent can be Buffer or string — ensure it's Buffer
    let buffer: Buffer;
    if (typeof result.fileContent === "string") {
      buffer = Buffer.from(result.fileContent, "base64");
    } else {
      buffer = result.fileContent as Buffer;
    }

    // 推断 content type
    const ext = cloudPath.split(".").pop()?.toLowerCase() || "png";
    const mimeMap: Record<string, string> = {
      png: "image/png",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      webp: "image/webp",
      gif: "image/gif",
    };

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": mimeMap[ext] || "image/png",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err: any) {
    console.error("[file] 下载失败:", err);
    return NextResponse.json(
      { success: false, message: err.message || "文件不存在" },
      { status: 404 }
    );
  }
}
