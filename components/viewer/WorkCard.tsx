"use client";

import { useState } from "react";
import Image from "next/image";
import { WorkItem } from "@/lib/types";

interface WorkCardProps {
  work: WorkItem;
  onClick: () => void;
}

export default function WorkCard({ work, onClick }: WorkCardProps) {
  const [imgError, setImgError] = useState(false);

  return (
    <button
      type="button"
      className="group cursor-pointer rounded-lg border border-gray-200 bg-white shadow-sm transition hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-400"
      onClick={onClick}
      aria-label={`${work.studentName}の${work.assignmentName}を拡大表示`}
    >
      {/* Thumbnail */}
      <div className="relative aspect-square w-full overflow-hidden rounded-t-lg bg-gray-100">
        {imgError ? (
          <div className="flex h-full w-full items-center justify-center bg-gray-200 text-gray-400">
            <svg
              className="h-12 w-12"
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
          </div>
        ) : (
          <Image
            src={work.imageUrl}
            alt={`${work.studentName} - ${work.assignmentName}`}
            className="h-full w-full object-cover transition group-hover:scale-105"
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
            onError={() => setImgError(true)}
          />
        )}
      </div>

      {/* Info */}
      <div className="p-3 text-left">
        <p className="truncate text-sm font-medium text-gray-900">
          {work.studentName}
        </p>
        <p className="truncate text-xs text-gray-500">
          {work.assignmentName}
        </p>

        {/* Badges - fixed height for up to 3 badges */}
        <div className="mt-1.5 flex flex-wrap gap-0.5 h-[2.75rem] content-start items-start">
          {work.badges.map((badge) => (
            <span
              key={badge.id}
              className="inline-flex items-center rounded-full bg-yellow-100 px-1.5 text-[10px] font-medium text-yellow-800 h-[1.2rem]"
            >
              ⭐ {badge.name}
            </span>
          ))}
        </div>
      </div>
    </button>
  );
}
