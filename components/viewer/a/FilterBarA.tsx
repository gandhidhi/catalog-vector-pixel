"use client";

import { RefObject, useEffect, useRef, useState } from "react";
import { FilterOption, SortOptionA } from "./types";

const SORT_OPTIONS: { value: SortOptionA; label: string }[] = [
  { value: "random", label: "ランダム" },
  { value: "student_asc", label: "学籍番号 ↑" },
  { value: "student_desc", label: "学籍番号 ↓" },
];

interface FilterBarAProps {
  studentOptions: FilterOption[];
  badgeTypes: FilterOption[];
  /** 検索ボックス内で選択中（未実行）の学生タグ */
  pendingStudents: FilterOption[];
  onPendingStudentsChange: (students: FilterOption[]) => void;
  /** 検索実行済みの学生数（0なら未検索） */
  appliedCount: number;
  onSearch: () => void;
  onClearSearch: () => void;
  selectedBadges: string[];
  onBadgesChange: (ids: string[]) => void;
  /** 「３つタグ」: 3つ以上のバッジが付与された作品のみ表示 */
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

/**
 * Aパターンの上部フィルターバー。
 * 通常幅: 学生検索ボックス → Sortプルダウン → タグ検索プルダウン の横並び。
 * 狭い幅: ハンバーガーメニューから非モーダルのダイアログを開いて全機能を操作する。
 */
export default function FilterBarA(props: FilterBarAProps) {
  const {
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
  } = props;

  // 検索エリアの拡縮（折りたたみ）状態
  const [collapsed, setCollapsed] = useState(false);

  const tagCount = selectedBadges.length + (threeTagsOnly ? 1 : 0);
  const activeSummary: string[] = [];
  if (appliedCount > 0) activeSummary.push(`検索: ${appliedCount}名`);
  if (tagCount > 0) activeSummary.push(`タグ: ${tagCount}件`);

  return (
    <div className="relative shrink-0 border-b border-slate-200 bg-white">
      {/* ---- Desktop bar ---- */}
      <div
        className={`hidden flex-wrap items-center gap-x-6 gap-y-3 px-8 md:flex ${
          collapsed ? "py-1.5" : "py-3"
        }`}
      >
        {collapsed ? (
          <p className="truncate text-[11px] text-slate-400">
            {activeSummary.length > 0
              ? activeSummary.join(" / ")
              : "検索・フィルター"}
          </p>
        ) : (
          <>
            <div className="flex min-w-0 items-center gap-3">
              <span className="shrink-0 text-xs tracking-widest text-slate-400">
                検索
              </span>
              <StudentSearchBox
                studentOptions={studentOptions}
                selected={pendingStudents}
                onChange={onPendingStudentsChange}
                onSubmit={onSearch}
              />
              <button
                type="button"
                onClick={onSearch}
                className="shrink-0 border border-accent-a px-4 py-1.5 text-xs font-medium text-accent-a transition hover:bg-accent-a hover:text-white"
              >
                検索開始
              </button>
              {appliedCount > 0 && (
                <button
                  type="button"
                  onClick={onClearSearch}
                  className="shrink-0 text-xs text-slate-400 underline underline-offset-2 hover:text-slate-500"
                >
                  クリア（{appliedCount}名で検索中）
                </button>
              )}
            </div>

            {/* ソート・タグ: px-4のタッチ余白ぶんをネガティブマージンで相殺し、
                検索開始ボタンとの見た目の間隔（約20px）を揃える */}
            <div className="-ml-5 flex items-center -space-x-3">
              <SortDropdown sortBy={sortBy} onSortChange={onSortChange} />
              {badgeTypes.length > 0 && (
                <TagDropdown
                  badgeTypes={badgeTypes}
                  selectedBadges={selectedBadges}
                  onBadgesChange={onBadgesChange}
                  threeTagsOnly={threeTagsOnly}
                  onThreeTagsChange={onThreeTagsChange}
                />
              )}
            </div>
          </>
        )}

        {/* 拡縮トグル（右上） */}
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          aria-expanded={!collapsed}
          aria-label={collapsed ? "検索エリアを開く" : "検索エリアを閉じる"}
          className="ml-auto flex h-7 w-7 shrink-0 items-center justify-center border border-slate-300 text-slate-500 transition hover:border-accent-a hover:text-accent-a"
        >
          <DropdownChevron open={!collapsed} />
        </button>
      </div>

      {/* ---- Mobile bar (hamburger) ---- */}
      <MobileFilterMenu {...props} />
    </div>
  );
}

function DropdownChevron({ open }: { open: boolean }) {
  return (
    <svg
      className={`h-3.5 w-3.5 transition ${open ? "rotate-180" : ""}`}
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
  );
}

function SortDropdown({
  sortBy,
  onSortChange,
}: {
  sortBy: SortOptionA;
  onSortChange: (sort: SortOptionA) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useOutsideClose(ref, () => setOpen(false), open);

  const current =
    SORT_OPTIONS.find((o) => o.value === sortBy) ?? SORT_OPTIONS[0];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex items-center gap-2 px-4 py-[7px] text-xs text-slate-400 transition hover:bg-slate-200 hover:text-slate-500 active:bg-slate-300"
      >
        <span className="tracking-widest text-slate-400">ソート :</span>
        <span className="font-medium text-accent-a">{current.label}</span>
        <DropdownChevron open={open} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-20 mt-2 min-w-[10rem] border border-slate-200 bg-white shadow-lg">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onSortChange(opt.value);
                setOpen(false);
              }}
              className={`block w-full px-3 py-2 text-left text-xs transition hover:bg-accent-a-soft ${
                sortBy === opt.value
                  ? "font-medium text-accent-a"
                  : "text-slate-500"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function TagDropdown({
  badgeTypes,
  selectedBadges,
  onBadgesChange,
  threeTagsOnly,
  onThreeTagsChange,
}: {
  badgeTypes: FilterOption[];
  selectedBadges: string[];
  onBadgesChange: (ids: string[]) => void;
  threeTagsOnly: boolean;
  onThreeTagsChange: (value: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useOutsideClose(ref, () => setOpen(false), open);

  const selectionCount = selectedBadges.length + (threeTagsOnly ? 1 : 0);

  function toggle(id: string) {
    onBadgesChange(
      selectedBadges.includes(id)
        ? selectedBadges.filter((b) => b !== id)
        : [...selectedBadges, id],
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex items-center gap-2 px-4 py-[7px] text-xs text-slate-400 transition hover:bg-slate-200 hover:text-slate-500 active:bg-slate-300"
      >
        <span className="tracking-widest text-slate-400">タグ :</span>
        <span
          className={
            selectionCount > 0 ? "font-medium text-accent-a" : "text-slate-500"
          }
        >
          {selectionCount > 0 ? `${selectionCount}件選択中` : "すべて"}
        </span>
        <DropdownChevron open={open} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-20 mt-2 min-w-[12rem] border border-slate-200 bg-white shadow-lg">
          {/* ３つタグ（バッジ3つ以上の作品）は常に一番上 */}
          <label className="flex cursor-pointer items-center gap-2 border-b border-slate-100 px-3 py-2 text-xs text-slate-500 transition hover:bg-accent-a-soft">
            <input
              type="checkbox"
              checked={threeTagsOnly}
              onChange={(e) => onThreeTagsChange(e.target.checked)}
              className="h-3 w-3 border-slate-300 accent-[#1e3a8a]"
            />
            <span
              className={threeTagsOnly ? "font-medium text-accent-a" : ""}
            >
              ３つタグ
            </span>
          </label>

          <div className="max-h-64 overflow-y-auto p-1">
            {badgeTypes.map((b) => (
              <label
                key={b.id}
                className="flex cursor-pointer items-center gap-2 px-2 py-1.5 text-xs text-slate-500 transition hover:bg-accent-a-soft"
              >
                <input
                  type="checkbox"
                  checked={selectedBadges.includes(b.id)}
                  onChange={() => toggle(b.id)}
                  className="h-3 w-3 border-slate-300 accent-[#1e3a8a]"
                />
                <span
                  className={
                    selectedBadges.includes(b.id)
                      ? "font-medium text-accent-a"
                      : ""
                  }
                >
                  ⭐ {b.label}
                </span>
              </label>
            ))}
          </div>
          {selectionCount > 0 && (
            <div className="border-t border-slate-100 p-2">
              <button
                type="button"
                onClick={() => {
                  onBadgesChange([]);
                  onThreeTagsChange(false);
                }}
                className="w-full text-center text-xs text-slate-400 underline underline-offset-2 hover:text-slate-500"
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

/**
 * 狭い幅用: ハンバーガーメニュー。
 * 開くと非モーダルのダイアログ（背景は操作可能なまま）に
 * 文字検索・Sort・タグ検索が収納されている。
 */
function MobileFilterMenu({
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
}: FilterBarAProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useOutsideClose(ref, () => setOpen(false), open);

  const tagCount = selectedBadges.length + (threeTagsOnly ? 1 : 0);
  const activeSummary: string[] = [];
  if (appliedCount > 0) activeSummary.push(`検索: ${appliedCount}名`);
  if (tagCount > 0) activeSummary.push(`タグ: ${tagCount}件`);

  return (
    <div ref={ref} className="flex items-center justify-between px-4 py-2 md:hidden">
      <p className="truncate text-[11px] text-slate-400">
        {activeSummary.join(" / ")}
      </p>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label="検索・フィルターメニュー"
        className="flex h-8 w-8 items-center justify-center border border-slate-300 text-slate-500 transition hover:border-accent-a hover:text-accent-a"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5"
          />
        </svg>
      </button>

      {/* Non-modal dialog */}
      {open && (
        <div
          role="dialog"
          aria-label="検索とフィルター"
          className="absolute right-2 top-full z-30 mt-2 w-[calc(100vw-1rem)] max-w-sm border border-slate-200 bg-white p-4 shadow-xl"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs tracking-widest text-slate-400">
              検索・フィルター
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="閉じる"
              className="text-slate-400 transition hover:text-slate-500"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Student search */}
          <div className="mt-3">
            <StudentSearchBox
              studentOptions={studentOptions}
              selected={pendingStudents}
              onChange={onPendingStudentsChange}
              onSubmit={onSearch}
              widthClass="w-full"
            />
            <div className="mt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={onSearch}
                className="flex-1 border border-accent-a px-4 py-1.5 text-xs font-medium text-accent-a transition hover:bg-accent-a hover:text-white"
              >
                検索開始
              </button>
              {appliedCount > 0 && (
                <button
                  type="button"
                  onClick={onClearSearch}
                  className="shrink-0 text-xs text-slate-400 underline underline-offset-2 hover:text-slate-500"
                >
                  クリア
                </button>
              )}
            </div>
          </div>

          {/* Sort */}
          <div className="mt-4">
            <p className="mb-1.5 text-xs tracking-widest text-slate-400">
              ソート
            </p>
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value as SortOptionA)}
              className="w-full border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-500 focus:border-accent-a focus:outline-none"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Tags */}
          {badgeTypes.length > 0 && (
            <div className="mt-4">
              <p className="mb-1.5 text-xs tracking-widest text-slate-400">
                タグ
              </p>
              <div className="flex flex-wrap gap-2">
                {/* ３つタグは常に先頭 */}
                <button
                  type="button"
                  onClick={() => onThreeTagsChange(!threeTagsOnly)}
                  className={`border px-2.5 py-1 text-xs transition ${
                    threeTagsOnly
                      ? "border-accent-a bg-accent-a-soft font-medium text-accent-a"
                      : "border-slate-300 text-slate-500 hover:border-slate-400"
                  }`}
                >
                  ３つタグ
                </button>
                {badgeTypes.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() =>
                      onBadgesChange(
                        selectedBadges.includes(b.id)
                          ? selectedBadges.filter((id) => id !== b.id)
                          : [...selectedBadges, b.id],
                      )
                    }
                    className={`border px-2.5 py-1 text-xs transition ${
                      selectedBadges.includes(b.id)
                        ? "border-accent-a bg-accent-a-soft font-medium text-accent-a"
                        : "border-slate-300 text-slate-500 hover:border-slate-400"
                    }`}
                  >
                    ⭐ {b.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * 苗字を入力すると候補がドロップダウン表示され、
 * 選択するとタグ（チップ）としてボックス内に追加される検索ボックス。
 */
function StudentSearchBox({
  studentOptions,
  selected,
  onChange,
  onSubmit,
  widthClass = "w-64 md:w-80",
}: {
  studentOptions: FilterOption[];
  selected: FilterOption[];
  onChange: (students: FilterOption[]) => void;
  onSubmit: () => void;
  widthClass?: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useOutsideClose(containerRef, () => setOpen(false), open);

  const trimmed = query.trim();
  const selectedIds = new Set(selected.map((s) => s.id));
  const candidates =
    trimmed === ""
      ? []
      : studentOptions
          .filter(
            (s) =>
              !selectedIds.has(s.id) &&
              s.label.toLowerCase().includes(trimmed.toLowerCase()),
          )
          .slice(0, 8);

  function addStudent(student: FilterOption) {
    onChange([...selected, student]);
    // IMEの未確定文字が残らないよう、一度blurで入力を確定させてから
    // DOMの値ごとクリアし、次フレームでフォーカスを戻す
    const input = inputRef.current;
    if (input) {
      input.blur();
      input.value = "";
    }
    setQuery("");
    setOpen(false);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    // IMEの変換確定操作（変換中のEnter等）はショートカットとして扱わない
    if (e.nativeEvent.isComposing) return;
    if (e.key === "Enter") {
      e.preventDefault();
      if (candidates.length > 0) {
        // 候補がある間は Enter で先頭候補を選択
        addStudent(candidates[0]);
      } else if (trimmed === "") {
        // 入力が空（選択済み）なら Enter で検索実行
        onSubmit();
      }
    } else if (e.key === "Backspace" && query === "" && selected.length > 0) {
      onChange(selected.slice(0, -1));
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className={`relative min-w-0 ${widthClass}`}>
      <div
        className="flex min-h-[34px] w-full cursor-text flex-wrap items-center gap-1 border-b border-slate-300 px-1 py-1 transition focus-within:border-accent-a"
        onClick={() => inputRef.current?.focus()}
      >
        {selected.map((student) => (
          <span
            key={student.id}
            className="inline-flex items-center gap-1 bg-accent-a-soft px-2 py-0.5 text-xs text-accent-a"
          >
            {student.label}
            <button
              type="button"
              onClick={() =>
                onChange(selected.filter((s) => s.id !== student.id))
              }
              aria-label={`${student.label}を外す`}
              className="text-accent-a/50 transition hover:text-accent-a"
            >
              ×
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={selected.length === 0 ? "苗字を入力..." : ""}
          className="min-w-[6rem] flex-1 bg-transparent px-1 py-0.5 text-xs text-slate-500 placeholder:text-slate-300 focus:outline-none"
          aria-label="学生名で検索"
        />
      </div>

      {/* Candidates dropdown */}
      {open && trimmed !== "" && (
        <div className="absolute left-0 top-full z-20 mt-1 w-full border border-slate-200 bg-white shadow-lg">
          {candidates.length === 0 ? (
            <p className="px-3 py-2 text-xs text-slate-400">
              該当する学生がいません
            </p>
          ) : (
            candidates.map((student) => (
              <button
                key={student.id}
                type="button"
                onClick={() => addStudent(student)}
                className="block w-full px-3 py-2 text-left text-xs text-slate-500 transition hover:bg-accent-a-soft hover:text-accent-a"
              >
                {student.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
