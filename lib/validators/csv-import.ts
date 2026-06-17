/**
 * CSVインポートバリデーター
 * - BOM付きUTF-8対応（先頭の \uFEFF を自動除去）
 * - 必須カラム: 「学籍番号」「学生氏名」
 * - 任意カラム: 「ヨミガナ」「英字氏名」
 * - 余分なカラム（空カラム含む）は自動無視
 * - 最大200データ行（ヘッダー行は含まない）
 * - カンマを含む値はダブルクォートで囲む（RFC 4180準拠）
 */

import { validateStudentId, validateStudentName } from "./master-data";

export interface CsvStudentRow {
  studentId: string;
  name: string;
  nameKana?: string;
  nameEn?: string;
}

export interface CsvImportResult {
  valid: boolean;
  rows: CsvStudentRow[];
  errors: { line: number; reason: string }[];
  headerError?: string;
}

const MAX_DATA_ROWS = 200;

const REQUIRED_COLUMNS = ["学籍番号", "学生氏名"] as const;
const OPTIONAL_COLUMNS = ["ヨミガナ", "英字氏名"] as const;

/**
 * BOMを除去する
 */
function stripBom(content: string): string {
  if (content.charCodeAt(0) === 0xfeff) {
    return content.slice(1);
  }
  return content;
}

/**
 * RFC 4180準拠のCSV行パーサー
 * ダブルクォートで囲まれたフィールド内のカンマやダブルクォートを正しく処理する
 */
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        // 次の文字もダブルクォートならエスケープされたクォート
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i += 2;
        } else {
          // クォート終了
          inQuotes = false;
          i++;
        }
      } else {
        current += char;
        i++;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
        i++;
      } else if (char === ",") {
        fields.push(current);
        current = "";
        i++;
      } else {
        current += char;
        i++;
      }
    }
  }

  // 最後のフィールドを追加
  fields.push(current);

  return fields;
}

/**
 * CSVコンテンツをパースして検証する
 */
export function parseAndValidate(csvContent: string): CsvImportResult {
  const content = stripBom(csvContent);
  const lines = content.split(/\r?\n/);

  // 空行を末尾から除去（末尾の改行対策）
  while (lines.length > 0 && lines[lines.length - 1].trim() === "") {
    lines.pop();
  }

  if (lines.length === 0) {
    return {
      valid: false,
      rows: [],
      errors: [],
      headerError: "CSVファイルが空です",
    };
  }

  // ヘッダー行をパース
  const headerFields = parseCsvLine(lines[0]).map((f) => f.trim());

  // 必須カラムの存在チェック
  const columnIndices: Record<string, number> = {};

  for (const required of REQUIRED_COLUMNS) {
    const idx = headerFields.indexOf(required);
    if (idx === -1) {
      return {
        valid: false,
        rows: [],
        errors: [],
        headerError: `必須カラム「${required}」が見つかりません`,
      };
    }
    columnIndices[required] = idx;
  }

  // 任意カラムのインデックスを取得
  for (const optional of OPTIONAL_COLUMNS) {
    const idx = headerFields.indexOf(optional);
    if (idx !== -1) {
      columnIndices[optional] = idx;
    }
  }

  // データ行の処理
  const dataLines = lines.slice(1);

  // 200行上限チェック
  if (dataLines.length > MAX_DATA_ROWS) {
    return {
      valid: false,
      rows: [],
      errors: [],
      headerError: `データ行数が上限（${MAX_DATA_ROWS}行）を超えています（${dataLines.length}行）`,
    };
  }

  const rows: CsvStudentRow[] = [];
  const errors: { line: number; reason: string }[] = [];

  for (let i = 0; i < dataLines.length; i++) {
    const lineNumber = i + 2; // 1-indexed, ヘッダーが1行目
    const line = dataLines[i];

    // 空行をスキップ
    if (line.trim() === "") {
      continue;
    }

    const fields = parseCsvLine(line);

    // 学籍番号を取得
    const studentId = (
      fields[columnIndices["学籍番号"]] ?? ""
    ).trim();
    if (!validateStudentId(studentId)) {
      errors.push({
        line: lineNumber,
        reason: `学籍番号が不正です（8桁の数字が必要）: "${studentId}"`,
      });
      continue;
    }

    // 学生氏名を取得
    const name = (fields[columnIndices["学生氏名"]] ?? "").trim();
    if (!validateStudentName(name)) {
      errors.push({
        line: lineNumber,
        reason: `学生氏名が不正です（1〜50文字が必要）: "${name}"`,
      });
      continue;
    }

    // 任意カラムを取得
    const row: CsvStudentRow = { studentId, name };

    if (columnIndices["ヨミガナ"] !== undefined) {
      const nameKana = (
        fields[columnIndices["ヨミガナ"]] ?? ""
      ).trim();
      if (nameKana) {
        row.nameKana = nameKana;
      }
    }

    if (columnIndices["英字氏名"] !== undefined) {
      const nameEn = (
        fields[columnIndices["英字氏名"]] ?? ""
      ).trim();
      if (nameEn) {
        row.nameEn = nameEn;
      }
    }

    rows.push(row);
  }

  return {
    valid: errors.length === 0,
    rows,
    errors,
  };
}
