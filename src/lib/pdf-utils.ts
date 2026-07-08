import type * as PdfJsType from "pdfjs-dist";
import { PDFDocument, degrees } from "pdf-lib";

export interface PdfPageInfo {
  pageIndex: number;
  pageNumber: number;
  thumbnailUrl: string;
  width: number;
  height: number;
  rotation: number; // 0, 90, 180, 270
  isDeleted: boolean;
  cropBox: { x: number; y: number; width: number; height: number } | null; // 相對比例 (0~1)
}

export interface PlacedSignature {
  id: string;
  pageIndex: number;
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
    // 設定 PDF.js Worker，使用相符版本的 CDN 以支援無伺服器靜態部署
    pdfjs.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.8.69/pdf.worker.min.mjs";
    pdfjsInstance = pdfjs;
  }
  return pdfjsInstance;
}

/**
 * 從 File 載入 PDF，並產生每一頁的預覽與尺寸資訊
 */
export async function loadPdfPages(file: File): Promise<PdfPageInfo[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfjs = await getPdfjsLib();
  
  // 載入 PDF 文件進行渲染
  const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;
  
  const pagesInfo: PdfPageInfo[] = [];

  for (let i = 1; i <= numPages; i++) {
    const page = await pdfDoc.getPage(i);
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
      pageIndex: i - 1,
      pageNumber: i,
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
  originalFile: File;
  pages: PdfPageInfo[];
  signatures: PlacedSignature[];
  savedSignatures: SavedSignature[];
}

/**
 * 根據使用者編輯操作，重組、旋轉、裁切 PDF 並壓印簽名，最後導出新 PDF Blob
 */
export async function exportPdf({
  originalFile,
  pages,
  signatures,
  savedSignatures,
}: ExportPdfParams): Promise<Blob> {
  const originalBytes = await originalFile.arrayBuffer();
  
  // 1. 載入原始 PDF
  const srcDoc = await PDFDocument.load(originalBytes);
  
  // 2. 建立全新的 PDF 文件
  const newDoc = await PDFDocument.create();
  
  // 3. 過濾掉標記為被刪除的頁面，只拷貝需要的頁面
  const activePages = pages.filter(p => !p.isDeleted);
  const activeIndices = activePages.map(p => p.pageIndex);
  
  if (activeIndices.length === 0) {
    throw new Error("無法導出空的文件，請至少保留一頁。");
  }
  
  // 拷貝指定頁面到新 PDF
  const copiedPages = await newDoc.copyPages(srcDoc, activeIndices);
  
  // 建立簽名圖片的嵌入快取，避免重複嵌入相同的圖片
  const embeddedSignaturesMap: Record<string, any> = {};
  
  // 4. 逐頁進行編輯套用 (旋轉、裁切、電子簽章)
  for (let i = 0; i < activePages.length; i++) {
    const sourcePageConfig = activePages[i];
    const newPage = copiedPages[i];
    
    // 取得拷貝後頁面的實際物理尺寸
    const { width: pageW, height: pageH } = newPage.getSize();
    
    // A. 套用頁面旋轉
    if (sourcePageConfig.rotation !== 0) {
      // 這裡採用絕對角度，而不是相對累加角度
      newPage.setRotation(degrees(sourcePageConfig.rotation));
    }
    
    // B. 套用頁面裁切 (CropBox)
    if (sourcePageConfig.cropBox) {
      const { x: rx, y: ry, width: rw, height: rh } = sourcePageConfig.cropBox;
      // 換算成 PDF 內部 points 座標 (注意 PDF 的原點是在左下角，而 Canvas 在左上角)
      const cropX = rx * pageW;
      const cropW = rw * pageW;
      const cropH = rh * pageH;
      // PDF y_pdf = H_pdf - (y_canvas + h_canvas)
      const cropY = pageH - (ry + rh) * pageH;
      
      newPage.setCropBox(cropX, cropY, cropW, cropH);
    }
    
    // C. 壓印電子簽章 (Flatten)
    // 找出所有放置在當前頁面的簽名 (注意：放置的 pageIndex 是原始頁面 index)
    const pageSignatures = signatures.filter(sig => sig.pageIndex === sourcePageConfig.pageIndex);
    
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
      
      newPage.drawImage(embeddedImg, {
        x: sigX,
        y: sigY,
        width: sigW,
        height: sigH,
      });
    }
    
    // 將編輯後的頁面加入新文件
    newDoc.addPage(newPage);
  }
  
  // 5. 輸出 PDF 位元組並打包為 Blob
  const pdfBytes = await newDoc.save();
  return new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
}
