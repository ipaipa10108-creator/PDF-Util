import React, { useState } from "react";
import { RotateCw, Trash2, Undo, Crop, Check, Move, X } from "lucide-react";
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
  onReorderPages: (draggedIndex: number, hoverIndex: number) => void; // 拖曳重排
  onMovePagePosition: (fromIndex: number, toIndexAfter: number) => void; // 指定位置移動
  onCopyToAllPages: (sigId: string) => void;
  onOpenCopyModal: (sigId: string) => void;
  onRecordHistory: () => void;
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
  onReorderPages,
  onMovePagePosition,
  onCopyToAllPages,
  onOpenCopyModal,
  onRecordHistory,
}: ThumbnailGridProps) {
  
  const isPlacementMode = !!activeSignatureId;

  // 拖曳狀態
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // 行內移動位置狀態
  const [movingPageIndex, setMovingPageIndex] = useState<number | null>(null);
  const [targetPosition, setTargetPosition] = useState<string>("");

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
        pageId: page.id,
        signatureImageId: activeSignatureId,
        x,
        y,
        width: sigWidth,
        height: sigHeight,
      };

      onAddPlacedSignature(newPlacedSig);
    } else {
      // 否則，一般的點擊為切換該頁面的選取狀態
      onToggleSelect(page.pageIndex);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* 拖曳操作說明小字 */}
      {!isPlacementMode && pages.length > 1 && (
        <p className="text-[10px] text-slate-400 mb-4 text-center">
          💡 提示：您可以直接<b>拖曳頁面</b>以調整其順序，或者點擊頁面下方的「<b>移動</b>」按鈕指定定位。
        </p>
      )}

      <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 animate-fade-in">
        {pages.map((page) => {
          const isSelected = selectedIndices.has(page.pageIndex);
          const isDraggingThis = draggedIndex === page.pageIndex;
          const isHoveredOverThis = dragOverIndex === page.pageIndex && !isDraggingThis;

          return (
            <div
              key={page.id}
              draggable={!isPlacementMode && !page.isDeleted}
              onDragStart={(e) => {
                if (isPlacementMode || page.isDeleted) return;
                setDraggedIndex(page.pageIndex);
                e.dataTransfer.effectAllowed = "move";
              }}
              onDragOver={(e) => {
                if (isPlacementMode || page.isDeleted) return;
                e.preventDefault();
                setDragOverIndex(page.pageIndex);
              }}
              onDragEnd={() => {
                setDraggedIndex(null);
                setDragOverIndex(null);
              }}
              onDrop={(e) => {
                if (isPlacementMode || page.isDeleted) return;
                e.preventDefault();
                if (draggedIndex !== null && draggedIndex !== page.pageIndex) {
                  onReorderPages(draggedIndex, page.pageIndex);
                }
                setDraggedIndex(null);
                setDragOverIndex(null);
              }}
              className={`group relative flex flex-col items-center rounded-2xl border p-4.5 transition-all duration-300 bg-white dark:bg-slate-900 shadow-sm
                ${isSelected 
                  ? "border-indigo-500 bg-indigo-500/[0.01] ring-1 ring-indigo-500 dark:ring-indigo-500/80 shadow-md shadow-indigo-500/5" 
                  : "border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700"
                }
                ${isDraggingThis ? "opacity-30 scale-95" : ""}
                ${isHoveredOverThis ? "border-dashed border-2 border-indigo-500 bg-indigo-500/5 scale-102" : ""}
              `}
            >
              {/* 多選核取方塊 */}
              {!page.isDeleted && !isPlacementMode && (
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleSelect(page.pageIndex);
                  }}
                  className={`absolute top-3 left-3 z-30 flex h-5.5 w-5.5 items-center justify-center rounded-lg border transition-all cursor-pointer shadow-sm
                    ${isSelected
                      ? "bg-indigo-500 border-indigo-500 text-white"
                      : "border-slate-300 dark:border-slate-700 bg-white/90 hover:border-slate-400 dark:bg-slate-950/90"
                    }
                  `}
                >
                  {isSelected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                </div>
              )}

              {/* 頁碼角標 */}
              <span className="absolute top-3 right-3 z-20 rounded-md bg-slate-900/60 dark:bg-slate-950/80 text-white font-bold px-2 py-0.5 text-[10px] tracking-wider backdrop-blur-[2px]">
                {page.pageNumber}
              </span>

              {/* 縮圖點擊主容器 */}
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
                    pageId={page.id}
                    placedSignatures={placedSignatures}
                    savedSignatures={savedSignatures}
                    onUpdateSignatures={onUpdateSignatures}
                    containerWidth={0} // 傳入 0 讓 SignatureLayer 使用 absolute inset-0 滿版定位
                    containerHeight={0}
                    onCopyToAllPages={onCopyToAllPages}
                    onOpenCopyModal={onOpenCopyModal}
                    onRecordHistory={onRecordHistory}
                  />
                )}

                {/* 刪除狀態覆蓋層 */}
                {page.isDeleted && (
                  <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-900/65 backdrop-blur-[1px] text-white animate-fade-in">
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
                {isPlacementMode && !page.isDeleted && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-indigo-500/5 hover:bg-indigo-500/10 transition-colors pointer-events-none">
                    <span className="rounded bg-indigo-500/90 text-white px-2 py-1 text-[10px] font-bold shadow-md tracking-wider">
                      點擊此處放置簽章
                    </span>
                  </div>
                )}
              </div>

              {/* 頁面下方快速控制列 (當未刪除時) */}
              {!page.isDeleted && (
                <div className="w-full">
                  {movingPageIndex === page.pageIndex ? (
                    /* 指定移動位置輸入區 */
                    <div 
                      className="flex w-full items-center justify-center gap-1 mt-4 animate-fade-in" 
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="text-[9.5px] text-slate-500 font-bold">移至第</span>
                      <input
                        type="number"
                        min="0"
                        max={pages.length}
                        value={targetPosition}
                        onChange={(e) => setTargetPosition(e.target.value)}
                        placeholder="0-N"
                        className="w-10 h-7 rounded border border-slate-200 dark:border-slate-800 bg-transparent text-center text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:text-slate-100"
                      />
                      <span className="text-[9.5px] text-slate-500 font-bold">頁後</span>
                      <button
                        onClick={() => {
                          const toPos = parseInt(targetPosition, 10);
                          if (!isNaN(toPos) && toPos >= 0 && toPos <= pages.length) {
                            onMovePagePosition(page.pageIndex, toPos);
                            setMovingPageIndex(null);
                          } else {
                            alert(`請輸入有效的目標頁數 (0-${pages.length})。0 代表移至最前面。`);
                          }
                        }}
                        className="flex h-7 w-7 items-center justify-center rounded bg-indigo-500 text-white hover:bg-indigo-600 transition-colors"
                        title="確認移動"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setMovingPageIndex(null)}
                        className="flex h-7 w-7 items-center justify-center rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 transition-colors"
                        title="取消"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    /* 預設功能控制列 */
                    <div className="flex w-full items-center justify-center gap-1.5 mt-4 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-200">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRotatePage(page.pageIndex, 90);
                        }}
                        className="flex h-7 px-2 items-center gap-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-[9.5px] font-bold text-slate-600 dark:text-slate-300 transition-colors"
                        title="順時針旋轉 90°"
                      >
                        <RotateCw className="h-3 w-3" />
                        <span>旋轉</span>
                      </button>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenCropModal(page.pageIndex);
                        }}
                        className="flex h-7 px-2 items-center gap-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-[9.5px] font-bold text-slate-600 dark:text-slate-300 transition-colors"
                        title="裁切頁面區域"
                      >
                        <Crop className="h-3 w-3" />
                        <span>裁切</span>
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setMovingPageIndex(page.pageIndex);
                          setTargetPosition("");
                        }}
                        className="flex h-7 px-2 items-center gap-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-[9.5px] font-bold text-slate-600 dark:text-slate-300 transition-colors"
                        title="指定移動至特定頁碼"
                      >
                        <Move className="h-3 w-3" />
                        <span>移動</span>
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeletePage(page.pageIndex);
                        }}
                        className="flex h-7 w-7 items-center justify-center rounded bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 transition-colors"
                        title="刪除此頁面"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
              )}

            </div>
          );
        })}
      </div>
    </div>
  );
}
