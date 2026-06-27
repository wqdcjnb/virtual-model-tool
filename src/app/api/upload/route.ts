/**
 * POST /api/upload
 * 接收 base64 图片，等比缩放后上传到 CloudBase 云存储
 * 返回永久可访问的图片 URL（通过 /api/file/:cloudPath 代理）
 */
import { NextResponse } from "next/server";
import sharp from "sharp";
import app from "@/lib/cloudbase";

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
    const extMap: Record<string, string> = {
      "image/png": "png",
      "image/jpeg": "jpg",
      "image/webp": "webp",
    };
    const ext = extMap[mime] || mime.split("/")[1] || "png";
    let buffer = Buffer.from(pure, "base64");

    if (buffer.length > 15 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, message: "图片大小不能超过 15MB" },
        { status: 400 }
      );
    }

    // 获取原图尺寸
    const metadata = await sharp(Uint8Array.from(buffer)).metadata();
    const width = metadata.width || 1024;
    const height = metadata.height || 1024;

    // 自适应缩放：短边 ≥ 400，长边 ≤ 2048
    const MIN_SIDE = 400;
    const MAX_SIDE = 2048;
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

    const outputFormat: "jpeg" | "png" | "webp" =
      ext === "jpg" || ext === "jpeg" ? "jpeg" :
      ext === "webp" ? "webp" : "png";

    if (finalW !== width || finalH !== height) {
      buffer = Buffer.from(await sharp(Uint8Array.from(buffer))
        .resize(finalW, finalH, { fit: "inside" })
        .toFormat(outputFormat, outputFormat === "jpeg" ? { quality: 85 } : {})
        .toBuffer());
    }

    if (outputFormat === "jpeg" && buffer.length > 3 * 1024 * 1024) {
      buffer = Buffer.from(await sharp(Uint8Array.from(buffer))
        .jpeg({ quality: 60 })
        .toBuffer());
    }

    if (buffer.length > 5 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, message: "图片处理后仍超 5MB，请上传较小的图片" },
        { status: 400 }
      );
    }

    // 上传到 CloudBase 云存储
    const cloudPath = `ref_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const uploadResult = await app.uploadFile({
      cloudPath,
      fileContent: buffer,
    });

    // 获取 CDN 临时访问 URL
    const urlResult = await app.getTempFileURL({
      fileList: [uploadResult.fileID],
    });
    const cdnUrl = urlResult.fileList?.[0]?.tempFileURL || "";

    console.log("[upload] CloudBase 上传完成:", cdnUrl);

    return NextResponse.json({
      success: true,
      url: cdnUrl,
      fileId: uploadResult.fileID,
      cloudPath,
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
