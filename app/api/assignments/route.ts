import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  validateAssignmentNumber,
  validateAssignmentName,
} from "@/lib/validators/master-data";

/**
 * GET /api/assignments - 課題一覧取得（認証不要）
 */
export async function GET() {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("assignments")
    .select("*")
    .order("number", { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: "課題一覧の取得に失敗しました" },
      { status: 500 },
    );
  }

  const assignments = (data ?? []).map((row) => ({
    id: row.id,
    number: row.number,
    name: row.name,
    createdAt: row.created_at,
  }));

  return NextResponse.json({ assignments });
}

/**
 * POST /api/assignments - 課題登録（認証必須）
 * Body: { number: number, name: string }
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

  let body: { number?: number; name?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "リクエストボディが不正です" },
      { status: 400 },
    );
  }

  const { number, name } = body;

  // バリデーション: number は1〜7の整数であること
  if (number === undefined || !validateAssignmentNumber(number)) {
    return NextResponse.json(
      { error: "課題番号は1〜7の整数で入力してください" },
      { status: 400 },
    );
  }

  // バリデーション: name は1〜100文字であること
  if (!name || !validateAssignmentName(name)) {
    return NextResponse.json(
      { error: "課題名は1〜100文字で入力してください" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("assignments")
    .insert({ number, name: name.trim() })
    .select()
    .single();

  if (error) {
    // 一意制約違反（重複課題番号）
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "同じ課題番号が既に登録されています" },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: "課題の登録に失敗しました" },
      { status: 500 },
    );
  }

  const assignment = {
    id: data.id,
    number: data.number,
    name: data.name,
    createdAt: data.created_at,
  };

  return NextResponse.json({ assignment }, { status: 201 });
}
