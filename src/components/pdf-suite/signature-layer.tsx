import React, { useRef, useEffect } from "react";
import { X } from "lucide-react";
import { PlacedSignature, SavedSignature } from "@/lib/pdf-utils";

export interface SignatureLayerProps {
  pageIndex: number;
  placedSignatures: PlacedSignature[];
  savedSignatures: SavedSignature[];
  onUpdateSignatures: (signatures: PlacedSignature[]) => void;
  containerWidth: number;
  containerHeight: number;
}

export function SignatureLayer({
  pageIndex,
  placedSignatures,
  savedSignatures,
  onUpdateSignatures,
  containerWidth,
  containerHeight,
}: SignatureLayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // 取得當前頁面的簽章
  const pageSignatures = placedSignatures.filter(sig => sig.pageIndex === pageIndex);

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

      // 換算為相對比例
      const rx = deltaX / cWidth;
      const ry = deltaY / cHeight;

      // 計算新座標並限制在 [0, 1 - size] 範圍內
      let newX = Math.max(0, Math.min(1 - sigW, initialX + rx));
      let newY = Math.max(0, Math.min(1 - sigH, initialY + ry));

      // 即時更新
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

    const container = containerRef.current;
    if (!container) return;

    const startClientX = e.clientX;
    const startClientY = e.clientY;
    const rect = container.getBoundingClientRect();
    const cWidth = rect.width;
    const cHeight = rect.height;

    // 儲存寬高比以進行等比例縮放
    const aspect = initialW / initialH;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startClientX;
      
      // 以 X 軸拖曳量換算新比例寬度
      const rw = deltaX / cWidth;
      
      // 設定最小寬度比例為 5%
      let newW = Math.max(0.05, Math.min(1 - initialX, initialW + rw));
      let newH = newW / aspect;

      // 如果高度超出了邊界，則反向限制寬度
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

  const handleDelete = (e: React.MouseEvent, sigId: string) => {
    e.preventDefault();
    e.stopPropagation();
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
            className="absolute border border-dashed border-indigo-500 bg-indigo-500/5 hover:bg-indigo-500/10 cursor-move group/sig select-none shadow-sm rounded transition-shadow hover:shadow-indigo-500/20"
            style={{
              left: `${sig.x * 100}%`,
              top: `${sig.y * 100}%`,
              width: `${sig.width * 100}%`,
              height: `${sig.height * 100}%`,
            }}
            onMouseDown={(e) => handleStartDrag(e, sig.id, sig.x, sig.y, sig.width, sig.height)}
          >
            {/* 簽章影像 */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={savedSig.dataUrl}
              alt="Signature"
              className="w-full h-full object-contain pointer-events-none"
            />

            {/* 右下角縮放手柄 */}
            <div
              className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-indigo-500 border border-white cursor-se-resize shadow-md translate-x-1 translate-y-1 opacity-0 group-hover/sig:opacity-100 transition-opacity"
              onMouseDown={(e) => handleStartResize(e, sig.id, sig.x, sig.y, sig.width, sig.height)}
              title="拖曳以等比例縮放"
            />

            {/* 右上角刪除按鈕 */}
            <button
              onClick={(e) => handleDelete(e, sig.id)}
              className="absolute -top-2 -right-2 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-rose-500 hover:bg-rose-600 text-white shadow-md border border-white opacity-0 group-hover/sig:opacity-100 transition-opacity"
              title="移出此簽章"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
