"use client";

import { useState, useEffect, useCallback } from "react";
import type { WorkItem, WorkListResponse, Assignment } from "@/lib/types";
import WorkModal from "@/components/viewer/WorkModal";

interface BadgeTypeItem {
  id: string;
  name: string;
  description: string | null;
}

export default function BadgesPage() {
  const [works, setWorks] = useState<WorkItem[]>([]);
  const [badgeTypes, setBadgeTypes] = useState<BadgeTypeItem[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [selectedAssignment, setSelectedAssignment] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("student_asc");
  const [error, setError] = useState<string | null>(null);
  const [columns, setColumns] = useState<4 | 6 | 8>(4);
  const [selectedWork, setSelectedWork] = useState<WorkItem | null>(null);

  // Fetch badge types
  useEffect(() => {
    async function fetchBadgeTypes() {
      try {
        const res = await fetch("/api/badges/types");
        if (!res.ok) throw new Error("バッジ種別の取得に失敗しました");
        const data = await res.json();
        setBadgeTypes(data.badgeTypes);
      } catch (err) {
        setError(err instanceof Error ? err.message : "エラーが発生しました");
      }
    }
    fetchBadgeTypes();
  }, []);

  // Fetch assignments for filter
  useEffect(() => {
    async function fetchAssignments() {
      try {
        const res = await fetch("/api/assignments");
        if (!res.ok) throw new Error("課題一覧の取得に失敗しました");
        const data = await res.json();
        setAssignments(data.assignments);
      } catch (err) {
        setError(err instanceof Error ? err.message : "エラーが発生しました");
      }
    }
    fetchAssignments();
  }, []);

  // Fetch works (append mode for "load more")
  const fetchWorks = useCallback(async (reset = false) => {
    setLoading(true);
    setError(null);
    try {
      const currentPage = reset ? 1 : page;
      const params = new URLSearchParams({
        page: String(currentPage),
        pageSize: "20",
        sortBy,
      });
      if (selectedAssignment) {
        params.set("assignmentIds", selectedAssignment);
      }
      const res = await fetch(`/api/works?${params.toString()}`);
      if (!res.ok) throw new Error("作品一覧の取得に失敗しました");
      const data: WorkListResponse = await res.json();
      if (reset) {
        setWorks(data.works);
      } else {
        setWorks((prev) => [...prev, ...data.works]);
      }
      setTotalPages(data.totalPages);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }, [page, selectedAssignment, sortBy]);

  useEffect(() => {
    fetchWorks(page === 1);
  }, [fetchWorks]);

  function handleLoadMore() {
    setPage((p) => p + 1);
  }

  // Optimistic badge add
  async function handleAddBadge(workId: string, badgeTypeId: string) {
    const work = works.find((w) => w.id === workId);
    if (!work) return;

    // Check badge limit
    if (work.badges.length >= 3) {
      setError("1つの作品に付与できるバッジは最大3個です");
      setTimeout(() => setError(null), 3000);
      return;
    }

    // Check duplicate
    if (work.badges.some((b) => b.badgeTypeId === badgeTypeId)) {
      return;
    }

    const badgeType = badgeTypes.find((bt) => bt.id === badgeTypeId);
    if (!badgeType) return;

    // Optimistic update - use temp ID
    const tempId = `temp-${Date.now()}`;
    const optimisticBadge = { id: tempId, badgeTypeId, name: badgeType.name };

    setWorks((prev) =>
      prev.map((w) =>
        w.id === workId
          ? { ...w, badges: [...w.badges, optimisticBadge] }
          : w,
      ),
    );

    try {
      const res = await fetch("/api/badges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workId, badgeTypeId }),
      });

      if (!res.ok) {
        const data = await res.json();
        // Revert optimistic update
        setWorks((prev) =>
          prev.map((w) =>
            w.id === workId
              ? { ...w, badges: w.badges.filter((b) => b.id !== tempId) }
              : w,
          ),
        );
        setError(data.error || "バッジの付与に失敗しました");
        setTimeout(() => setError(null), 3000);
        return;
      }

      const data = await res.json();
      // Replace temp ID with real ID
      setWorks((prev) =>
        prev.map((w) =>
          w.id === workId
            ? {
                ...w,
                badges: w.badges.map((b) =>
                  b.id === tempId ? { ...b, id: data.workBadge.id } : b,
                ),
              }
            : w,
        ),
      );
    } catch {
      // Revert optimistic update
      setWorks((prev) =>
        prev.map((w) =>
          w.id === workId
            ? { ...w, badges: w.badges.filter((b) => b.id !== tempId) }
            : w,
        ),
      );
      setError("通信エラーが発生しました。再度お試しください");
      setTimeout(() => setError(null), 3000);
    }
  }

  // Delete work (image)
  async function handleDeleteWork(workId: string) {
    const work = works.find((w) => w.id === workId);
    if (!work) return;

    // Optimistic update
    setWorks((prev) => prev.filter((w) => w.id !== workId));
    setTotal((prev) => prev - 1);

    try {
      const res = await fetch(`/api/works/${workId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        // Revert optimistic update
        setWorks((prev) => [...prev, work]);
        setTotal((prev) => prev + 1);
        setError("作品の削除に失敗しました");
        setTimeout(() => setError(null), 3000);
      }
    } catch {
      // Revert optimistic update
      setWorks((prev) => [...prev, work]);
      setTotal((prev) => prev + 1);
      setError("通信エラーが発生しました。再度お試しください");
      setTimeout(() => setError(null), 3000);
    }
  }

  // Optimistic badge remove
  async function handleRemoveBadge(workId: string, workBadgeId: string) {
    const work = works.find((w) => w.id === workId);
    if (!work) return;

    const removedBadge = work.badges.find((b) => b.id === workBadgeId);
    if (!removedBadge) return;

    // Optimistic update
    setWorks((prev) =>
      prev.map((w) =>
        w.id === workId
          ? { ...w, badges: w.badges.filter((b) => b.id !== workBadgeId) }
          : w,
      ),
    );

    try {
      const res = await fetch(`/api/badges/${workBadgeId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        // Revert optimistic update
        setWorks((prev) =>
          prev.map((w) =>
            w.id === workId
              ? { ...w, badges: [...w.badges, removedBadge] }
              : w,
          ),
        );
        setError("バッジの削除に失敗しました");
        setTimeout(() => setError(null), 3000);
      }
    } catch {
      // Revert optimistic update
      setWorks((prev) =>
        prev.map((w) =>
          w.id === workId
            ? { ...w, badges: [...w.badges, removedBadge] }
            : w,
        ),
      );
      setError("通信エラーが発生しました。再度お試しください");
      setTimeout(() => setError(null), 3000);
    }
  }

  function handleAssignmentFilter(assignmentId: string) {
    setSelectedAssignment(assignmentId);
    setWorks([]);
    setPage(1);
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">バッジ管理</h2>
        <p className="mt-1 text-sm text-gray-500">
          作品にバッジを付与・削除します。1作品あたり最大3個まで付与できます。
        </p>
      </div>

      {/* Error toast */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Assignment filter */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          課題フィルター
        </h3>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleAssignmentFilter("")}
            className={`px-3 py-1.5 text-sm rounded-md border ${
              selectedAssignment === ""
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            }`}
          >
            すべて
          </button>
          {assignments.map((a) => (
            <button
              key={a.id}
              onClick={() => handleAssignmentFilter(a.id)}
              className={`px-3 py-1.5 text-sm rounded-md border ${
                selectedAssignment === a.id
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              }`}
            >
              課題{a.number}: {a.name}
            </button>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-3">
          <span className="text-sm text-gray-600">並び替え:</span>
          <select
            value={sortBy}
            onChange={(e) => { setSortBy(e.target.value); setWorks([]); setPage(1); }}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="random">ランダム</option>
            <option value="student_asc">学籍番号（昇順）</option>
            <option value="student_desc">学籍番号（降順）</option>
            <option value="assignment_desc">課題番号（新しい順）</option>
          </select>
        </div>
      </div>

      {/* Badge types legend */}
      {badgeTypes.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-3">
            定義済みバッジ一覧
          </h3>
          <div className="flex flex-wrap gap-2">
            {badgeTypes.map((bt) => (
              <span
                key={bt.id}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800"
                title={bt.description || undefined}
              >
                🏅 {bt.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Works grid */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            作品一覧
            {total > 0 && (
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({total}件)
              </span>
            )}
          </h3>
          {/* Column switcher */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-500 mr-1">表示列:</span>
            {([4, 6, 8] as const).map((col) => (
              <button
                key={col}
                onClick={() => setColumns(col)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-colors ${
                  columns === col
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                }`}
              >
                {col}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-gray-500">読み込み中...</p>
        ) : works.length === 0 ? (
          <p className="text-sm text-gray-500">
            表示対象の作品がありません。
          </p>
        ) : (
          <>
            <div
              className={`grid items-start ${columns === 8 ? "gap-2" : "gap-4"}`}
              style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
            >
              {works.map((work) => (
                <WorkBadgeCard
                  key={work.id}
                  work={work}
                  badgeTypes={badgeTypes}
                  onAddBadge={handleAddBadge}
                  onRemoveBadge={handleRemoveBadge}
                  onDeleteWork={handleDeleteWork}
                  onImageClick={setSelectedWork}
                  compact={columns === 8}
                />
              ))}
            </div>

            {/* Load More */}
            {page < totalPages && (
              <div className="mt-8 flex justify-center">
                <button
                  type="button"
                  onClick={handleLoadMore}
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
          </>
        )}
      </div>

      {/* Image modal */}
      {selectedWork && (
        <WorkModal
          work={selectedWork}
          onClose={() => setSelectedWork(null)}
        />
      )}
    </div>
  );
}


// Work card component with badge management
function WorkBadgeCard({
  work,
  badgeTypes,
  onAddBadge,
  onRemoveBadge,
  onDeleteWork,
  onImageClick,
  compact,
}: {
  work: WorkItem;
  badgeTypes: BadgeTypeItem[];
  onAddBadge: (_workId: string, _badgeTypeId: string) => void;
  onRemoveBadge: (_workId: string, _workBadgeId: string) => void;
  onDeleteWork: (_workId: string) => void;
  onImageClick: (_work: WorkItem) => void;
  compact: boolean;
}) {
  const [showBadgePicker, setShowBadgePicker] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Badge types already assigned to this work
  const assignedBadgeTypeIds = new Set(work.badges.map((b) => b.badgeTypeId));
  const isAtLimit = work.badges.length >= 3;

  return (
    <div className="border border-gray-200 rounded-lg relative">
      {/* Thumbnail */}
      <div className="aspect-square bg-gray-100 relative overflow-hidden rounded-t-lg">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={work.imageUrl}
          alt={`${work.studentName} - ${work.assignmentName}`}
          className="w-full h-full object-cover cursor-pointer"
          onClick={() => onImageClick(work)}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.style.display = "none";
            target.parentElement!.classList.add("flex", "items-center", "justify-center");
            const placeholder = document.createElement("span");
            placeholder.className = "text-gray-400 text-xs text-center px-2";
            placeholder.textContent = "画像を読み込めません";
            target.parentElement!.appendChild(placeholder);
          }}
        />
        {/* Delete button */}
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="absolute top-1.5 right-1.5 w-6 h-6 flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-red-600 transition-colors"
          title="作品を削除"
          aria-label="作品を削除"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {/* Delete confirmation dialog */}
      {showDeleteConfirm && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 rounded-lg">
          <div className="bg-white rounded-md shadow-lg p-4 mx-2 text-center">
            <p className="text-sm text-gray-700 mb-3">
              この作品を削除しますか？
            </p>
            <p className="text-xs text-gray-500 mb-3">
              関連するバッジも削除されます
            </p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
              >
                キャンセル
              </button>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  onDeleteWork(work.id);
                }}
                className="px-3 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-md"
              >
                削除する
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Info */}
      <div className={compact ? "p-2" : "p-3"}>
        <p className={`font-medium text-gray-900 truncate ${compact ? "text-xs" : "text-sm"}`}>
          {work.studentName}
        </p>
        <p className={`text-gray-500 truncate ${compact ? "text-[10px]" : "text-xs"}`}>
          課題{work.assignmentNumber}: {work.assignmentName}
        </p>

        {/* Current badges */}
        <div className="mt-2 flex flex-wrap gap-1">
          {work.badges.map((badge) => (
            <span
              key={badge.id}
              className={`inline-flex items-center gap-0.5 rounded-full font-medium bg-yellow-100 text-yellow-800 ${compact ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs"}`}
            >
              🏅 {badge.name}
              <button
                onClick={() => onRemoveBadge(work.id, badge.id)}
                className="ml-0.5 text-yellow-600 hover:text-red-600 font-bold"
                title="バッジを削除"
                aria-label={`${badge.name}を削除`}
              >
                ×
              </button>
            </span>
          ))}
        </div>

        {/* Add badge button */}
        <div className="mt-2 relative">
          <button
            onClick={() => setShowBadgePicker(!showBadgePicker)}
            disabled={isAtLimit && !showBadgePicker}
            className="text-xs text-blue-600 hover:text-blue-800 disabled:text-gray-400 disabled:cursor-not-allowed"
          >
            {showBadgePicker ? "閉じる" : isAtLimit ? "上限(3個)に達しています" : "+ バッジを追加"}
          </button>

          {/* Badge picker dropdown */}
          {showBadgePicker && (
            <div className="absolute z-50 bottom-full mb-1 left-0 w-full bg-white border border-gray-200 rounded-md shadow-lg py-1">
              {badgeTypes.length === 0 ? (
                <p className="px-3 py-2 text-xs text-gray-500">
                  バッジ種別が登録されていません
                </p>
              ) : (
                badgeTypes.map((bt) => {
                  const isAssigned = assignedBadgeTypeIds.has(bt.id);
                  const disabled = isAssigned || isAtLimit;
                  return (
                    <button
                      key={bt.id}
                      onClick={() => {
                        if (!disabled) {
                          onAddBadge(work.id, bt.id);
                          setShowBadgePicker(false);
                        }
                      }}
                      disabled={disabled}
                      className={`w-full text-left px-3 py-1.5 text-xs ${
                        disabled
                          ? "text-gray-400 bg-gray-50 cursor-not-allowed"
                          : "text-gray-700 hover:bg-blue-50 hover:text-blue-700"
                      }`}
                      title={
                        isAssigned
                          ? "既に付与済み"
                          : isAtLimit
                            ? "上限(3個)に達しています"
                            : bt.description || undefined
                      }
                    >
                      🏅 {bt.name}
                      {isAssigned && (
                        <span className="ml-1 text-gray-400">(付与済み)</span>
                      )}
                    </button>
                  );
                })
              )}
              {isAtLimit && (
                <p className="px-3 py-1.5 text-xs text-red-500 border-t border-gray-100">
                  1つの作品に付与できるバッジは最大3個です
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
