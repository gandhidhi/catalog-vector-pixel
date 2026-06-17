"use client";

import { useState, useEffect, useCallback } from "react";
import { WorkItem, WorkListResponse } from "@/lib/types";
import WorkGallery from "@/components/viewer/WorkGallery";
import FilterPanel from "@/components/viewer/FilterPanel";
import ResultCount from "@/components/viewer/ResultCount";
import WorkModal from "@/components/viewer/WorkModal";

interface FilterOption {
  id: string;
  label: string;
}

const PAGE_SIZE = 20;

export default function ViewerPage() {
  // Works state
  const [works, setWorks] = useState<WorkItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [selectedAssignments, setSelectedAssignments] = useState<string[]>([]);
  const [selectedBadges, setSelectedBadges] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState("random");

  // Filter options (fetched from API)
  const [studentOptions, setStudentOptions] = useState<FilterOption[]>([]);
  const [assignmentOptions, setAssignmentOptions] = useState<FilterOption[]>(
    [],
  );
  const [badgeTypeOptions, setBadgeTypeOptions] = useState<FilterOption[]>([]);

  // Modal state
  const [selectedWork, setSelectedWork] = useState<WorkItem | null>(null);

  // Fetch filter options on mount
  useEffect(() => {
    async function fetchFilterOptions() {
      try {
        const [assignmentsRes, badgesRes] = await Promise.all([
          fetch("/api/assignments"),
          fetch("/api/badges/types"),
        ]);

        if (assignmentsRes.ok) {
          const data = await assignmentsRes.json();
          setAssignmentOptions(
            (data.assignments ?? []).map(
              (a: { id: string; number: number; name: string }) => ({
                id: a.id,
                label: `課題${a.number}: ${a.name}`,
              }),
            ),
          );
        }

        if (badgesRes.ok) {
          const data = await badgesRes.json();
          setBadgeTypeOptions(
            (data.badgeTypes ?? []).map(
              (b: { id: string; name: string }) => ({
                id: b.id,
                label: b.name,
              }),
            ),
          );
        }
      } catch {
        // Silently fail - filters just won't have options
      }
    }

    fetchFilterOptions();
  }, []);

  // Fetch works
  const fetchWorks = useCallback(
    async (pageNum: number, append: boolean) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("page", pageNum.toString());
        params.set("pageSize", PAGE_SIZE.toString());

        if (selectedStudents.length > 0) {
          params.set("studentIds", selectedStudents.join(","));
        }
        if (selectedAssignments.length > 0) {
          params.set("assignmentIds", selectedAssignments.join(","));
        }
        if (selectedBadges.length > 0) {
          params.set("badgeIds", selectedBadges.join(","));
        }
        if (sortBy !== "random" && sortBy !== "assignment_desc") {
          params.set("sortBy", sortBy);
        }

        const res = await fetch(`/api/works?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to fetch works");

        const data: WorkListResponse = await res.json();

        // ランダムの場合、クライアント側でシャッフル
        let worksToSet = data.works;
        if (sortBy === "random") {
          worksToSet = [...data.works].sort(() => Math.random() - 0.5);
        }

        if (append) {
          setWorks((prev) => [...prev, ...worksToSet]);
        } else {
          setWorks(worksToSet);
        }
        setTotal(data.total);
        setPage(data.page);
        setTotalPages(data.totalPages);

        // Extract unique students for filter options from the first load
        if (pageNum === 1 && studentOptions.length === 0) {
          fetchStudentOptions();
        }
      } catch {
        // Error state could be shown here
      } finally {
        setLoading(false);
      }
    },
    [selectedStudents, selectedAssignments, selectedBadges, sortBy, studentOptions.length],
  );

  // Fetch student options (unique students from works)
  async function fetchStudentOptions() {
    try {
      // Fetch all works without pagination to get unique students
      // Or just fetch a large page to get student names
      const res = await fetch("/api/works?page=1&pageSize=100");
      if (!res.ok) return;
      const data: WorkListResponse = await res.json();

      const uniqueStudents = new Map<string, string>();
      data.works.forEach((w) => {
        if (!uniqueStudents.has(w.studentId)) {
          uniqueStudents.set(w.studentId, w.studentName);
        }
      });

      // If there are more pages, fetch them too
      if (data.totalPages > 1) {
        for (let p = 2; p <= Math.min(data.totalPages, 5); p++) {
          const pageRes = await fetch(`/api/works?page=${p}&pageSize=100`);
          if (!pageRes.ok) break;
          const pageData: WorkListResponse = await pageRes.json();
          pageData.works.forEach((w) => {
            if (!uniqueStudents.has(w.studentId)) {
              uniqueStudents.set(w.studentId, w.studentName);
            }
          });
        }
      }

      const options: FilterOption[] = Array.from(uniqueStudents.entries())
        .map(([id, name]) => ({ id, label: name }))
        .sort((a, b) => a.label.localeCompare(b.label, "ja"));

      setStudentOptions(options);
    } catch {
      // Silently fail
    }
  }

  // Initial fetch
  useEffect(() => {
    fetchWorks(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStudents, selectedAssignments, selectedBadges, sortBy]);

  // Handle load more
  function handleLoadMore() {
    if (page < totalPages) {
      fetchWorks(page + 1, true);
    }
  }

  // Handle filter reset
  function handleReset() {
    setSelectedStudents([]);
    setSelectedAssignments([]);
    setSelectedBadges([]);
    setSortBy("random");
  }

  const hasActiveFilters =
    selectedStudents.length > 0 ||
    selectedAssignments.length > 0 ||
    selectedBadges.length > 0;

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-gray-900">作品ギャラリー</h1>
          <p className="mt-1 text-sm text-gray-500">
            学生の課題作品を閲覧できます
          </p>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col gap-6 lg:flex-row">
          {/* Sidebar filters */}
          <aside className="w-full shrink-0 lg:w-64">
            <FilterPanel
              students={studentOptions}
              assignments={assignmentOptions}
              badgeTypes={badgeTypeOptions}
              selectedStudents={selectedStudents}
              selectedAssignments={selectedAssignments}
              selectedBadges={selectedBadges}
              onStudentsChange={setSelectedStudents}
              onAssignmentsChange={setSelectedAssignments}
              onBadgesChange={setSelectedBadges}
              sortBy={sortBy}
              onSortChange={setSortBy}
              onReset={handleReset}
            />
          </aside>

          {/* Main content */}
          <div className="flex-1">
            {/* Result count */}
            <div className="mb-4">
              <ResultCount total={total} filtered={hasActiveFilters} />
            </div>

            {/* Gallery */}
            <WorkGallery
              works={works}
              hasMore={page < totalPages}
              loading={loading}
              onLoadMore={handleLoadMore}
              onWorkClick={setSelectedWork}
            />
          </div>
        </div>
      </div>

      {/* Modal */}
      {selectedWork && (
        <WorkModal work={selectedWork} onClose={() => setSelectedWork(null)} />
      )}
    </main>
  );
}
