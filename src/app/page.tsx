"use client";

import React, { useState, useEffect } from "react";
import confetti from "canvas-confetti";
import { ShieldCheck, Lock, Share2, AlertTriangle, FileText, CheckCircle2, ChevronRight, LayoutGrid, RotateCw, Trash2, FileSignature, FilePlus2 } from "lucide-react";
import { Header } from "@/components/pdf-suite/header";
import { Dropzone } from "@/components/pdf-suite/dropzone";
import { ThumbnailGrid } from "@/components/pdf-suite/thumbnail-grid";
import { CropModal } from "@/components/pdf-suite/crop-modal";
import { SignatureModal } from "@/components/pdf-suite/signature-modal";
import { InsertModal } from "@/components/pdf-suite/insert-modal";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { 
  PdfPageInfo, 
  PlacedSignature, 
  SavedSignature, 
  loadPdfPages, 
  exportPdf 
} from "@/lib/pdf-utils";

interface WebShareNavigator {
  share?: (data: ShareData) => Promise<void>;
  canShare?: (data: ShareData) => boolean;
}

export default function MainPage() {
  const [file, setFile] = useState<File | null>(null);
  const [filesMap, setFilesMap] = useState<Record<string, File>>({});
  const [isInsertModalOpen, setIsInsertModalOpen] = useState(false);
  const [pages, setPages] = useState<PdfPageInfo[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [placedSignatures, setPlacedSignatures] = useState<PlacedSignature[]>([]);
  const [activeSignatureId, setActiveSignatureId] = useState<string | null>(null);
  
  // 使用本機儲存快取電子簽章
  const [savedSignatures, setSavedSignatures] = useLocalStorage<SavedSignature[]>(
    "local_pdf_saved_signatures",
    []
  );

  // 狀態控制
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [cropPageIndex, setCropPageIndex] = useState<number | null>(null);
  
  // 緩存最近一次導出成功的 Blob，以供 Web Share 分享使用
  const [exportedBlob, setExportedBlob] = useState<Blob | null>(null);
  const [canShare, setCanShare] = useState(false);
  
  // 深色模式狀態
  const [isDarkMode, setIsDarkMode] = useState(false);

  // 初始化深色模式設定
  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark") || 
                   localStorage.getItem("theme") === "dark" ||
                   (!("theme" in localStorage) && window.matchMedia("(prefers-color-scheme: dark)").matches);
    
    setIsDarkMode(isDark);
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    // 檢查 Web Share API 支援度
    const nav = navigator as unknown as WebShareNavigator;
    if (typeof navigator !== "undefined" && nav.share && nav.canShare) {
      setCanShare(true);
    }
  }, []);

  const handleToggleDarkMode = () => {
    const nextDark = !isDarkMode;
    setIsDarkMode(nextDark);
    if (nextDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  // 檔案選取處理
  const handleFileSelect = async (selectedFile: File) => {
    setIsLoading(true);
    setExportedBlob(null);
    setPlacedSignatures([]);
    setSelectedIndices(new Set());
    
    try {
      setFile(selectedFile);
      const fileId = "file-main";
      setFilesMap({ [fileId]: selectedFile });
      const loadedPages = await loadPdfPages(selectedFile, fileId);
      setPages(loadedPages);
    } catch (error) {
      console.error("Error loading PDF file", error);
      alert("無法讀取或解析 PDF 文件，請確保該檔案為標準且未受密碼保護的 PDF。\n詳細錯誤資訊：" + (error instanceof Error ? error.message : String(error)));
      setFile(null);
    } finally {
      setIsLoading(false);
    }
  };

  // 處理 PDF 頁面插入邏輯
  const handleConfirmInsert = async (
    insertedFile: File,
    selectedIndices: number[],
    insertAfterPosition: number
  ) => {
    setIsLoading(true);
    try {
      const insertFileId = `file-insert-${Date.now()}`;
      // 1. 將新文件加入 filesMap 快取中
      setFilesMap(prev => ({ ...prev, [insertFileId]: insertedFile }));
      
      // 2. 加載新選定頁面的預覽與規格
      const newPages = await loadPdfPages(insertedFile, insertFileId, selectedIndices);
      
      // 3. 在指定頁碼位置插入新頁面，並重新排序 index 與 pageNumber
      setPages(prevPages => {
        const updated = [...prevPages];
        updated.splice(insertAfterPosition, 0, ...newPages);
        return updated.map((p, idx) => ({
          ...p,
          pageIndex: idx,
          pageNumber: idx + 1,
        }));
      });

      // 清除選取與導出快取
      setSelectedIndices(new Set());
      setExportedBlob(null);
    } catch (error) {
      console.error("Error inserting pages", error);
      alert("無法插入 PDF 頁面，詳細原因：" + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsLoading(false);
    }
  };

  // 快速選取方法
  const handleSelectAll = () => {
    const all = new Set(pages.filter(p => !p.isDeleted).map(p => p.pageIndex));
    setSelectedIndices(all);
  };

  const handleSelectOdds = () => {
    const odds = new Set(pages.filter(p => !p.isDeleted && p.pageNumber % 2 !== 0).map(p => p.pageIndex));
    setSelectedIndices(odds);
  };

  const handleSelectEvens = () => {
    const evens = new Set(pages.filter(p => !p.isDeleted && p.pageNumber % 2 === 0).map(p => p.pageIndex));
    setSelectedIndices(evens);
  };

  const handleSelectNone = () => {
    setSelectedIndices(new Set());
  };

  const handleToggleSelect = (pageIndex: number) => {
    const nextSelected = new Set(selectedIndices);
    if (nextSelected.has(pageIndex)) {
      nextSelected.delete(pageIndex);
    } else {
      nextSelected.add(pageIndex);
    }
    setSelectedIndices(nextSelected);
  };

  // 頁面旋轉與刪除
  const handleRotateSelected = (degrees: number) => {
    const updatedPages = pages.map(page => {
      if (selectedIndices.has(page.pageIndex)) {
        return { ...page, rotation: (page.rotation + degrees) % 360 };
      }
      return page;
    });
    setPages(updatedPages);
    setSelectedIndices(new Set()); // 旋轉完後重設選取
    setExportedBlob(null); // 清除導出快取
  };

  const handleRotateSinglePage = (pageIndex: number, degrees: number) => {
    const updatedPages = pages.map(page => {
      if (page.pageIndex === pageIndex) {
        return { ...page, rotation: (page.rotation + degrees) % 360 };
      }
      return page;
    });
    setPages(updatedPages);
    setExportedBlob(null);
  };

  const handleDeleteSelected = () => {
    const updatedPages = pages.map(page => {
      if (selectedIndices.has(page.pageIndex)) {
        return { ...page, isDeleted: true };
      }
      return page;
    });
    setPages(updatedPages);
    
    // 從被刪除的頁面中移出所有已放置的簽名 (透過 pageId 進行對齊過濾)
    const deletedPageIds = new Set(pages.filter(p => selectedIndices.has(p.pageIndex)).map(p => p.id));
    const filteredSignatures = placedSignatures.filter(sig => !deletedPageIds.has(sig.pageId));
    setPlacedSignatures(filteredSignatures);
    
    setSelectedIndices(new Set());
    setExportedBlob(null);
  };

  const handleDeleteSinglePage = (pageIndex: number) => {
    const updatedPages = pages.map(page => {
      if (page.pageIndex === pageIndex) {
        return { ...page, isDeleted: true };
      }
      return page;
    });
    setPages(updatedPages);
    
    // 移出該頁面已放置的簽名
    const targetPage = pages.find(p => p.pageIndex === pageIndex);
    const filteredSignatures = targetPage 
      ? placedSignatures.filter(sig => sig.pageId !== targetPage.id) 
      : placedSignatures;
    setPlacedSignatures(filteredSignatures);
    
    // 從選取集合中移出
    const nextSelected = new Set(selectedIndices);
    nextSelected.delete(pageIndex);
    setSelectedIndices(nextSelected);
    
    setExportedBlob(null);
  };

  const handleRestorePage = (pageIndex: number) => {
    const updatedPages = pages.map(page => {
      if (page.pageIndex === pageIndex) {
        return { ...page, isDeleted: false };
      }
      return page;
    });
    setPages(updatedPages);
    setExportedBlob(null);
  };

  // 裁切套用
  const handleApplyCrop = (
    pageIndex: number,
    cropBox: { x: number; y: number; width: number; height: number } | null,
    applyToAll: boolean
  ) => {
    const updatedPages = pages.map(page => {
      if (applyToAll || page.pageIndex === pageIndex) {
        return { ...page, cropBox };
      }
      return page;
    });
    setPages(updatedPages);
    setCropPageIndex(null);
    setExportedBlob(null);
  };

  // 簽名管理
  const handleAddSignature = (sig: SavedSignature) => {
    setSavedSignatures([...savedSignatures, sig]);
  };

  const handleDeleteSignature = (id: string) => {
    setSavedSignatures(savedSignatures.filter(s => s.id !== id));
  };

  const handleAddPlacedSignature = (sig: PlacedSignature) => {
    setPlacedSignatures([...placedSignatures, sig]);
    setActiveSignatureId(null); // 放置後取消啟用，方便使用者選取或拖曳
    setExportedBlob(null);
  };

  const handleUpdateSignatures = (updatedSigs: PlacedSignature[]) => {
    setPlacedSignatures(updatedSigs);
    setExportedBlob(null);
  };

  // 統一生成 PDF Blob 的邏輯，支援僅導出/分享被勾選的頁面
  const generatePdfBlob = async (): Promise<Blob | null> => {
    if (!file) return null;

    const hasSelection = selectedIndices.size > 0;
    
    // 如果有勾選某些頁面，則在導出時將未勾選的頁面標記為刪除 (不寫入最終 PDF)
    let pagesToExport = pages;
    if (hasSelection) {
      pagesToExport = pages.map(p => {
        if (!selectedIndices.has(p.pageIndex)) {
          return { ...p, isDeleted: true };
        }
        return p;
      });
    }

    return await exportPdf({
      filesMap,
      pages: pagesToExport,
      signatures: placedSignatures,
      savedSignatures,
    });
  };

  // 匯出 PDF
  const handleExport = async () => {
    if (!file) return;
    setIsExporting(true);
    
    try {
      const blob = await generatePdfBlob();
      if (!blob) return;

      setExportedBlob(blob);

      // 下載機制
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `edited_${file.name}`;
      a.click();
      URL.revokeObjectURL(url);

      // 觸發彩花特效
      confetti({
        particleCount: 110,
        spread: 80,
        origin: { y: 0.6 },
        colors: ["#6366f1", "#8b5cf6", "#a78bfa", "#ec4899"],
      });

    } catch (error) {
      console.error("Error exporting PDF", error);
      alert("導出 PDF 時發生錯誤: " + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsExporting(false);
    }
  };

  // Web Share 原生分享
  const handleShare = async () => {
    if (!file) return;
    setIsExporting(true); // 進入導出中狀態

    try {
      const blob = await generatePdfBlob();
      if (!blob) return;

      const fileToShare = new File([blob], `edited_${file.name}`, {
        type: "application/pdf",
      });

      const nav = navigator as unknown as WebShareNavigator;
      if (nav.canShare && nav.canShare({ files: [fileToShare] }) && nav.share) {
        await nav.share({
          files: [fileToShare],
          title: "分享您的 PDF 文件",
          text: selectedIndices.size > 0 
            ? `這是您勾選分享的 PDF 頁面 (${selectedIndices.size} 頁)。` 
            : "這是使用 Local PDF Suite 編輯並完成電子簽署的文件。",
        });
      } else {
        alert("此瀏覽器/系統不支援分享該 PDF 檔案。");
      }
    } catch (error) {
      console.error("Error calling navigator.share", error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleReset = () => {
    if (confirm("您確定要清除目前的文件嗎？所有未導出的修改將會遺失。")) {
      setFile(null);
      setFilesMap({});
      setPages([]);
      setSelectedIndices(new Set());
      setPlacedSignatures([]);
      setActiveSignatureId(null);
      setExportedBlob(null);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900 transition-colors duration-200 dark:bg-slate-950 dark:text-slate-50">
      
      {/* 頂部工具列 */}
      <Header
        fileName={file ? file.name : null}
        totalPages={pages.length}
        selectedCount={selectedIndices.size}
        onSelectAll={handleSelectAll}
        onSelectOdds={handleSelectOdds}
        onSelectEvens={handleSelectEvens}
        onSelectNone={handleSelectNone}
        onRotateSelected={handleRotateSelected}
        onDeleteSelected={handleDeleteSelected}
        onOpenSignatureModal={() => setIsSignatureModalOpen(true)}
        onOpenInsertModal={() => setIsInsertModalOpen(true)}
        onExport={handleExport}
        onShare={handleShare}
        onReset={handleReset}
        isExporting={isExporting}
        canShare={canShare}
        isDarkMode={isDarkMode}
        onToggleDarkMode={handleToggleDarkMode}
      />

      {/* 主要內容區 */}
      <main className="flex-1 flex flex-col justify-center">
        {!file ? (
          /* 上傳檔案前 */
          <Dropzone onFileSelect={handleFileSelect} isLoading={isLoading} />
        ) : (
          /* 載入檔案後 */
          <div className="flex-1 flex flex-col">
            
            {/* 提示資訊橫幅 */}
            <div className="bg-slate-100/50 dark:bg-slate-900/30 border-b border-slate-200/50 dark:border-slate-800/50 px-4 py-2 text-center text-xs font-semibold text-slate-500 dark:text-slate-400">
              {activeSignatureId ? (
                <div className="flex items-center justify-center gap-1.5 text-indigo-600 dark:text-indigo-400 animate-pulse">
                  <span>已選取簽章！請點擊下方的任何一頁縮圖，將其放置在您想要的位置。</span>
                  <button 
                    onClick={() => setActiveSignatureId(null)}
                    className="underline text-[10px] ml-1 opacity-80 hover:opacity-100"
                  >
                    取消放置
                  </button>
                </div>
              ) : (
                <span className="flex items-center justify-center gap-1">
                  <LayoutGrid className="h-3.5 w-3.5" />
                  <span>您可以在縮圖上勾選以進行批次旋轉或刪除，也可以點擊每一頁下方的「裁切」或頂部的「簽章」按鈕。</span>
                </span>
              )}
            </div>

            {/* 縮圖網格互動編輯區 */}
            <div className="flex-1 overflow-y-auto">
              <ThumbnailGrid
                pages={pages}
                selectedIndices={selectedIndices}
                placedSignatures={placedSignatures}
                savedSignatures={savedSignatures}
                activeSignatureId={activeSignatureId}
                onToggleSelect={handleToggleSelect}
                onRotatePage={handleRotateSinglePage}
                onDeletePage={handleDeleteSinglePage}
                onRestorePage={handleRestorePage}
                onOpenCropModal={(idx) => setCropPageIndex(idx)}
                onUpdateSignatures={handleUpdateSignatures}
                onAddPlacedSignature={handleAddPlacedSignature}
              />
            </div>
            
            {/* 已導出成功提示 (附帶 Web Share 按鈕) */}
            {exportedBlob && (
              <div className="mx-auto max-w-lg mb-8 px-4 w-full">
                <div className="flex items-center justify-between rounded-xl border border-emerald-100 dark:border-emerald-950/40 bg-emerald-500/[0.04] p-4.5 shadow-sm text-sm">
                  <div className="flex items-center gap-2.5 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="font-bold">PDF 文件導出下載成功！</span>
                  </div>
                  {canShare && (
                    <button
                      onClick={handleShare}
                      className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs transition-colors shadow-sm"
                    >
                      <Share2 className="h-3.5 w-3.5" />
                      <span>分享文件</span>
                    </button>
                  )}
                </div>
              </div>
            )}
            
          </div>
        )}
      </main>

      {/* 裁切彈窗 */}
      {cropPageIndex !== null && (
        <CropModal
          page={pages[cropPageIndex]}
          onClose={() => setCropPageIndex(null)}
          onApplyCrop={handleApplyCrop}
        />
      )}

      {/* 電子簽章管理彈窗 */}
      {isSignatureModalOpen && (
        <SignatureModal
          savedSignatures={savedSignatures}
          onAddSignature={handleAddSignature}
          onDeleteSignature={handleDeleteSignature}
          onSelectActiveSignature={setActiveSignatureId}
          activeSignatureId={activeSignatureId}
          onClose={() => setIsSignatureModalOpen(false)}
        />
      )}

      {/* 插入 PDF 彈窗 */}
      {isInsertModalOpen && (
        <InsertModal
          mainPdfTotalPages={pages.filter(p => !p.isDeleted).length}
          onClose={() => setIsInsertModalOpen(false)}
          onConfirmInsert={handleConfirmInsert}
        />
      )}

      {/* 手機端底部懸浮操作列 */}
      {file && (
        <div className="fixed bottom-6 left-4 right-4 z-30 md:hidden flex items-center justify-around rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 px-4 py-3.5 shadow-xl backdrop-blur-md animate-slide-up">
          {/* 快速選取/清空 */}
          <button
            onClick={selectedIndices.size === pages.filter(p => !p.isDeleted).length ? handleSelectNone : handleSelectAll}
            className="flex flex-col items-center gap-1.5 text-[10px] font-bold text-slate-600 dark:text-slate-400 active:text-indigo-500"
          >
            <span className="text-sm">
              {selectedIndices.size > 0 ? "☑" : "☐"}
            </span>
            <span>{selectedIndices.size > 0 ? "清空" : "全選"}</span>
          </button>

          {/* 旋轉 90° */}
          <button
            onClick={() => handleRotateSelected(90)}
            disabled={selectedIndices.size === 0}
            className="flex flex-col items-center gap-1.5 text-[10px] font-bold text-slate-600 dark:text-slate-400 disabled:opacity-30 active:text-indigo-500"
          >
            <RotateCw className="h-4.5 w-4.5" />
            <span>旋轉 90°</span>
          </button>

          {/* 刪除 */}
          <button
            onClick={handleDeleteSelected}
            disabled={selectedIndices.size === 0}
            className="flex flex-col items-center gap-1.5 text-[10px] font-bold text-red-500 disabled:opacity-30"
          >
            <Trash2 className="h-4.5 w-4.5" />
            <span>刪除</span>
          </button>

          {/* 插入 */}
          <button
            onClick={() => setIsInsertModalOpen(true)}
            className="flex flex-col items-center gap-1.5 text-[10px] font-bold text-slate-600 dark:text-slate-400 active:text-indigo-500"
          >
            <FilePlus2 className="h-4.5 w-4.5" />
            <span>插入</span>
          </button>

          {/* 簽名 */}
          <button
            onClick={() => setIsSignatureModalOpen(true)}
            className="flex flex-col items-center gap-1.5 text-[10px] font-bold text-indigo-500"
          >
            <FileSignature className="h-4.5 w-4.5" />
            <span>簽章</span>
          </button>
        </div>
      )}

      {/* 頁尾 */}
      <footer className="py-4.5 text-center text-[10px] text-slate-400 border-t border-slate-200/50 dark:border-slate-900/60 bg-white/40 dark:bg-slate-950/40">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <span className="font-medium">
            Local PDF Suite &copy; {new Date().getFullYear()} - 瀏覽器本機 PDF 編輯與簽章安全工具
          </span>
          <div className="flex items-center gap-2 text-indigo-500/90 dark:text-indigo-400/90 font-semibold">
            <Lock className="h-3 w-3" />
            <span>100% 本地端安全運算，承諾無伺服器上傳</span>
          </div>
        </div>
      </footer>

    </div>
  );
}


