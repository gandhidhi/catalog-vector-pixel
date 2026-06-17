"use client";

import { useState, useEffect, useRef } from "react";
import type { Student, Assignment } from "@/lib/types";

interface UploadResult {
  id: string;
  studentName: string;
  assignmentName: string;
  filename: string;
  imageUrl: string;
}

export default function UploadPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // Form state
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [selectedAssignmentId, setSelectedAssignmentId] = useState("");
  const [file, setFile] = useState<File | null>(null);

  // Feedback state
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<UploadResult | null>(null);

  // Duplicate dialog state
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [duplicateFilename, setDuplicateFilename] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [studentsRes, assignmentsRes] = await Promise.all([
        fetch("/api/students"),
        fetch("/api/assignments"),
      ]);

      if (studentsRes.ok) {
        const data = await studentsRes.json();
        setStudents(data.students);
      }

      if (assignmentsRes.ok) {
        const data = await assignmentsRes.json();
        setAssignments(data.assignments);
      }
    } catch {
      setError("データの取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload(overwrite = false) {
    if (!file || !selectedStudentId || !selectedAssignmentId) return;

    setUploading(true);
    setError(null);
    setSuccess(null);
    setShowDuplicateDialog(false);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("studentId", selectedStudentId);
      formData.append("assignmentId", selectedAssignmentId);
      if (overwrite) {
        formData.append("overwrite", "true");
      }

      const res = await fetch("/api/uploads/single", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        // 重複検知
        if (res.status === 409 && data.duplicate) {
          setDuplicateFilename(data.existingWork?.filename ?? null);
          setShowDuplicateDialog(true);
          return;
        }
        setError(data.error || "アップロードに失敗しました");
        return;
      }

      setSuccess(data.work);
      // フォームリセット
      setFile(null);
      setSelectedStudentId("");
      setSelectedAssignmentId("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch {
      setError("通信エラーが発生しました。再度お試しください");
    } finally {
      setUploading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    handleUpload(false);
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">作品アップロード</h2>
        </div>
        <p className="text-sm text-gray-500">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">作品アップロード</h2>
        <p className="mt-1 text-sm text-gray-500">
          変換済みPNGファイルを1件ずつアップロードし、学生と課題に紐づけます。
        </p>
      </div>

      {/* アップロードフォーム */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          単体アップロード
        </h3>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
            <p className="text-sm text-green-700">
              アップロード完了: 「{success.filename}」を
              {success.studentName}さんの{success.assignmentName}として登録しました
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 学生選択 */}
          <div>
            <label
              htmlFor="student-select"
              className="block text-sm font-medium text-gray-700"
            >
              学生
            </label>
            <select
              id="student-select"
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">学生を選択してください</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.studentId} - {student.name}
                </option>
              ))}
            </select>
          </div>

          {/* 課題選択 */}
          <div>
            <label
              htmlFor="assignment-select"
              className="block text-sm font-medium text-gray-700"
            >
              課題
            </label>
            <select
              id="assignment-select"
              value={selectedAssignmentId}
              onChange={(e) => setSelectedAssignmentId(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">課題を選択してください</option>
              {assignments.map((assignment) => (
                <option key={assignment.id} value={assignment.id}>
                  第{assignment.number}回: {assignment.name}
                </option>
              ))}
            </select>
          </div>

          {/* ファイル選択 */}
          <div>
            <label
              htmlFor="file-input"
              className="block text-sm font-medium text-gray-700"
            >
              PNGファイル（2MB以下）
            </label>
            <input
              ref={fileInputRef}
              id="file-input"
              type="file"
              accept=".png"
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                setError(null);
                setSuccess(null);
              }}
              className="mt-1 block text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>

          {/* アップロードボタン */}
          <button
            type="submit"
            disabled={uploading || !file || !selectedStudentId || !selectedAssignmentId}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? "アップロード中..." : "アップロード"}
          </button>
        </form>
      </div>

      {/* 重複ダイアログ */}
      {showDuplicateDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              重複アップロードの確認
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              この学生のこの課題は既にアップロード済みです。
              {duplicateFilename && (
                <span className="block mt-1 text-gray-500">
                  既存ファイル: {duplicateFilename}
                </span>
              )}
              上書きしますか？
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowDuplicateDialog(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={() => handleUpload(true)}
                disabled={uploading}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md disabled:opacity-50"
              >
                {uploading ? "上書き中..." : "上書きする"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ヒント */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">アップロード要件</h4>
        <ul className="text-sm text-gray-500 list-disc list-inside space-y-1">
          <li>ファイル形式: PNG (.png) のみ</li>
          <li>ファイルサイズ: 2MB以下</li>
          <li>同一学生×同一課題の重複時は上書き確認が表示されます</li>
        </ul>
      </div>
    </div>
  );
}
