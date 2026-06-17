"use client";

import { useState, useEffect, useCallback } from "react";
import type { WorkItem, WorkListResponse, Assignment } from "@/lib/types";

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
  const [error, setError] = useState<string | null>(null);

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

  // Fetch works
  const fetchWorks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: "20",
      });
      if (selectedAssignment) {
        params.set("assignmentIds", selectedAssignment);
      }
      const res = await fetch(`/api/works?${params.toString()}`);
      if (!res.ok) throw new Error("作品一覧の取得に失敗しました");
      const data: WorkListResponse = await res.json();
      setWorks(data.works);
      setTotalPages(data.totalPages);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }, [page, selectedAssignment]);

  useEffect(() => {
    fetchWorks();
  }, [fetchWorks]);

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
        </div>

        {loading ? (
          <p className="text-sm text-gray-500">読み込み中...</p>
        ) : works.length === 0 ? (
          <p className="text-sm text-gray-500">
            表示対象の作品がありません。
          </p>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {works.map((work) => (
                <WorkBadgeCard
                  key={work.id}
                  work={work}
                  badgeTypes={badgeTypes}
                  onAddBadge={handleAddBadge}
                  onRemoveBadge={handleRemoveBadge}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1.5 text-sm rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  前へ
                </button>
                <span className="text-sm text-gray-600">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1.5 text-sm rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  次へ
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}


// Work card component with badge management
function WorkBadgeCard({
  work,
  badgeTypes,
  onAddBadge,
  onRemoveBadge,
}: {
  work: WorkItem;
  badgeTypes: BadgeTypeItem[];
  onAddBadge: (_workId: string, _badgeTypeId: string) => void;
  onRemoveBadge: (_workId: string, _workBadgeId: string) => void;
}) {
  const [showBadgePicker, setShowBadgePicker] = useState(false);

  // Badge types already assigned to this work
  const assignedBadgeTypeIds = new Set(work.badges.map((b) => b.badgeTypeId));
  const isAtLimit = work.badges.length >= 3;

  return (
    <div className="border border-gray-200 rounded-lg">
      {/* Thumbnail */}
      <div className="aspect-square bg-gray-100 relative overflow-hidden rounded-t-lg">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={work.imageUrl}
          alt={`${work.studentName} - ${work.assignmentName}`}
          className="w-full h-full object-cover"
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
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="text-sm font-medium text-gray-900 truncate">
          {work.studentName}
        </p>
        <p className="text-xs text-gray-500 truncate">
          課題{work.assignmentNumber}: {work.assignmentName}
        </p>

        {/* Current badges */}
        <div className="mt-2 flex flex-wrap gap-1">
          {work.badges.map((badge) => (
            <span
              key={badge.id}
              className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"
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
