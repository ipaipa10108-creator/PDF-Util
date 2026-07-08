import type * as PdfJsType from "pdfjs-dist";
import { PDFDocument, degrees } from "pdf-lib";

export interface PdfPageInfo {
  id: string; // 唯一 ID
  fileId: string; // 所屬的檔案 ID
  sourcePageIndex: number; // 在該原始檔案中的 pageIndex (0-based)
  pageIndex: number; // 目前在 pages 陣列中的顯示順序 index (0-based)
  pageNumber: number; // 頁碼 (1-based)
  thumbnailUrl: string;
  width: number;
  height: number;
  rotation: number; // 0, 90, 180, 270
  isDeleted: boolean;
  cropBox: { x: number; y: number; width: number; height: number } | null; // 相對比例 (0~1)
}

export interface PlacedSignature {
  id: string;
  pageId: string; // 使用 pageId 替代 pageIndex
  signatureImageId: string;
  x: number; // 相對位置 (0~1)
  y: number; // 相對位置 (0~1)
  width: number; // 相對頁面寬度比例 (0~1)
  height: number; // 相對頁面高度比例 (0~1)
}

export interface SavedSignature {
  id: string;
  type: "draw" | "image";
  color?: "black" | "blue" | "red";
  dataUrl: string;
  createdAt: number;
}

let pdfjsInstance: typeof PdfJsType | null = null;

async function getPdfjsLib(): Promise<typeof PdfJsType> {
  if (typeof window === "undefined") {
    throw new Error("PDF.js can only be loaded in browser environment");
  }
  if (!pdfjsInstance) {
    const pdfjs = await import("pdfjs-dist");
    // 使用 Webpack 原生機制載入同源 Worker，避免瀏覽器的 Web Worker 跨域 (CORS) 安全策略限制
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url
    ).toString();
    pdfjsInstance = pdfjs;
  }
  return pdfjsInstance;
}/**
 * 從 File 載入 PDF，並產生每一頁的預覽與尺寸資訊，支援載入指定頁碼範圍
 */
export async function loadPdfPages(
  file: File,
  fileId: string,
  targetPageIndices?: number[]
): Promise<PdfPageInfo[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfjs = await getPdfjsLib();
  
  // 載入 PDF 文件進行渲染
  const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;
  
  const pagesInfo: PdfPageInfo[] = [];

  // 如果有傳入指定頁碼，則使用指定頁碼（0-based 轉成 1-based）；否則，載入全部頁面
  const indices = targetPageIndices && targetPageIndices.length > 0
    ? targetPageIndices.map(idx => idx + 1).filter(p => p >= 1 && p <= numPages)
    : Array.from({ length: numPages }, (_, idx) => idx + 1);

  for (const pageNum of indices) {
    const page = await pdfDoc.getPage(pageNum);
    // 預設以 1.5 倍縮放渲染縮圖，取得清晰影像
    const viewport = page.getViewport({ scale: 1.5 });
    
    // 建立離屏 Canvas 進行渲染
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const context = canvas.getContext("2d");
    
    if (context) {
      await page.render({
        canvasContext: context,
        viewport: viewport,
      }).promise;
    }
    
    const thumbnailUrl = canvas.toDataURL("image/jpeg", 0.85);
    
    // 取得原始 PDF 頁面寬高與預設旋轉值
    const pdfViewport = page.getViewport({ scale: 1.0 });
    
    pagesInfo.push({
      id: `page-${fileId}-${pageNum - 1}-${Math.random().toString(36).substring(2, 9)}`,
      fileId,
      sourcePageIndex: pageNum - 1,
      pageIndex: pageNum - 1,
      pageNumber: pageNum,
      thumbnailUrl,
      width: pdfViewport.width,
      height: pdfViewport.height,
      rotation: pdfViewport.rotation % 360,
      isDeleted: false,
      cropBox: null,
    });
  }
  
  return pagesInfo;
}
interface ExportPdfParams {
  filesMap: Record<string, File>; // 用於支援多個檔案的 Map，key 為 fileId
  pages: PdfPageInfo[];
  signatures: PlacedSignature[];
  savedSignatures: SavedSignature[];
}

