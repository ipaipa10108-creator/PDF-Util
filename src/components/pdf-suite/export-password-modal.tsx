"use client";

import React, { useState, useRef, useEffect } from "react";
import { ShieldCheck, Shield, ShieldOff, Eye, EyeOff, X, KeyRound } from "lucide-react";

export type ExportPasswordMode = "remove" | "keep" | "new";

export interface ExportPasswordModalProps {
  /** 原始 PDF 是否有密碼保護 */
  hasPassword: boolean;
  /** 原始密碼（有密碼時才傳） */
  originalPassword?: string;
  onConfirm: (mode: ExportPasswordMode, newPassword?: string) => void;
  onCancel: () => void;
}

interface ModeOption {
  id: ExportPasswordMode;
  icon: React.ReactNode;
  label: string;
  desc: string;
  color: string;
  showWhenNoPassword?: boolean;
}

export function ExportPasswordModal({
  hasPassword,
  originalPassword,
  onConfirm,
  onCancel,
}: ExportPasswordModalProps) {
  const [mode, setMode] = useState<ExportPasswordMode>(hasPassword ? "keep" : "remove");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const newPassRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (mode === "new") {
      setTimeout(() => newPassRef.current?.focus(), 80);
    }
  }, [mode]);

  const passwordMismatch = mode === "new" && confirmPassword.length > 0 && newPassword !== confirmPassword;
  const canConfirm =
    mode !== "new" ||
    (newPassword.length > 0 && newPassword === confirmPassword);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!canConfirm) return;
    if (mode === "new") {
      onConfirm("new", newPassword);
    } else if (mode === "keep") {
      onConfirm("keep", originalPassword);
    } else {
      onConfirm("remove");
    }
  };

  const options: ModeOption[] = [
    ...(hasPassword
      ? [
          {
            id: "keep" as ExportPasswordMode,
            icon: <Shield className="h-5 w-5" />,
            label: "保留原始密碼",
            desc: "使用與來源文件相同的密碼保護匯出的 PDF",
            color: "indigo",
          },
        ]
      : []),
    {
      id: "new",
      icon: <KeyRound className="h-5 w-5" />,
      label: "設定新密碼",
      desc: "為匯出的 PDF 設定一組全新的開啟密碼",
      color: "amber",
      showWhenNoPassword: true,
    },
    {
      id: "remove",
      icon: <ShieldOff className="h-5 w-5" />,
      label: hasPassword ? "解除密碼保護" : "不設定密碼",
      desc: hasPassword
        ? "移除密碼，匯出的 PDF 可直接開啟，無需輸入密碼"
        : "直接匯出，不為 PDF 添加任何密碼保護",
      color: "slate",
    },
  ];

  const colorMap: Record<string, { ring: string; bg: string; text: string; dot: string }> = {
    indigo: {
      ring: "border-indigo-400 dark:border-indigo-500",
      bg: "bg-indigo-50/60 dark:bg-indigo-950/20",
      text: "text-indigo-700 dark:text-indigo-300",
      dot: "bg-indigo-500",
    },
    amber: {
      ring: "border-amber-400 dark:border-amber-500",
      bg: "bg-amber-50/60 dark:bg-amber-950/20",
      text: "text-amber-700 dark:text-amber-300",
      dot: "bg-amber-500",
    },
    slate: {
      ring: "border-slate-300 dark:border-slate-600",
      bg: "bg-slate-50/60 dark:bg-slate-800/30",
      text: "text-slate-600 dark:text-slate-400",
      dot: "bg-slate-400",
    },
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onKeyDown={(e) => e.key === "Escape" && onCancel()}
    >
      <div className="absolute inset-0" onClick={onCancel} />

      <div className="relative w-full max-w-md rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden">
        {/* 頂部色彩條 */}
        <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

        <div className="p-6">
          {/* 關閉按鈕 */}
          <button
            onClick={onCancel}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>

          {/* 標題 */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50">
              <ShieldCheck className="h-5 w-5 text-indigo-500 dark:text-indigo-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
                匯出密碼設定
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                請選擇匯出 PDF 的密碼保護方式
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-2.5">
            {/* 模式選擇 */}
            {options.map((opt) => {
              const isSelected = mode === opt.id;
              const c = colorMap[opt.color];
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setMode(opt.id)}
                  className={`w-full flex items-start gap-3 p-3.5 rounded-xl border-2 text-left transition-all duration-150
                    ${isSelected ? `${c.ring} ${c.bg}` : "border-slate-200/70 dark:border-slate-700/70 hover:border-slate-300 dark:hover:border-slate-600 bg-transparent"}
                  `}
                >
                  {/* 自訂 Radio */}
                  <div className="mt-0.5 shrink-0 h-4 w-4 rounded-full border-2 flex items-center justify-center transition-colors
                    ${isSelected ? c.ring : 'border-slate-300 dark:border-slate-600'}"
                    style={{ borderColor: isSelected ? undefined : undefined }}
                  >
                    <div className={`h-2 w-2 rounded-full transition-all ${isSelected ? c.dot : "scale-0"}`} />
                  </div>

                  {/* 圖示 */}
                  <div className={`shrink-0 mt-0.5 ${isSelected ? c.text : "text-slate-400 dark:text-slate-500"}`}>
                    {opt.icon}
                  </div>

                  {/* 文字 */}
                  <div className="min-w-0">
                    <p className={`text-sm font-semibold ${isSelected ? c.text : "text-slate-700 dark:text-slate-300"}`}>
                      {opt.label}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                      {opt.desc}
                    </p>
                  </div>
                </button>
              );
            })}

            {/* 新密碼輸入（僅 "new" 模式顯示） */}
            {mode === "new" && (
              <div className="mt-1 space-y-2.5 pt-1">
                {/* 新密碼 */}
                <div className="relative">
                  <input
                    ref={newPassRef}
                    type={showNew ? "text" : "password"}
                    id="new-pdf-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="輸入新密碼"
                    className="w-full h-10 pl-4 pr-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100 text-sm font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 dark:focus:border-amber-500 dark:focus:ring-amber-500/20 transition-colors"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                {/* 確認密碼 */}
                <div className="relative">
                  <input
                    type={showConfirm ? "text" : "password"}
                    id="confirm-pdf-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="再次輸入密碼確認"
                    className={`w-full h-10 pl-4 pr-11 rounded-xl border bg-slate-50 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100 text-sm font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-colors
                      ${passwordMismatch
                        ? "border-red-400 dark:border-red-500 focus:ring-red-400/30"
                        : "border-slate-200 dark:border-slate-700 focus:ring-amber-400/30 focus:border-amber-400 dark:focus:border-amber-500"
                      }
                    `}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                {passwordMismatch && (
                  <p className="text-xs text-red-500 dark:text-red-400 pl-1">兩次輸入的密碼不一致</p>
                )}
              </div>
            )}

            {/* 操作按鈕 */}
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 h-10 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={!canConfirm}
                className="flex-1 h-10 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white text-sm font-bold transition-all shadow-sm shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                確認匯出
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
