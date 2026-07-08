import React from "react";
import { RotateCw, Trash2, Undo, Crop, Check } from "lucide-react";
import { PdfPageInfo, PlacedSignature, SavedSignature } from "@/lib/pdf-utils";
import { SignatureLayer } from "./signature-layer";

export interface ThumbnailGridProps {
  pages: PdfPageInfo[];
  selectedIndices: Set<number>;
  placedSignatures: PlacedSignature[];
  savedSignatures: SavedSignature[];
  activeSignatureId: string | null;
  onToggleSelect: (pageIndex: number) => void;
  onRotatePage: (pageIndex: number, degrees: number) => void;
  onDeletePage: (pageIndex: number) => void;
  onRestorePage: (pageIndex: number) => void;
  onOpenCropModal: (pageIndex: number) => void;
  onUpdateSignatures: (signatures: PlacedSignature[]) => void;
  onAddPlacedSignature: (sig: PlacedSignature) => void;
}

export function ThumbnailGrid({
  pages,
  selectedIndices,
  placedSignatures,
  savedSignatures,
  activeSignatureId,
  onToggleSelect,
  onRotatePage,
  onDeletePage,
  onRestorePage,
  onOpenCropModal,
  onUpdateSignatures,
  onAddPlacedSignature,
}: ThumbnailGridProps) {
  
  const handlePageClick = (e: React.MouseEvent<HTMLDivElement>, page: PdfPageInfo) => {
    if (page.isDeleted) return;

    const rect = e.currentTarget.getBoundingClientRect();
    
    // 如果目前有啟用的簽名 ID，代表使用者正試圖「放置簽名」
    if (activeSignatureId) {
      e.preventDefault();
      e.stopPropagation();

      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      
      const rx = clickX / rect.width;
      const ry = clickY / rect.height;

      // 預設簽名比例為頁面寬度的 20%，高度 10%
      const sigWidth = 0.22;
      const sigHeight = 0.10;

      // 將簽名中心點對準點擊位置
      const x = Math.max(0, Math.min(1 - sigWidth, rx - sigWidth / 2));
      const y = Math.max(0, Math.min(1 - sigHeight, ry - sigHeight / 2));

      const newPlacedSig: PlacedSignature = {
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        pageIndex: page.pageIndex,
        signatureImageId: activeSignatureId,
        x,
        y,
        width: sigWidth,
        height: sigHeight,
      };

      onAddPlacedSignature(newPlacedSig);
    } else {
      // 否則，一般的點擊為切換該頁面的選取狀態
      // 如果點選的是頁面控制項按鈕，則在按鈕 handler 中阻止冒泡，因此這裡只處理卡片本體點擊
      onToggleSelect(page.pageIndex);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {pages.map((page) => {
          const isSelected = selectedIndices.has(page.pageIndex);
          const isPlacementMode = !!activeSignatureId && !page.isDeleted;
          
          return (
            <div
              key={page.pageIndex}
              className={`group relative flex flex-col items-center rounded-2xl border bg-white/40 dark:bg-slate-900/40 p-4 transition-all duration-300
                ${page.isDeleted 
                  ? "border-slate-200 dark:border-slate-800 opacity-60" 
                  : isSelected 
                    ? "border-indigo-500 shadow-lg shadow-indigo-500/10 dark:border-indigo-500/80 bg-indigo-500/[0.02]" 
                    : "border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700"
                }
              `}
            >
              
              {/* 卡片標題：頁碼與核取方塊 */}
              <div className="flex w-full items-center justify-between mb-3 text-xs font-semibold">
                <span className="text-slate-500 dark:text-slate-400">
                  第 {page.pageNumber} 頁
                </span>
                
                {!page.isDeleted && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleSelect(page.pageIndex);
                    }}
                    className={`flex h-5 w-5 items-center justify-center rounded border transition-all
                      ${isSelected 
                        ? "bg-indigo-500 border-indigo-500 text-white" 
                        : "border-slate-300 hover:border-indigo-400 dark:border-slate-700 dark:hover:border-indigo-500"
                      }
                    `}
                  >
                    {isSelected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                  </button>
                )}
              </div>

              {/* PDF 頁面預覽容器 */}
              <div
                onClick={(e) => handlePageClick(e, page)}
                className={`relative w-full overflow-hidden rounded-xl border border-slate-200/60 dark:border-slate-800/60 bg-slate-100 dark:bg-slate-950 transition-all duration-300 shadow-inner cursor-pointer
                  ${isPlacementMode ? "ring-2 ring-indigo-500/40 ring-offset-2 dark:ring-offset-slate-950" : ""}
                `}
                style={{
                  aspectRatio: `${page.width} / ${page.height}`,
                }}
              >
                {/* 縮圖 Canvas 渲染圖像 */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={page.thumbnailUrl}
                  alt={`Page ${page.pageNumber}`}
                  className="w-full h-full object-contain pointer-events-none select-none transition-transform duration-300 ease-out"
                  style={{
                    transform: `rotate(${page.rotation}deg)`,
                  }}
                />

                {/* 簽名壓印圖層 (當有在該頁放置簽名且未刪除時) */}
                {!page.isDeleted && (
                  <SignatureLayer
                    pageIndex={page.pageIndex}
                    placedSignatures={placedSignatures}
                    savedSignatures={savedSignatures}
                    onUpdateSignatures={onUpdateSignatures}
                    containerWidth={0} // 傳入 0 讓 SignatureLayer 使用 absolute inset-0 滿版定位
                    containerHeight={0}
                  />
                )}

                {/* 刪除狀態覆蓋層 */}
                {page.isDeleted && (
                  <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-900/65 backdrop-blur-[1px] text-white">
                    <span className="text-xs font-semibold tracking-wider opacity-90 mb-2">頁面已刪除</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRestorePage(page.pageIndex);
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-[11px] font-bold transition-all shadow-md active:scale-95"
                    >
                      <Undo className="h-3 w-3" />
                      <span>還原</span>
                    </button>
                  </div>
                )}

                {/* 簽名放置模式下的懸停引導 */}
                {isPlacementMode && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-indigo-500/5 hover:bg-indigo-500/10 transition-colors pointer-events-none">
                    <span className="rounded bg-indigo-500/90 text-white px-2 py-1 text-[10px] font-bold shadow-md tracking-wider">
                      點擊此處放置簽章
                    </span>
                  </div>
                )}
              </div>

              {/* 頁面下方快速控制列 (當未刪除時) */}
              {!page.isDeleted && (
                <div className="flex w-full items-center justify-center gap-2 mt-4 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-200">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRotatePage(page.pageIndex, 90);
                    }}
                    className="flex h-7 px-2.5 items-center gap-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-[10px] font-bold text-slate-600 dark:text-slate-300 transition-colors"
                    title="順時針旋轉 90°"
                  >
                    <RotateCw className="h-3.5 w-3.5" />
                    <span>旋轉</span>
                  </button>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenCropModal(page.pageIndex);
                    }}
                    className="flex h-7 px-2.5 items-center gap-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-[10px] font-bold text-slate-600 dark:text-slate-300 transition-colors"
                    title="裁切頁面區域"
                  >
                    <Crop className="h-3.5 w-3.5" />
                    <span>裁切</span>
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeletePage(page.pageIndex);
                    }}
                    className="flex h-7 w-7 items-center justify-center rounded bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 transition-colors"
                    title="刪除此頁面"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

            </div>
          );
        })}
      </div>
    </div>
  );
}
