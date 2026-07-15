"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowsPointingInIcon } from "@heroicons/react/24/outline";
import { StopIcon, Squares2X2Icon } from "@heroicons/react/24/solid";
import { Assignment, WorkItem, WorkListResponse } from "@/lib/types";
import WorkCardA from "./WorkCardA";
import { GridMode, SortOptionA } from "./types";

const PAGE_SIZE = 20;

/** 拡縮（幅）アニメーションの長さ。ViewerA側のシーケンスと合わせること */
export const EXPAND_ANIMATION_MS = 500;
/** フェードイン/アウトの長さ */
export const FADE_ANIMATION_MS = 200;

interface AssignmentColumnProps {
  assignment: Assignment;
  /** 検索実行済みの学生ID（空なら全学生） */
  studentIds: string[];
  badgeIds: string[];
  /** 指定数以上のバッジが付与された作品のみ表示（0なら無効） */
  minBadges: number;
  sortBy: SortOptionA;
  onWorkClick: (work: WorkItem) => void;
  /** trueなら画面幅いっぱいのグリッド表示 */
  expanded?: boolean;
  /** 他の課題が展開中のため、幅0に畳まれている状態 */
  hiddenAway?: boolean;
  /** 展開課題同士の切り替え中: 幅の移動アニメーションを無効化 */
  noTransition?: boolean;
  /** 作品リストをアルファで隠す（順序付きアニメーションの各段階で使用） */
  fadingOut?: boolean;
  /** 列全体（ヘッダー含む）をアルファで隠す（拡大シーケンスの第1段階） */
  dimmed?: boolean;
  /** 展開グリッドの列数モード */
  gridMode?: GridMode;
  onGridModeChange?: (mode: GridMode) => void;
  /** 通常表示時: ヘッダー押下で展開 */
  onExpand?: () => void;
  /** 展開表示時: ヘッダー押下で列表示に戻る */
  onCollapse?: () => void;
  /** スクロール位置変更コールバック（モバイル用） */
  onScrollY?: (scrollTop: number) => void;
}

/**
 * 課題1つぶんの表示。
 * 通常はカラム（縦1列）、expanded時は画面幅いっぱいのグリッドになる。
 * どちらもデータは独立して取得し、スクロール末尾で自動的に追加読み込みする。
 */
