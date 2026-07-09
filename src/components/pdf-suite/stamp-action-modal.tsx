import React from "react";
import { X, Copy, Layers, Trash2, HelpCircle } from "lucide-react";

export interface StampActionModalProps {
  onClose: () => void;
  onCopyToAll: () => void;
  onCopyToSpecific: () => void;
  onDelete: () => void;
}

export function StampActionModal({
  onClose,
  onCopyToAll,
  onCopyToSpecific,
  onDelete,
}: StampActionModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm animate-fade-in">
      <div className="flex w-full max-w-sm flex-col rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-scale-in">
        
        {/* 標頭 */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-5 py-3.5 bg-slate-50/50 dark:bg-slate-950/20">
          <div className="flex items-center gap-2 text-indigo-500">
            <HelpCircle className="h-4.5 w-4.5" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              貼圖操作選單
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 transition-colors"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* 按鈕清單 */}
        <div className="p-5 space-y-2.5">
          {/* 全部頁面張貼 */}
          <button
            type="button"
            onClick={() => {
              onCopyToAll();
              onClose();
            }}
            className="flex w-full items-center gap-3 rounded-xl border border-indigo-100/50 dark:border-indigo-950/40 bg-indigo-50/20 dark:bg-indigo-950/10 hover:bg-indigo-500 hover:text-white dark:hover:bg-indigo-600 dark:hover:text-white px-4 py-3 text-xs font-bold text-indigo-600 dark:text-indigo-400 transition-all active:scale-[0.98]"
          >
            <Copy className="h-4 w-4 shrink-0" />
            <div className="text-left">
              <div>全部頁面張貼</div>
              <div className="text-[10px] opacity-80 font-normal mt-0.5">複製到此文件其餘所有頁面的相同位置</div>
            </div>
          </button>

          {/* 指定頁面張貼 */}
          <button
            type="button"
            onClick={() => {
              onCopyToSpecific();
              onClose();
            }}
            className="flex w-full items-center gap-3 rounded-xl border border-violet-100/50 dark:border-violet-950/40 bg-violet-50/20 dark:bg-violet-950/10 hover:bg-violet-500 hover:text-white dark:hover:bg-violet-600 dark:hover:text-white px-4 py-3 text-xs font-bold text-violet-600 dark:text-violet-400 transition-all active:scale-[0.98]"
          >
            <Layers className="h-4 w-4 shrink-0" />
            <div className="text-left">
              <div>指定頁面張貼...</div>
              <div className="text-[10px] opacity-80 font-normal mt-0.5">開啟頁面選擇器以複製到特定頁面</div>
            </div>
          </button>

          {/* 刪除此貼圖 */}
          <button
            type="button"
            onClick={() => {
              onDelete();
              onClose();
            }}
            className="flex w-full items-center gap-3 rounded-xl border border-rose-100 dark:border-rose-950/30 bg-rose-500/5 hover:bg-rose-500 hover:text-white px-4 py-3 text-xs font-bold text-rose-500 dark:text-rose-400 transition-all active:scale-[0.98]"
          >
            <Trash2 className="h-4 w-4 shrink-0" />
            <div className="text-left">
              <div>刪除此貼圖</div>
              <div className="text-[10px] opacity-80 font-normal mt-0.5">將此貼圖從目前頁面中移除</div>
            </div>
          </button>

          {/* 取消 */}
          <button
            type="button"
            onClick={onClose}
            className="w-full text-center py-2 text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-350 transition-colors border-t border-slate-100 dark:border-slate-800/80 pt-4 mt-2"
          >
            取消
          </button>
        </div>

      </div>
    </div>
  );
}
