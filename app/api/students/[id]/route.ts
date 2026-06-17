import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * DELETE /api/students/[id] - 学生削除（認証必須）
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

  // 関連する作品があるか確認
  const { count } = await adminClient
    .from("works")
    .select("*", { count: "exact", head: true })
    .eq("student_id", id);

  if (count && count > 0) {
    return NextResponse.json(
      { error: `この学生には${count}件の作品が紐づいています。先に作品を削除してください。` },
      { status: 409 },
    );
  }

  const { error } = await adminClient.from("students").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: "学生の削除に失敗しました" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
