import React, { useState } from "react";
import { X, Check, Copy } from "lucide-react";
import { PdfPageInfo } from "@/lib/pdf-utils";

export interface CopyStampModalProps {
  pages: PdfPageInfo[];
  sourcePageId: string;
  onClose: () => void;
  onConfirmCopy: (targetPageIds: string[]) => void;
}

export function CopyStampModal({
  pages,
  sourcePageId,
  onClose,
  onConfirmCopy,
}: CopyStampModalProps) {
  // 過濾掉被刪除的頁面與來源頁面
  const eligiblePages = pages.filter((p) => !p.isDeleted && p.id !== sourcePageId);
  
  const [selectedPageIds, setSelectedPageIds] = useState<Set<string>>(
    new Set()
  );

  const handleTogglePage = (pageId: string) => {
    const nextSet = new Set(selectedPageIds);
    if (nextSet.has(pageId)) {
      nextSet.delete(pageId);
    } else {
      nextSet.add(pageId);
    }
    setSelectedPageIds(nextSet);
  };

  const handleSelectAll = () => {
    const allIds = eligiblePages.map((p) => p.id);
    setSelectedPageIds(new Set(allIds));
  };

  const handleSelectNone = () => {
    setSelectedPageIds(new Set());
  };

  const handleConfirm = () => {
    if (selectedPageIds.size === 0) {
      alert("請至少選擇一個目標頁面進行張貼。");
      return;
    }
    onConfirmCopy(Array.from(selectedPageIds));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm animate-fade-in">
      <div className="flex h-full max-h-[80vh] w-full max-w-xl flex-col rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        
        {/* 標頭 */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-4">
          <div className="flex items-center gap-2 text-indigo-500">
            <Copy className="h-5 w-5" />
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              複製貼圖至其他頁面
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 說明文字 */}
        <div className="px-6 pt-4">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            請選擇您要將此貼圖複製到的頁面。貼圖在目標頁面上的張貼位置與大小，將與當前頁面完全相同。
          </p>
        </div>

        {/* 頁面列表 */}
        <div className="flex-1 p-6 overflow-y-auto">
          {eligiblePages.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-12">
              <p className="text-sm font-bold text-slate-500">沒有其他可供張貼的頁面。</p>
              <p className="text-xs text-slate-400 mt-1">此 PDF 文件只有一頁，或其餘頁面已被刪除。</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* 全選/取消全選工具列 */}
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-2">
                <span>已選擇：{selectedPageIds.size} 頁</span>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="text-indigo-500 hover:underline"
                  >
                    全選
                  </button>
                  <span>|</span>
                  <button
                    type="button"
                    onClick={handleSelectNone}
                    className="text-slate-500 hover:underline"
                  >
                    清空
                  </button>
                </div>
              </div>

              {/* 縮圖網格 (3列) */}
              <div className="grid grid-cols-3 gap-3">
                {eligiblePages.map((page) => {
                  const isChecked = selectedPageIds.has(page.id);
                  return (
                    <div
                      key={page.id}
                      onClick={() => handleTogglePage(page.id)}
                      className={`relative flex flex-col items-center rounded-xl border p-2 cursor-pointer bg-slate-50/50 dark:bg-slate-950/20 transition-all select-none
                        ${isChecked
                          ? "border-indigo-500 ring-1 ring-indigo-500 bg-indigo-500/[0.01]"
                          : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                        }
                      `}
                    >
                      {/* Checkbox */}
                      <div className={`absolute top-2 left-2 z-10 flex h-4.5 w-4.5 items-center justify-center rounded border text-white transition-all
                        ${isChecked ? "bg-indigo-500 border-indigo-500" : "border-slate-300 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95"}
                      `}>
                        {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                      </div>
                      
                      {/* 頁碼 */}
                      <span className="absolute top-2 right-2 z-10 rounded bg-slate-900/60 text-white font-bold px-1.5 py-0.5 text-[9px] tracking-wider">
                        第 {page.pageNumber} 頁
                      </span>

                      {/* 頁面縮圖 */}
                      <div className="w-full aspect-[3/4] overflow-hidden rounded bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={page.thumbnailUrl}
                          alt={`Page ${page.pageNumber}`}
                          className="max-w-full max-h-full object-contain pointer-events-none select-none"
                          style={{
                            transform: `rotate(${page.rotation}deg)`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 底部按鈕 */}
        <div className="border-t border-slate-200 dark:border-slate-800 px-6 py-4 bg-white dark:bg-slate-900 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="h-9 px-4 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 text-xs font-semibold text-slate-600 dark:text-slate-300 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            disabled={eligiblePages.length === 0}
            className="flex items-center gap-1.5 h-9 px-4 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white font-semibold text-xs transition-colors shadow-md shadow-indigo-500/20 disabled:opacity-50"
          >
            <Check className="h-4 w-4" /> 確認套用
          </button>
        </div>

      </div>
    </div>
  );
}
