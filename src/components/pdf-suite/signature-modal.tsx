import React, { useRef, useState, useEffect } from "react";
import { X, Trash2, Edit3, Image as ImageIcon, Check, ShieldAlert } from "lucide-react";
import { SavedSignature } from "@/lib/pdf-utils";

export interface SignatureModalProps {
  savedSignatures: SavedSignature[];
  onAddSignature: (sig: SavedSignature) => void;
  onDeleteSignature: (id: string) => void;
  onSelectActiveSignature: (id: string | null) => void;
  activeSignatureId: string | null;
  onClose: () => void;
}

export function SignatureModal({
  savedSignatures,
  onAddSignature,
  onDeleteSignature,
  onSelectActiveSignature,
  activeSignatureId,
  onClose,
}: SignatureModalProps) {
  const [activeTab, setActiveTab] = useState<"draw" | "upload" | "list">("draw");
  const [penColor, setPenColor] = useState<"black" | "blue" | "red">("black");
  const [penWidth, setPenWidth] = useState<number>(4); // 新增筆觸粗細狀態 (預設 4px 中)
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const lastPos = useRef({ x: 0, y: 0 });

  // 取得畫筆顏色對應的 HEX 值
  const getHexColor = (color: "black" | "blue" | "red") => {
    switch (color) {
      case "black": return "#0f172a"; // Slate-900
      case "blue": return "#2563eb";  // Blue-600
      case "red": return "#dc2626";   // Red-600
    }
  };

  // 1. 初始化畫布尺寸 (僅在切換到 draw 分頁時執行一次，防止顏色/粗細變更時清空畫布)
  useEffect(() => {
    if (activeTab !== "draw") return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);
    
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.clearRect(0, 0, rect.width, rect.height);
  }, [activeTab]);

  // 2. 當筆劃屬性 (顏色/粗細) 變更時，動態更新 context 屬性，不重新設定 canvas 寬高
  useEffect(() => {
    if (activeTab !== "draw") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.strokeStyle = getHexColor(penColor);
    ctx.lineWidth = penWidth;
  }, [activeTab, penColor, penWidth]);

  // 手寫繪製輔助函式
  const getCoordinates = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      if (e.touches.length === 0) return null;
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (ctx) {
      // 繪圖開始時，確保套用最新的顏色和粗細
      ctx.strokeStyle = getHexColor(penColor);
      ctx.lineWidth = penWidth;
    }

    const pos = getCoordinates(e.nativeEvent, canvas);
    if (!pos) return;

    setIsDrawing(true);
    lastPos.current = pos;
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const pos = getCoordinates(e.nativeEvent, canvas);
    if (!ctx || !pos) return;

    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();

    lastPos.current = pos;
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    // 考慮到 scaled context，這裡直接用 clearRect 清除雙倍 buffer
    ctx.clearRect(0, 0, rect.width * 2, rect.height * 2);
  };

  const saveDrawSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL("image/png");
    
    // 檢查是否有畫任何東西 (像素檢查)
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const hasDrawData = imgData.data.some(channel => channel !== 0);

    if (!hasDrawData) {
      alert("請先在畫板上簽寫名字。");
      return;
    }

    const newSig: SavedSignature = {
      id: `sig-draw-${Date.now()}`,
      type: "draw",
      color: penColor,
      dataUrl,
      createdAt: Date.now(),
    };

    onAddSignature(newSig);
    onSelectActiveSignature(newSig.id);
    onClose();
  };

  // 圖片上傳處理
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result && typeof event.target.result === "string") {
          const newSig: SavedSignature = {
            id: `sig-img-${Date.now()}`,
            type: "image",
            dataUrl: event.target.result,
            createdAt: Date.now(),
          };
          onAddSignature(newSig);
          onSelectActiveSignature(newSig.id);
          onClose();
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm animate-fade-in">
      <div className="flex h-full max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        
        {/* 標頭 */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-4">
          <div className="flex items-center gap-2 text-indigo-500">
            <Edit3 className="h-5 w-5" />
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              電子簽章管理員
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 分頁標籤切換 */}
        <div className="flex border-b border-slate-150 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/10 px-6 pt-2">
          <button
            onClick={() => setActiveTab("draw")}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-3 text-xs font-bold transition-all
              ${activeTab === "draw" 
                ? "border-indigo-500 text-indigo-600 dark:text-indigo-400" 
                : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              }
            `}
          >
            <Edit3 className="h-4 w-4" />
            手寫簽名
          </button>
          
          <button
            onClick={() => setActiveTab("upload")}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-3 text-xs font-bold transition-all
              ${activeTab === "upload" 
                ? "border-indigo-500 text-indigo-600 dark:text-indigo-400" 
                : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              }
            `}
          >
            <ImageIcon className="h-4 w-4" />
            匯入簽名圖片
          </button>
          
          <button
            onClick={() => setActiveTab("list")}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-3 text-xs font-bold transition-all relative
              ${activeTab === "list" 
                ? "border-indigo-500 text-indigo-600 dark:text-indigo-400" 
                : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              }
            `}
          >
            <span>已儲存簽章</span>
            {savedSignatures.length > 0 && (
              <span className="ml-1 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 text-[9px] font-bold">
                {savedSignatures.length}
              </span>
            )}
          </button>
        </div>

        {/* 分頁內容 */}
        <div className="flex-1 p-6 overflow-y-auto">
          
          {/* TAB 1: 手寫畫板 */}
          {activeTab === "draw" && (
            <div className="flex flex-col h-full gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                {/* 筆刷顏色與粗細調整列 */}
                <div className="flex items-center gap-4">
                  {/* 顏色 */}
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">顏色：</span>
                    {(["black", "blue", "red"] as const).map(color => {
                      let dotColor = "";
                      switch (color) {
                        case "black": dotColor = "bg-slate-900 border-slate-400"; break;
                        case "blue": dotColor = "bg-blue-600 border-blue-400"; break;
                        case "red": dotColor = "bg-red-600 border-red-400"; break;
                      }
                      return (
                        <button
                          key={color}
                          onClick={() => setPenColor(color)}
                          className={`h-6 w-6 rounded-full border-2 transition-all flex items-center justify-center
                            ${penColor === color 
                              ? "scale-110 ring-2 ring-indigo-500/40 ring-offset-1 dark:ring-offset-slate-900" 
                              : "opacity-60 hover:opacity-100"
                            }
                          `}
                        >
                          <span className={`h-3 w-3 rounded-full ${dotColor}`} />
                        </button>
                      );
                    })}
                  </div>

                  {/* 粗細 */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">筆觸：</span>
                    {([2, 4, 6] as const).map(widthVal => {
                      let label = "";
                      switch (widthVal) {
                        case 2: label = "細"; break;
                        case 4: label = "中"; break;
                        case 6: label = "粗"; break;
                      }
                      return (
                        <button
                          key={widthVal}
                          onClick={() => setPenWidth(widthVal)}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all border
                            ${penWidth === widthVal
                              ? "bg-indigo-500 border-indigo-500 text-white"
                              : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850"
                            }
                          `}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                
                <button
                  onClick={clearCanvas}
                  className="rounded px-2.5 py-1 text-[11px] font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors"
                >
                  重寫清空
                </button>
              </div>

              {/* 畫布容器 */}
              <div className="flex-1 min-h-[220px] rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 overflow-hidden shadow-inner relative">
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 w-full h-full cursor-crosshair touch-none bg-transparent"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                />
              </div>

              <div className="flex items-center gap-2 justify-end mt-2">
                <button
                  onClick={onClose}
                  className="h-9 px-4 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 text-xs font-semibold text-slate-600 dark:text-slate-300 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={saveDrawSignature}
                  className="h-9 px-4 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white font-semibold text-xs transition-all shadow-md shadow-indigo-500/20 active:scale-95"
                >
                  確認並使用
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: 圖片上傳 */}
          {activeTab === "upload" && (
            <div className="flex flex-col h-full justify-center">
              <label className="group flex flex-col items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500/60 rounded-xl p-8 text-center cursor-pointer transition-all duration-300 bg-slate-50/50 dark:bg-slate-950/10 min-h-[220px]">
                <input
                  type="file"
                  accept="image/png, image/svg+xml"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-850 text-slate-400 group-hover:text-indigo-500 dark:text-slate-500 dark:group-hover:text-indigo-400 transition-colors mb-4 shadow-sm">
                  <ImageIcon className="h-6 w-6 group-hover:scale-110 transition-transform" />
                </div>
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">
                  選擇透明背景簽名圖片 (PNG / SVG)
                </span>
                <span className="text-xs text-slate-400 max-w-[240px]">
                  建議使用去背的透明背景圖以獲得最佳的 PDF 壓印效果。
                </span>
              </label>
            </div>
          )}

          {/* TAB 3: 已儲存簽名清單 */}
          {activeTab === "list" && (
            <div className="h-full flex flex-col">
              {savedSignatures.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                  <div className="h-12 w-12 rounded-xl bg-slate-50 dark:bg-slate-850 flex items-center justify-center text-slate-400 dark:text-slate-600 mb-3 shadow-inner">
                    <Edit3 className="h-5 w-5" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">尚未建立任何簽章</h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-[200px]">
                    請點選「手寫簽名」或「匯入簽名圖片」來建立您的第一個簽名。
                  </p>
                </div>
              ) : (
                <div className="flex-1 flex flex-col gap-4">
                  <span className="text-[10.5px] text-slate-400">
                    點擊簽章即啟用該簽名，關閉視窗後可在預覽頁面上「點擊」以進行任意放置與壓印。
                  </span>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {savedSignatures.map(sig => {
                      const isActive = activeSignatureId === sig.id;
                      return (
                        <div
                          key={sig.id}
                          onClick={() => {
                            onSelectActiveSignature(isActive ? null : sig.id);
                          }}
                          className={`group/item relative flex items-center justify-center border rounded-xl p-4 cursor-pointer transition-all h-28 bg-slate-50/20 dark:bg-slate-950/5 hover:scale-[1.01]
                            ${isActive 
                              ? "border-indigo-500 bg-indigo-500/[0.02] shadow-md shadow-indigo-500/5 ring-1 ring-indigo-500" 
                              : "border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700"
                            }
                          `}
                        >
                          {/* 簽名縮圖 */}
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={sig.dataUrl}
                            alt="Saved Signature"
                            className="max-w-full max-h-full object-contain filter dark:invert-0 pointer-events-none select-none"
                          />

                          {/* 啟用打勾 */}
                          {isActive && (
                            <div className="absolute top-2 left-2 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500 text-white shadow-sm">
                              <Check className="h-3 w-3 stroke-[3]" />
                            </div>
                          )}

                          {/* 類型標籤 */}
                          <span className="absolute bottom-2 left-2.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-1 py-0.5 text-[8.5px] font-bold">
                            {sig.type === "draw" ? "手寫" : "圖片"}
                          </span>

                          {/* 刪除按鈕 */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteSignature(sig.id);
                              if (isActive) onSelectActiveSignature(null);
                            }}
                            className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-lg bg-red-50 hover:bg-red-100 dark:bg-red-950/25 dark:hover:bg-red-950/50 text-red-500 dark:text-red-400 opacity-0 group-hover/item:opacity-100 transition-opacity shadow-sm"
                            title="從本地儲存中移除此簽章"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* 資安宣示頁尾 */}
        <div className="border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/10 px-6 py-3.5 flex items-center justify-center gap-2">
          <ShieldAlert className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
          <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
            隱私安全保障：所有儲存的簽章資料僅保留於您瀏覽器的本機快取 (localStorage)，絕不上傳至任何伺服器。
          </span>
        </div>

      </div>
    </div>
  );
}
