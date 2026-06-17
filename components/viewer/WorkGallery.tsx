"use client";

import { WorkItem } from "@/lib/types";
import WorkCard from "./WorkCard";

interface WorkGalleryProps {
  works: WorkItem[];
  hasMore: boolean;
  loading: boolean;
  onLoadMore: () => void;
  onWorkClick: (work: WorkItem) => void;
}

export default function WorkGallery({
  works,
  hasMore,
  loading,
  onLoadMore,
  onWorkClick,
}: WorkGalleryProps) {
  if (!loading && works.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <svg
          className="mb-4 h-16 w-16 text-gray-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z"
          />
        </svg>
        <p className="text-lg font-medium text-gray-500">
          作品がまだアップロードされていません
        </p>
        <p className="mt-1 text-sm text-gray-400">
          教員が作品をアップロードすると、ここに表示されます
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 items-start">
        {works.map((work) => (
          <WorkCard
            key={work.id}
            work={work}
            onClick={() => onWorkClick(work)}
          />
        ))}
      </div>

      {/* Load More */}
      {hasMore && (
        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={loading}
            className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg
                  className="h-4 w-4 animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                読み込み中...
              </span>
            ) : (
              "もっと見る"
            )}
          </button>
        </div>
      )}

      {/* Initial loading state */}
      {loading && works.length === 0 && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-lg border border-gray-200 bg-white"
            >
              <div className="aspect-square w-full rounded-t-lg bg-gray-200" />
              <div className="p-3">
                <div className="h-4 w-2/3 rounded bg-gray-200" />
                <div className="mt-2 h-3 w-1/2 rounded bg-gray-200" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
