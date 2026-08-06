import type * as PdfJsType from "pdfjs-dist";
import { PDFDocument, degrees } from "pdf-lib";
import { encryptPDF } from "@pdfsmaller/pdf-encrypt-lite";

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
}

/**
 * 測試指定密碼是否能開啟 PDF（ArrayBuffer 版本，可反複使用同一份資料）
 * @returns true = 密碼正確；false = 密碼錯誤；throws = 非密碼錯誤
 */
export async function testPdfPassword(
  arrayBuffer: ArrayBuffer,
  password: string
): Promise<boolean> {
  const pdfjs = await getPdfjsLib();
  let task: PdfJsType.PDFDocumentLoadingTask | null = null;
  try {
    task = pdfjs.getDocument({ data: arrayBuffer.slice(0), password });
    const doc = await task.promise;
    doc.destroy();
    return true;
  } catch (e: unknown) {
    const err = e as Record<string, unknown>;
    // PasswordException code 1 = NEED_PASSWORD (no password given)
    // PasswordException code 2 = INCORRECT_PASSWORD
    if (err?.["name"] === "PasswordException") return false;
    throw e;
  } finally {
    task?.destroy?.();
  }
}

/**
 * 從 File 載入 PDF，並產生每一頁的預覽與尺寸資訊，支援載入指定頁碼範圍
 */
export async function loadPdfPages(
  file: File,
  fileId: string,
  targetPageIndices?: number[],
  password?: string
): Promise<PdfPageInfo[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfjs = await getPdfjsLib();
  
  // 載入 PDF 文件進行渲染（若有密碼則傳入）
  const loadingTask = pdfjs.getDocument({ data: arrayBuffer, password: password ?? "" });
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
  /** 各 fileId 對應的開啟密碼（加密 PDF 才需要） */
  filePasswordsMap?: Record<string, string>;
  /** 匯出 PDF 的密碼：字串 = 加密，undefined/null = 不加密 */
  outputPassword?: string | null;
}

/**
 * 根據使用者編輯操作，重組、旋轉、裁切 PDF 並壓印簽名，最後導出新 PDF Blob
 * 若原始 PDF 有密碼保護，會使用 filePasswordsMap 解密，匯出結果不含密碼（= 解除保護）
 */
export async function exportPdf({
  filesMap,
  pages,
  signatures,
  savedSignatures,
  filePasswordsMap = {},
  outputPassword,
}: ExportPdfParams): Promise<Blob> {
  // 1. 載入 pdf-lib 文件 (無視加密供結構讀取) 與 pdfjs 文件 (用密碼解密供高解析度重繪)
  const loadedDocsMap: Record<string, PDFDocument> = {};
  const pdfjsDocsMap: Record<string, any> = {};

  for (const [fileId, fileObj] of Object.entries(filesMap)) {
    const bytes = await fileObj.arrayBuffer();
    loadedDocsMap[fileId] = await PDFDocument.load(bytes, {
      ignoreEncryption: true,
    });

    // 如果該檔案有開啟密碼，使用 pdfjs-dist 加載解密後的文件
    const password = filePasswordsMap[fileId];
    if (password !== undefined) {
      const pdfjs = await getPdfjsLib();
      const loadingTask = pdfjs.getDocument({ data: bytes.slice(0), password });
      pdfjsDocsMap[fileId] = await loadingTask.promise;
    }
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
    const pdfjsDoc = pdfjsDocsMap[pageConfig.fileId];

    let targetPage: any;
    let pageW = pageConfig.width;
    let pageH = pageConfig.height;

    if (pdfjsDoc) {
      // 🌟 加密 PDF 解密導出：透過 PDF.js 將解密頁面渲染為 2.0x 高解析度圖像繪入新頁面 (防止內容空白)
      const pdfjsPage = await pdfjsDoc.getPage(pageConfig.sourcePageIndex + 1);
      const viewport = pdfjsPage.getViewport({ scale: 2.0 });

      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        await pdfjsPage.render({ canvasContext: ctx, viewport }).promise;
      }

      const imgDataUrl = canvas.toDataURL("image/jpeg", 0.92);
      const base64Data = imgDataUrl.split(",")[1];
      const imgBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

      const bgImg = await newDoc.embedJpg(imgBytes);
      targetPage = newDoc.addPage([pageW, pageH]);
      targetPage.drawImage(bgImg, {
        x: 0,
        y: 0,
        width: pageW,
        height: pageH,
      });
    } else {
      // 🌟 未加密正常 PDF：保持 100% 原始向量品質與極小檔案體積
      if (!srcDoc) continue;
      const [copiedPage] = await newDoc.copyPages(srcDoc, [pageConfig.sourcePageIndex]);
      const size = copiedPage.getSize();
      pageW = size.width;
      pageH = size.height;
      targetPage = newDoc.addPage(copiedPage);
    }
    
    // A. 套用頁面旋轉
    if (pageConfig.rotation !== 0) {
      targetPage.setRotation(degrees(pageConfig.rotation));
    }
    
    // B. 套用頁面裁切 (CropBox)
    if (pageConfig.cropBox) {
      const { x: rx, y: ry, width: rw, height: rh } = pageConfig.cropBox;
      const cropX = rx * pageW;
      const cropW = rw * pageW;
      const cropH = rh * pageH;
      const cropY = pageH - (ry + rh) * pageH;
      
      targetPage.setCropBox(cropX, cropY, cropW, cropH);
    }
    
    // C. 壓印電子簽章 (Flatten)
    const pageSignatures = signatures.filter(sig => sig.pageId === pageConfig.id);
    
    for (const sig of pageSignatures) {
      const savedSig = savedSignatures.find(s => s.id === sig.signatureImageId);
      if (!savedSig) continue;
      
      if (!embeddedSignaturesMap[savedSig.id]) {
        const base64Data = savedSig.dataUrl.split(",")[1];
        const imgBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
        const embeddedImg = await newDoc.embedPng(imgBytes);
        embeddedSignaturesMap[savedSig.id] = embeddedImg;
      }
      
      const embeddedImg = embeddedSignaturesMap[savedSig.id];
      
      const sigX = sig.x * pageW;
      const sigW = sig.width * pageW;
      const sigH = sig.height * pageH;
      const sigY = pageH - (sig.y + sig.height) * pageH;
      
      targetPage.drawImage(embeddedImg, {
        x: sigX,
        y: sigY,
        width: sigW,
        height: sigH,
      });
    }
  }
  
  // 5. 輸出 PDF 位元組並按需加密
  const pdfBytes = await newDoc.save();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let finalBytes: any;
  if (outputPassword) {
    finalBytes = await encryptPDF(pdfBytes, outputPassword, outputPassword);
  } else {
    finalBytes = pdfBytes;
  }

  return new Blob([finalBytes.buffer as ArrayBuffer], { type: "application/pdf" });
}
