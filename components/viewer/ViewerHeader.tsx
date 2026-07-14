"use client";

import { UI_VERSIONS, useUIVersion } from "./ui-version";

/**
 * 全UIバージョン共通のヘッダー。
 * 右上のスイッチャーは常に同じ位置に表示される。
 */
export default function ViewerHeader() {
  return (
    <header className="shrink-0 border-b border-slate-200 bg-white font-plex-mono">
      <div className="flex items-center justify-between px-4 py-2 md:px-8">
        <h1 className="text-lg font-medium text-slate-500">Adobe Works</h1>
        <UIVersionSwitcher />
      </div>
    </header>
  );
}

function UIVersionSwitcher() {
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
