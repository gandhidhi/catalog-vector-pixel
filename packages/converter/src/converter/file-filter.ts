/**
 * 変換対象ファイルのフィルタリング
 * .ai / .psd / .pdf が変換対象。それ以外はスキップ。
 */

const CONVERTIBLE_EXTENSIONS = /\.(ai|psd|pdf)$/i;

export interface FilterResult {
  convertible: string[];
  skipped: string[];
}

/**
 * ファイル名リストから変換対象ファイルとスキップ対象ファイルを分類する
 * - .ai / .psd / .pdf 拡張子（大文字小文字不問）のみが変換対象
 * - それ以外のファイルはスキップ
 */
export function filterConvertibleFiles(filenames: string[]): FilterResult {
  const convertible: string[] = [];
  const skipped: string[] = [];

  for (const filename of filenames) {
    if (CONVERTIBLE_EXTENSIONS.test(filename)) {
      convertible.push(filename);
    } else {
      skipped.push(filename);
    }
  }

  return { convertible, skipped };
}
