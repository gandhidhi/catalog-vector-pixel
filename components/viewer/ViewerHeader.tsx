"use client";

import { useEffect, useRef, useState } from "react";
import { PaintBrushIcon } from "@heroicons/react/24/outline";
import { UI_VERSIONS, useUIVersion } from "./ui-version";

/**
 * 全UIバージョン共通のヘッダー。
 * デスクトップ: ボタングループ
 * モバイル: アイコン + プルダウン
 */
export default function ViewerHeader() {
  const { version } = useUIVersion();
  const isB = version === "b";

  return (
    <header
      className={`shrink-0 border-b font-plex-mono ${
        isB ? "border-orange-200 bg-orange-100" : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex items-center justify-between px-4 py-2 md:px-8">
        <h1
          className={`text-lg font-light ${
            isB ? "font-dot text-orange-600" : "text-slate-500"
          }`}
        >
          Adobe Works
        </h1>
        {/* デスクトップ: ボタングループ */}
        <div className="hidden md:block">
          <UIVersionButtonGroup />
        </div>
        {/* モバイル: プルダウン */}
        <div className="md:hidden">
          <UIVersionDropdown />
        </div>
      </div>
    </header>
  );
}

function UIVersionButtonGroup() {
  const { version, setVersion } = useUIVersion();
  const isB = version === "b";

  return (
    <div
      className={`flex items-center overflow-hidden rounded-md border ${
        isB ? "border-orange-300" : "border-slate-300"
      }`}
      role="group"
      aria-label="UIバージョン切り替え"
    >
      {UI_VERSIONS.map((v) => (
        <button
          key={v.id}
          type="button"
          disabled={!v.available}
          onClick={() => v.available && setVersion(v.id)}
          title={v.available ? `UIパターン${v.label}` : "準備中"}
          aria-pressed={version === v.id}
          className={`px-3 py-1 text-xs font-medium transition border-r last:border-r-0 ${
            isB ? "border-orange-300" : "border-slate-300"
          } ${
            version === v.id
              ? isB
                ? "bg-orange-500 text-white"
                : "bg-accent-a text-white"
              : v.available
                ? isB
                  ? "bg-orange-100 text-orange-500 hover:bg-orange-200"
                  : "bg-white text-slate-600 hover:bg-slate-200"
                : isB
                  ? "cursor-not-allowed bg-orange-100 text-orange-300"
                  : "cursor-not-allowed bg-white text-slate-300"
          }`}
        >
          {v.label}
        </button>
      ))}
    </div>
  );
}

function UIVersionDropdown() {
  const { version, setVersion } = useUIVersion();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const isB = version === "b";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label="UIバージョン切り替え"
        className={`flex h-8 w-8 items-center justify-center border transition ${
          isB
            ? "border-orange-300 text-orange-500 hover:border-orange-500 hover:text-orange-600"
            : "border-slate-300 text-slate-500 hover:border-accent-a hover:text-accent-a"
        }`}
      >
        <PaintBrushIcon className="h-4 w-4" />
      </button>

      {open && (
        <div
          className={`fixed right-4 top-12 z-50 min-w-[8rem] border bg-white shadow-lg ${
            isB ? "border-orange-200" : "border-slate-200"
          }`}
        >
          {UI_VERSIONS.map((v) => (
            <button
              key={v.id}
              type="button"
              disabled={!v.available}
              onClick={() => {
                if (v.available) {
                  setVersion(v.id);
                  setOpen(false);
                }
              }}
              className={`block w-full px-4 py-2.5 text-left text-xs transition ${
                version === v.id
                  ? isB
                    ? "bg-orange-50 font-medium text-orange-600"
                    : "font-medium text-accent-a bg-accent-a-soft"
                  : v.available
                    ? isB
                      ? "text-stone-500 hover:bg-orange-50"
                      : "text-slate-500 hover:bg-slate-100"
                    : "cursor-not-allowed text-slate-300"
              }`}
            >
              UI {v.label}
              {!v.available && (
                <span className="ml-1 text-[10px] text-slate-300">
                  (準備中)
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
