import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validatePngFile } from "@/lib/validators/upload";

/**
 * POST /api/uploads/single - 単体PNGアップロード（認証必須）
 * multipart/form-data: file (PNG), studentId, assignmentId, overwrite (optional)
 */
export async function POST(request: Request) {
  // 認証チェック
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

  // FormData解析
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "リクエストの形式が不正です" },
      { status: 400 },
    );
  }

  const file = formData.get("file") as File | null;
  const studentId = formData.get("studentId") as string | null;
  const assignmentId = formData.get("assignmentId") as string | null;
  const overwrite = formData.get("overwrite") === "true";

  // 必須パラメータチェック
  if (!file) {
    return NextResponse.json(
      { error: "ファイルが選択されていません" },
      { status: 400 },
    );
  }

  if (!studentId) {
    return NextResponse.json(
      { error: "学生が選択されていません" },
      { status: 400 },
    );
  }

  if (!assignmentId) {
    return NextResponse.json(
      { error: "課題が選択されていません" },
      { status: 400 },
    );
  }

  // PNGバリデーション（拡張子 + サイズ ≤ 2MB）
  const validation = validatePngFile({ name: file.name, size: file.size });
  if (!validation.valid) {
    return NextResponse.json(
      { error: validation.error },
      { status: 422 },
    );
  }

  // Admin client（RLSバイパス）でDB操作
  const adminClient = createAdminClient();

  // 学生の存在確認
  const { data: student, error: studentError } = await adminClient
    .from("students")
    .select("id, student_id, name")
    .eq("id", studentId)
    .single();

  if (studentError || !student) {
    return NextResponse.json(
      { error: "指定された学生が見つかりません" },
      { status: 404 },
    );
  }

  // 課題の存在確認
  const { data: assignment, error: assignmentError } = await adminClient
    .from("assignments")
    .select("id, number, name")
    .eq("id", assignmentId)
    .single();

  if (assignmentError || !assignment) {
    return NextResponse.json(
      { error: "指定された課題が見つかりません" },
      { status: 404 },
    );
  }

  // 重複チェック（同一学生 × 同一課題）
  const { data: existingWork } = await adminClient
    .from("works")
    .select("id, filename, storage_path")
    .eq("student_id", studentId)
    .eq("assignment_id", assignmentId)
    .single();

  if (existingWork && !overwrite) {
    return NextResponse.json(
      {
        error: "この学生のこの課題は既にアップロード済みです",
        duplicate: true,
        existingWork: {
          id: existingWork.id,
          filename: existingWork.filename,
        },
      },
      { status: 409 },
    );
  }

  // Supabase Storage にアップロード（upsert で既存ファイルを上書き）
  const storagePath = `works/${assignmentId}/${studentId}.png`;
  const fileBuffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await adminClient.storage
    .from("works")
    .upload(storagePath, fileBuffer, {
      contentType: "image/png",
      upsert: true,
    });

  if (uploadError) {
    return NextResponse.json(
      { error: "ファイルのアップロードに失敗しました" },
      { status: 500 },
    );
  }

  // Public URL を取得
  const { data: urlData } = adminClient.storage
    .from("works")
    .getPublicUrl(storagePath);

  const imageUrl = urlData.publicUrl;

  // DB にメタデータを登録（upsert: 同一学生×課題で重複時は上書き）
  const { data: work, error: dbError } = await adminClient
    .from("works")
    .upsert(
      {
        student_id: studentId,
        assignment_id: assignmentId,
        filename: file.name,
        storage_path: storagePath,
        image_url: imageUrl,
        file_size: file.size,
      },
      { onConflict: "student_id,assignment_id" },
    )
    .select()
    .single();

  if (dbError) {
    // ロールバック: Storageからファイルを削除（新規の場合のみ意味がある）
    if (!existingWork) {
      await adminClient.storage
        .from("works")
        .remove([storagePath]);
    }

    return NextResponse.json(
      { error: "メタデータの登録に失敗しました" },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      success: true,
      work: {
        id: work.id,
        studentName: student.name,
        assignmentName: assignment.name,
        filename: file.name,
        imageUrl,
      },
    },
    { status: 201 },
  );
}
