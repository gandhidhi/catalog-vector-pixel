"use client";

import { useMemo } from "react";
import { Assignment, WorkItem } from "@/lib/types";
import WorkCardA from "./WorkCardA";
import { SortOptionA } from "./types";

interface PinnedColumnsProps {
  assignments: Assignment[];
  /** 学籍番号昇順の学生一覧（作品を持つ学生のみ） */
  students: { id: string; name: string }[];
  /** studentId -> assignmentId -> 作品 */
  worksByStudent: Map<string, Map<string, WorkItem>>;
  loading: boolean;
  sortBy: SortOptionA;
  appliedStudentIds: string[];
  badgeIds: string[];
  minBadges: number;
  onWorkClick: (work: WorkItem) => void;
}

/**
 * 固定モード（デスクトップ専用）。
 * 全課題を1枚のグリッドとして描画するため、縦スクロールが自動的に同期する。
 * 行 = 学生（学籍番号順）、列 = 課題。作品がないセルは空けたままにして、
 * どの課題列でも同じ行に同じ学生が並ぶ。
 */
export default function PinnedColumns({
  assignments,
  students,
  worksByStudent,
  loading,
  sortBy,
  appliedStudentIds,
  badgeIds,
  minBadges,
  onWorkClick,
}: PinnedColumnsProps) {
  // 行（学生）: 検索フィルター適用 + 昇順/降順
  const rows = useMemo(() => {
    let list = students;
    if (appliedStudentIds.length > 0) {
      const set = new Set(appliedStudentIds);
      list = list.filter((s) => set.has(s.id));
    }
    if (sortBy === "student_desc") {
      list = [...list].reverse();
    }
    return list;
  }, [students, appliedStudentIds, sortBy]);

  // タグ系フィルター（クライアント側で判定）
  function passesFilter(work: WorkItem): boolean {
    if (minBadges > 0 && work.badges.length < minBadges) return false;
    if (
      badgeIds.length > 0 &&
      !work.badges.some((b) => badgeIds.includes(b.badgeTypeId))
    ) {
      return false;
    }
    return true;
  }

  // 課題ごとの表示件数（フィルター適用後）
  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of assignments) map.set(a.id, 0);
    for (const s of rows) {
      const byAssignment = worksByStudent.get(s.id);
      if (!byAssignment) continue;
      for (const a of assignments) {
        const w = byAssignment.get(a.id);
        if (
          w &&
          (minBadges <= 0 || w.badges.length >= minBadges) &&
          (badgeIds.length === 0 ||
            w.badges.some((b) => badgeIds.includes(b.badgeTypeId)))
        ) {
          map.set(a.id, (map.get(a.id) ?? 0) + 1);
        }
      }
    }
    return map;
  }, [assignments, rows, worksByStudent, badgeIds, minBadges]);

  if (loading && students.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-xs tracking-widest text-slate-400">読み込み中...</p>
      </div>
    );
  }

  if (!loading && rows.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center">
        <p className="text-sm font-medium text-slate-500">
          条件に合う学生がいません
        </p>
      </div>
    );
  }

  return (
    <div className="scrollbar-hidden h-full overflow-auto">
      <div
        className="grid"
        style={{
          gridTemplateColumns: `repeat(${assignments.length}, minmax(264px, 1fr))`,
        }}
      >
        {/* ヘッダー行（各列の課題情報・スクロールしても上に固定） */}
        {assignments.map((a, ai) => (
          <div
            key={`head-${a.id}`}
            className={`sticky top-0 z-10 border-b border-slate-200 bg-slate-50 px-5 pb-4 pt-6 ${
              ai > 0 ? "border-l" : ""
            }`}
          >
            <div className="flex items-end justify-between gap-3">
              <p className="font-plex-mono text-2xl font-normal leading-none tracking-tight text-slate-500">
                {String(a.number).padStart(2, "0")}
              </p>
              <div className="min-w-0 text-right">
                <p className="text-[10px] tracking-wider text-slate-400">
                  {loading ? "…" : `${counts.get(a.id) ?? 0} 作品`}
                </p>
                <p
                  className="truncate text-xs font-normal leading-tight text-slate-500"
                  title={a.name}
                >
                  {a.name}
                </p>
              </div>
            </div>
          </div>
        ))}

        {/* 学生ごとの行 × 課題ごとの列。作品がないセルは空けておく */}
        {rows.flatMap((s) =>
          assignments.map((a, ai) => {
            const work = worksByStudent.get(s.id)?.get(a.id);
            const show = work !== undefined && passesFilter(work);
            return (
              <div
                key={`${s.id}-${a.id}`}
                className={`px-5 pb-10 pt-1 ${
                  ai > 0 ? "border-l border-slate-200" : ""
                }`}
              >
                {show ? (
                  <WorkCardA work={work} onClick={() => onWorkClick(work)} />
                ) : null}
              </div>
            );
          }),
        )}
      </div>

      {loading && students.length > 0 && (
        <p className="py-6 text-center text-[11px] tracking-wider text-slate-400">
          読み込み中...
        </p>
      )}
    </div>
  );
}
