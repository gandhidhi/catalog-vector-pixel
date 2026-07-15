"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronRightIcon, ChevronLeftIcon } from "@heroicons/react/24/outline";
import { Assignment, WorkItem, WorkListResponse } from "@/lib/types";
import Lightbox from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import Captions from "yet-another-react-lightbox/plugins/captions";
import "yet-another-react-lightbox/styles.css";
import "yet-another-react-lightbox/plugins/captions.css";
import ViewerHeader from "@/components/viewer/ViewerHeader";
import FilterBarA from "./FilterBarA";
import AssignmentColumn, {
  EXPAND_ANIMATION_MS,
  FADE_ANIMATION_MS,
} from "./AssignmentColumn";
import { useStudentOptions } from "./useStudentOptions";
import PinnedColumns from "./PinnedColumns";
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

  // モバイル: 選択中の課題タブ（最初は1番目）
  const [mobileTabId, setMobileTabId] = useState<string | null>(null);

  // 課題読み込み後にデフォルトのタブを設定
  useEffect(() => {
    if (assignments.length > 0 && mobileTabId === null) {
      setMobileTabId(assignments[0].id);
    }
  }, [assignments, mobileTabId]);

  // 固定モード（デスクトップ専用）: 学生の行位置を揃えて全列同期スクロール
  const [pinned, setPinned] = useState(false);
  const [pinnedLoading, setPinnedLoading] = useState(false);
  const [pinnedStudents, setPinnedStudents] = useState<
    { id: string; name: string }[]
  >([]);
  const [pinnedWorks, setPinnedWorks] = useState<
    Map<string, Map<string, WorkItem>>
  >(new Map());
  const pinnedFetchIdRef = useRef(0);

  // 展開表示中の課題ID（nullなら通常の列表示）
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // 展開グリッドの列数モード
  const [desktopGridMode, setDesktopGridMode] = useState<GridMode>("responsive");
  const [mobileGridMode, setMobileGridMode] = useState<GridMode>(1);
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

  /** 固定モードのON/OFF。ONにする際は展開状態と進行中のアニメーションを畳む */
  function handlePinnedChange(value: boolean) {
    setPinned(value);
    if (value) {
      switchTimersRef.current.forEach((t) => clearTimeout(t));
      switchTimersRef.current = [];
      setExpandedId(null);
      setRailVisible(false);
      setSequencing(false);
      setPhaseHideLists(false);
      setDimOthersExcept(null);
      setFadeOutId(null);
      setNoAnim(false);
      // 固定モードは学籍番号順が前提。ランダムのときは昇順に切り替える
      if (sortBy === "random") setSortBy("student_asc");
    }
  }

  // 固定モード用データ: 全作品を学籍番号昇順で取得し、
  // 学生の並び順（＝学籍番号順）と 学生×課題 の対応表を作る
  useEffect(() => {
    if (!pinned) return;
    const fetchId = ++pinnedFetchIdRef.current;

    async function fetchAll() {
      setPinnedLoading(true);
      try {
        const students: { id: string; name: string }[] = [];
        const seen = new Set<string>();
        const map = new Map<string, Map<string, WorkItem>>();

        let page = 1;
        let totalPages = 1;
        while (page <= totalPages && page <= 10) {
          const res = await fetch(
            `/api/works?page=${page}&pageSize=100&sortBy=student_asc`,
          );
          if (!res.ok) throw new Error("Failed to fetch works");
          const data: WorkListResponse = await res.json();
          totalPages = data.totalPages;

          for (const w of data.works) {
            if (!seen.has(w.studentId)) {
              seen.add(w.studentId);
              students.push({ id: w.studentId, name: w.studentName });
            }
            let byAssignment = map.get(w.studentId);
            if (!byAssignment) {
              byAssignment = new Map();
              map.set(w.studentId, byAssignment);
            }
            if (!byAssignment.has(w.assignmentId)) {
              byAssignment.set(w.assignmentId, w);
            }
          }
          page++;
        }

        if (fetchId !== pinnedFetchIdRef.current) return;
        setPinnedStudents(students);
        setPinnedWorks(map);
      } catch {
        // 失敗時は現状表示を維持
      } finally {
        if (fetchId === pinnedFetchIdRef.current) {
          setPinnedLoading(false);
        }
      }
    }

    fetchAll();
  }, [pinned]);

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
    <div className="flex h-full flex-col overflow-hidden">
      {/* モバイル: ヘッダー（常時表示） */}
      <div className="md:hidden shrink-0">
        <ViewerHeader />
      </div>

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
        pinned={pinned}
        onPinnedChange={handlePinnedChange}
        assignments={assignments}
        mobileTabId={mobileTabId}
        onMobileTabChange={setMobileTabId}
        mobileHidden={false}
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
            {/* Desktop（固定モード）: 学生の行位置を揃えた同期スクロールグリッド */}
            {pinned && (
              <div className="hidden h-full min-w-0 flex-1 md:block">
                <PinnedColumns
                  assignments={assignments}
                  students={pinnedStudents}
                  worksByStudent={pinnedWorks}
                  loading={pinnedLoading}
                  sortBy={sortBy}
                  appliedStudentIds={appliedStudentIds}
                  badgeIds={selectedBadges}
                  minBadges={threeTagsOnly ? 3 : 0}
                  onWorkClick={setSelectedWork}
                />
              </div>
            )}

            {/* Desktop: 全カラム横並び */}
            <div
              ref={scrollRef}
              onScroll={updateArrows}
              className={`h-full min-w-0 flex-1 snap-x divide-x divide-slate-200 overflow-x-auto ${
                pinned ? "hidden" : "hidden md:flex"
              } ${expandedAssignment ? "border-r border-slate-200" : ""}`}
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
                  gridMode={desktopGridMode}
                  onGridModeChange={setDesktopGridMode}
                  onExpand={() => handleExpand(assignment.id)}
                  onCollapse={handleCollapse}
                />
              ))}
            </div>

            {/* Mobile: 選択タブの課題のみ表示 */}
            {mobileTabId && (
              <div className="flex h-full min-w-0 flex-1 bg-slate-50 md:hidden">
                {assignments
                  .filter((a) => a.id === mobileTabId)
                  .map((assignment) => (
                    <AssignmentColumn
                      key={assignment.id}
                      assignment={assignment}
                      studentIds={appliedStudentIds}
                      badgeIds={selectedBadges}
                      minBadges={threeTagsOnly ? 3 : 0}
                      sortBy={sortBy}
                      onWorkClick={setSelectedWork}
                      expanded={true}
                      gridMode={mobileGridMode}
                      onGridModeChange={setMobileGridMode}
                      onExpand={() => {}}
                      onCollapse={() => {}}
                    />
                  ))}
              </div>
            )}

            {/* 右端: 他の課題への切り替えレール（展開時のみ表示） */}
            <aside
              className={`hidden shrink-0 flex-col border-l border-slate-200 bg-slate-100 ease-in-out md:flex ${
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
          visible={
            !pinned && !expandedAssignment && !sequencing && canScrollLeft
          }
        />
        <PagingArrow
          direction={1}
          onClick={() => scrollByColumn(1)}
          visible={
            !pinned && !expandedAssignment && !sequencing && canScrollRight
          }
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
      {direction === 1 ? (
        <ChevronRightIcon className="h-4 w-4 text-slate-600" />
      ) : (
        <ChevronLeftIcon className="h-4 w-4 text-slate-600" />
      )}
    </button>
  );
}