/**
 * 根據使用者編輯操作，重組、旋轉、裁切 PDF 並壓印簽名，最後導出新 PDF Blob
 */
export async function exportPdf({
  filesMap,
  pages,
  signatures,
  savedSignatures,
}: ExportPdfParams): Promise<Blob> {
  // 1. 載入所有來源 PDF 文件並進行快取
  const loadedDocsMap: Record<string, PDFDocument> = {};
  for (const [fileId, fileObj] of Object.entries(filesMap)) {
    const bytes = await fileObj.arrayBuffer();
    loadedDocsMap[fileId] = await PDFDocument.load(bytes);
  }
  
  // 2. 建立全新的 PDF 文件
  const newDoc = await PDFDocument.create();
  
  // 3. 過濾掉標記為被刪除的頁面
  const activePages = pages.filter(p => !p.isDeleted);
  
  if (activePages.length === 0) {
    throw new Error("無法導出空的文件，請至少保留一頁。");
  }
  
  // 建立簽名圖片的嵌入快取
  const embeddedSignaturesMap: Record<string, any> = {};
  
  // 4. 逐頁進行編輯套用 (旋轉、裁切、電子簽章)
  for (let i = 0; i < activePages.length; i++) {
    const pageConfig = activePages[i];
    const srcDoc = loadedDocsMap[pageConfig.fileId];
    if (!srcDoc) continue;
    
    // 拷貝對應檔案的對應頁面 (拷貝單個頁面)
    const [copiedPage] = await newDoc.copyPages(srcDoc, [pageConfig.sourcePageIndex]);
    const { width: pageW, height: pageH } = copiedPage.getSize();
    
    // A. 套用頁面旋轉
    if (pageConfig.rotation !== 0) {
      copiedPage.setRotation(degrees(pageConfig.rotation));
    }
    
    // B. 套用頁面裁切 (CropBox)
    if (pageConfig.cropBox) {
      const { x: rx, y: ry, width: rw, height: rh } = pageConfig.cropBox;
      // 換算成 PDF 內部 points 座標 (注意 PDF 的原點是在左下角，而 Canvas 在左上角)
      const cropX = rx * pageW;
      const cropW = rw * pageW;
      const cropH = rh * pageH;
      // PDF y_pdf = H_pdf - (y_canvas + h_canvas)
      const cropY = pageH - (ry + rh) * pageH;
      
      copiedPage.setCropBox(cropX, cropY, cropW, cropH);
    }
    
    // C. 壓印電子簽章 (Flatten) - 根據頁面的唯一 ID `id` 進行簽名匹配
    const pageSignatures = signatures.filter(sig => sig.pageId === pageConfig.id);
    
    for (const sig of pageSignatures) {
      const savedSig = savedSignatures.find(s => s.id === sig.signatureImageId);
      if (!savedSig) continue;
      
      // 如果該簽章圖片尚未嵌入，則進行嵌入
      if (!embeddedSignaturesMap[savedSig.id]) {
        // 從 Base64 Data URL 提取圖片 bytes
        const base64Data = savedSig.dataUrl.split(",")[1];
        const imgBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
        
        // 嵌入 PNG
        const embeddedImg = await newDoc.embedPng(imgBytes);
        embeddedSignaturesMap[savedSig.id] = embeddedImg;
      }
      
      const embeddedImg = embeddedSignaturesMap[savedSig.id];
      
      // 換算簽章在 PDF 頁面中的物理座標 (同樣換算 PDF 左下角原點)
      const sigX = sig.x * pageW;
      const sigW = sig.width * pageW;
      const sigH = sig.height * pageH;
      // PDF y_pdf = H_pdf - (y_canvas + h_canvas)
      const sigY = pageH - (sig.y + sig.height) * pageH;
      
      copiedPage.drawImage(embeddedImg, {
        x: sigX,
        y: sigY,
        width: sigW,
        height: sigH,
      });
    }
    
    // 將編輯後的頁面加入新文件
    newDoc.addPage(copiedPage);
  }
  
  // 5. 輸出 PDF 位元組並打包為 Blob
  const pdfBytes = await newDoc.save();
  return new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
}
