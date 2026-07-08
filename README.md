# Local PDF Web Suite (純本地端網頁 PDF 綜合處理工具)

![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/ipaipa10108-creator/PDF-Util/deploy.yml?branch=main&label=Deploy%20Status&style=flat-square)
![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)
![Privacy](https://img.shields.io/badge/Privacy-100%25%20Local-emerald?style=flat-square)

一個現代化、高質感的網頁端 PDF 綜合編輯與電子簽署工具。

### 🔒 絕對的隱私與安全承諾
本工具為 **100% 靜態前端網頁應用**。所有的 PDF 解析、渲染、頁面編輯、裁切與簽章生成皆在您的瀏覽器本地沙盒中完成。**100% 承諾不將任何文件、個資或簽名圖像上傳至任何後端伺服器**，保障極致的文件隱私安全。

---

## ✨ 核心功能

* 📂 **文件載入與預覽**：支援拖放 (Drag & Drop) 或點擊上傳 PDF，即時以網格縮圖 (Thumbnail Grid) 形式渲染並呈現所有頁面與頁碼。
* 🔄 **頁面旋轉**：支援單獨或批次勾選頁面進行順時針 90°、180°、逆時針 90° 旋轉，前端 UI 即時以動畫響應。
* ❌ **頁面刪除**：一鍵標記刪除指定頁面，在 UI 上置灰隱藏，並在最終導出時完全剔除。
* 📐 **指定頁面導出**：自由選擇特定頁面重新打包，並於瀏覽器本地合成生成全新的 PDF 下載。
* ✂️ **視覺化頁面裁切 (Crop Box)**：點擊特定頁面進入裁切模式，提供 8 個控制點的精美視覺化裁切框，支援「僅套用當前頁面」或「套用至所有頁面」。
* ✍️ **電子簽章壓印 (E-Sign)**：
  * **手寫簽章**：提供流暢的 Canvas 手寫簽名板，可自由切換「黑、藍、紅」三色筆跡。
  * **圖片匯入**：支援拖放或上傳透明背景的 PNG/SVG 簽名圖片。
  * **互動式放置**：支援在 PDF 縮圖上任意點擊放置多個簽名、拖曳調整位置、拉動控制點進行等比例縮放。
  * **本機快取**：已建立的簽章將加密儲存於瀏覽器 `localStorage` 中，方便下次使用。
* 📤 **原生 Web Share 分享**：不經過任何雲端伺服器，直接呼叫作業系統（iOS/Android/macOS/Windows）的原生分享視窗，透過 AirDrop、LINE、Email 等本地管道發送產出的 PDF。
* 🌓 **深色/淺色模式**：支援精美的科技感深色模式與簡約淺色模式，並自動跟隨系統喜好設定。

---

## 🛠️ 技術棧

* **核心框架**：Next.js 15 (App Router) & React 19 & TypeScript
* **樣式系統**：Tailwind CSS (支援 Dark Mode、磨砂玻璃效果)
* **PDF 解析與渲染**：`pdfjs-dist` (Mozilla PDF.js)
* **PDF 編輯與壓印**：`pdf-lib` (純前端 PDF 合成器)
* **圖示庫**：`lucide-react`
* **特效**：`canvas-confetti` (導出成功時的彩花驚喜)
* **自動部署**：GitHub Actions

---

## 🚀 本地開發與運行指南

如果您想在本地端執行開發或進行修改，請按照以下步驟操作：

### 1. 安裝 pnpm
本專案嚴格使用 `pnpm` 包管理器。如果您尚未安裝，請執行：
```bash
npm install -g pnpm
```

### 2. 安裝依賴項
在專案根目錄下執行：
```bash
pnpm install
```

### 3. 啟動開發伺服器
```bash
pnpm dev
```
啟動後，在瀏覽器中開啟 [http://localhost:3000](http://localhost:3000) 即可使用。

### 4. 本地打包編譯
進行靜態網頁導出驗證：
```bash
pnpm build
```
Next.js 會將整個專案編譯並導出為靜態網頁，生成於根目錄下的 `./out/` 資料夾中。

---

## 📦 雲端靜態託管部署

### A. 使用 GitHub Pages 自動部署 (已設定完成)
本專案已配置 GitHub Actions 部署工作流。您只需：
1. 將程式碼推送到 GitHub 的 `main` 或 `master` 分支。
2. 前往 GitHub 倉庫的 **Settings** -> **Pages**。
3. 將 **Build and deployment** 下方的 **Source** 更改為 **`GitHub Actions`**。
4. 推送後，GitHub 系統將自動在雲端完成 `pnpm install` 與編譯，並自動部署上線。

### B. 部署於 Vercel / Cloudflare Pages
1. 將專案推送到 GitHub。
2. 在 Vercel 或 Cloudflare Pages 直接匯入此倉庫。
3. 平台會自動識別 Next.js 專案並在雲端一鍵完成部署。
