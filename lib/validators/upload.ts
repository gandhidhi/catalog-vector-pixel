/**
 * PNGファイルアップロードバリデーション
 * - 拡張子: .png のみ
 * - サイズ: 2MB（2,097,152バイト）以下
 */

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

const MAX_PNG_FILE_SIZE = 2_097_152; // 2MB in bytes
const MAX_PDF_FILE_SIZE = 10_485_760; // 10MB in bytes

/**
 * ファイル名から拡張子が .png であるかを検証する
 */
export function validatePngExtension(filename: string): boolean {
  return filename.toLowerCase().endsWith(".png");
}

/**
 * ファイル名から拡張子が .pdf であるかを検証する
 */
export function validatePdfExtension(filename: string): boolean {
  return filename.toLowerCase().endsWith(".pdf");
}

/**
 * ファイルサイズが2MB以下であるかを検証する
 */
export function validateFileSize(size: number): boolean {
  return size >= 0 && size <= MAX_PNG_FILE_SIZE;
}

/**
 * PNGファイルバリデーション（拡張子 + サイズ）
 * File APIが使える環境ではFile objectを受け取り、
 * サーバーサイドではファイル名とサイズを個別に検証可能。
 */
export function validatePngFile(file: {
  name: string;
  size: number;
}): ValidationResult {
  if (!validatePngExtension(file.name)) {
    return {
      valid: false,
      error: "対応ファイル形式は .png のみです",
    };
  }

  if (!validateFileSize(file.size)) {
    return {
      valid: false,
      error: "ファイルサイズは2MB以下にしてください",
    };
  }

  return { valid: true };
}

/**
 * PDFファイルバリデーション（拡張子 + サイズ ≤ 10MB）
 */
export function validatePdfFile(file: {
  name: string;
  size: number;
}): ValidationResult {
  if (!validatePdfExtension(file.name)) {
    return {
      valid: false,
      error: "対応ファイル形式は .pdf のみです",
    };
  }

  if (file.size < 0 || file.size > MAX_PDF_FILE_SIZE) {
    return {
      valid: false,
      error: "PDFファイルサイズは10MB以下にしてください",
    };
  }

  return { valid: true };
}

/**
 * PNG または PDF のバリデーション（拡張子判定 + サイズ）
 * 対応形式: .png (2MB以下) / .pdf (10MB以下)
 */
export function validateUploadFile(file: {
  name: string;
  size: number;
}): ValidationResult & { fileType?: "png" | "pdf" } {
  const name = file.name.toLowerCase();

  if (name.endsWith(".png")) {
    const result = validatePngFile(file);
    return { ...result, fileType: result.valid ? "png" : undefined };
  }

  if (name.endsWith(".pdf")) {
    const result = validatePdfFile(file);
    return { ...result, fileType: result.valid ? "pdf" : undefined };
  }

  return {
    valid: false,
    error: "対応ファイル形式は .png または .pdf です",
  };
}
