"use client";

import { RefObject, useEffect, useRef, useState } from "react";
import { FilterOption, SortOptionA } from "@/components/viewer/a/types";

const SORT_OPTIONS: { value: SortOptionA; label: string }[] = [
  { value: "random", label: "ランダム" },
  { value: "student_asc", label: "学籍番号 ↑" },
  { value: "student_desc", label: "学籍番号 ↓" },
];

interface SearchMenuBProps {
  studentOptions: FilterOption[];
  badgeTypes: FilterOption[];
  pendingStudents: FilterOption[];
  onPendingStudentsChange: (students: FilterOption[]) => void;
  appliedCount: number;
  onSearch: () => void;
  onClearSearch: () => void;
  selectedBadges: string[];
  onBadgesChange: (ids: string[]) => void;
  threeTagsOnly: boolean;
  onThreeTagsChange: (value: boolean) => void;
  sortBy: SortOptionA;
  onSortChange: (sort: SortOptionA) => void;
}

/** 要素の外側をクリックしたら onClose を呼ぶ */
function useOutsideClose(
  ref: RefObject<HTMLElement>,
  onClose: () => void,
  enabled: boolean,
) {
  useEffect(() => {
    if (!enabled) return;
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [ref, onClose, enabled]);
}

function MagnifierIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 21l-4.35-4.35M17 10.5a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z"
      />
    </svg>
  );
}

function Chip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`rounded-full border px-3 py-1 font-dot text-[11px] transition ${
        selected
          ? "border-orange-500 bg-orange-500 text-white"
          : "border-orange-300 bg-white text-stone-500 hover:border-orange-500 hover:text-orange-600 active:bg-orange-100"
      }`}
    >
      {label}
    </button>
  );
}

/**
 * 検索・絞り込みの統合メニュー。
 * 課題タブ行の右端に置く虫眼鏡ボタンと、その下に開くポップアップ。
 * ポップアップ内で「学生検索」「ソート」「タグ」の3つがすべて操作できる。
 */