export default function AssignmentColumn({
  assignment,
  studentIds,
  badgeIds,
  minBadges,
  sortBy,
  onWorkClick,
  expanded = false,
  hiddenAway = false,
  noTransition = false,
  fadingOut = false,
  dimmed = false,
  gridMode = "responsive",
  onGridModeChange,
  onExpand,
  onCollapse,
  onScrollY,
}: AssignmentColumnProps) {
  const [works, setWorks] = useState<WorkItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  // 拡大アニメーション完了後にtrueになり、右上UIをフェードイン表示する
  const [expandAnimDone, setExpandAnimDone] = useState(false);

  const listRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  // フィルター変更中に届いた古いレスポンスを破棄するための通し番号
  const fetchIdRef = useRef(0);
  const expandTimerRef = useRef<number | null>(null);

  // expanded が true に変わったら EXPAND_ANIMATION_MS 後に expandAnimDone を true にする
  useEffect(() => {
    if (expanded) {
      expandTimerRef.current = window.setTimeout(() => {
        setExpandAnimDone(true);
      }, EXPAND_ANIMATION_MS);
    } else {
      setExpandAnimDone(false);
      if (expandTimerRef.current !== null) {
        clearTimeout(expandTimerRef.current);
        expandTimerRef.current = null;
      }
    }
    return () => {
      if (expandTimerRef.current !== null) {
        clearTimeout(expandTimerRef.current);
      }
    };
  }, [expanded]);

  const studentKey = studentIds.join(",");
  const badgeKey = badgeIds.join(",");

  const fetchPage = useCallback(
    async (pageNum: number, append: boolean) => {
      const fetchId = ++fetchIdRef.current;
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("assignmentIds", assignment.id);
        params.set("page", pageNum.toString());
        params.set("pageSize", PAGE_SIZE.toString());
        if (studentKey) params.set("studentIds", studentKey);
        if (badgeKey) params.set("badgeIds", badgeKey);
        if (minBadges > 0) params.set("minBadges", minBadges.toString());
        if (sortBy === "student_asc" || sortBy === "student_desc") {
          params.set("sortBy", sortBy);
        }

        const res = await fetch(`/api/works?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to fetch works");
        const data: WorkListResponse = await res.json();

        if (fetchId !== fetchIdRef.current) return;

        // ランダムはAPI非対応のためクライアント側でシャッフル（旧UIと同方式）
        let list = data.works;
        if (sortBy === "random") {
          list = [...list].sort(() => Math.random() - 0.5);
        }

        setWorks((prev) => (append ? [...prev, ...list] : list));
        setTotal(data.total);
        setPage(data.page);
        setTotalPages(data.totalPages);
      } catch {
        // 通信失敗時は現状表示を維持
      } finally {
        if (fetchId === fetchIdRef.current) {
          setLoading(false);
        }
      }
    },
    [assignment.id, studentKey, badgeKey, minBadges, sortBy],
  );

  // フィルター・ソート変更時は列をリセットして1ページ目から取り直す
  useEffect(() => {
    setWorks([]);
    setPage(1);
    setTotalPages(0);
    listRef.current?.scrollTo({ top: 0 });
    fetchPage(1, false);
  }, [fetchPage]);

  // 追加読み込み（IntersectionObserver から最新のstateで呼ぶためref経由）
  const loadMoreRef = useRef<() => void>(() => {});
  useEffect(() => {
    loadMoreRef.current = () => {
      if (!loading && page < totalPages) {
        fetchPage(page + 1, true);
      }
    };
  });

  const sentinelVisibleRef = useRef(false);

  useEffect(() => {
    const rootEl = listRef.current;
    const target = sentinelRef.current;
    if (!rootEl || !target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        sentinelVisibleRef.current = entries[0].isIntersecting;
        if (entries[0].isIntersecting) {
          loadMoreRef.current();
        }
      },
      { root: null, rootMargin: "300px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  // 読み込み完了時にセンチネルがまだ画面内なら続きを読む
  // （Observerは「見えた瞬間」しか発火しないため、その取りこぼしを拾う）
  useEffect(() => {
    if (sentinelVisibleRef.current && !loading && page < totalPages) {
      fetchPage(page + 1, true);
    }
  }, [loading, page, totalPages, fetchPage]);

  const numberLabel = String(assignment.number).padStart(2, "0");
  const totalLabel = loading && works.length === 0 ? "…" : `${total} 作品`;

  return (
    <section
      className={`flex h-full min-w-0 shrink-0 flex-col ${
        expanded
          ? "grow basis-[264px]"
          : hiddenAway
            ? "pointer-events-none grow-0 basis-0 overflow-hidden opacity-0"
            : "grow snap-start basis-[264px]"
      } ${dimmed ? "pointer-events-none opacity-0" : ""}`}
      style={{
        transition: noTransition
          ? "none"
          : `flex-grow ${EXPAND_ANIMATION_MS}ms ease-out, flex-basis ${EXPAND_ANIMATION_MS}ms ease-out, opacity ${FADE_ANIMATION_MS}ms ease-out`,
      }}
      aria-label={`課題${assignment.number}: ${assignment.name}`}
      aria-hidden={hiddenAway}
    >
      {/* Header */}
      {expanded ? (
        <>
        {/* デスクトップ: 展開時ヘッダー（縮小ボタン＋グリッドタブ付き） */}
        <div className="relative hidden shrink-0 md:block">
          <button
            type="button"
            onClick={onCollapse}
            aria-label="縮小して全課題を表示"
            className="flex w-full items-end gap-4 px-5 pb-4 pr-44 pt-6 text-left transition hover:bg-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-a md:px-8 md:pr-44"
          >
            <p className="font-plex-mono text-2xl font-normal leading-none tracking-tight text-slate-500">
              {numberLabel}
            </p>
            <div
              className={`min-w-0 transition-opacity duration-300 ${
                expandAnimDone ? "opacity-100" : "invisible opacity-0"
              }`}
            >
              <p className="truncate text-[10px] tracking-wider text-slate-400">
                {totalLabel}
              </p>
              <p
                className="truncate text-xs font-normal leading-tight text-slate-500"
                title={assignment.name}
              >
                {assignment.name}
              </p>
            </div>
          </button>

          <div
            className={`absolute bottom-4 right-5 flex items-center gap-3 transition-opacity duration-300 md:right-8 ${
              expandAnimDone ? "opacity-100" : "opacity-0"
            }`}
          >
            {/* グリッド列数の切り替えタブ（デスクトップ） */}
            <GridModeTabs
              value={gridMode}
              onChange={(mode) => onGridModeChange?.(mode)}
            />

            {/* 縮小ボタン（デスクトップのみ） */}
            <button
              type="button"
              onClick={onCollapse}
              aria-label="縮小して全課題を表示"
              className="hidden h-7 w-7 items-center justify-center border border-slate-300 bg-white text-slate-500 transition hover:border-accent-a hover:text-accent-a md:flex"
            >
              <ArrowsPointingInIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
        </>
      ) : (
        /* 通常時: ヘッダー全体がボタン。押下でこの課題を展開表示 */
        <button
          type="button"
          onClick={onExpand}
          aria-label={`課題${assignment.number}を広げて表示`}
          className="shrink-0 px-5 pb-4 pt-6 text-left transition hover:bg-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-a"
        >
          <div className="flex items-end justify-between gap-3">
            <p className="shrink-0 font-plex-mono text-2xl font-normal leading-none tracking-tight text-slate-500">
              {numberLabel}
            </p>
            <div className="min-w-0 text-right">
              <p className="truncate text-[10px] tracking-wider text-slate-400">
                {totalLabel}
              </p>
              <p
                className="truncate text-xs font-normal leading-tight text-slate-500"
                title={assignment.name}
              >
                {assignment.name}
              </p>
            </div>
          </div>
        </button>
      )}

      {/* Scrollable works list */}
      <div className="relative min-h-0 flex-1">
        <div
          ref={listRef}
          onScroll={onScrollY ? (e) => onScrollY((e.target as HTMLElement).scrollTop) : undefined}
          className={`absolute inset-0 overflow-y-auto scrollbar-hidden pb-10 md:pt-2.5 transition-opacity duration-300 ${
          expanded ? (gridMode === 3 ? "px-0 md:px-8" : "px-5 md:px-8") : "px-5"
        } ${fadingOut ? "opacity-0" : "opacity-100"}`}
      >
        {/* モバイル: 課題情報 + グリッド切替（スクロール内sticky） */}
        {expanded && (
          <div className={`sticky top-0 z-10 border-b border-slate-200 bg-slate-50 px-5 pb-3 pt-4 md:hidden ${gridMode === 3 ? "" : "-mx-5"}`}>
            <div className="flex items-center justify-between">
              <div className="flex min-w-0 items-end gap-3">
                <p className="shrink-0 font-plex-mono text-xl font-normal leading-none tracking-tight text-slate-500">
                  {numberLabel}
                </p>
                <div className="min-w-0">
                  <p className="truncate text-[10px] tracking-wider text-slate-400">
                    {totalLabel}
                  </p>
                  <p
                    className="truncate text-xs font-normal leading-tight text-slate-500"
                    title={assignment.name}
                  >
                    {assignment.name}
                  </p>
                </div>
              </div>
              <div className="shrink-0 ml-3">
                <MobileGridModeTabs
                  value={gridMode}
                  onChange={(mode) => onGridModeChange?.(mode)}
                />
              </div>
            </div>
          </div>
        )}
        {/* keyで列⇄グリッドの切り替え時に再マウントし、フェードインさせる */}
        <div
          key={expanded ? `grid-${gridMode}` : "list"}
          className={`fade-in-content ${
            expanded
              ? gridMode === 1
                ? "grid grid-cols-1 gap-x-0 gap-y-10"
                : gridMode === 3
                  ? "grid grid-cols-3 gap-0"
                  : gridMode === 4
                    ? "grid grid-cols-4 gap-x-0 gap-y-10"
                    : gridMode === 8
                      ? "grid grid-cols-8 gap-x-0 gap-y-8"
                      : "grid grid-cols-2 gap-x-0 gap-y-10 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
              : "flex flex-col gap-10"
          }`}
        >
          {works.map((work) => (
            <WorkCardA
              key={work.id}
              work={work}
              onClick={() => onWorkClick(work)}
              hideInfo={expanded && gridMode === 3}
            />
          ))}

          {/* Initial loading skeleton */}
          {loading &&
            works.length === 0 &&
            Array.from({ length: expanded ? 10 : 3 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-square w-full bg-slate-100" />
                <div className="mt-2.5 h-3.5 w-2/3 bg-slate-100" />
                <div className="mt-1.5 h-2.5 w-1/3 bg-slate-100" />
              </div>
            ))}
        </div>

        {/* Empty state */}
        {!loading && works.length === 0 && (
          <p className="pt-4 text-xs text-slate-300">作品なし</p>
        )}

        {/* Loading more indicator */}
        {loading && works.length > 0 && (
          <p className="pt-6 text-center text-[11px] tracking-wider text-slate-400">
            読み込み中...
          </p>
        )}

        {/* Infinite scroll sentinel */}
        <div ref={sentinelRef} className="h-px" aria-hidden="true" />
      </div>
      </div>
    </section>
  );
}

/**
 * 展開グリッドの列数切り替えタブ（レスポンシブ / 4列 / 8列）。
 */
function GridModeTabs({
  value,
  onChange,
}: {
  value: GridMode;
  onChange: (mode: GridMode) => void;
}) {
  const options: { id: GridMode; label: React.ReactNode; title: string }[] = [
    {
      id: "responsive",
      label: <ResponsiveIcon />,
      title: "レスポンシブ（画面幅に合わせる）",
    },
    { id: 4, label: "4", title: "4列表示" },
    { id: 8, label: "8", title: "8列表示" },
  ];

  return (
    <div
      className="flex h-7 items-center overflow-hidden border border-slate-300"
      role="group"
      aria-label="グリッドの列数"
    >
      {options.map((opt) => (
        <button
          key={String(opt.id)}
          type="button"
          title={opt.title}
          aria-pressed={value === opt.id}
          onClick={() => onChange(opt.id)}
          className={`flex h-full w-8 items-center justify-center border-r border-slate-300 font-plex-mono text-xs transition last:border-r-0 ${
            value === opt.id
              ? "bg-accent-a text-white"
              : "bg-white text-slate-500 hover:bg-slate-200"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

/** レスポンシブ（デスクトップ+モバイル）を表すアイコン */
function ResponsiveIcon() {
  return (
    <svg
      className="h-3.5 w-3.5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M10.5 19.5h-6A1.5 1.5 0 013 18V6a1.5 1.5 0 011.5-1.5h12A1.5 1.5 0 0118 6v3m-7.5 10.5v-3m0 3h3m-3-3H6m9 7.5h4.5A1.5 1.5 0 0021 19.5v-7.5a1.5 1.5 0 00-1.5-1.5H15a1.5 1.5 0 00-1.5 1.5v7.5a1.5 1.5 0 001.5 1.5z"
      />
    </svg>
  );
}

/**
 * モバイル用グリッド列数切り替え（1列 / 3列）。アイコン表示。
 */
function MobileGridModeTabs({
  value,
  onChange,
}: {
  value: GridMode;
  onChange: (mode: GridMode) => void;
}) {
  const options: { id: GridMode; icon: React.ReactNode; title: string }[] = [
    { id: 1, icon: <StopIcon className="h-5 w-5" />, title: "1列表示" },
    { id: 3, icon: <Squares2X2Icon className="h-5 w-5" />, title: "3列表示" },
  ];

  return (
    <div
      className="flex items-center overflow-hidden border border-slate-300"
      role="group"
      aria-label="グリッドの列数"
    >
      {options.map((opt) => (
        <button
          key={String(opt.id)}
          type="button"
          title={opt.title}
          aria-pressed={value === opt.id}
          onClick={() => onChange(opt.id)}
          className={`flex h-10 w-10 items-center justify-center border-r border-slate-300 transition last:border-r-0 ${
            value === opt.id
              ? "bg-accent-a text-white"
              : "bg-white text-slate-500"
          }`}
        >
          {opt.icon}
        </button>
      ))}
    </div>
  );
}
