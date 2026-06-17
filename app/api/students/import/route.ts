import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseAndValidate } from "@/lib/validators/csv-import";

/**
 * POST /api/students/import - 学生CSVインポート（認証必須）
 * multipart/form-data でCSVファイルを受け取り、一括登録する
 * - BOM付きUTF-8対応
 * - 必須カラム: 学籍番号, 学生氏名
 * - 200行上限
 * - バリデーションエラー行はスキップして残りを続行
 * - 学籍番号先頭5桁からコース自動紐づけ
 */
export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "認証が必要です" },
      { status: 401 },
    );
  }

  // FormDataからCSVファイルを取得
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "リクエストの形式が不正です。multipart/form-dataで送信してください" },
      { status: 400 },
    );
  }

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { error: "CSVファイルが選択されていません" },
      { status: 400 },
    );
  }

  // ファイル内容をテキストとして読み取り（UTF-8）
  const csvContent = await file.text();

  // CSVパース＆バリデーション
  const result = parseAndValidate(csvContent);

  // ヘッダーエラーがある場合は400を返す
  if (result.headerError) {
    return NextResponse.json(
      { error: result.headerError },
      { status: 400 },
    );
  }

  // コースプレフィックス一覧を事前に取得
  const { data: courses } = await supabase
    .from("courses")
    .select("id, prefix");

  const prefixToCourseId: Record<string, string> = {};
  if (courses) {
    for (const course of courses) {
      prefixToCourseId[course.prefix] = course.id;
    }
  }

  // 有効行をDBに登録
  let importedCount = 0;
  const errors: { line: number; reason: string }[] = [...result.errors];

  for (const row of result.rows) {
    // 学籍番号先頭5桁からコースを自動紐づけ
    const prefix = row.studentId.substring(0, 5);
    const courseId = prefixToCourseId[prefix] ?? null;

    const { error: insertError } = await supabase
      .from("students")
      .insert({
        student_id: row.studentId,
        name: row.name,
        name_kana: row.nameKana || null,
        name_en: row.nameEn || null,
        course_id: courseId,
      });

    if (insertError) {
      // 一意制約違反（重複学籍番号）
      if (insertError.code === "23505") {
        errors.push({
          line: 0, // 行番号は後で設定
          reason: `学籍番号「${row.studentId}」は既に登録されています`,
        });
      } else {
        errors.push({
          line: 0,
          reason: `学籍番号「${row.studentId}」の登録に失敗しました: ${insertError.message}`,
        });
      }
    } else {
      importedCount++;
    }
  }

  const skippedCount = result.errors.length + (result.rows.length - importedCount);

  return NextResponse.json({
    importedCount,
    skippedCount,
    errors,
  });
}
