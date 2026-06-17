/**
 * ファイル名パーサー
 * パターン: {学籍番号}_{氏名}.png
 * - 学籍番号: 8桁数字
 * - 氏名: 1文字以上
 * 例: 12345001_黒須哲郎.png
 */

export interface FilenameParseResult {
  studentId: string;
  name: string;
}

/**
 * ファイル名が命名規則に適合するかパースする
 * パターン: {8桁数字}_{氏名}.png
 *
 * @returns パース成功時は studentId と name を返す。不適合の場合は null。
 */
export function parseFilename(
  filename: string,
): FilenameParseResult | null {
  // パターン: 先頭8桁数字 + アンダースコア + 1文字以上の氏名 + .png
  const pattern = /^(\d{8})_(.+)\.png$/i;
  const match = filename.match(pattern);

  if (!match) {
    return null;
  }

  const studentId = match[1];
  const name = match[2];

  // 氏名が空でないことを確認（正規表現の .+ で保証されるが念のため）
  if (name.length === 0) {
    return null;
  }

  return { studentId, name };
}