export default function SearchMenuB({
  studentOptions,
  badgeTypes,
  pendingStudents,
  onPendingStudentsChange,
  appliedCount,
  onSearch,
  onClearSearch,
  selectedBadges,
  onBadgesChange,
  threeTagsOnly,
  onThreeTagsChange,
  sortBy,
  onSortChange,
}: SearchMenuBProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function close() {
    setOpen(false);
    setQuery("");
  }

  useOutsideClose(containerRef, close, open);

  // 開いたら学生検索の入力にフォーカス
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // 適用中のフィルター数（ボタンのバッジ表示用。ソートは含めない）
  const activeCount =
    appliedCount + selectedBadges.length + (threeTagsOnly ? 1 : 0);

  const trimmed = query.trim();
  const selectedIds = new Set(pendingStudents.map((s) => s.id));
  const candidates =
    trimmed === ""
      ? []
      : studentOptions
          .filter(
            (s) =>
              !selectedIds.has(s.id) &&
              s.label.toLowerCase().includes(trimmed.toLowerCase()),
          )
          .slice(0, 6);

  function addStudent(student: FilterOption) {
    onPendingStudentsChange([...pendingStudents, student]);
    // IMEの未確定文字が残らないよう、blurで確定させてからDOM値ごとクリア
    const input = inputRef.current;
    if (input) {
      input.blur();
      input.value = "";
    }
    setQuery("");
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function applySearch() {
    onSearch();
    close();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.nativeEvent.isComposing) return;
    if (e.key === "Enter") {
      e.preventDefault();
      if (candidates.length > 0) {
        addStudent(candidates[0]);
      } else if (trimmed === "") {
        applySearch();
      }
    } else if (
      e.key === "Backspace" &&
      query === "" &&
      pendingStudents.length > 0
    ) {
      onPendingStudentsChange(pendingStudents.slice(0, -1));
    } else if (e.key === "Escape") {
      close();
    }
  }

  return (
    <div ref={containerRef} className="relative shrink-0">
      {/* トリガーボタン（タブと同じサイズ感・白地で表現を変える） */}
      <button
        type="button"
        onClick={() => (open ? close() : setOpen(true))}
        aria-expanded={open}
        aria-label="検索・絞り込み"
        className={`flex h-full min-w-[60px] flex-col items-center justify-center gap-1.5 px-2 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
          open
            ? "bg-orange-500/80 text-white"
            : "bg-orange-300/30 text-orange-400 hover:bg-orange-400/40 hover:text-orange-600"
        }`}
      >
        <span className="relative">
          <MagnifierIcon className="h-6 w-6" />
          {activeCount > 0 && !open && (
            <span className="absolute -right-2.5 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-orange-500 px-1 font-dot text-[9px] leading-none text-white">
              {activeCount}
            </span>
          )}
        </span>
        <span className="font-dot text-[11px] leading-none">検索</span>
      </button>

      {/* 統合ポップアップ */}
      {open && (
        <div
          role="dialog"
          aria-label="検索・絞り込み"
          className="absolute right-0 top-full z-30 mt-2 w-[340px] max-w-[94vw] rounded-xl border border-orange-300 bg-white shadow-2xl"
        >
          {/* ヘッダー */}
          <div className="flex items-center justify-between border-b border-orange-100 px-3 py-2">
            <p className="font-dot text-[11px] tracking-widest text-stone-400">
              検索・絞り込み
            </p>
            <button
              type="button"
              onClick={close}
              className="rounded border border-orange-200 px-1.5 py-0.5 font-dot text-[10px] text-stone-400 transition hover:border-orange-400 hover:text-orange-600"
            >
              Esc
            </button>
          </div>

          {/* 学生検索 */}
          <div className="border-b border-orange-100 px-3 py-3">
            <p className="mb-2 font-dot text-[11px] text-stone-400">
              学生検索
            </p>
            <div className="flex items-center gap-2 border-b border-orange-200 pb-1.5 transition focus-within:border-orange-500">
              <MagnifierIcon className="h-4 w-4 shrink-0 text-orange-400" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="苗字を入力..."
                className="min-w-0 flex-1 bg-transparent text-sm text-stone-600 placeholder:text-stone-300 focus:outline-none"
                aria-label="学生名で検索"
              />
            </div>

            {/* 候補リスト */}
            {trimmed !== "" && (
              <div className="max-h-40 overflow-y-auto py-1">
                {candidates.length === 0 ? (
                  <p className="px-1 py-1.5 font-dot text-[11px] text-stone-400">
                    該当する学生がいません
                  </p>
                ) : (
                  candidates.map((student) => (
                    <button
                      key={student.id}
                      type="button"
                      onClick={() => addStudent(student)}
                      className="block w-full rounded px-2 py-1.5 text-left text-sm text-stone-600 transition hover:bg-orange-50 hover:text-orange-700"
                    >
                      {student.label}
                    </button>
                  ))
                )}
              </div>
            )}

            {/* 選択済みチップ */}
            {pendingStudents.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-2">
                {pendingStudents.map((student) => (
                  <span
                    key={student.id}
                    className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 font-dot text-[11px] text-orange-700"
                  >
                    {student.label}
                    <button
                      type="button"
                      onClick={() =>
                        onPendingStudentsChange(
                          pendingStudents.filter((s) => s.id !== student.id),
                        )
                      }
                      aria-label={`${student.label}を外す`}
                      className="text-orange-400 transition hover:text-orange-700"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between gap-3 pt-2.5">
              <button
                type="button"
                onClick={applySearch}
                className="rounded-full bg-orange-500 px-4 py-1.5 font-dot text-xs text-white transition hover:bg-orange-600 active:bg-orange-700"
              >
                検索開始
              </button>
              {appliedCount > 0 && (
                <button
                  type="button"
                  onClick={onClearSearch}
                  className="font-dot text-[11px] text-stone-400 underline underline-offset-2 transition hover:text-orange-600"
                >
                  クリア（{appliedCount}名）
                </button>
              )}
            </div>
          </div>

          {/* ソート */}
          <div className="border-b border-orange-100 px-3 py-3">
            <p className="mb-2 font-dot text-[11px] text-stone-400">ソート</p>
            <div className="flex flex-wrap gap-1.5">
              {SORT_OPTIONS.map((opt) => (
                <Chip
                  key={opt.value}
                  label={opt.label}
                  selected={sortBy === opt.value}
                  onClick={() => onSortChange(opt.value)}
                />
              ))}
            </div>
          </div>

          {/* タグ */}
          <div className="px-3 py-3">
            <p className="mb-2 font-dot text-[11px] text-stone-400">タグ</p>
            <div className="flex flex-wrap gap-1.5">
              <Chip
                label="３つタグ"
                selected={threeTagsOnly}
                onClick={() => onThreeTagsChange(!threeTagsOnly)}
              />
              {badgeTypes.map((b) => (
                <Chip
                  key={b.id}
                  label={`⭐${b.label}`}
                  selected={selectedBadges.includes(b.id)}
                  onClick={() =>
                    onBadgesChange(
                      selectedBadges.includes(b.id)
                        ? selectedBadges.filter((id) => id !== b.id)
                        : [...selectedBadges, b.id],
                    )
                  }
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
