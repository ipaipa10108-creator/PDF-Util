import React, { useState, useRef } from "react";
import { UploadCloud, ShieldCheck, Lock, EyeOff } from "lucide-react";

export interface DropzoneProps {
  onFileSelect: (file: File) => void;
  isLoading: boolean;
}

export function Dropzone({ onFileSelect, isLoading }: DropzoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === "application/pdf") {
        onFileSelect(file);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type === "application/pdf") {
        onFileSelect(file);
      }
    }
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={onButtonClick}
        className={`group relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center cursor-pointer transition-all duration-300 backdrop-blur-md
          ${isDragActive 
            ? "border-indigo-500 bg-indigo-50/10 dark:bg-indigo-950/10 scale-[1.01] shadow-xl shadow-indigo-500/10" 
            : "border-slate-300 hover:border-indigo-400 bg-white/50 dark:border-slate-800 dark:bg-slate-900/50 dark:hover:border-indigo-500/60"
          }
          ${isLoading ? "pointer-events-none opacity-60" : ""}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={handleFileChange}
          className="hidden"
          disabled={isLoading}
        />

        {/* 拖曳圖示 */}
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-400 group-hover:text-indigo-500 dark:text-slate-500 dark:group-hover:text-indigo-400 transition-colors shadow-sm mb-6">
          <UploadCloud className={`h-8 w-8 ${isLoading ? "animate-pulse" : "group-hover:scale-110 transition-transform duration-300"}`} />
        </div>

        {/* 主要文字 */}
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">
          {isLoading ? "正在載入並解析 PDF 文件..." : "拖放 PDF 檔案至此，或點擊瀏覽"}
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 max-w-sm">
          僅支援標準 PDF 格式文件。文件解析、渲染與修改將 100% 在您的瀏覽器沙盒中完成。
        </p>

        {/* 資安宣告卡片 */}
        <div className="w-full max-w-md rounded-xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100/50 dark:border-indigo-950/40 p-4.5 text-left transition-all">
          <div className="flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-indigo-500 dark:text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-indigo-900 dark:text-indigo-300 mb-1">
                絕對隱私與安全承諾
              </h4>
              <p className="text-[11px] leading-relaxed text-indigo-700/95 dark:text-indigo-400/90 font-medium">
                本系統無後端伺服器，您的文件、簽名與個資絕不會上傳或離開您的本機設備，請安心使用。
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 安全特點網格 */}
      <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-3">
        <div className="flex flex-col items-center p-5 rounded-xl bg-white/40 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/60 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/30 text-indigo-500 dark:text-indigo-400 mb-4">
            <Lock className="h-5 w-5" />
          </div>
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">100% 本地運行</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-[200px]">
            利用 WebAssembly 與 Canvas 技術，在瀏覽器沙盒中直接渲染與編輯 PDF。
          </p>
        </div>

        <div className="flex flex-col items-center p-5 rounded-xl bg-white/40 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/60 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/30 text-indigo-500 dark:text-indigo-400 mb-4">
            <EyeOff className="h-5 w-5" />
          </div>
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">零隱私外洩風險</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-[200px]">
            沒有登入註冊，無資料同步與雲端儲存，您的合約與簽名絕不外流。
          </p>
        </div>

        <div className="flex flex-col items-center p-5 rounded-xl bg-white/40 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/60 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/30 text-indigo-500 dark:text-indigo-400 mb-4">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">離線亦可使用</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-[200px]">
            即使在無網路連線的離線狀態下，仍可順暢載入、編輯與下載 PDF。
          </p>
        </div>
      </div>
    </div>
  );
}
