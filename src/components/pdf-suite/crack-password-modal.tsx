"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { X, Zap, Square, Copy, Check, ChevronRight, KeyRound, AlertTriangle } from "lucide-react";
import { testPdfPassword } from "@/lib/pdf-utils";

// ─── 常見密碼字典 ──────────────────────────────────────────────────────────────
const COMMON_PASSWORDS: string[] = [
  // 全球最常見密碼
  "123456","password","12345678","qwerty","123456789","12345","1234","111111",
  "1234567","dragon","123123","baseball","abc123","football","monkey","letmein",
  "shadow","master","666666","qwertyuiop","123321","mustang","1234567890",
  "michael","superman","batman","trustno1","sunshine","princess","welcome",
  "password1","iloveyou","admin","login","hello","pass","test","guest",
  "password123","000000","654321","1q2w3e4r","qazwsx","zxcvbnm","asdfgh",
  "1qaz2wsx","q1w2e3r4","123qwe","1qazxsw2","aaaaaa","passw0rd","p@ssword",
  // 常見數字組合
  "0000","0000000","00000000","1111","11111","111111","1111111","11111111",
  "2222","3333","4444","5555","6666","7777","8888","9999",
  "1212","2121","1122","2211","1234","4321","1230","0123",
  "1357","2468","1010","2020","3030","1314","5201314","0520",
  // 年份 (常用於密碼)
  "1990","1991","1992","1993","1994","1995","1996","1997","1998","1999",
  "2000","2001","2002","2003","2004","2005","2006","2007","2008","2009",
  "2010","2011","2012","2013","2014","2015","2016","2017","2018","2019",
  "2020","2021","2022","2023","2024","2025",
  // 台灣/中文常見密碼
  "0912","0910","0911","0922","0933","0966","0988","0977",
  "a1234","a12345","a123456","A1234","A12345","A123456",
  "abc","abcd","abcde","abcdef","abcdefg","abcdefgh",
  "ABCD","abCD","Ab12","ab12","Ab1234","ab1234",
  "aaa","bbb","ccc","aabb","abab",
  "pass123","Pass123","PASS123",
  "admin123","Admin123","administrator",
  "root","toor","user","1111aaaa","aaaa1111",
  "qwerty123","Qwerty123","asdfghjkl",
  "zxcvbn","zxcvbnm","poiuytrewq",
  // 常見英文詞
  "apple","google","facebook","twitter","amazon","windows","microsoft",
  "love","hate","life","death","home","work","name","time",
  "china","taiwan","japan","korea","usa","america",
  "dog","cat","fish","bird","lion","tiger","bear",
  "red","blue","green","black","white","yellow",
  "happy","lucky","money","power","super","ultra","mega",
  "spring","summer","autumn","winter","monday","friday",
  "secret","hidden","private","secure","safety","protect",
  // 鍵盤路徑
  "qweasdzxc","1q2w3e","!@#$%^","!QAZ2wsx","1qaz!QAZ",
  "!@#123","123!@#",
  // 常見帳號相關
  "changeme","default","system","manager","support","service",
  "info","help","web","mail","email","ftp","ssh","vpn",
];

// ─── 工具函式 ──────────────────────────────────────────────────────────────────
function* numericGenerator(digitMin: number, digitMax: number) {
  for (let digits = digitMin; digits <= digitMax; digits++) {
    const max = Math.pow(10, digits);
    const padLen = digits;
    for (let i = 0; i < max; i++) {
      yield i.toString().padStart(padLen, "0");
    }
  }
}

const PHASE_LABELS = ["字典攻擊", "4 位數字", "5 位數字", "6 位數字"];

// ─── 元件型別 ──────────────────────────────────────────────────────────────────
export interface CrackPasswordModalProps {
  file: File;
  onFound: (password: string) => void;
  onCancel: () => void;
}

