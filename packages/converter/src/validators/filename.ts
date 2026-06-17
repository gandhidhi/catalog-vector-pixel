/**
 * 変換ツール用ファイル名バリデーター
 * パターン: {学籍番号}_{氏名}.{ai|psd}（変換前）または {学籍番号}_{氏名}.png（変換後）
 * - 学籍番号: 8桁数字
 * - 氏名: 1文字以上
 */

export interface FilenameParseResult {
  studentId: string;
  name: string;
}

const VALID_EXTENSIONS = /\.(ai|psd|png)$/i;
const FILENAME_PATTERN = /^(\d{8})_(.+)\.(ai|psd|png)$/i;

/**
 * ファイル名が命名規則に適合するかパースする
 * パターン: {8桁数字}_{氏名}.{ai|psd|png}
 *
 * @returns パース成功時は studentId と name を返す。不適合の場合は null。
 */
export function parse(filename: string): FilenameParseResult | null {
  const match = filename.match(FILENAME_PATTERN);

  if (!match) {
    return null;
  }

  const studentId = match[1];
  const name = match[2];

  if (name.length === 0) {
    return null;
  }

  return { studentId, name };
}

/**
 * ファイル名の修正候補を提示する
 * よくある問題を検出して修正案を返す:
 * - スペースをアンダースコアに置換
 * - ハイフン区切りをアンダースコアに置換
 * - 全角数字を半角に変換
 * - 拡張子の正規化
 *
 * @returns 修正候補の文字列。修正不可能な場合は null。
 */
export function suggestCorrection(filename: string): string | null {
  // 既に正しいフォーマットならnull（修正不要）
  if (parse(filename) !== null) {
    return null;
  }

  let corrected = filename;

  // 全角数字を半角に変換
  corrected = corrected.replace(/[０-９]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0xfee0),
  );

  // 全角アンダースコアを半角に変換
  corrected = corrected.replace(/＿/g, "_");

  // 拡張子がない場合やサポート外の場合のパス名抽出
  const dotIndex = corrected.lastIndexOf(".");
  let baseName: string;
  let extension: string;

  if (dotIndex > 0) {
    baseName = corrected.substring(0, dotIndex);
    extension = corrected.substring(dotIndex).toLowerCase();
  } else {
    // 拡張子がないケース - 修正不可
    return null;
  }

  // 拡張子がサポートされてるか確認
  if (!VALID_EXTENSIONS.test(extension)) {
    return null;
  }

  // ベース名内のスペースをアンダースコアに置換
  baseName = baseName.replace(/\s+/g, "_");

  // ベース名内のハイフンをアンダースコアに（学籍番号と氏名の区切り部分のみ）
  // パターン: 先頭が数字で始まり、最初の区切りがハイフンの場合
  if (/^\d{8}-/.test(baseName)) {
    baseName = baseName.replace(/^(\d{8})-/, "$1_");
  }

  corrected = baseName + extension;

  // 修正後が有効なフォーマットか確認
  if (parse(corrected) !== null) {
    return corrected;
  }

  // さらに試行: 先頭のアンダースコアが複数ある場合、最初だけ残す
  const digitMatch = corrected.match(/^(\d{8})[\s_-]+(.+)\.(ai|psd|png)$/i);
  if (digitMatch) {
    corrected = `${digitMatch[1]}_${digitMatch[2]}.${digitMatch[3].toLowerCase()}`;
    if (parse(corrected) !== null) {
      return corrected;
    }
  }

  return null;
}
