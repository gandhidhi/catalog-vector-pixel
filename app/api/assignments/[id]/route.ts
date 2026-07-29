import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * PUT /api/assignments/[id] - 課題名更新（認証必須）
 * Body: { name: string }
 */
export async function PUT(
  request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  const { id } = params;
  if (!id) {
    return NextResponse.json({ error: "IDが必要です" }, { status: 400 });
  }

  let body: { name?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "リクエストボディが不正です" }, { status: 400 });
  }

  const name = body.name?.trim();
  if (!name || name.length < 1 || name.length > 100) {
    return NextResponse.json({ error: "課題名は1〜100文字で入力してください" }, { status: 422 });
  }

  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from("assignments")
    .update({ name })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "課題名の更新に失敗しました" }, { status: 500 });
  }

  return NextResponse.json({ assignment: data });
}

/**
 * DELETE /api/assignments/[id] - 課題削除（認証必須）
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  const { id } = params;
  if (!id) {
    return NextResponse.json({ error: "IDが必要です" }, { status: 400 });
  }

  const adminClient = createAdminClient();

  const { count } = await adminClient
    .from("works")
    .select("*", { count: "exact", head: true })
    .eq("assignment_id", id);

  if (count && count > 0) {
    return NextResponse.json(
      { error: `この課題には${count}件の作品が紐づいています。先に作品を削除してください。` },
      { status: 409 },
    );
  }

  const { error } = await adminClient.from("assignments").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: "課題の削除に失敗しました" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
