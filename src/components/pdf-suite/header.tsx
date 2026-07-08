import { 
  Sun, 
  Moon, 
  RotateCw, 
  RotateCcw, 
  Trash2, 
  FileSignature, 
  Download, 
  Share2, 
  RefreshCw, 
  FileText,
  CheckSquare,
  Square
} from "lucide-react";

export interface HeaderProps {
  fileName: string | null;
  totalPages: number;
  selectedCount: number;
  onSelectAll: () => void;
  onSelectOdds: () => void;
  onSelectEvens: () => void;
  onSelectNone: () => void;
  onRotateSelected: (degrees: number) => void;
  onDeleteSelected: () => void;
  onOpenSignatureModal: () => void;
  onExport: () => void;
  onShare: () => void;
  onReset: () => void;
  isExporting: boolean;
  canShare: boolean;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

export function Header({
  fileName,
  totalPages,
  selectedCount,
  onSelectAll,
  onSelectOdds,
  onSelectEvens,
  onSelectNone,
  onRotateSelected,
  onDeleteSelected,
  onOpenSignatureModal,
  onExport,
  onShare,
  onReset,
  isExporting,
  canShare,
  isDarkMode,
  onToggleDarkMode,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 w-full border-b backdrop-blur-md transition-colors duration-200 bg-white/80 border-slate-200 dark:bg-slate-900/80 dark:border-slate-800">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* LOGO 與標題 */}
        <div className="flex items-center gap-2 cursor-pointer" onClick={onReset}>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/30">
            <FileText className="h-5.5 w-5.5" />
          </div>
          <span className="hidden text-lg font-bold bg-gradient-to-r from-indigo-500 to-violet-500 bg-clip-text text-transparent sm:block">
            Local PDF Suite
          </span>
        </div>

        {/* 檔案資訊與主要控制區 (當有載入 PDF 時) */}
        {fileName && (
          <div className="hidden flex-1 items-center justify-center gap-4 px-6 md:flex">
            <div className="flex items-center gap-2 rounded-lg bg-slate-100 dark:bg-slate-800/60 px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 font-medium max-w-[200px] truncate">
              <span className="truncate">{fileName}</span>
              <span className="rounded bg-slate-200 dark:bg-slate-700 px-1 py-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                {totalPages} 頁
              </span>
            </div>
            
            {/* 快速選取分組 */}
            <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 p-1">
              <button
                onClick={onSelectAll}
                className="rounded px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-indigo-500 dark:text-slate-300 dark:hover:text-indigo-400 transition-colors"
                title="全選所有頁面"
              >
                全選
              </button>
              <span className="text-slate-300 dark:text-slate-700 text-xs">|</span>
              <button
                onClick={onSelectOdds}
                className="rounded px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-indigo-500 dark:text-slate-300 dark:hover:text-indigo-400 transition-colors"
                title="選取單數頁面"
              >
                單數
              </button>
              <span className="text-slate-300 dark:text-slate-700 text-xs">|</span>
              <button
                onClick={onSelectEvens}
                className="rounded px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-indigo-500 dark:text-slate-300 dark:hover:text-indigo-400 transition-colors"
                title="選取雙數頁面"
              >
                雙數
              </button>
              <span className="text-slate-300 dark:text-slate-700 text-xs">|</span>
              <button
                onClick={onSelectNone}
                className="rounded px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-rose-500 dark:text-slate-300 dark:hover:text-rose-400 transition-colors"
                title="清除所有選取"
              >
                清空
              </button>
            </div>
          </div>
        )}

        {/* 右側操作按鈕 */}
        <div className="flex items-center gap-2">
          {fileName && (
            <div className="flex items-center gap-1.5 border-r border-slate-200 dark:border-slate-800 pr-3 mr-1">
              {/* 旋轉功能按鈕 */}
              <button
                onClick={() => onRotateSelected(270)}
                disabled={selectedCount === 0}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:hover:bg-transparent transition-all"
                title="選取頁面逆時針旋轉 90°"
              >
                <RotateCcw className="h-4.5 w-4.5" />
              </button>
              <button
                onClick={() => onRotateSelected(180)}
                disabled={selectedCount === 0}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:hover:bg-transparent transition-all"
                title="選取頁面旋轉 180°"
              >
                <RefreshCw className="h-4.5 w-4.5" />
              </button>
              <button
                onClick={() => onRotateSelected(90)}
                disabled={selectedCount === 0}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:hover:bg-transparent transition-all"
                title="選取頁面順時針旋轉 90°"
              >
                <RotateCw className="h-4.5 w-4.5" />
              </button>

              {/* 刪除功能按鈕 */}
              <button
                onClick={onDeleteSelected}
                disabled={selectedCount === 0}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 dark:border-red-950/40 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-600 dark:text-red-400 disabled:opacity-40 disabled:hover:bg-transparent transition-all"
                title="刪除選取頁面"
              >
                <Trash2 className="h-4.5 w-4.5" />
              </button>

              {/* 新增簽章按鈕 */}
              <button
                onClick={onOpenSignatureModal}
                className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-indigo-200 dark:border-indigo-900/40 bg-indigo-50/50 hover:bg-indigo-50 dark:bg-indigo-950/20 dark:hover:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 transition-all font-semibold text-xs"
                title="建立或管理電子簽章"
              >
                <FileSignature className="h-4 w-4" />
                <span>簽章</span>
              </button>
            </div>
          )}

          {/* 深淺色模式切換 */}
          <button
            onClick={onToggleDarkMode}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-all"
            title={isDarkMode ? "切換至淺色模式" : "切換至深色模式"}
          >
            {isDarkMode ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
          </button>

          {/* 導出與分享按鈕 */}
          {fileName && (
            <div className="flex items-center gap-1.5 ml-1">
              <button
                onClick={onExport}
                disabled={isExporting}
                className="flex items-center gap-1.5 h-9 px-3 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 text-white font-semibold text-xs hover:from-indigo-600 hover:to-violet-600 shadow-md shadow-indigo-500/20 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:scale-100 disabled:hover:from-indigo-500 transition-all"
                title="下載編輯後的 PDF"
              >
                <Download className="h-4 w-4" />
                <span>{isExporting ? "導出中..." : "下載"}</span>
              </button>

              {canShare && (
                <button
                  onClick={onShare}
                  disabled={isExporting}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 transition-all"
                  title="使用原生分享"
                >
                  <Share2 className="h-4.5 w-4.5" />
                </button>
              )}
            </div>
          )}
        </div>

      </div>
    </header>
  );
}
