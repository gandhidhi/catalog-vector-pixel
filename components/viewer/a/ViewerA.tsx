"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Assignment, WorkItem } from "@/lib/types";
import Lightbox from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import Captions from "yet-another-react-lightbox/plugins/captions";
import "yet-another-react-lightbox/styles.css";
import "yet-another-react-lightbox/plugins/captions.css";
import FilterBarA from "./FilterBarA";
import AssignmentColumn, {
  EXPAND_ANIMATION_MS,
  FADE_ANIMATION_MS,
} from "./AssignmentColumn";
import { useStudentOptions } from "./useStudentOptions";
import { FilterOption, GridMode, SortOptionA } from "./types";

/**
 * Aパターン本体。
 * - 上部: フィルターバー（学生検索 / バッジ / 並び替え）
 * - 下部: 課題ごとの縦カラムを横並びに表示（最大7列）
 *   ウィンドウ幅に収まらないときは左右のページ送りで移動できる。
 */
export default function ViewerA() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(true);
  const [badgeTypes, setBadgeTypes] = useState<FilterOption[]>([]);
  const studentOptions = useStudentOptions();

  // 検索ボックス内のタグ（未実行）と、検索実行済みの学生ID
  const [pendingStudents, setPendingStudents] = useState<FilterOption[]>([]);
  const [appliedStudentIds, setAppliedStudentIds] = useState<string[]>([]);
  const [selectedBadges, setSelectedBadges] = useState<string[]>([]);
  // 「３つタグ」: 3つ以上のバッジが付与された作品のみ表示
  const [threeTagsOnly, setThreeTagsOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortOptionA>("random");

  const [selectedWork, setSelectedWork] = useState<WorkItem | null>(null);

  // 展開表示中の課題ID（nullなら通常の列表示）
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // 展開グリッドの列数モード（全課題で共有）
  const [gridMode, setGridMode] = useState<GridMode>("responsive");
  const expandedAssignment = expandedId
    ? (assignments.find((a) => a.id === expandedId) ?? null)
    : null;

  // レール（右側の課題切り替えUI）の表示状態: 全アニメーション完了後にtrue
  const [railVisible, setRailVisible] = useState(false);

  // 展開課題同士の切り替え: 幅の移動アニメーションを止めてクロスフェードする
  const [fadeOutId, setFadeOutId] = useState<string | null>(null);
  const [noAnim, setNoAnim] = useState(false);
  // 順序付き拡縮シーケンスの状態
  const [sequencing, setSequencing] = useState(false);
  const [phaseHideLists, setPhaseHideLists] = useState(false);
  const [dimOthersExcept, setDimOthersExcept] = useState<string | null>(null);
  const switchTimersRef = useRef<number[]>([]);
  useEffect(
    () => () => switchTimersRef.current.forEach((t) => clearTimeout(t)),
    [],
  );

  /**
   * 拡大シーケンス:
   * ① 全作品と他課題のヘッダーをアルファでフェードアウト
   * ② 押下した課題の面を幅アニメーションで拡大
   * ③ 拡大後のグリッドをフェードイン
   * ④ レール（右側の課題切り替えUI）をフェードイン
   */
  function handleExpand(id: string) {
    if (sequencing || fadeOutId !== null) return;
    setSequencing(true);
    setPhaseHideLists(true);
    setDimOthersExcept(id);
    setRailVisible(false);
    switchTimersRef.current.push(
      window.setTimeout(() => {
        setExpandedId(id);
        switchTimersRef.current.push(
          window.setTimeout(() => {
            setPhaseHideLists(false);
            setDimOthersExcept(null);
            setSequencing(false);
            setRailVisible(true);
          }, EXPAND_ANIMATION_MS),
        );
      }, FADE_ANIMATION_MS),
    );
  }

  /** 縮小シーケンス: レールを即非表示→通常の逆順 */
  function handleCollapse() {
    if (sequencing || fadeOutId !== null || expandedId === null) return;
    setSequencing(true);
    setRailVisible(false);
    setPhaseHideLists(true);
    switchTimersRef.current.push(
      window.setTimeout(() => {
        setExpandedId(null);
        switchTimersRef.current.push(
          window.setTimeout(() => {
            setPhaseHideLists(false);
            setSequencing(false);
          }, EXPAND_ANIMATION_MS),
        );
      }, FADE_ANIMATION_MS),
    );
  }

  function handleRailClick(id: string) {
    if (sequencing) return;
    if (id === expandedId) {
      handleCollapse(); // 表示中の課題を押したら縮小シーケンス
      return;
    }
    if (expandedId === null || fadeOutId !== null) return;
    // 1. 現在のグリッドをフェードアウト
    setFadeOutId(expandedId);
    switchTimersRef.current.push(
      window.setTimeout(() => {
        // 2. 幅アニメーションなしで課題を切り替え、新グリッドをフェードイン
        setNoAnim(true);
        setExpandedId(id);
        setFadeOutId(null);
        switchTimersRef.current.push(
          window.setTimeout(() => setNoAnim(false), 50),
        );
      }, FADE_ANIMATION_MS),
    );
  }

  // Fetch assignments and badge types on mount
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
        // 失敗時は空のまま（下の空状態表示に任せる）
      } finally {
        setAssignmentsLoading(false);
      }
    }

    fetchOptions();
  }, []);

  // ---- Horizontal paging ----
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateArrows = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 1);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
  }, []);

  useEffect(() => {
    updateArrows();
    // 拡縮アニメーション（800ms）完了後の状態でも再判定する
    const timer = setTimeout(updateArrows, 900);
    window.addEventListener("resize", updateArrows);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", updateArrows);
    };
  }, [updateArrows, assignments.length, expandedId]);

  function scrollByColumn(direction: 1 | -1) {
    const el = scrollRef.current;
    if (!el) return;
    const firstColumn = el.querySelector("section");
    const step = firstColumn ? firstColumn.clientWidth : 300;
    el.scrollBy({ left: direction * step, behavior: "smooth" });
  }

  // ---- Search handlers ----
  function handleSearch() {
    setAppliedStudentIds(pendingStudents.map((s) => s.id));
  }

  function handleClearSearch() {
    setPendingStudents([]);
    setAppliedStudentIds([]);
  }

  return (
    <div className="flex h-full flex-col">
      <FilterBarA
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

      {/* Assignment columns */}
      <div className="relative min-h-0 flex-1">
        {assignmentsLoading ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-xs tracking-widest text-slate-400">
              読み込み中...
            </p>
          </div>
        ) : assignments.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="text-sm font-medium text-slate-500">
              課題がまだ登録されていません
            </p>
            <p className="mt-1 text-xs text-slate-400">
              課題が登録されると、ここに課題ごとの作品が表示されます
            </p>
          </div>
        ) : (
          /* 全列を常に描画し、展開時は他列を幅0に畳んでアニメーションさせる */
          <div className="flex h-full bg-slate-50">
            <div
              ref={scrollRef}
              onScroll={updateArrows}
              className={`flex h-full min-w-0 flex-1 snap-x divide-x divide-slate-200 overflow-x-auto ${
                expandedAssignment ? "border-r border-slate-200" : ""
              }`}
            >
              {assignments.map((assignment) => (
                <AssignmentColumn
                  key={assignment.id}
                  assignment={assignment}
                  studentIds={appliedStudentIds}
                  badgeIds={selectedBadges}
                  minBadges={threeTagsOnly ? 3 : 0}
                  sortBy={sortBy}
                  onWorkClick={setSelectedWork}
                  expanded={expandedId === assignment.id}
                  hiddenAway={
                    expandedId !== null && expandedId !== assignment.id
                  }
                  noTransition={noAnim}
                  fadingOut={fadeOutId === assignment.id || phaseHideLists}
                  dimmed={
                    dimOthersExcept !== null &&
                    dimOthersExcept !== assignment.id
                  }
                  gridMode={gridMode}
                  onGridModeChange={setGridMode}
                  onExpand={() => handleExpand(assignment.id)}
                  onCollapse={handleCollapse}
                />
              ))}
            </div>

            {/* 右端: 他の課題への切り替えレール（展開時のみ表示） */}
            <aside
              className={`flex shrink-0 flex-col border-l border-slate-200 bg-slate-100 ease-in-out ${
                railVisible
                  ? "w-12 translate-x-0 opacity-100 transition-[opacity,transform] duration-200"
                  : expandedAssignment
                    ? "w-12 pointer-events-none translate-x-full opacity-0 transition-none"
                    : "w-0 overflow-hidden opacity-0 transition-opacity duration-200"
              }`}
              aria-label="課題の切り替え"
              aria-hidden={!railVisible}
            >
              {assignments.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  tabIndex={railVisible ? 0 : -1}
                  onClick={() => handleRailClick(a.id)}
                  title={`課題${a.number}: ${a.name}`}
                  className={`flex min-h-0 flex-1 items-center justify-center border-b border-slate-200 font-plex-mono text-xs transition last:border-b-0 ${
                    a.id === expandedId
                      ? "bg-accent-a text-white"
                      : "text-slate-500 hover:bg-slate-300 hover:text-accent-a"
                  }`}
                >
                  {String(a.number).padStart(2, "0")}
                </button>
              ))}
            </aside>
          </div>
        )}

        {/* Paging arrows（通常の列表示のときだけ表示、フェードアニメーション） */}
        <PagingArrow
          direction={-1}
          onClick={() => scrollByColumn(-1)}
          visible={!expandedAssignment && !sequencing && canScrollLeft}
        />
        <PagingArrow
          direction={1}
          onClick={() => scrollByColumn(1)}
          visible={!expandedAssignment && !sequencing && canScrollRight}
        />
      </div>

      {/* Lightbox（全画面表示 + ズームUI） */}
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
          container: { backgroundColor: "rgba(248, 250, 252, 0.95)" },
          icon: { color: "rgb(255, 255, 255)" },
          button: { color: "rgb(255, 255, 255)" },
        }}
        className="yarl-light"
      />
    </div>
  );
}

function PagingArrow({
  direction,
  onClick,
  visible,
}: {
  direction: 1 | -1;
  onClick: () => void;
  visible: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={direction === 1 ? "次の課題へ" : "前の課題へ"}
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      className={`absolute top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-slate-300 bg-white shadow-[0_10px_35px_rgba(0,0,0,0.35)] transition-all duration-200 hover:-translate-y-[calc(50%+2px)] hover:shadow-[0_14px_40px_rgba(0,0,0,0.45)] ${
        direction === 1 ? "right-3" : "left-3"
      } ${visible ? "opacity-100" : "pointer-events-none opacity-0"}`}
    >
      <svg
        className="h-4 w-4 text-slate-600"
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
