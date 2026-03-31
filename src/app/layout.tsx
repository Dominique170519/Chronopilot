import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI 日程管理",
  description: "AI 驱动的智能日程安排助手",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="bg-gray-50 text-gray-900">{children}</body>
    </html>
  );
}
