import React, { useState, useRef, useEffect } from "react";
import { X, FileText, Check, FilePlus2, AlertCircle, Loader2, Image as ImageIcon } from "lucide-react";
import { PDFDocument } from "pdf-lib";
import { 
  loadPdfPages, 
  PdfPageInfo, 
  isImageFile, 
  isPdfFile, 
  convertImageToPdfFile, 
  convertImagesToSinglePdfFile 
} from "@/lib/pdf-utils";

export interface InsertModalProps {
  mainPdfTotalPages: number;
  onClose: () => void;
  onConfirmInsert: (file: File, selectedPageIndices: number[], insertAfterPageIndex: number) => Promise<void>;
  presetFile?: File | null; // 支援從外部拖放傳入的預設檔案
}

export function InsertModal({
  mainPdfTotalPages,
  onClose,
  onConfirmInsert,
  presetFile,
}: InsertModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [originalFileNames, setOriginalFileNames] = useState<string>("");
  const [isImageSource, setIsImageSource] = useState<boolean>(false);
  
  // 插入參數設定
  const [pageOption, setPageOption] = useState<"all" | "custom">("all");
  const [customRange, setCustomRange] = useState<string>("");
  const [insertPosition, setInsertPosition] = useState<number>(mainPdfTotalPages); // 預設插入到最後一頁後
  const [rangeError, setRangeError] = useState<string | null>(null);

  // 視覺化選頁功能狀態
  const [renderPreviews, setRenderPreviews] = useState<boolean>(false);
  const [previewPages, setPreviewPages] = useState<PdfPageInfo[]>([]);
  const [selectedPageIndices, setSelectedPageIndices] = useState<Set<number>>(new Set());

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 處理檔案加載並讀取總頁數（支援單/多個 PDF 或圖檔）
  const processIncomingFiles = async (incomingFiles: File[]) => {
    if (!incomingFiles || incomingFiles.length === 0) return;
    setIsLoading(true);
    try {
      const validFiles = incomingFiles.filter(f => isPdfFile(f) || isImageFile(f));
      if (validFiles.length === 0) {
        alert("請選擇 PDF 文件或常見圖檔格式 (JPG, PNG, WebP, GIF, BMP 等)。");
        return;
      }

      let processedPdf: File;
      const allImages = validFiles.every(f => isImageFile(f));
      const hasImage = validFiles.some(f => isImageFile(f));

      if (allImages) {
        // 全是圖片
        setIsImageSource(true);
        if (validFiles.length === 1) {
          setOriginalFileNames(validFiles[0].name);
          processedPdf = await convertImageToPdfFile(validFiles[0]);
        } else {
          setOriginalFileNames(`${validFiles.length} 張圖片 (${validFiles[0].name} 等)`);
          processedPdf = await convertImagesToSinglePdfFile(validFiles, `merged_${validFiles.length}_images.pdf`);
        }
      } else if (validFiles.length === 1 && isPdfFile(validFiles[0])) {
        // 單一 PDF
        setIsImageSource(false);
        setOriginalFileNames(validFiles[0].name);
        processedPdf = validFiles[0];
      } else {
        // 混合多個檔案或多個 PDF
        setIsImageSource(hasImage);
        setOriginalFileNames(`${validFiles.length} 個檔案 (${validFiles[0].name} 等)`);
        // 逐一轉為 PDF 並合併
        const pdfDoc = await PDFDocument.create();
        for (const item of validFiles) {
          if (isImageFile(item)) {
            const singlePdf = await convertImageToPdfFile(item);
            const bytes = await singlePdf.arrayBuffer();
            const loaded = await PDFDocument.load(bytes);
            const copiedPages = await pdfDoc.copyPages(loaded, loaded.getPageIndices());
            copiedPages.forEach(p => pdfDoc.addPage(p));
          } else {
            const bytes = await item.arrayBuffer();
            const loaded = await PDFDocument.load(bytes, { ignoreEncryption: true });
            const copiedPages = await pdfDoc.copyPages(loaded, loaded.getPageIndices());
            copiedPages.forEach(p => pdfDoc.addPage(p));
          }
        }
        const mergedBytes = await pdfDoc.save();
        processedPdf = new File([mergedBytes.buffer as ArrayBuffer], "merged_insert.pdf", { type: "application/pdf" });
      }

      const arrayBuffer = await processedPdf.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const pagesCount = pdfDoc.getPageCount();

      setFile(processedPdf);
      setTotalPages(pagesCount);
      setCustomRange(`1-${pagesCount}`);
      setRangeError(null);

      // 重置預覽
      setPreviewPages([]);
      setRenderPreviews(false);
      setSelectedPageIndices(new Set());
    } catch (error) {
      console.error("Error processing inserted files", error);
      alert("無法讀取或處理此檔案，請確保檔案格式正確且無受損。\n詳細資訊：" + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsLoading(false);
    }
  };

  // 監聽外部拖入預設檔案的變化
  useEffect(() => {
    if (presetFile) {
      processIncomingFiles([presetFile]);
    }
  }, [presetFile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);
      processIncomingFiles(selectedFiles);
    }
  };

  // 讀取預覽縮圖畫面
  const loadPreviews = async (targetFile: File) => {
    setIsLoading(true);
    try {
      const tempFileId = `temp-insert-${Date.now()}`;
      const loaded = await loadPdfPages(targetFile, tempFileId);
      setPreviewPages(loaded);
      
      // 預設將所有頁面勾選
      const allSet = new Set(Array.from({ length: loaded.length }, (_, i) => i));
      setSelectedPageIndices(allSet);
    } catch (err) {
      console.error("Error generating page previews", err);
      alert("無法解析並載入 PDF 頁面預覽。");
      setRenderPreviews(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTogglePreviews = async (checked: boolean) => {
    setRenderPreviews(checked);
    if (checked && previewPages.length === 0 && file) {
      await loadPreviews(file);
    }
  };

  // 點選預覽縮圖切換選取狀態
  const handleTogglePreviewPage = (idx: number) => {
    const nextSet = new Set(selectedPageIndices);
    if (nextSet.has(idx)) {
      nextSet.delete(idx);
    } else {
      nextSet.add(idx);
    }
    setSelectedPageIndices(nextSet);
    
    // 同時更新 customRange 的文字框以保持顯示一致 (例: "1, 3, 4")
    const sortedArray = Array.from(nextSet).sort((a, b) => a - b).map(i => i + 1);
    setCustomRange(sortedArray.join(", "));
  };

  // 解析自訂頁碼範圍 (純文字輸入解析)
  const parsePageRange = (rangeStr: string, maxPages: number): number[] => {
    const pages = new Set<number>();
    const parts = rangeStr.split(",");
    
    for (const part of parts) {
      const cleanPart = part.trim();
      if (!cleanPart) continue;
      
      if (/^\d+$/.test(cleanPart)) {
        const pageNum = parseInt(cleanPart, 10);
        if (pageNum >= 1 && pageNum <= maxPages) {
          pages.add(pageNum - 1); // 轉為 0-based index
        } else {
          throw new Error(`頁碼 ${pageNum} 超出有效範圍 (1-${maxPages})`);
        }
      } else if (/^\d+-\d+$/.test(cleanPart)) {
        const [startStr, endStr] = cleanPart.split("-");
        const start = parseInt(startStr, 10);
        const end = parseInt(endStr, 10);
        
        if (start < 1 || end < 1) {
          throw new Error("頁碼必須大於或等於 1");
        }
        if (start > end) {
          throw new Error(`範圍起點 ${start} 不能大於終點 ${end}`);
        }
        if (end > maxPages) {
          throw new Error(`範圍終點 ${end} 超出有效範圍 (1-${maxPages})`);
        }
        
        for (let p = start; p <= end; p++) {
          pages.add(p - 1);
        }
      } else {
        throw new Error(`無效的輸入格式: "${cleanPart}"`);
      }
    }
    
    if (pages.size === 0) {
      throw new Error("請選擇或輸入要插入的頁碼");
    }
    
    return Array.from(pages).sort((a, b) => a - b);
  };

  const handleConfirm = async () => {
    if (!file) return;

    let selectedIndicesList: number[] = [];
    
    if (pageOption === "all") {
      selectedIndicesList = Array.from({ length: totalPages }, (_, idx) => idx);
    } else {
      if (renderPreviews && previewPages.length > 0) {
        // 如果有開啟視覺化預覽，直接使用勾選集合
        if (selectedPageIndices.size === 0) {
          alert("請至少勾選一頁要插入的頁面。");
          return;
        }
        selectedIndicesList = Array.from(selectedPageIndices).sort((a, b) => a - b);
      } else {
        // 否則，解析文字框輸入
        try {
          selectedIndicesList = parsePageRange(customRange, totalPages);
          setRangeError(null);
        } catch (err) {
          setRangeError(err instanceof Error ? err.message : "格式錯誤");
          return;
        }
      }
    }

    setIsLoading(true);
    try {
      await onConfirmInsert(file, selectedIndicesList, insertPosition);
      onClose();
    } catch (error) {
      console.error("Error inserting PDF", error);
      alert("插入 PDF 時發生錯誤，請重試。");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm animate-fade-in">
      <div className="flex h-full max-h-[85vh] w-full max-w-xl flex-col rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        
        {/* 標頭 */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-4">
          <div className="flex items-center gap-2 text-indigo-500">
            {isImageSource ? <ImageIcon className="h-5 w-5" /> : <FilePlus2 className="h-5 w-5" />}
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              插入外部檔案 (PDF 或圖檔)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
            disabled={isLoading}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 內容區 */}
        <div className="flex-1 p-6 overflow-y-auto space-y-5">
          
          {/* 檔案上傳 */}
          {!file ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500/60 rounded-xl p-8 text-center cursor-pointer transition-all duration-300 bg-slate-50/50 dark:bg-slate-950/10 min-h-[160px]"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf,image/*,.jpg,.jpeg,.png,.webp,.bmp,.gif"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="flex items-center gap-2 mb-3">
                <FilePlus2 className="h-8 w-8 text-indigo-400 group-hover:scale-110 transition-transform" />
                <ImageIcon className="h-8 w-8 text-sky-400 group-hover:scale-110 transition-transform" />
              </div>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                選擇要插入的 PDF 文件或圖檔
              </span>
              <p className="text-[11px] text-slate-400 max-w-sm">
                支援 PDF 文件與 JPG、PNG、WebP 等圖檔格式，支援單圖或多張圖檔同時選取合併插入
              </p>
            </div>
          ) : (
            /* 已選擇的檔案資訊與插入設定 */
            <div className="space-y-5">
              {/* 檔案卡片 */}
              <div className="flex items-center justify-between rounded-xl border border-indigo-100/50 dark:border-indigo-950/40 bg-indigo-50/20 dark:bg-indigo-950/10 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500 text-white shadow-md">
                    {isImageSource ? <ImageIcon className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 max-w-[240px] truncate" title={originalFileNames || file.name}>
                      {originalFileNames || file.name}
                    </h4>
                    <p className="text-[10px] text-slate-400 font-semibold">
                      {isImageSource ? "圖檔已自動轉為 PDF 頁面 · " : ""}共 {totalPages} 頁
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setFile(null);
                    setTotalPages(0);
                    setOriginalFileNames("");
                    setIsImageSource(false);
                    setPreviewPages([]);
                  }}
                  className="text-xs text-rose-500 font-bold hover:underline"
                  disabled={isLoading}
                >
                  重新選擇
                </button>
              </div>

              {/* 頁面選擇選項 */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  要插入的頁面：
                </label>
                
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                    <input
                      type="radio"
                      name="pageOption"
                      checked={pageOption === "all"}
                      onChange={() => {
                        setPageOption("all");
                        setRangeError(null);
                      }}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>全部頁面</span>
                  </label>
                  
                  <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                    <input
                      type="radio"
                      name="pageOption"
                      checked={pageOption === "custom"}
                      onChange={() => setPageOption("custom")}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>指定部分頁面</span>
                  </label>
                </div>

                {pageOption === "custom" && (
                  <div className="space-y-3.5 border-t border-slate-100 dark:border-slate-800 pt-3">
                    
                    {/* 核取方塊：讀入插入PDF畫面 */}
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={renderPreviews}
                        onChange={(e) => handleTogglePreviews(e.target.checked)}
                        className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500"
                        disabled={isLoading}
                      />
                      <span>讀入插入 PDF 畫面 (視覺化點選頁面)</span>
                    </label>

                    {/* 視覺化預覽區域 */}
                    {renderPreviews && (
                      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 p-3 space-y-3">
                        {isLoading && previewPages.length === 0 ? (
                          <div className="flex items-center justify-center py-8 gap-2 text-xs text-indigo-500 font-semibold">
                            <Loader2 className="h-4.5 w-4.5 animate-spin" />
                            <span>正在讀取預覽畫面...</span>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold px-1 border-b border-slate-100 dark:border-slate-800/80 pb-2">
                              <span>已勾選：{selectedPageIndices.size} 頁</span>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => setSelectedPageIndices(new Set(Array.from({ length: totalPages }, (_, i) => i)))}
                                  className="text-indigo-500 hover:underline"
                                >
                                  全選
                                </button>
                                <span>|</span>
                                <button
                                  type="button"
                                  onClick={() => setSelectedPageIndices(new Set())}
                                  className="text-slate-500 hover:underline"
                                >
                                  清空
                                </button>
                              </div>
                            </div>

                            {/* 預覽縮圖網格 (3列，最大高度限制) */}
                            <div className="grid grid-cols-3 gap-2.5 max-h-[190px] overflow-y-auto pr-1">
                              {previewPages.map((page, idx) => {
                                const isChecked = selectedPageIndices.has(idx);
                                return (
                                  <div
                                    key={page.id}
                                    onClick={() => handleTogglePreviewPage(idx)}
                                    className={`relative flex flex-col items-center rounded-lg border p-1.5 cursor-pointer bg-white dark:bg-slate-900 transition-all select-none
                                      ${isChecked 
                                        ? "border-indigo-500 ring-1 ring-indigo-500" 
                                        : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                                      }
                                    `}
                                  >
                                    {/* Checkbox */}
                                    <div className={`absolute top-1 left-1 z-10 flex h-4.5 w-4.5 items-center justify-center rounded border text-white transition-all
                                      ${isChecked ? "bg-indigo-500 border-indigo-500" : "border-slate-300 dark:border-slate-700 bg-white/90"}
                                    `}>
                                      {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                                    </div>
                                    
                                    {/* 頁碼 */}
                                    <span className="absolute top-1 right-1 z-10 rounded bg-slate-900/60 text-white font-bold px-1 py-0.5 text-[8.5px]">
                                      {idx + 1}
                                    </span>

                                    {/* 縮圖 */}
                                    <div className="w-full aspect-[3/4] overflow-hidden rounded bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img
                                        src={page.thumbnailUrl}
                                        alt={`Temp Page ${idx + 1}`}
                                        className="max-w-full max-h-full object-contain pointer-events-none select-none"
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {/* 當沒有開啟預覽時，顯示文字輸入框 */}
                    {!renderPreviews && (
                      <div className="space-y-1.5">
                        <input
                          type="text"
                          value={customRange}
                          onChange={(e) => setCustomRange(e.target.value)}
                          placeholder={`請輸入頁碼範圍，例如：1, 3-5`}
                          className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent px-3 py-2 text-xs text-slate-800 dark:text-slate-250 placeholder-slate-400 focus:border-indigo-500 focus:outline-none"
                        />
                        <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
                          <span>可使用逗號分隔，或使用減號表示頁碼範圍。</span>
                          <span>最大頁數: {totalPages}</span>
                        </div>
                        {rangeError && (
                          <div className="flex items-center gap-1 text-[10px] text-rose-500 font-bold mt-1">
                            <AlertCircle className="h-3.5 w-3.5" />
                            <span>{rangeError}</span>
                          </div>
                        )}
                      </div>
                    )}

                  </div>
                )}
              </div>

              {/* 插入位置選項 */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  插入位置：
                </label>
                <select
                  value={insertPosition}
                  onChange={(e) => setInsertPosition(parseInt(e.target.value, 10))}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-800 dark:text-slate-250 focus:border-indigo-500 focus:outline-none"
                >
                  <option value={0}>最前面 (第 1 頁之前)</option>
                  {Array.from({ length: mainPdfTotalPages }, (_, idx) => (
                    <option key={idx + 1} value={idx + 1}>
                      第 {idx + 1} 頁之後 {idx + 1 === mainPdfTotalPages ? "(最後面)" : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

        </div>

        {/* 底部按鈕 */}
        <div className="border-t border-slate-200 dark:border-slate-800 px-6 py-4 bg-white dark:bg-slate-900 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="h-9 px-4 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 text-xs font-semibold text-slate-600 dark:text-slate-300 transition-colors"
            disabled={isLoading}
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading || !file}
            className="flex items-center gap-1.5 h-9 px-4 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white font-semibold text-xs transition-colors shadow-md shadow-indigo-500/20 disabled:opacity-50"
          >
            {isLoading ? (
              <div className="flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>處理中...</span>
              </div>
            ) : (
              <><Check className="h-4 w-4" /> 確認插入</>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
