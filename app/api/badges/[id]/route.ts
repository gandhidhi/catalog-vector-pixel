import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * DELETE /api/badges/[id] - バッジ削除（認証必須）
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
    return NextResponse.json(
      { error: "認証が必要です" },
      { status: 401 },
    );
  }

  const { id } = params;

  if (!id) {
    return NextResponse.json(
      { error: "バッジIDが必要です" },
      { status: 400 },
    );
  }

  const adminClient = createAdminClient();

  const { error } = await adminClient
    .from("work_badges")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json(
      { error: "バッジの削除に失敗しました" },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
