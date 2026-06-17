"use client";

import { useState, useRef, useEffect } from "react";

interface FilterOption {
  id: string;
  label: string;
}

interface FilterPanelProps {
  students: FilterOption[];
  assignments: FilterOption[];
  badgeTypes: FilterOption[];
  selectedStudents: string[];
  selectedAssignments: string[];
  selectedBadges: string[];
  onStudentsChange: (ids: string[]) => void;
  onAssignmentsChange: (ids: string[]) => void;
  onBadgesChange: (ids: string[]) => void;
  onReset: () => void;
}

export default function FilterPanel({
  students,
  assignments,
  badgeTypes,
  selectedStudents,
  selectedAssignments,
  selectedBadges,
  onStudentsChange,
  onAssignmentsChange,
  onBadgesChange,
  onReset,
}: FilterPanelProps) {
  const hasActiveFilters =
    selectedStudents.length > 0 ||
    selectedAssignments.length > 0 ||
    selectedBadges.length > 0;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">フィルター</h2>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onReset}
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            リセット
          </button>
        )}
      </div>

      <div className="mt-3 space-y-4">
        {/* Student filter */}
        <StudentFilter
          students={students}
          selected={selectedStudents}
          onChange={onStudentsChange}
        />

        {/* Assignment filter */}
        <div>
          <p className="mb-1.5 text-xs font-medium text-gray-600">課題</p>
          <div className="flex flex-wrap gap-2">
            {assignments.map((a) => (
              <label
                key={a.id}
                className={`inline-flex cursor-pointer items-center rounded-full border px-3 py-1 text-xs transition ${
                  selectedAssignments.includes(a.id)
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-300 bg-white text-gray-600 hover:border-gray-400"
                }`}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={selectedAssignments.includes(a.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      onAssignmentsChange([...selectedAssignments, a.id]);
                    } else {
                      onAssignmentsChange(
                        selectedAssignments.filter((id) => id !== a.id),
                      );
                    }
                  }}
                />
                {a.label}
              </label>
            ))}
          </div>
        </div>

        {/* Badge filter */}
        <div>
          <p className="mb-1.5 text-xs font-medium text-gray-600">バッジ</p>
          <div className="flex flex-wrap gap-2">
            {badgeTypes.map((b) => (
              <label
                key={b.id}
                className={`inline-flex cursor-pointer items-center rounded-full border px-3 py-1 text-xs transition ${
                  selectedBadges.includes(b.id)
                    ? "border-yellow-500 bg-yellow-50 text-yellow-700"
                    : "border-gray-300 bg-white text-gray-600 hover:border-gray-400"
                }`}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={selectedBadges.includes(b.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      onBadgesChange([...selectedBadges, b.id]);
                    } else {
                      onBadgesChange(
                        selectedBadges.filter((id) => id !== b.id),
                      );
                    }
                  }}
                />
                ⭐ {b.label}
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Searchable student dropdown filter
 */
function StudentFilter({
  students,
  selected,
  onChange,
}: {
  students: FilterOption[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = students.filter((s) =>
    s.label.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div ref={containerRef} className="relative">
      <p className="mb-1.5 text-xs font-medium text-gray-600">学生</p>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-left text-xs text-gray-700 hover:border-gray-400"
      >
        <span className="truncate">
          {selected.length === 0
            ? "すべての学生"
            : `${selected.length}名選択中`}
        </span>
        <svg
          className={`h-4 w-4 text-gray-400 transition ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {open && (
        <div className="absolute z-10 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg">
          {/* Search */}
          <div className="border-b border-gray-100 p-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="名前で検索..."
              className="w-full rounded border border-gray-200 px-2 py-1 text-xs focus:border-blue-400 focus:outline-none"
            />
          </div>

          {/* Options */}
          <div className="max-h-48 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <p className="px-2 py-1 text-xs text-gray-400">
                該当する学生がいません
              </p>
            ) : (
              filtered.map((student) => (
                <label
                  key={student.id}
                  className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-xs hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(student.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        onChange([...selected, student.id]);
                      } else {
                        onChange(selected.filter((id) => id !== student.id));
                      }
                    }}
                    className="h-3 w-3 rounded border-gray-300 text-blue-600"
                  />
                  <span className="text-gray-700">{student.label}</span>
                </label>
              ))
            )}
          </div>

          {/* Clear selection */}
          {selected.length > 0 && (
            <div className="border-t border-gray-100 p-2">
              <button
                type="button"
                onClick={() => onChange([])}
                className="w-full text-center text-xs text-blue-600 hover:text-blue-800"
              >
                選択をクリア
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
