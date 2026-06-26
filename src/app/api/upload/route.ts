/**
 * POST /api/upload
 * 接收 base64 图片，等比缩放后保存到 data/uploads/
 * 返回公网可访问的图片 URL
 */
import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";
import sharp from "sharp";

const UPLOADS_DIR = path.join(process.cwd(), "data", "uploads");

export async function POST(request: Request) {
  try {
    const { image } = await request.json();

    if (!image) {
      return NextResponse.json(
        { success: false, message: "请提供图片数据" },
        { status: 400 }
      );
    }

    const matches = image.match(/^data:([^;]+);base64,(.+)$/);
    if (!matches) {
      return NextResponse.json(
        { success: false, message: "图片格式错误，需要 base64 data URL" },
        { status: 400 }
      );
    }

    const mime = matches[1];
    const pure = matches[2];
    const ext = mime.split("/")[1] || "png";
    let buffer = Buffer.from(pure, "base64");

    if (buffer.length > 10 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, message: "图片大小不能超过 10MB" },
        { status: 400 }
      );
    }

    // 获取原图尺寸
    const metadata = await sharp(Uint8Array.from(buffer)).metadata();
    const width = metadata.width || 1024;
    const height = metadata.height || 1024;

    // 对超大/超小图等比缩放
    const MIN_SIDE = 400;
    const MAX_SIDE = 7000;
    const longSide = Math.max(width, height);
    const shortSide = Math.min(width, height);
    let finalW = width;
    let finalH = height;

    if (shortSide < MIN_SIDE) {
      const scale = MIN_SIDE / shortSide;
      finalW = Math.round(width * scale);
      finalH = Math.round(height * scale);
    }
    if (longSide > MAX_SIDE) {
      const scale = MAX_SIDE / longSide;
      finalW = Math.round(finalW * scale);
      finalH = Math.round(finalH * scale);
    }

    if (finalW !== width || finalH !== height) {
      const resized = await sharp(Uint8Array.from(buffer))
        .resize(finalW, finalH, { fit: "inside" })
        .toFormat(ext === "jpg" ? "jpeg" : (ext as "png" | "jpeg" | "webp"))
        .toBuffer();
      buffer = Buffer.from(resized);
    }

    // 确保目录存在
    await mkdir(UPLOADS_DIR, { recursive: true });

    // 写入文件
    const baseId = `${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
    const filename = `upload_${baseId}.${ext}`;
    await writeFile(path.join(UPLOADS_DIR, filename), buffer);

    // 构建公网 URL
    const host = request.headers.get("host") || "localhost:3000";
    const forwardedProto = request.headers.get("x-forwarded-proto");
    const protocol = forwardedProto
      || (host.startsWith("localhost") ? "http" : "https");
    const url = `${protocol}://${host}/api/uploads/${filename}`;

    console.log("[upload] 图片上传完成:", url);

    return NextResponse.json({
      success: true,
      url,
      width: finalW,
      height: finalH,
    });
  } catch (err: any) {
    console.error("上传失败:", err);
    return NextResponse.json(
      { success: false, message: err.message || "上传失败" },
      { status: 500 }
    );
  }
}
