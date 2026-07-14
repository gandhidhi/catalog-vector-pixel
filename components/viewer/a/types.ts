export interface FilterOption {
  id: string;
  label: string;
}

export type SortOptionA = "random" | "student_asc" | "student_desc";

/** 展開グリッドの列数モード（レスポンシブ / 4列固定 / 8列固定） */
export type GridMode = "responsive" | 4 | 8;
