/**
 * PNGファイルアップロードバリデーション
 * - 拡張子: .png のみ
 * - サイズ: 2MB（2,097,152バイト）以下
 */

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

const MAX_FILE_SIZE = 2_097_152; // 2MB in bytes

/**
 * ファイル名から拡張子が .png であるかを検証する
 */
export function validatePngExtension(filename: string): boolean {
  return filename.toLowerCase().endsWith(".png");
}

/**
 * ファイルサイズが2MB以下であるかを検証する
 */
export function validateFileSize(size: number): boolean {
  return size >= 0 && size <= MAX_FILE_SIZE;
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
