import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/badges - バッジ付与（認証必須）
 * Body: { workId: string, badgeTypeId: string }
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

  let body: { workId?: string; badgeTypeId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "リクエストボディが不正です" },
      { status: 400 },
    );
  }

  const { workId, badgeTypeId } = body;

  if (!workId || !badgeTypeId) {
    return NextResponse.json(
      { error: "workId と badgeTypeId は必須です" },
      { status: 400 },
    );
  }

  const adminClient = createAdminClient();

  // 付与上限チェック: 1作品あたり最大3個
  const { count, error: countError } = await adminClient
    .from("work_badges")
    .select("*", { count: "exact", head: true })
    .eq("work_id", workId);

  if (countError) {
    return NextResponse.json(
      { error: "バッジ数の確認に失敗しました" },
      { status: 500 },
    );
  }

  if ((count ?? 0) >= 3) {
    return NextResponse.json(
      { error: "1つの作品に付与できるバッジは最大3個です" },
      { status: 422 },
    );
  }

  // バッジ付与（UNIQUE制約により同一バッジの重複付与を防止）
  const { data, error } = await adminClient
    .from("work_badges")
    .insert({
      work_id: workId,
      badge_type_id: badgeTypeId,
    })
    .select()
    .single();

  if (error) {
    // 一意制約違反（同一作品・同一バッジの重複）
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "このバッジは既に付与されています" },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: "バッジの付与に失敗しました" },
      { status: 500 },
    );
  }

  const workBadge = {
    id: data.id,
    workId: data.work_id,
    badgeTypeId: data.badge_type_id,
    assignedAt: data.assigned_at,
  };

  return NextResponse.json({ workBadge }, { status: 201 });
}
