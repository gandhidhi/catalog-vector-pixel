"use client";

import { useEffect } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";

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
 */
export default function PdfPreviewModal({
  pdfUrl,
  title,
  subtitle,
  onClose,
}: PdfPreviewModalProps) {
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
        className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="min-w-0">
          {title && (
            <p className="truncate text-sm font-medium text-white">{title}</p>
          )}
          {subtitle && (
            <p className="truncate text-xs text-slate-400">{subtitle}</p>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="閉じる"
          className="ml-4 flex h-8 w-8 items-center justify-center rounded text-white/70 transition hover:bg-white/10 hover:text-white"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
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
