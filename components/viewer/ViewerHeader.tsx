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
  return (
    <header className="shrink-0 border-b border-slate-200 bg-white font-plex-mono">
      <div className="flex items-center justify-between px-4 py-2 md:px-8">
        <h1 className="text-lg font-light text-slate-500">Adobe Works</h1>
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

  return (
    <div
      className="flex items-center overflow-hidden rounded-md border border-slate-300"
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
          className={`px-3 py-1 text-xs font-medium transition border-r border-slate-300 last:border-r-0 ${
            version === v.id
              ? "bg-accent-a text-white"
              : v.available
                ? "bg-white text-slate-600 hover:bg-slate-200"
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

  const currentLabel =
    UI_VERSIONS.find((v) => v.id === version)?.label ?? "A";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label="UIバージョン切り替え"
        className="flex h-8 w-8 items-center justify-center border border-slate-300 text-slate-500 transition hover:border-accent-a hover:text-accent-a"
      >
        <PaintBrushIcon className="h-4 w-4" />
      </button>

      {open && (
        <div className="fixed right-4 top-12 z-50 min-w-[8rem] border border-slate-200 bg-white shadow-lg">
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
                  ? "font-medium text-accent-a bg-accent-a-soft"
                  : v.available
                    ? "text-slate-500 hover:bg-slate-100"
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
