"use client";

import { useEffect, useCallback } from "react";
import Image from "next/image";
import { WorkItem } from "@/lib/types";

interface WorkModalProps {
  work: WorkItem;
  onClose: () => void;
}

export default function WorkModal({ work, onClose }: WorkModalProps) {
  // Close on Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    },
    [onClose],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    // Prevent body scroll
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [handleKeyDown]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${work.studentName} - ${work.assignmentName}`}
    >
      {/* Modal content - stop propagation to prevent closing when clicking inside */}
      <div
        className="relative flex max-h-[90vh] max-w-[90vw] flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute -right-2 -top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-md transition hover:bg-gray-100"
          aria-label="閉じる"
        >
          <svg
            className="h-5 w-5 text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {/* Image */}
        <div className="relative max-h-[75vh] max-w-[90vw]">
          <Image
            src={work.imageUrl}
            alt={`${work.studentName} - ${work.assignmentName}`}
            width={1280}
            height={960}
            className="max-h-[75vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
            style={{ width: "auto", height: "auto" }}
            priority
          />
        </div>

        {/* Info below image */}
        <div className="mt-4 w-full rounded-lg bg-white/95 px-4 py-3 shadow-lg backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">
                {work.studentName}
              </p>
              <p className="text-xs text-gray-500">{work.assignmentName}</p>
            </div>
            {work.badges.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {work.badges.map((badge) => (
                  <span
                    key={badge.id}
                    className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800"
                  >
                    ⭐ {badge.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
