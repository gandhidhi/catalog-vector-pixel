import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/badges/types - バッジ種別一覧（認証不要）
 */
export async function GET() {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("badge_types")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: "バッジ種別の取得に失敗しました" },
      { status: 500 },
    );
  }

  const badgeTypes = (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
  }));

  return NextResponse.json({ badgeTypes });
}
