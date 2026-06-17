import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * DELETE /api/courses/[id] - コース削除（認証必須）
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
    .from("students")
    .select("*", { count: "exact", head: true })
    .eq("course_id", id);

  if (count && count > 0) {
    return NextResponse.json(
      { error: `このコースには${count}名の学生が紐づいています。先に学生を削除してください。` },
      { status: 409 },
    );
  }

  const { error } = await adminClient.from("courses").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: "コースの削除に失敗しました" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
