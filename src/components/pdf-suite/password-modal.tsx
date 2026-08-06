"use client";

import React, { useState, useRef, useEffect } from "react";
import { Lock, X, Eye, EyeOff, AlertCircle } from "lucide-react";

export interface PasswordModalProps {
  fileName: string;
  errorMessage?: string | null;
  isLoading?: boolean;
  onConfirm: (password: string) => void;
  onCancel: () => void;
}

export function PasswordModal({
  fileName,
  errorMessage,
  isLoading = false,
  onConfirm,
  onCancel,
}: PasswordModalProps) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // 開啟時自動 focus
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!password || isLoading) return;
    onConfirm(password);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") onCancel();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onKeyDown={handleKeyDown}
    >
      {/* 點擊背景關閉 */}
      <div className="absolute inset-0" onClick={onCancel} />

      <div className="relative w-full max-w-md rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden animate-slide-up">
        {/* 頂部色彩條 */}
        <div className="h-1 w-full bg-gradient-to-r from-amber-400 via-orange-400 to-red-400" />

        <div className="p-6">
          {/* 關閉按鈕 */}
          <button
            onClick={onCancel}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>

          {/* 圖示 + 標題 */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/50 mb-4 shadow-sm">
              <Lock className="h-7 w-7 text-amber-500 dark:text-amber-400" />
            </div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1">
              此 PDF 受密碼保護
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed">
              請輸入密碼以開啟{" "}
              <span className="font-semibold text-slate-700 dark:text-slate-300 break-all">
                {fileName}
              </span>
            </p>
          </div>

          {/* 表單 */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 密碼輸入框 */}
            <div className="relative">
              <input
                ref={inputRef}
                type={showPassword ? "text" : "password"}
                id="pdf-password-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="輸入 PDF 密碼"
                disabled={isLoading}
                className={`w-full h-11 pl-4 pr-11 rounded-xl border text-sm font-medium transition-colors
                  bg-slate-50 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100
                  placeholder:text-slate-400 dark:placeholder:text-slate-500
                  focus:outline-none focus:ring-2 focus:ring-offset-0
                  ${
                    errorMessage
                      ? "border-red-400 dark:border-red-500 focus:ring-red-400/30 dark:focus:ring-red-500/30"
                      : "border-slate-200 dark:border-slate-700 focus:border-indigo-400 dark:focus:border-indigo-500 focus:ring-indigo-400/20 dark:focus:ring-indigo-500/20"
                  }
                  ${isLoading ? "opacity-60 cursor-not-allowed" : ""}
                `}
              />
              {/* 顯示/隱藏密碼切換 */}
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>

            {/* 錯誤訊息 */}
            {errorMessage && (
              <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/40 rounded-xl px-3 py-2.5">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* 操作按鈕 */}
            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={onCancel}
                disabled={isLoading}
                className="flex-1 h-10 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={!password || isLoading}
                className="flex-1 h-10 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-sm font-bold transition-all shadow-sm shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    驗證中...
                  </span>
                ) : (
                  "開啟文件"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
