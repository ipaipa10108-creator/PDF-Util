import React, { useState, useRef } from "react";
import { X, FileText, Check, FilePlus2, AlertCircle } from "lucide-react";
import { PDFDocument } from "pdf-lib";

export interface InsertModalProps {
  mainPdfTotalPages: number;
  onClose: () => void;
  onConfirmInsert: (file: File, selectedPageIndices: number[], insertAfterPageIndex: number) => Promise<void>;
}

export function InsertModal({
  mainPdfTotalPages,
  onClose,
  onConfirmInsert,
}: InsertModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  // 插入參數設定
  const [pageOption, setPageOption] = useState<"all" | "custom">("all");
  const [customRange, setCustomRange] = useState<string>("");
  const [insertPosition, setInsertPosition] = useState<number>(mainPdfTotalPages); // 預設插入到最後一頁後
  const [rangeError, setRangeError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type !== "application/pdf") {
        alert("請選擇 PDF 格式的檔案。");
        return;
      }
      
      setIsLoading(true);
      try {
        const arrayBuffer = await selectedFile.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        const pagesCount = pdfDoc.getPageCount();
        
        setFile(selectedFile);
        setTotalPages(pagesCount);
        setCustomRange(`1-${pagesCount}`); // 預設填入全部範圍
        setRangeError(null);
      } catch (error) {
        console.error("Error reading inserted PDF", error);
        alert("無法讀取此 PDF 檔案，請確保檔案未受損且無密碼保護。");
      } finally {
        setIsLoading(false);
      }
    }
  };

  // 解析自訂頁碼範圍
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
      throw new Error("請輸入要插入的頁碼");
    }
    
    return Array.from(pages).sort((a, b) => a - b);
  };

  const handleConfirm = async () => {
    if (!file) return;

    let selectedIndices: number[] = [];
    
    if (pageOption === "all") {
      selectedIndices = Array.from({ length: totalPages }, (_, idx) => idx);
    } else {
      try {
        selectedIndices = parsePageRange(customRange, totalPages);
        setRangeError(null);
      } catch (err) {
        setRangeError(err instanceof Error ? err.message : "格式錯誤");
        return;
      }
    }

    setIsLoading(true);
    try {
      await onConfirmInsert(file, selectedIndices, insertPosition);
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
      <div className="flex h-full max-h-[80vh] w-full max-w-lg flex-col rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        
        {/* 標頭 */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-4">
          <div className="flex items-center gap-2 text-indigo-500">
            <FilePlus2 className="h-5 w-5" />
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              插入外部 PDF 文件
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
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          
          {/* 檔案上傳 */}
          {!file ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500/60 rounded-xl p-8 text-center cursor-pointer transition-all duration-300 bg-slate-50/50 dark:bg-slate-950/10 min-h-[160px]"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                className="hidden"
              />
              <FilePlus2 className="h-10 w-10 text-slate-400 mb-3 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                選擇要插入的 PDF 文件
              </span>
            </div>
          ) : (
            /* 已選擇的檔案資訊與插入設定 */
            <div className="space-y-5">
              {/* 檔案卡片 */}
              <div className="flex items-center justify-between rounded-xl border border-indigo-100/50 dark:border-indigo-950/40 bg-indigo-50/20 dark:bg-indigo-950/10 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500 text-white shadow-md">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 max-w-[200px] truncate">
                      {file.name}
                    </h4>
                    <p className="text-[10px] text-slate-400">共 {totalPages} 頁</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setFile(null);
                    setTotalPages(0);
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
            {isLoading ? "處理中..." : <><Check className="h-4 w-4" /> 確認插入</>}
          </button>
        </div>

      </div>
    </div>
  );
}
