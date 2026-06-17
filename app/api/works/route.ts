import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { WorkItem, WorkListResponse } from "@/lib/types";

/**
 * GET /api/works - 作品一覧取得（認証不要）
 *
 * クエリパラメータ（すべてオプション）:
 * - studentIds: カンマ区切りUUID（学生フィルター）
 * - assignmentIds: カンマ区切りUUID（課題フィルター）
 * - badgeIds: カンマ区切りUUID（バッジ種別フィルター）
 * - hasBadge: "true" でバッジ付き作品のみ
 * - page: ページ番号（1始まり、デフォルト1）
 * - pageSize: ページサイズ（デフォルト20）
 * - sortBy: ソート順（"assignment_desc"=課題番号降順（デフォルト）, "student_asc"=学籍番号昇順, "student_desc"=学籍番号降順）
 */
export async function GET(request: NextRequest) {
  const supabase = createClient();
  const { searchParams } = request.nextUrl;

  // クエリパラメータのパース
  const studentIdsParam = searchParams.get("studentIds");
  const assignmentIdsParam = searchParams.get("assignmentIds");
  const badgeIdsParam = searchParams.get("badgeIds");
  const hasBadgeParam = searchParams.get("hasBadge");
  const pageParam = searchParams.get("page");
  const pageSizeParam = searchParams.get("pageSize");
  const sortByParam = searchParams.get("sortBy") ?? "assignment_desc";

  const studentIds = studentIdsParam
    ? studentIdsParam.split(",").filter(Boolean)
    : undefined;
  const assignmentIds = assignmentIdsParam
    ? assignmentIdsParam.split(",").filter(Boolean)
    : undefined;
  const badgeIds = badgeIdsParam
    ? badgeIdsParam.split(",").filter(Boolean)
    : undefined;
  const hasBadge = hasBadgeParam === "true";

  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);
  const pageSize = Math.max(1, Math.min(100, parseInt(pageSizeParam ?? "20", 10) || 20));

  // バッジフィルターが指定されている場合、対象work_idsを先に取得する
  let badgeFilteredWorkIds: string[] | undefined;

  if (hasBadge || (badgeIds && badgeIds.length > 0)) {
    let badgeQuery = supabase.from("work_badges").select("work_id");

    if (badgeIds && badgeIds.length > 0) {
      badgeQuery = badgeQuery.in("badge_type_id", badgeIds);
    }

    const { data: badgeData, error: badgeError } = await badgeQuery;

    if (badgeError) {
      return NextResponse.json(
        { error: "バッジフィルターの処理に失敗しました" },
        { status: 500 },
      );
    }

    // 重複排除してwork_idのリストを取得
    const workIdSet = new Set((badgeData ?? []).map((row) => row.work_id));
    badgeFilteredWorkIds = Array.from(workIdSet);

    // バッジフィルター適用で該当作品が0件の場合、空結果を返す
    if (badgeFilteredWorkIds.length === 0) {
      const response: WorkListResponse = {
        works: [],
        total: 0,
        page,
        pageSize,
        totalPages: 0,
      };
      return NextResponse.json(response);
    }
  }

  // カウントクエリ（total取得）
  let countQuery = supabase
    .from("works")
    .select("*", { count: "exact", head: true });

  if (studentIds && studentIds.length > 0) {
    countQuery = countQuery.in("student_id", studentIds);
  }
  if (assignmentIds && assignmentIds.length > 0) {
    countQuery = countQuery.in("assignment_id", assignmentIds);
  }
  if (badgeFilteredWorkIds) {
    countQuery = countQuery.in("id", badgeFilteredWorkIds);
  }

  const { count, error: countError } = await countQuery;

  if (countError) {
    return NextResponse.json(
      { error: "作品数の取得に失敗しました" },
      { status: 500 },
    );
  }

  const total = count ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  // 結果が0件の場合
  if (total === 0) {
    const response: WorkListResponse = {
      works: [],
      total: 0,
      page,
      pageSize,
      totalPages: 0,
    };
    return NextResponse.json(response);
  }

  // データクエリ（JOINあり）
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let dataQuery = supabase
    .from("works")
    .select(
      `
      id,
      student_id,
      assignment_id,
      image_url,
      uploaded_at,
      students!inner (id, student_id, name),
      assignments!inner (id, name, number)
    `,
    );

  // ソート順の適用
  if (sortByParam === "student_asc") {
    dataQuery = dataQuery
      .order("student_id", { referencedTable: "students", ascending: true })
      .order("number", { referencedTable: "assignments", ascending: false });
  } else if (sortByParam === "student_desc") {
    dataQuery = dataQuery
      .order("student_id", { referencedTable: "students", ascending: false })
      .order("number", { referencedTable: "assignments", ascending: false });
  } else {
    // デフォルト: assignment_desc
    dataQuery = dataQuery
      .order("number", { referencedTable: "assignments", ascending: false })
      .order("student_id", { ascending: true });
  }

  dataQuery = dataQuery.range(from, to);

  if (studentIds && studentIds.length > 0) {
    dataQuery = dataQuery.in("student_id", studentIds);
  }
  if (assignmentIds && assignmentIds.length > 0) {
    dataQuery = dataQuery.in("assignment_id", assignmentIds);
  }
  if (badgeFilteredWorkIds) {
    dataQuery = dataQuery.in("id", badgeFilteredWorkIds);
  }

  const { data: worksData, error: worksError } = await dataQuery;

  if (worksError) {
    return NextResponse.json(
      { error: "作品一覧の取得に失敗しました" },
      { status: 500 },
    );
  }

  // 取得した作品のバッジ情報を一括取得
  const workIds = (worksData ?? []).map((w) => w.id);
  let badgesMap: Record<string, { id: string; badgeTypeId: string; name: string }[]> = {};

  if (workIds.length > 0) {
    const { data: workBadgesData, error: workBadgesError } = await supabase
      .from("work_badges")
      .select(
        `
        id,
        work_id,
        badge_types!inner (id, name)
      `,
      )
      .in("work_id", workIds);

    if (workBadgesError) {
      return NextResponse.json(
        { error: "バッジ情報の取得に失敗しました" },
        { status: 500 },
      );
    }

    // work_idごとにバッジをグループ化
    for (const row of workBadgesData ?? []) {
      const workId = row.work_id;
      if (!badgesMap[workId]) {
        badgesMap[workId] = [];
      }
      const badgeType = row.badge_types as unknown as {
        id: string;
        name: string;
      };
      if (badgeType) {
        badgesMap[workId].push({ id: row.id, badgeTypeId: badgeType.id, name: badgeType.name });
      }
    }
  }

  // レスポンスの構築
  const works: WorkItem[] = (worksData ?? []).map((row) => {
    const student = row.students as unknown as { id: string; student_id: string; name: string };
    const assignment = row.assignments as unknown as {
      id: string;
      name: string;
      number: number;
    };

    return {
      id: row.id,
      studentId: row.student_id,
      studentName: student.name,
      assignmentId: row.assignment_id,
      assignmentName: assignment.name,
      assignmentNumber: assignment.number,
      imageUrl: row.image_url,
      uploadedAt: row.uploaded_at,
      badges: badgesMap[row.id] ?? [],
    };
  });

  const response: WorkListResponse = {
    works,
    total,
    page,
    pageSize,
    totalPages,
  };

  return NextResponse.json(response);
}
