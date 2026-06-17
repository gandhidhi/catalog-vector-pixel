import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  validateStudentId,
  validateStudentName,
} from "@/lib/validators/master-data";

/**
 * GET /api/students - 学生一覧取得（認証必須）
 * コース情報をJOINして返す
 */
export async function GET() {
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

  const { data, error } = await supabase
    .from("students")
    .select("*, courses(*)")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: "学生一覧の取得に失敗しました" },
      { status: 500 },
    );
  }

  const students = (data ?? []).map((row) => ({
    id: row.id,
    studentId: row.student_id,
    name: row.name,
    nameKana: row.name_kana,
    nameEn: row.name_en,
    courseId: row.course_id,
    createdAt: row.created_at,
    course: row.courses
      ? {
          id: row.courses.id,
          name: row.courses.name,
          prefix: row.courses.prefix,
          createdAt: row.courses.created_at,
        }
      : null,
  }));

  return NextResponse.json({ students });
}

/**
 * POST /api/students - 学生登録（認証必須）
 * Body: { studentId: string, name: string, nameKana?: string, nameEn?: string }
 * 学籍番号の先頭5桁からコースを自動紐づけ
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

  let body: {
    studentId?: string;
    name?: string;
    nameKana?: string;
    nameEn?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "リクエストボディが不正です" },
      { status: 400 },
    );
  }

  const { studentId, name, nameKana, nameEn } = body;

  // バリデーション: studentId は8桁の数字
  if (!studentId || !validateStudentId(studentId)) {
    return NextResponse.json(
      { error: "学籍番号は8桁の数字で入力してください" },
      { status: 400 },
    );
  }

  // バリデーション: name は1〜50文字
  if (!name || !validateStudentName(name)) {
    return NextResponse.json(
      { error: "氏名は1文字以上50文字以下で入力してください" },
      { status: 400 },
    );
  }

  // 学籍番号の先頭5桁でコースを検索
  const prefix = studentId.substring(0, 5);
  const { data: courseData } = await supabase
    .from("courses")
    .select("id, name")
    .eq("prefix", prefix)
    .single();

  const courseId = courseData?.id ?? null;
  const warning =
    courseId === null
      ? `学籍番号プレフィックス「${prefix}」に一致するコースが見つかりません。コース未設定で登録されます。`
      : null;

  // 学生レコードを挿入
  const { data, error } = await supabase
    .from("students")
    .insert({
      student_id: studentId,
      name: name.trim(),
      name_kana: nameKana?.trim() || null,
      name_en: nameEn?.trim() || null,
      course_id: courseId,
    })
    .select("*, courses(*)")
    .single();

  if (error) {
    // 一意制約違反（重複学籍番号）
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "この学籍番号は既に登録されています" },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: "学生の登録に失敗しました" },
      { status: 500 },
    );
  }

  const student = {
    id: data.id,
    studentId: data.student_id,
    name: data.name,
    nameKana: data.name_kana,
    nameEn: data.name_en,
    courseId: data.course_id,
    createdAt: data.created_at,
    course: data.courses
      ? {
          id: data.courses.id,
          name: data.courses.name,
          prefix: data.courses.prefix,
          createdAt: data.courses.created_at,
        }
      : null,
  };

  return NextResponse.json({ student, warning }, { status: 201 });
}
