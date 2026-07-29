"use client";

import { useEffect, useState } from "react";
import {
  XMarkIcon,
  ArrowsPointingInIcon,
  ArrowsPointingOutIcon,
} from "@heroicons/react/24/outline";

interface PdfPreviewModalProps {
  pdfUrl: string;
  title?: string;
  subtitle?: string;
  onClose: () => void;
}

/**
 * PDFプレビューモーダル。
 * ブラウザ内蔵のPDFビューアー（iframe）を使用。
 * CORSの問題を回避しつつ、ページ送り・ズーム・ダウンロードはブラウザ標準UIで対応。
 * Escキーまたは背景クリックで閉じる。
 * ヘッダーの縮小ボタンで情報表示をトグル。
 */
export default function PdfPreviewModal({
  pdfUrl,
  title,
  subtitle,
  onClose,
}: PdfPreviewModalProps) {
  const [headerHidden, setHeaderHidden] = useState(false);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-slate-900/90"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title ?? "PDFプレビュー"}
    >
      {/* Header */}
      <div
        className={`flex shrink-0 items-center justify-between px-4 transition-all duration-200 ease-out ${
          headerHidden
            ? "h-12 border-b border-transparent"
            : "border-b border-white/10 py-3"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* タイトル（非表示モードでは隠す） */}
        <div className={`min-w-0 transition-opacity duration-200 ${headerHidden ? "opacity-0" : "opacity-100"}`}>
          {title && (
            <p className="truncate text-sm font-medium text-white">{title}</p>
          )}
          {subtitle && (
            <p className="truncate text-xs text-slate-400">{subtitle}</p>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* 縮小/拡大トグルボタン */}
          <button
            type="button"
            onClick={() => setHeaderHidden((h) => !h)}
            aria-label={headerHidden ? "情報を表示" : "情報を非表示"}
            className={`flex h-8 w-8 items-center justify-center rounded transition ${
              headerHidden
                ? "text-slate-500 hover:bg-slate-800 hover:text-slate-300"
                : "text-white/70 hover:bg-white/10 hover:text-white"
            }`}
          >
            {headerHidden ? (
              <ArrowsPointingOutIcon className="h-5 w-5" />
            ) : (
              <ArrowsPointingInIcon className="h-5 w-5" />
            )}
          </button>

          {/* 閉じるボタン */}
          <button
            type="button"
            onClick={onClose}
            aria-label="閉じる"
            className={`flex h-8 w-8 items-center justify-center rounded transition ${
              headerHidden
                ? "text-slate-500 hover:bg-slate-800 hover:text-slate-300"
                : "text-white/70 hover:bg-white/10 hover:text-white"
            }`}
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* PDF iframe */}
      <div
        className="min-h-0 flex-1 p-2"
        onClick={(e) => e.stopPropagation()}
      >
        <iframe
          src={pdfUrl}
          className="h-full w-full rounded bg-white"
          title={title ?? "PDFプレビュー"}
        />
      </div>
    </div>
  );
}
