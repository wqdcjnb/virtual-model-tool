import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI 虚拟模特生成 - 万相虚拟模特工具",
  description: "上传模特实拍图，AI 替换模特和背景，快速生成更多模特拍摄图",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