// ─── 主元件 ────────────────────────────────────────────────────────────────────
export function CrackPasswordModal({ file, onFound, onCancel }: CrackPasswordModalProps) {
  const [phase, setPhase] = useState(0);          // 目前階段索引
  const [attempt, setAttempt] = useState(0);      // 已嘗試次數
  const [total, setTotal] = useState(0);          // 本階段總數
  const [speed, setSpeed] = useState(0);          // 嘗試/秒
  const [current, setCurrent] = useState("");     // 目前密碼
  const [status, setStatus] = useState<"idle" | "running" | "found" | "failed">("idle");
  const [foundPw, setFoundPw] = useState("");
  const [copied, setCopied] = useState(false);
  const [maxPhase, setMaxPhase] = useState(1);    // 使用者選擇最多跑到哪個階段

  const stopRef = useRef(false);
  const abufRef = useRef<ArrayBuffer | null>(null);
  const speedRef = useRef({ count: 0, ts: Date.now() });

  // 預先讀取 ArrayBuffer
  useEffect(() => {
    file.arrayBuffer().then((buf) => { abufRef.current = buf; });
  }, [file]);

  const YIELD_EVERY = 10; // 每 N 次讓出主執行緒一次

  const runCrack = useCallback(async () => {
    if (!abufRef.current) return;
    stopRef.current = false;
    setStatus("running");
    setAttempt(0);

    speedRef.current = { count: 0, ts: Date.now() };
    const speedInterval = setInterval(() => {
      const now = Date.now();
      const elapsed = (now - speedRef.current.ts) / 1000;
      if (elapsed > 0) {
        setSpeed(Math.round(speedRef.current.count / elapsed));
        speedRef.current = { count: 0, ts: now };
      }
    }, 800);

    // Phase 0: 字典
    // Phase 1: 4-digit (0000–9999)
    // Phase 2: 5-digit (00000–99999)
    // Phase 3: 6-digit (000000–999999)
    const phases: Array<() => Generator<string>> = [
      () => (function* () { for (const pw of COMMON_PASSWORDS) yield pw; })(),
      () => numericGenerator(4, 4),
      () => numericGenerator(5, 5),
      () => numericGenerator(6, 6),
    ];
    const phaseTotals = [
      COMMON_PASSWORDS.length,
      10000,
      100000,
      1000000,
    ];

    let found = false;

    for (let ph = 0; ph <= maxPhase && !found && !stopRef.current; ph++) {
      setPhase(ph);
      setAttempt(0);
      setTotal(phaseTotals[ph]);

      const gen = phases[ph]();
      let localCount = 0;
      let batchCount = 0;

      for (const pw of gen) {
        if (stopRef.current) break;

        setCurrent(pw);
        const ok = await testPdfPassword(abufRef.current!, pw);
        localCount++;
        batchCount++;
        speedRef.current.count++;

        if (ok) {
          setFoundPw(pw);
          setStatus("found");
          found = true;
          break;
        }

        if (batchCount >= YIELD_EVERY) {
          batchCount = 0;
          setAttempt(localCount);
          await new Promise<void>((r) => setTimeout(r, 0));
        }
      }

      if (!found) setAttempt(phaseTotals[ph]);
    }

    clearInterval(speedInterval);
    setSpeed(0);
    if (!found && !stopRef.current) setStatus("failed");
    if (stopRef.current) setStatus("idle");
  }, [maxPhase]);

  const handleCopy = () => {
    navigator.clipboard.writeText(foundPw).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const progressPct = total > 0 ? Math.min(100, Math.round((attempt / total) * 100)) : 0;

  const isRunning = status === "running";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onKeyDown={(e) => { if (e.key === "Escape" && !isRunning) onCancel(); }}
    >
      <div className="absolute inset-0" onClick={() => { if (!isRunning) onCancel(); }} />

      <div className="relative w-full max-w-md rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden">
        {/* 頂部色彩條 */}
        <div className="h-1 w-full bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500" />

        <div className="p-6">
          {/* 關閉按鈕 */}
          <button
            onClick={onCancel}
            disabled={isRunning}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <X className="h-4 w-4" />
          </button>

          {/* 標題 */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 dark:bg-violet-950/30 border border-violet-100 dark:border-violet-900/50">
              <Zap className="h-5 w-5 text-violet-500 dark:text-violet-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">自動密碼破解</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[240px]">{file.name}</p>
            </div>
          </div>

          {/* 找到密碼！ */}
          {status === "found" && (
            <div className="mb-5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 p-4">
              <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-2 flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5" /> 找到密碼！
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded-lg bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-800/50 px-3 py-2 text-sm font-mono font-bold text-slate-800 dark:text-slate-100 tracking-widest">
                  {foundPw}
                </code>
                <button
                  onClick={handleCopy}
                  className="shrink-0 flex items-center gap-1 h-9 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold transition-colors"
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "已複製" : "複製"}
                </button>
              </div>
              <button
                onClick={() => onFound(foundPw)}
                className="mt-3 w-full h-10 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white text-sm font-bold transition-all shadow-sm shadow-emerald-500/20"
              >
                <KeyRound className="h-4 w-4" />
                使用此密碼開啟文件
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* 失敗 */}
          {status === "failed" && (
            <div className="mb-5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 p-4 flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-red-700 dark:text-red-400">破解失敗</p>
                <p className="text-xs text-red-600/80 dark:text-red-400/80 mt-0.5">
                  已嘗試所有設定的組合，未能找到正確密碼。您可以嘗試擴大範圍或手動輸入密碼。
                </p>
              </div>
            </div>
          )}

          {/* 進度區塊（執行中或待機） */}
          {status !== "found" && (
            <div className="space-y-4">
              {/* 階段選擇 */}
              {status === "idle" && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">破解範圍</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { val: 0, label: "僅字典", sub: `${COMMON_PASSWORDS.length} 組常見密碼` },
                      { val: 1, label: "字典 + 4位數", sub: "共約 1 萬次" },
                      { val: 2, label: "字典 + 5位數", sub: "共約 11 萬次" },
                      { val: 3, label: "字典 + 6位數", sub: "共約 111 萬次，較慢" },
                    ].map((opt) => (
                      <button
                        key={opt.val}
                        type="button"
                        onClick={() => setMaxPhase(opt.val)}
                        className={`flex flex-col items-start p-2.5 rounded-xl border-2 text-left transition-all text-xs
                          ${maxPhase === opt.val
                            ? "border-violet-400 dark:border-violet-500 bg-violet-50/60 dark:bg-violet-950/20"
                            : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                          }`}
                      >
                        <span className={`font-semibold ${maxPhase === opt.val ? "text-violet-700 dark:text-violet-300" : "text-slate-700 dark:text-slate-300"}`}>
                          {opt.label}
                        </span>
                        <span className="text-slate-500 dark:text-slate-400 mt-0.5">{opt.sub}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 進度資訊（執行中） */}
              {isRunning && (
                <div className="space-y-3">
                  {/* 階段指示器 */}
                  <div className="flex items-center gap-2">
                    {Array.from({ length: maxPhase + 1 }, (_, i) => (
                      <div key={i} className="flex items-center gap-1">
                        <div className={`h-1.5 w-8 rounded-full transition-colors ${i <= phase ? "bg-violet-500" : "bg-slate-200 dark:bg-slate-700"}`} />
                        {i < maxPhase && <div className="h-px w-2 bg-slate-300 dark:bg-slate-600" />}
                      </div>
                    ))}
                    <span className="text-xs text-violet-600 dark:text-violet-400 font-medium ml-1">
                      {PHASE_LABELS[phase]}
                    </span>
                  </div>

                  {/* 進度條 */}
                  <div className="relative h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-300"
                      style={{ width: `${progressPct}%` }}
                    />
                    {/* 光暈動畫 */}
                    <div
                      className="absolute inset-y-0 rounded-full bg-gradient-to-r from-violet-400/40 to-fuchsia-400/40 animate-pulse"
                      style={{ left: `${Math.max(0, progressPct - 10)}%`, width: "10%" }}
                    />
                  </div>

                  {/* 數字 */}
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>{attempt.toLocaleString()} / {total.toLocaleString()}</span>
                    <span>{progressPct}%</span>
                    {speed > 0 && <span>{speed.toLocaleString()} 次/秒</span>}
                  </div>

                  {/* 目前嘗試 */}
                  <div className="flex items-center gap-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 px-3 py-2">
                    <span className="text-xs text-slate-400 shrink-0">嘗試中：</span>
                    <code className="text-xs font-mono font-semibold text-slate-700 dark:text-slate-200 truncate">
                      {current}
                    </code>
                    <span className="ml-auto flex gap-0.5 shrink-0">
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          className="h-1 w-1 rounded-full bg-violet-500 animate-bounce"
                          style={{ animationDelay: `${i * 0.15}s` }}
                        />
                      ))}
                    </span>
                  </div>
                </div>
              )}

              {/* 操作按鈕 */}
              <div className="flex gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={onCancel}
                  disabled={isRunning}
                  className="flex-1 h-10 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  取消
                </button>

                {!isRunning ? (
                  <button
                    type="button"
                    onClick={runCrack}
                    className="flex-1 h-10 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white text-sm font-bold transition-all shadow-sm shadow-violet-500/20"
                  >
                    <Zap className="h-4 w-4" />
                    開始破解
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => { stopRef.current = true; }}
                    className="flex-1 h-10 flex items-center justify-center gap-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold transition-all"
                  >
                    <Square className="h-3.5 w-3.5 fill-white" />
                    停止
                  </button>
                )}
              </div>
            </div>
          )}

          {/* 找到密碼後的取消按鈕 */}
          {status === "found" && (
            <button
              onClick={onCancel}
              className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              關閉
            </button>
          )}

          {/* 免責聲明 */}
          <p className="mt-4 text-[10px] text-center text-slate-400 dark:text-slate-600 leading-relaxed">
            本工具僅適用於合法目的（如本人忘記密碼）。所有運算均在瀏覽器本地完成，文件不會上傳。
          </p>
        </div>
      </div>
    </div>
  );
}
