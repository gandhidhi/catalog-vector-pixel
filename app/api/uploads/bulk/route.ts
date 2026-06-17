import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validatePngFile } from "@/lib/validators/upload";
import { parseFilename } from "@/lib/validators/filename";
import type { BulkUploadResult, BulkUploadFailureReason } from "@/lib/types";

const MAX_FILES = 150;

/**
 * POST /api/uploads/bulk - バルクPNGアップロード（認証必須）
 * multipart/form-data: files[] (multiple PNGs), assignmentId
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

  const assignmentId = formData.get("assignmentId") as string | null;
  const files = formData.getAll("files") as File[];

  // 必須パラメータチェック
  if (!assignmentId) {
    return NextResponse.json(
      { error: "課題が選択されていません" },
      { status: 400 },
    );
  }

  if (files.length === 0) {
    return NextResponse.json(
      { error: "ファイルが選択されていません" },
      { status: 400 },
    );
  }

  // 最大ファイル数チェック
  if (files.length > MAX_FILES) {
    return NextResponse.json(
      { error: `一度にアップロードできるファイルは最大${MAX_FILES}件です` },
      { status: 400 },
    );
  }

  // Admin client（RLSバイパス）でDB操作
  const adminClient = createAdminClient();

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

  // continue-on-error方式で各ファイルを処理
  const successes: BulkUploadResult["successes"] = [];
  const failures: BulkUploadResult["failures"] = [];

  for (const file of files) {
    const result = await processFile(file, assignmentId, adminClient);
    if (result.success) {
      successes.push({ filename: file.name, studentName: result.studentName! });
    } else {
      failures.push({ filename: file.name, reason: result.reason! });
    }
  }

  const response: BulkUploadResult = {
    totalFiles: files.length,
    successCount: successes.length,
    failureCount: failures.length,
    successes,
    failures,
  };

  return NextResponse.json(response, { status: 200 });
}

interface ProcessResult {
  success: boolean;
  studentName?: string;
  reason?: BulkUploadFailureReason;
}

async function processFile(
  file: File,
  assignmentId: string,
  adminClient: ReturnType<typeof createAdminClient>,
): Promise<ProcessResult> {
  // 1. PNGバリデーション（拡張子チェック）
  if (!file.name.toLowerCase().endsWith(".png")) {
    return { success: false, reason: "INVALID_FORMAT" };
  }

  // 2. サイズチェック（≤ 2MB）
  const validation = validatePngFile({ name: file.name, size: file.size });
  if (!validation.valid) {
    return { success: false, reason: "FILE_TOO_LARGE" };
  }

  // 3. ファイル名パース
  const parsed = parseFilename(file.name);
  if (!parsed) {
    return { success: false, reason: "FILENAME_PATTERN_MISMATCH" };
  }

  // 4. 学生検索（student_id から）
  const { data: student, error: studentError } = await adminClient
    .from("students")
    .select("id, student_id, name")
    .eq("student_id", parsed.studentId)
    .single();

  if (studentError || !student) {
    return { success: false, reason: "STUDENT_NOT_FOUND" };
  }

  // 5. Supabase Storage にアップロード（upsert で重複時は上書き）
  const storagePath = `works/${assignmentId}/${student.id}.png`;
  const fileBuffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await adminClient.storage
    .from("works")
    .upload(storagePath, fileBuffer, {
      contentType: "image/png",
      upsert: true,
    });

  if (uploadError) {
    return { success: false, reason: "STORAGE_ERROR" };
  }

  // 6. Public URL を取得
  const { data: urlData } = adminClient.storage
    .from("works")
    .getPublicUrl(storagePath);

  const imageUrl = urlData.publicUrl;

  // 7. DB にメタデータを登録（upsert: 同一学生×課題で重複時は上書き）
  const { error: dbError } = await adminClient
    .from("works")
    .upsert(
      {
        student_id: student.id,
        assignment_id: assignmentId,
        filename: file.name,
        storage_path: storagePath,
        image_url: imageUrl,
        file_size: file.size,
      },
      { onConflict: "student_id,assignment_id" },
    );

  if (dbError) {
    // ロールバック: Storageからファイルを削除
    await adminClient.storage.from("works").remove([storagePath]);
    return { success: false, reason: "STORAGE_ERROR" };
  }

  return { success: true, studentName: student.name };
}
