// ============================================================
// Entity Types
// ============================================================

export interface Student {
  id: string;
  studentId: string; // 8桁数字
  name: string;
  nameKana: string | null; // ヨミガナ
  nameEn: string | null; // 英字氏名
  courseId: string | null; // コースUUID
  createdAt: string;
  // Joined data
  course?: Course;
}

export interface Course {
  id: string;
  name: string; // コース名（例: 〇〇Aコース）
  prefix: string; // 学籍番号プレフィックス（5桁）
  createdAt: string;
}

export interface Assignment {
  id: string;
  number: number; // 1-7
  name: string;
  createdAt: string;
}

export interface Work {
  id: string;
  studentId: string;
  assignmentId: string;
  filename: string;
  storagePath: string;
  imageUrl: string;
  fileSize: number;
  width: number | null;
  height: number | null;
  uploadedAt: string;
  // Joined data
  student?: Student;
  assignment?: Assignment;
  badges?: BadgeType[];
}

export interface BadgeType {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
}

export interface WorkBadge {
  id: string;
  workId: string;
  badgeTypeId: string;
  assignedAt: string;
}

// ============================================================
// Query / Response Types
// ============================================================

export interface WorkListQuery {
  studentIds?: string[];
  assignmentIds?: string[];
  badgeIds?: string[];
  hasBadge?: boolean;
  page: number; // 1-indexed
  pageSize: number; // default: 20
}

export interface WorkListResponse {
  works: WorkItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface WorkItem {
  id: string;
  studentId: string;
  studentName: string;
  assignmentId: string;
  assignmentName: string;
  assignmentNumber: number;
  imageUrl: string;
  uploadedAt: string;
  badges: { id: string; badgeTypeId: string; name: string }[];
}

// ============================================================
// Upload Types
// ============================================================

export interface BulkUploadResult {
  totalFiles: number;
  successCount: number;
  failureCount: number;
  successes: { filename: string; studentName: string }[];
  failures: { filename: string; reason: BulkUploadFailureReason }[];
}

export type BulkUploadFailureReason =
  | "FILENAME_PATTERN_MISMATCH"
  | "STUDENT_NOT_FOUND"
  | "FILE_TOO_LARGE"
  | "INVALID_FORMAT"
  | "STORAGE_ERROR";
