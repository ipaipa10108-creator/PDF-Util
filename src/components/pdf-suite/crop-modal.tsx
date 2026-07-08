import React, { useState, useRef, useEffect } from "react";
import { X, Crop, Check, RefreshCw } from "lucide-react";
import { PdfPageInfo } from "@/lib/pdf-utils";

export interface CropModalProps {
  page: PdfPageInfo;
  onClose: () => void;
  onApplyCrop: (pageIndex: number, cropBox: { x: number; y: number; width: number; height: number } | null, applyToAll: boolean) => void;
}

export function CropModal({ page, onClose, onApplyCrop }: CropModalProps) {
  // 裁切狀態以相對比例 (0~1) 表示
  const [crop, setCrop] = useState<{ x: number; y: number; width: number; height: number }>({
    x: 0.1,
    y: 0.1,
    width: 0.8,
    height: 0.8,
  });

  const containerRef = useRef<HTMLDivElement>(null);

  // 初始化裁切框
  useEffect(() => {
    if (page.cropBox) {
      setCrop(page.cropBox);
    } else {
      setCrop({ x: 0.1, y: 0.1, width: 0.8, height: 0.8 });
    }
  }, [page]);

  const handleStartDragBox = (e: React.MouseEvent) => {
    e.preventDefault();
    const container = containerRef.current;
    if (!container) return;

    const startClientX = e.clientX;
    const startClientY = e.clientY;
    const rect = container.getBoundingClientRect();
    const cWidth = rect.width;
    const cHeight = rect.height;

    const initialX = crop.x;
    const initialY = crop.y;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startClientX;
      const deltaY = moveEvent.clientY - startClientY;

      const rx = deltaX / cWidth;
      const ry = deltaY / cHeight;

      const newX = Math.max(0, Math.min(1 - crop.width, initialX + rx));
      const newY = Math.max(0, Math.min(1 - crop.height, initialY + ry));

      setCrop(prev => ({ ...prev, x: newX, y: newY }));
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleStartResize = (e: React.MouseEvent, handle: string) => {
    e.preventDefault();
    e.stopPropagation();

    const container = containerRef.current;
    if (!container) return;

    const startClientX = e.clientX;
    const startClientY = e.clientY;
    const rect = container.getBoundingClientRect();
    const cWidth = rect.width;
    const cHeight = rect.height;

    const initialCrop = { ...crop };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startClientX;
      const deltaY = moveEvent.clientY - startClientY;

      const rx = deltaX / cWidth;
      const ry = deltaY / cHeight;

      let newX = initialCrop.x;
      let newY = initialCrop.y;
      let newW = initialCrop.width;
      let newH = initialCrop.height;

      const minSize = 0.05; // 最小限制在 5%

      // 根據不同的拖曳手柄計算新的邊界
      if (handle.includes("e")) {
        newW = Math.max(minSize, Math.min(1 - initialCrop.x, initialCrop.width + rx));
      }
      if (handle.includes("s")) {
        newH = Math.max(minSize, Math.min(1 - initialCrop.y, initialCrop.height + ry));
      }
      if (handle.includes("w")) {
        const potentialX = initialCrop.x + rx;
        const potentialW = initialCrop.width - rx;
        if (potentialX >= 0 && potentialW >= minSize) {
          newX = potentialX;
          newW = potentialW;
        }
      }
      if (handle.includes("n")) {
        const potentialY = initialCrop.y + ry;
        const potentialH = initialCrop.height - ry;
        if (potentialY >= 0 && potentialH >= minSize) {
          newY = potentialY;
          newH = potentialH;
        }
      }

      setCrop({ x: newX, y: newY, width: newW, height: newH });
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleReset = () => {
    setCrop({ x: 0, y: 0, width: 1, height: 1 });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm animate-fade-in">
      <div className="flex h-full max-h-[90vh] w-full max-w-4xl flex-col rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        
        {/* 彈窗標題 */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-4.5">
          <div className="flex items-center gap-2 text-indigo-500">
            <Crop className="h-5 w-5" />
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              頁面裁切模式 (第 {page.pageNumber} 頁)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 裁切工作區 */}
        <div className="flex-1 bg-slate-50 dark:bg-slate-950/40 p-6 overflow-auto flex items-center justify-center">
          <div
            ref={containerRef}
            className="relative select-none border border-slate-200 dark:border-slate-800 shadow-md rounded-lg overflow-hidden bg-slate-900"
            style={{
              aspectRatio: `${page.width} / ${page.height}`,
              maxHeight: "55vh",
            }}
          >
            {/* 頁面背景圖 */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={page.thumbnailUrl}
              alt="Page to crop"
              className="w-full h-full object-contain pointer-events-none select-none"
              style={{
                transform: `rotate(${page.rotation}deg)`,
              }}
            />

            {/* 視覺化裁切框 (陰影遮罩技巧呈現精美的高亮裁切區) */}
            <div
              className="absolute border-2 border-solid border-indigo-500 cursor-move shadow-[0_0_0_9999px_rgba(0,0,0,0.6)]"
              style={{
                left: `${crop.x * 100}%`,
                top: `${crop.y * 100}%`,
                width: `${crop.width * 100}%`,
                height: `${crop.height * 100}%`,
              }}
              onMouseDown={handleStartDragBox}
            >
              {/* 四個角錨點與四條邊手柄 */}
              {["nw", "n", "ne", "e", "se", "s", "sw", "w"].map(handle => {
                let positionClass = "";
                switch (handle) {
                  case "nw": positionClass = "top-0 left-0 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize"; break;
                  case "n": positionClass = "top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 cursor-ns-resize"; break;
                  case "ne": positionClass = "top-0 right-0 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize"; break;
                  case "e": positionClass = "top-1/2 right-0 translate-x-1/2 -translate-y-1/2 cursor-ew-resize"; break;
                  case "se": positionClass = "bottom-0 right-0 translate-x-1/2 translate-y-1/2 cursor-nwse-resize"; break;
                  case "s": positionClass = "bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 cursor-ns-resize"; break;
                  case "sw": positionClass = "bottom-0 left-0 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize"; break;
                  case "w": positionClass = "top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize"; break;
                }
                return (
                  <div
                    key={handle}
                    className={`absolute h-3 w-3 rounded-full bg-indigo-500 border-2 border-white shadow-md active:scale-125 transition-transform ${positionClass}`}
                    onMouseDown={(e) => handleStartResize(e, handle)}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* 彈窗下方控制與確認按鈕 */}
        <div className="border-t border-slate-200 dark:border-slate-800 px-6 py-4.5 bg-white dark:bg-slate-900 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* 還原與資訊 */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="flex h-9 px-3 items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 text-xs font-semibold text-slate-600 dark:text-slate-300 transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>重置裁切區</span>
            </button>
            <span className="text-[10.5px] text-slate-400">
              提示：可拖曳框線與 8 個邊角錨點調整保留範圍。
            </span>
          </div>

          {/* 套用按鈕組 */}
          <div className="flex items-center gap-2 sm:self-end">
            <button
              onClick={onClose}
              className="h-9 px-4 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 text-xs font-semibold text-slate-600 dark:text-slate-300 transition-colors"
            >
              取消
            </button>
            
            <button
              onClick={() => onApplyCrop(page.pageIndex, crop.x === 0 && crop.y === 0 && crop.width === 1 && crop.height === 1 ? null : crop, true)}
              className="h-9 px-4 rounded-lg border border-indigo-200 dark:border-indigo-900/40 bg-indigo-50/50 hover:bg-indigo-50 dark:bg-indigo-950/20 dark:hover:bg-indigo-950/40 text-xs font-semibold text-indigo-600 dark:text-indigo-400 transition-colors"
              title="將目前的裁切尺寸套用至此 PDF 的每一頁"
            >
              套用至所有頁面
            </button>

            <button
              onClick={() => onApplyCrop(page.pageIndex, crop.x === 0 && crop.y === 0 && crop.width === 1 && crop.height === 1 ? null : crop, false)}
              className="flex items-center gap-1.5 h-9 px-4 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white font-semibold text-xs transition-colors shadow-md shadow-indigo-500/20"
            >
              <Check className="h-4 w-4" />
              <span>僅套用此頁</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
