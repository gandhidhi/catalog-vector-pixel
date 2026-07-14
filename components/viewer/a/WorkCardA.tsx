"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { WorkItem } from "@/lib/types";

interface WorkCardAProps {
  work: WorkItem;
  onClick: () => void;
}

/**
 * Aパターンの作品カード（エディトリアル調・ミニマル）。
 * 正方形画像 → 学生名 → タグ の縦積み。
 * タグ行の中にスクロールボタンを置くため、カード全体ではなく
 * 画像+学生名の部分だけをクリック領域（ボタン）にしている。
 */
export default function WorkCardA({ work, onClick }: WorkCardAProps) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={onClick}
        aria-label={`${work.studentName}の${work.assignmentName}を拡大表示`}
        className="group block w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-a"
      >
        {/* 額縁: 白いマットの内側に画像を余白付きで収める */}
        <div className="aspect-square w-full bg-white p-2">
          <div className="relative h-full w-full overflow-hidden bg-slate-100">
            {imgError ? (
              <div className="flex h-full w-full items-center justify-center text-slate-300">
                <svg
                  className="h-10 w-10"
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
                fill
                sizes="(max-width: 768px) 80vw, 320px"
                className="object-cover transition duration-300 group-hover:scale-[1.03]"
                onError={() => setImgError(true)}
              />
            )}
          </div>
        </div>

        <p className="mt-2.5 truncate text-xs font-normal text-slate-500">{work.studentName}</p>
      </button>

      {/* タグの有無でカードの縦幅が変わらないよう、行の高さは常に確保する */}
      <div className="mt-1.5 h-5">
        {work.badges.length > 0 && <BadgeRow badges={work.badges} />}
      </div>
    </div>
  );
}

/**
 * タグを1行で表示し、幅を超えた分は隠す。
 * 隠れたタグがあるときだけ右端に送りボタンを表示する。
 */
function BadgeRow({ badges }: { badges: WorkItem["badges"] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hasPrev, setHasPrev] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  const updateButtons = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setHasPrev(el.scrollLeft > 1);
    setHasMore(el.scrollWidth - el.clientWidth - el.scrollLeft > 1);
  }, []);

  useEffect(() => {
    updateButtons();
    window.addEventListener("resize", updateButtons);
    return () => window.removeEventListener("resize", updateButtons);
  }, [updateButtons, badges.length]);

  function scrollByRow(direction: 1 | -1) {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: "smooth" });
  }

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        onScroll={updateButtons}
        className={`scrollbar-hidden flex gap-1 overflow-x-auto ${hasMore ? "pr-6" : ""} ${hasPrev ? "pl-6" : ""}`}
      >
        {badges.map((badge) => (
          <span
            key={badge.id}
            className="inline-flex shrink-0 items-center whitespace-nowrap border border-slate-500 px-1.5 py-px text-[10px] text-slate-500"
          >
            ⭐ {badge.name}
          </span>
        ))}
      </div>

      {hasPrev && (
        <div className="absolute inset-y-0 left-0 flex items-center bg-gradient-to-r from-slate-50 via-slate-50/80 to-transparent pr-4">
          <BadgeRowArrow direction={-1} onClick={() => scrollByRow(-1)} />
        </div>
      )}

      {hasMore && (
        <div className="absolute inset-y-0 right-0 flex items-center bg-gradient-to-l from-slate-50 via-slate-50/80 to-transparent pl-4">
          <BadgeRowArrow direction={1} onClick={() => scrollByRow(1)} />
        </div>
      )}
    </div>
  );
}

function BadgeRowArrow({ direction, onClick }: { direction: 1 | -1; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={direction === 1 ? "隠れているタグを表示" : "前のタグに戻る"}
      className="flex h-[18px] w-[18px] items-center justify-center border border-slate-200 bg-white text-slate-400 shadow-sm transition hover:border-accent-a hover:text-accent-a"
    >
      <svg
        className="h-3 w-3"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d={direction === 1 ? "M9 5l7 7-7 7" : "M15 19l-7-7 7-7"}
        />
      </svg>
    </button>
  );
}
