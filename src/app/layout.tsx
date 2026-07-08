import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Local PDF Web Suite - 純本地端網頁 PDF 綜合處理工具",
  description: "100% 本地端執行的 PDF 編輯與簽章工具，保證隱私與安全，提供旋轉、刪除、裁切、電子簽章壓印及原生分享功能。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW" className="h-full">
      <head>
        <link rel="manifest" href="/PDF-Util/manifest.json" />
        <meta name="theme-color" content="#6366f1" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/PDF-Util/icon-192.png" />
      </head>
      <body className="h-full antialiased">
        {children}
      </body>
    </html>
  );
}
