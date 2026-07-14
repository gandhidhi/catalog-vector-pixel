export interface FilterOption {
  id: string;
  label: string;
}

export type SortOptionA = "random" | "student_asc" | "student_desc";

/** 展開グリッドの列数モード */
export type GridMode = "responsive" | 1 | 3 | 4 | 8;
