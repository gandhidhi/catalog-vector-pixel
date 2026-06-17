/**
 * マスターデータバリデーション
 * - 学籍番号: 8桁数字
 * - 氏名: 1〜50文字
 * - 課題番号: 1〜7の整数
 * - 課題名: 1〜100文字
 */

/**
 * 学籍番号バリデーション: 正確に8桁の数字
 */
export function validateStudentId(id: string): boolean {
  return /^\d{8}$/.test(id);
}

/**
 * 氏名バリデーション: 1〜50文字
 */
export function validateStudentName(name: string): boolean {
  return name.length >= 1 && name.length <= 50;
}

/**
 * 課題番号バリデーション: 1〜7の整数
 */
export function validateAssignmentNumber(num: number): boolean {
  return Number.isInteger(num) && num >= 1 && num <= 7;
}

/**
 * 課題名バリデーション: 1〜100文字
 */
export function validateAssignmentName(name: string): boolean {
  return name.length >= 1 && name.length <= 100;
}
