import React, { useRef } from "react";
import { X, Copy, Layers } from "lucide-react";
import { PlacedSignature, SavedSignature } from "@/lib/pdf-utils";

export interface SignatureLayerProps {
  pageId: string; // 使用 pageId 替代 pageIndex
  placedSignatures: PlacedSignature[];
  savedSignatures: SavedSignature[];
  onUpdateSignatures: (signatures: PlacedSignature[]) => void;
  containerWidth: number;
  containerHeight: number;
  onCopyToAllPages: (sigId: string) => void;
  onOpenCopyModal: (sigId: string) => void;
  onRecordHistory: () => void;
}

export function SignatureLayer({
  pageId,
  placedSignatures,
  savedSignatures,
  onUpdateSignatures,
  containerWidth,
  containerHeight,
  onCopyToAllPages,
  onOpenCopyModal,
  onRecordHistory,
}: SignatureLayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // 根據唯一 pageId 篩選放置於此頁的簽章
  const pageSignatures = placedSignatures.filter(sig => sig.pageId === pageId);

  // 滑鼠拖曳處理
  const handleStartDrag = (
    e: React.MouseEvent,
    sigId: string,
    initialX: number,
    initialY: number,
    sigW: number,
    sigH: number
  ) => {
    e.preventDefault();
    e.stopPropagation();

    onRecordHistory();

    const container = containerRef.current;
    if (!container) return;

    const startClientX = e.clientX;
    const startClientY = e.clientY;
    const rect = container.getBoundingClientRect();
    const cWidth = rect.width;
    const cHeight = rect.height;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startClientX;
      const deltaY = moveEvent.clientY - startClientY;

      const rx = deltaX / cWidth;
      const ry = deltaY / cHeight;

      let newX = Math.max(0, Math.min(1 - sigW, initialX + rx));
      let newY = Math.max(0, Math.min(1 - sigH, initialY + ry));

      const updated = placedSignatures.map(sig => {
        if (sig.id === sigId) {
          return { ...sig, x: newX, y: newY };
        }
        return sig;
      });
      onUpdateSignatures(updated);
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  // 手機觸控拖曳處理
  const handleStartDragTouch = (
    e: React.TouchEvent,
    sigId: string,
    initialX: number,
    initialY: number,
    sigW: number,
    sigH: number
  ) => {
    e.stopPropagation();

    onRecordHistory();

    const container = containerRef.current;
    if (!container) return;

    if (e.touches.length === 0) return;
    const touch = e.touches[0];
    const startClientX = touch.clientX;
    const startClientY = touch.clientY;
    const rect = container.getBoundingClientRect();
    const cWidth = rect.width;
    const cHeight = rect.height;

    const handleTouchMove = (moveEvent: TouchEvent) => {
      if (moveEvent.touches.length === 0) return;
      // 阻止瀏覽器預設滾動，保證在手機上只能拖曳簽章
      moveEvent.preventDefault();

      const moveTouch = moveEvent.touches[0];
      const deltaX = moveTouch.clientX - startClientX;
      const deltaY = moveTouch.clientY - startClientY;

      const rx = deltaX / cWidth;
      const ry = deltaY / cHeight;

      let newX = Math.max(0, Math.min(1 - sigW, initialX + rx));
      let newY = Math.max(0, Math.min(1 - sigH, initialY + ry));

      const updated = placedSignatures.map(sig => {
        if (sig.id === sigId) {
          return { ...sig, x: newX, y: newY };
        }
        return sig;
      });
      onUpdateSignatures(updated);
    };

    const handleTouchEnd = () => {
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };

    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    document.addEventListener("touchend", handleTouchEnd);
  };

  // 滑鼠縮放處理
  const handleStartResize = (
    e: React.MouseEvent,
    sigId: string,
    initialX: number,
    initialY: number,
    initialW: number,
    initialH: number
  ) => {
    e.preventDefault();
    e.stopPropagation();

    onRecordHistory();

    const container = containerRef.current;
    if (!container) return;

    const startClientX = e.clientX;
    const startClientY = e.clientY;
    const rect = container.getBoundingClientRect();
    const cWidth = rect.width;
    const cHeight = rect.height;

    const aspect = initialW / initialH;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startClientX;
      const rw = deltaX / cWidth;
      
      let newW = Math.max(0.05, Math.min(1 - initialX, initialW + rw));
      let newH = newW / aspect;

      if (initialY + newH > 1) {
        newH = 1 - initialY;
        newW = newH * aspect;
      }

      const updated = placedSignatures.map(sig => {
        if (sig.id === sigId) {
          return { ...sig, width: newW, height: newH };
        }
        return sig;
      });
      onUpdateSignatures(updated);
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  // 手機觸控縮放處理
  const handleStartResizeTouch = (
    e: React.TouchEvent,
    sigId: string,
    initialX: number,
    initialY: number,
    initialW: number,
    initialH: number
  ) => {
    e.stopPropagation();

    onRecordHistory();

    const container = containerRef.current;
    if (!container) return;

    if (e.touches.length === 0) return;
    const touch = e.touches[0];
    const startClientX = touch.clientX;
    const startClientY = touch.clientY;
    const rect = container.getBoundingClientRect();
    const cWidth = rect.width;
    const cHeight = rect.height;

    const aspect = initialW / initialH;

    const handleTouchMove = (moveEvent: TouchEvent) => {
      if (moveEvent.touches.length === 0) return;
      moveEvent.preventDefault();

      const moveTouch = moveEvent.touches[0];
      const deltaX = moveTouch.clientX - startClientX;
      const rw = deltaX / cWidth;

      let newW = Math.max(0.05, Math.min(1 - initialX, initialW + rw));
      let newH = newW / aspect;

      if (initialY + newH > 1) {
        newH = 1 - initialY;
        newW = newH * aspect;
      }

      const updated = placedSignatures.map(sig => {
        if (sig.id === sigId) {
          return { ...sig, width: newW, height: newH };
        }
        return sig;
      });
      onUpdateSignatures(updated);
    };

    const handleTouchEnd = () => {
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };

    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    document.addEventListener("touchend", handleTouchEnd);
  };

  const handleDelete = (e: React.MouseEvent | React.TouchEvent, sigId: string) => {
    e.preventDefault();
    e.stopPropagation();
    onRecordHistory();
    const filtered = placedSignatures.filter(sig => sig.id !== sigId);
    onUpdateSignatures(filtered);
  };

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-20 pointer-events-auto"
      style={{ width: containerWidth || "100%", height: containerHeight || "100%" }}
    >
      {pageSignatures.map(sig => {
        const savedSig = savedSignatures.find(s => s.id === sig.signatureImageId);
        if (!savedSig) return null;

        return (
          <div
            key={sig.id}
            className="absolute border border-dashed border-indigo-500 bg-indigo-500/5 hover:bg-indigo-500/10 cursor-move group/sig select-none shadow-sm rounded transition-shadow hover:shadow-indigo-500/20 touch-none"
            style={{
              left: `${sig.x * 100}%`,
              top: `${sig.y * 100}%`,
              width: `${sig.width * 100}%`,
              height: `${sig.height * 100}%`,
            }}
            onMouseDown={(e) => handleStartDrag(e, sig.id, sig.x, sig.y, sig.width, sig.height)}
            onTouchStart={(e) => handleStartDragTouch(e, sig.id, sig.x, sig.y, sig.width, sig.height)}
          >
            {/* 簽章影像 */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={savedSig.dataUrl}
              alt="Signature"
              className="w-full h-full object-contain pointer-events-none"
            />

            {/* 左上角複製到全部頁面按鈕 */}
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onCopyToAllPages(sig.id);
              }}
              onTouchStart={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onCopyToAllPages(sig.id);
              }}
              className="absolute -top-2.5 -left-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-md border border-white opacity-80 sm:opacity-0 group-hover/sig:opacity-100 transition-opacity"
              title="全部張貼 (複製到所有其他頁面的相同位置)"
            >
              <Copy className="h-2.5 w-2.5" />
            </button>

            {/* 左上角複製到指定頁面按鈕 */}
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onOpenCopyModal(sig.id);
              }}
              onTouchStart={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onOpenCopyModal(sig.id);
              }}
              className="absolute -top-2.5 left-3.5 flex h-5 w-5 items-center justify-center rounded-full bg-violet-600 hover:bg-violet-700 text-white shadow-md border border-white opacity-80 sm:opacity-0 group-hover/sig:opacity-100 transition-opacity"
              title="指定頁面張貼..."
            >
              <Layers className="h-2.5 w-2.5" />
            </button>

            {/* 右下角縮放手柄 */}
            <div
              className="absolute bottom-0 right-0 h-4.5 w-4.5 rounded-full bg-indigo-500 border border-white cursor-se-resize shadow-md translate-x-1.5 translate-y-1.5 opacity-80 sm:opacity-0 group-hover/sig:opacity-100 transition-opacity flex items-center justify-center text-[8px] text-white font-bold"
              onMouseDown={(e) => handleStartResize(e, sig.id, sig.x, sig.y, sig.width, sig.height)}
              onTouchStart={(e) => handleStartResizeTouch(e, sig.id, sig.x, sig.y, sig.width, sig.height)}
              title="等比例縮放"
            >
              ⤾
            </div>

            {/* 右上角刪除按鈕 */}
            <button
              onClick={(e) => handleDelete(e, sig.id)}
              onTouchStart={(e) => handleDelete(e, sig.id)}
              className="absolute -top-2.5 -right-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 hover:bg-rose-600 text-white shadow-md border border-white opacity-80 sm:opacity-0 group-hover/sig:opacity-100 transition-opacity"
              title="移出此簽章"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
