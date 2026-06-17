import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/courses - コース一覧取得（認証必須）
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
    .from("courses")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: "コース一覧の取得に失敗しました" },
      { status: 500 },
    );
  }

  const courses = (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    prefix: row.prefix,
    createdAt: row.created_at,
  }));

  return NextResponse.json({ courses });
}

/**
 * POST /api/courses - コース登録（認証必須）
 * Body: { name: string, prefix: string }
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

  let body: { name?: string; prefix?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "リクエストボディが不正です" },
      { status: 400 },
    );
  }

  const { name, prefix } = body;

  // バリデーション: name は空でないこと
  if (!name || name.trim().length === 0) {
    return NextResponse.json(
      { error: "コース名は必須です" },
      { status: 400 },
    );
  }

  // バリデーション: prefix は5桁の数字であること
  if (!prefix || !/^\d{5}$/.test(prefix)) {
    return NextResponse.json(
      { error: "プレフィックスは5桁の数字で入力してください" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("courses")
    .insert({ name: name.trim(), prefix })
    .select()
    .single();

  if (error) {
    // 一意制約違反（重複）
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "同じコース名またはプレフィックスが既に登録されています" },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: "コースの登録に失敗しました" },
      { status: 500 },
    );
  }

  const course = {
    id: data.id,
    name: data.name,
    prefix: data.prefix,
    createdAt: data.created_at,
  };

  return NextResponse.json({ course }, { status: 201 });
}
