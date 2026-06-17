import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/students/lookup?studentId=12345001
 * 学籍番号からstudent UUIDを検索する（認証必須）
 */
export async function GET(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  const studentId = request.nextUrl.searchParams.get("studentId");

  if (!studentId) {
    return NextResponse.json({ error: "studentIdパラメータが必要です" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("students")
    .select("id, student_id, name")
    .eq("student_id", studentId)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "学生が見つかりません" }, { status: 404 });
  }

  return NextResponse.json({
    student: {
      id: data.id,
      studentId: data.student_id,
      name: data.name,
    },
  });
}
