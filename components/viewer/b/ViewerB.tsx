"use client";

import {
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import { Assignment, WorkItem, WorkListResponse } from "@/lib/types";
import Lightbox from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import Captions from "yet-another-react-lightbox/plugins/captions";
import "yet-another-react-lightbox/styles.css";
import "yet-another-react-lightbox/plugins/captions.css";
import { useStudentOptions } from "@/components/viewer/a/useStudentOptions";
import { FilterOption, SortOptionA } from "@/components/viewer/a/types";
import SearchMenuB from "./FilterBarB";

const PAGE_SIZE = 30;

/**
 * Bパターン（ポップ・レトロ / オレンジ × Bentoグリッド）。
 * - 上部: アイコン付き課題タブ（すべて + 課題1〜7）で1課題ずつ切り替え
 * - その下: 検索ツールバー
 * - 本体: 正方形Bentoグリッド（タグ付き作品は2×2の大セル）
 *   写真はモノトーンで置き、ホバーでカラーに変わる
 */

// 課題番号1〜7に固定で割り当てる図形アイコン
const SHAPE_ORDER = [
  "circle",
  "triangle",
  "square",
  "cross",
  "diamond",
  "star",
  "heart",
] as const;

type ShapeName = (typeof SHAPE_ORDER)[number];

function ShapeIcon({ shape }: { shape: ShapeName }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  return (
    <svg className="h-6 w-6" viewBox="0 0 24 24" aria-hidden="true">
      {shape === "circle" && <circle cx="12" cy="12" r="8" {...common} />}
      {shape === "triangle" && <path d="M12 4.5L20 19H4z" {...common} />}
      {shape === "square" && (
        <rect x="5" y="5" width="14" height="14" {...common} />
      )}
      {shape === "cross" && <path d="M6 6l12 12M18 6L6 18" {...common} />}
      {shape === "diamond" && (
        <path d="M12 3.5L20.5 12L12 20.5L3.5 12z" {...common} />
      )}
      {shape === "star" && (
        <path
          d="M12 3.5l2.47 5.01 5.53.8-4 3.9.94 5.5L12 16.11l-4.94 2.6.94-5.5-4-3.9 5.53-.8z"
          {...common}
        />
      )}
      {shape === "heart" && (
        <path
          d="M12 19.5s-7.5-4.7-7.5-9.6C4.5 7 6.5 5 9 5c1.3 0 2.4.6 3 1.6C12.6 5.6 13.7 5 15 5c2.5 0 4.5 2 4.5 4.9 0 4.9-7.5 9.6-7.5 9.6z"
          {...common}
        />
      )}
    </svg>
  );
}

/** 「すべて」タブ用: 4分割グリッドのアイコン */
function AllIcon() {
  return (
    <svg
      className="h-6 w-6"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 5h5.5v5.5H5zM13.5 5H19v5.5h-5.5zM5 13.5h5.5V19H5zM13.5 13.5H19V19h-5.5z" />
    </svg>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
  title,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={active}
      className={`flex min-w-[68px] shrink-0 flex-col items-center gap-1.5 px-2 pb-2.5 pt-3 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
        active
          ? "bg-orange-500/80 text-white"
          : "bg-orange-300/30 text-orange-400 hover:bg-orange-400/40 hover:text-orange-600"
      }`}
    >
      {icon}
      <span className="font-dot text-[11px] leading-none">{label}</span>
    </button>
  );
}

export default function ViewerB() {
  // マスタ情報
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [badgeTypes, setBadgeTypes] = useState<FilterOption[]>([]);
  const studentOptions = useStudentOptions();

  // フィルター状態
  const [pendingStudents, setPendingStudents] = useState<FilterOption[]>([]);
  const [appliedStudentIds, setAppliedStudentIds] = useState<string[]>([]);
  const [selectedBadges, setSelectedBadges] = useState<string[]>([]);
  const [threeTagsOnly, setThreeTagsOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortOptionA>("random");

  // タブ: "all" または課題ID
  const [selectedTab, setSelectedTab] = useState<string>("all");

  // 作品一覧
  const [works, setWorks] = useState<WorkItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);

  const [selectedWork, setSelectedWork] = useState<WorkItem | null>(null);

  const listRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const fetchIdRef = useRef(0);

  // Bentoユニット: 列幅から小セル1個分の正方形サイズを実測して行の高さに使う。
  // 小セル=1×1、大セル=2×2（1:2なので dense 配置で隙間が必ず埋まる）
  const gridRef = useRef<HTMLDivElement>(null);
  const [bento, setBento] = useState({ unit: 0, cols: 8 });

  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const update = () => {
      const w = el.clientWidth;
      if (w === 0) return;
      const cols = w < 640 ? 4 : w < 1024 ? 6 : w < 1440 ? 8 : 10;
      setBento({ unit: w / cols, cols });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // テンプレート方式: タグ付き作品を大セルにするが、
  // 大セル同士の間に最低 MIN_GAP 作品を挟んでリズムを一定に保つ。
  // （全作品タグ付きの課題でも「全部大セル」にならない）
  const largeFlags = useMemo(() => {
    const MIN_GAP = 5;
    let sinceLarge = MIN_GAP;
    return works.map((w) => {
      if (w.badges.length > 0 && sinceLarge >= MIN_GAP) {
        sinceLarge = 0;
        return true;
      }
      sinceLarge++;
      return false;
    });
  }, [works]);

  // マスタ情報の取得
  useEffect(() => {
    async function fetchOptions() {
      try {
        const [assignmentsRes, badgesRes] = await Promise.all([
          fetch("/api/assignments"),
          fetch("/api/badges/types"),
        ]);
        if (assignmentsRes.ok) {
          const data = await assignmentsRes.json();
          setAssignments(data.assignments ?? []);
        }
        if (badgesRes.ok) {
          const data = await badgesRes.json();
          setBadgeTypes(
            (data.badgeTypes ?? []).map((b: { id: string; name: string }) => ({
              id: b.id,
              label: b.name,
            })),
          );
        }
      } catch {
        // 失敗時は空のまま
      }
    }
    fetchOptions();
  }, []);

  const studentKey = appliedStudentIds.join(",");
  const badgeKey = selectedBadges.join(",");

  const fetchPage = useCallback(
    async (pageNum: number, append: boolean) => {
      const fetchId = ++fetchIdRef.current;
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("page", pageNum.toString());
        params.set("pageSize", PAGE_SIZE.toString());
        if (selectedTab !== "all") params.set("assignmentIds", selectedTab);
        if (studentKey) params.set("studentIds", studentKey);
        if (badgeKey) params.set("badgeIds", badgeKey);
        if (threeTagsOnly) params.set("minBadges", "3");
        if (sortBy === "student_asc" || sortBy === "student_desc") {
          params.set("sortBy", sortBy);
        }

        const res = await fetch(`/api/works?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to fetch works");
        const data: WorkListResponse = await res.json();

        if (fetchId !== fetchIdRef.current) return;

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
    [selectedTab, studentKey, badgeKey, threeTagsOnly, sortBy],
  );

  // タブ・フィルター変更時は1ページ目から取り直す
  useEffect(() => {
    setWorks([]);
    setPage(1);
    setTotalPages(0);
    listRef.current?.scrollTo({ top: 0 });
    fetchPage(1, false);
  }, [fetchPage]);

  // 無限スクロール
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
        if (entries[0].isIntersecting) loadMoreRef.current();
      },
      { root: rootEl, rootMargin: "400px" },
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

  function handleSearch() {
    setAppliedStudentIds(pendingStudents.map((s) => s.id));
  }

  function handleClearSearch() {
    setPendingStudents([]);
    setAppliedStudentIds([]);
  }

  const selectedAssignment =
    selectedTab === "all"
      ? null
      : (assignments.find((a) => a.id === selectedTab) ?? null);

  const headingLabel = selectedAssignment
    ? `課題${selectedAssignment.number}: ${selectedAssignment.name}`
    : "すべての作品";

  return (
    <div
      className="texture-grain relative flex h-full flex-col bg-orange-100"
      style={{
        // レイアウトとは無関係の装飾縦線（ごく薄いオレンジ）
        backgroundImage:
          "repeating-linear-gradient(90deg, rgba(254, 215, 170, 0.6) 0px, rgba(254, 215, 170, 0.6) 1px, transparent 1px, transparent 180px)",
      }}
    >
      {/* 課題タブ（すべて + 課題1〜7）+ 右端の検索ボタン
          白に近い枠線の内側に、隙間を空けてボタンを並べる */}
      <div className="shrink-0 border-b border-orange-200">
        <div className="flex items-stretch gap-1.5 px-2 py-2">
          <div className="scrollbar-hidden flex flex-1 gap-1.5 overflow-x-auto">
            <TabButton
              active={selectedTab === "all"}
              onClick={() => setSelectedTab("all")}
              icon={<AllIcon />}
              label="すべて"
            />
            {assignments.map((a) => (
              <TabButton
                key={a.id}
                active={selectedTab === a.id}
                onClick={() => setSelectedTab(a.id)}
                icon={
                  <ShapeIcon
                    shape={SHAPE_ORDER[(a.number - 1) % 7] ?? "circle"}
                  />
                }
                label={`課題${a.number}`}
                title={a.name}
              />
            ))}
          </div>

          {/* 検索・絞り込み（統合ポップアップ） */}
          <SearchMenuB
            studentOptions={studentOptions}
            badgeTypes={badgeTypes}
            pendingStudents={pendingStudents}
            onPendingStudentsChange={setPendingStudents}
            appliedCount={appliedStudentIds.length}
            onSearch={handleSearch}
            onClearSearch={handleClearSearch}
            selectedBadges={selectedBadges}
            onBadgesChange={setSelectedBadges}
            threeTagsOnly={threeTagsOnly}
            onThreeTagsChange={setThreeTagsOnly}
            sortBy={sortBy}
            onSortChange={setSortBy}
          />
        </div>
      </div>

      {/* 作品エリア */}
      <div
        ref={listRef}
        className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto pb-12"
      >
        {/* 見出し（ここだけ従来の左右余白を維持） */}
        <div className="flex items-end justify-between gap-4 px-4 pb-4 pt-5 md:px-8">
          <h2 className="font-dot text-base text-orange-600">{headingLabel}</h2>
          <p className="shrink-0 font-dot text-xs text-orange-600">
            {loading && works.length === 0 ? "…" : `${total} 作品`}
          </p>
        </div>

        {/* Bento grid（全セル正方形: 小=1×1 / 大=2×2ユニット） */}
        <div
          ref={gridRef}
          className="grid grid-flow-dense gap-0"
          style={{
            gridTemplateColumns: `repeat(${bento.cols}, minmax(0, 1fr))`,
            gridAutoRows: bento.unit > 0 ? `${bento.unit}px` : "160px",
          }}
        >
          {works.map((work, i) => (
            <WorkCardB
              key={work.id}
              work={work}
              large={largeFlags[i] ?? false}
              onClick={() => setSelectedWork(work)}
            />
          ))}

          {/* Loading skeleton */}
          {loading &&
            works.length === 0 &&
            Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="col-span-1 row-span-1 w-full animate-pulse border border-orange-100 bg-white/60"
              />
            ))}
        </div>

        {/* Empty state */}
        {!loading && works.length === 0 && (
          <div className="flex flex-col items-center py-16 text-center">
            <p className="font-dot text-sm text-stone-500">
              条件に合う作品がありません
            </p>
          </div>
        )}

        {/* Loading more */}
        {loading && works.length > 0 && (
          <p className="pt-8 text-center font-dot text-[11px] text-stone-400">
            読み込み中...
          </p>
        )}

        <div ref={sentinelRef} className="h-px" aria-hidden="true" />
      </div>

      {/* Lightbox（Aと同じ全画面 + ズームUI） */}
      <Lightbox
        open={selectedWork !== null}
        close={() => setSelectedWork(null)}
        slides={
          selectedWork
            ? [
                {
                  src: selectedWork.imageUrl,
                  title: selectedWork.studentName,
                  description:
                    selectedWork.badges.length > 0
                      ? `${selectedWork.assignmentName}\n${selectedWork.badges
                          .map((b) => `⭐ ${b.name}`)
                          .join("　")}`
                      : selectedWork.assignmentName,
                },
              ]
            : []
        }
        plugins={[Zoom, Captions]}
        zoom={{ maxZoomPixelRatio: 4, scrollToZoom: true }}
        carousel={{ finite: true, padding: "5%" }}
        controller={{ closeOnBackdropClick: true }}
        render={{ buttonPrev: () => null, buttonNext: () => null }}
        styles={{
          container: { backgroundColor: "rgba(41, 37, 36, 0.94)" },
        }}
      />
    </div>
  );
}

/**
 * Bentoセル。タグ付き作品（large）は2×2の大セルになる。
 * 画像はモノトーンで表示し、ホバーでカラーに戻る。
 */
function WorkCardB({
  work,
  large,
  onClick,
}: {
  work: WorkItem;
  large: boolean;
  onClick: () => void;
}) {
  const [imgError, setImgError] = useState(false);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${work.studentName}の${work.assignmentName}を拡大表示`}
      className={`group relative block w-full overflow-hidden border border-orange-100/60 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
        large ? "col-span-2 row-span-2" : "col-span-1 row-span-1"
      }`}
    >
      <div className="absolute inset-0 opacity-90 group-hover:opacity-100 transition-opacity duration-150">
        {imgError ? (
          <div className="flex h-full w-full items-center justify-center text-orange-200">
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
            sizes={large ? "(max-width: 768px) 100vw, 640px" : "(max-width: 768px) 50vw, 320px"}
            className="object-cover grayscale contrast-110 transition duration-150 group-hover:grayscale-0 group-hover:contrast-100"
            onError={() => setImgError(true)}
          />
        )}

        {/* オレンジのデュオトーン層: screen合成で暗部→オレンジ、明部→白。
            ホバーで消えてフルカラーに戻る */}
        {!imgError && (
          <>
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-orange-400 mix-blend-screen transition-opacity duration-150 group-hover:opacity-0"
            />
            {/* 白側をほんのりオレンジに染める（multiply合成） */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-orange-100 mix-blend-multiply transition-opacity duration-150 group-hover:opacity-0"
            />
          </>
        )}

        {/* 学生名（左下・角にぴったり） */}
        <span className="absolute bottom-0 left-0 max-w-[70%] truncate border border-orange-100 bg-white/50 px-1.5 py-0.5 font-dot text-[10px] text-orange-400 transition-transform duration-150 group-hover:translate-y-full">
          {work.studentName}
        </span>

        {/* タグ数（右下・角にぴったり） */}
        {work.badges.length > 0 && (
          <span
            className="absolute bottom-0 right-0 inline-flex items-center gap-1 border border-orange-100 bg-white/50 px-1.5 py-0.5 font-dot text-[10px] text-orange-400 transition-transform duration-150 group-hover:translate-y-full"
            title={work.badges.map((b) => b.name).join(" / ")}
          >
            <span aria-hidden="true">⭐</span>
            {work.badges.length}
          </span>
        )}
      </div>
    </button>
  );
}
