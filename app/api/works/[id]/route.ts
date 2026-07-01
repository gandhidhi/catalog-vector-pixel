import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * DELETE /api/works/[id] - 作品削除（認証必須）
 * Storage上のファイル、関連バッジ、DBレコードを削除する
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
      { error: "作品IDが必要です" },
      { status: 400 },
    );
  }

  const adminClient = createAdminClient();

  // 作品の存在確認・storage_path取得
  const { data: work, error: fetchError } = await adminClient
    .from("works")
    .select("id, storage_path")
    .eq("id", id)
    .single();

  if (fetchError || !work) {
    return NextResponse.json(
      { error: "指定された作品が見つかりません" },
      { status: 404 },
    );
  }

  // 1. 関連バッジを削除
  const { error: badgeDeleteError } = await adminClient
    .from("work_badges")
    .delete()
    .eq("work_id", id);

  if (badgeDeleteError) {
    return NextResponse.json(
      { error: "関連バッジの削除に失敗しました" },
      { status: 500 },
    );
  }

  // 2. Storageからファイルを削除
  const { error: storageError } = await adminClient.storage
    .from("works")
    .remove([work.storage_path]);

  if (storageError) {
    return NextResponse.json(
      { error: "ストレージからの削除に失敗しました" },
      { status: 500 },
    );
  }

  // 3. DBレコードを削除
  const { error: dbError } = await adminClient
    .from("works")
    .delete()
    .eq("id", id);

  if (dbError) {
    return NextResponse.json(
      { error: "作品レコードの削除に失敗しました" },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
