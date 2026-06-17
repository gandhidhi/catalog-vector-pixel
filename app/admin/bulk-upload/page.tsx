"use client";

import { useState, useEffect, useRef } from "react";
import type { Assignment, BulkUploadResult } from "@/lib/types";

export default function BulkUploadPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // Form state
  const [selectedAssignmentId, setSelectedAssignmentId] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  // Progress state
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);

  // Result state
  const [result, setResult] = useState<BulkUploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchAssignments();
  }, []);

  async function fetchAssignments() {
    setLoading(true);
    try {
      const res = await fetch("/api/assignments");
      if (res.ok) {
        const data = await res.json();
        setAssignments(data.assignments);
      }
    } catch {
      setError("課題データの取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(e.target.files ?? []);
    setFiles(selectedFiles);
    setError(null);
    setResult(null);
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedAssignmentId || files.length === 0) return;

    // クライアント側の最大ファイル数チェック
    if (files.length > 150) {
      setError("一度にアップロードできるファイルは最大150件です");
      return;
    }

    setUploading(true);
    setError(null);
    setResult(null);
    setProgress({ current: 0, total: files.length });

    try {
      const formData = new FormData();
      formData.append("assignmentId", selectedAssignmentId);
      files.forEach((file) => {
        formData.append("files", file);
      });

      // 進捗はサーバー側で一括処理されるため、送信開始を表示
      setProgress({ current: 0, total: files.length });

      const res = await fetch("/api/uploads/bulk", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "アップロードに失敗しました");
        setProgress(null);
        return;
      }

      // 完了
      setResult(data as BulkUploadResult);
      setProgress({ current: data.totalFiles, total: data.totalFiles });

      // フォームリセット
      setFiles([]);
      setSelectedAssignmentId("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch {
      setError("通信エラーが発生しました。再度お試しください");
      setProgress(null);
    } finally {
      setUploading(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">バルクアップロード</h2>
        </div>
        <p className="text-sm text-gray-500">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">バルクアップロード</h2>
        <p className="mt-1 text-sm text-gray-500">
          変換済みPNGファイルを一括でアップロードし、ファイル名から学生に自動紐づけします。
        </p>
      </div>

      {/* 命名規則ヒント（常時表示） */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-800 mb-1">
          📋 ファイル命名規則
        </h4>
        <p className="text-sm text-blue-700">
          <code className="bg-blue-100 px-1 py-0.5 rounded text-blue-900 font-mono">
            {"{学籍番号}_{氏名}.png"}
          </code>
        </p>
        <p className="text-xs text-blue-600 mt-1">
          例: <code className="font-mono">12345001_黒須哲郎.png</code>
        </p>
      </div>

      {/* アップロードフォーム */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          一括アップロード（最大150ファイル）
        </h3>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleUpload} className="space-y-4">
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
              disabled={uploading}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
            >
              <option value="">課題を選択してください</option>
              {assignments.map((assignment) => (
                <option key={assignment.id} value={assignment.id}>
                  第{assignment.number}回: {assignment.name}
                </option>
              ))}
            </select>
          </div>

          {/* ファイル選択（複数） */}
          <div>
            <label
              htmlFor="files-input"
              className="block text-sm font-medium text-gray-700"
            >
              PNGファイル（複数選択可、各2MB以下）
            </label>
            <input
              ref={fileInputRef}
              id="files-input"
              type="file"
              accept=".png"
              multiple
              onChange={handleFileChange}
              disabled={uploading}
              className="mt-1 block text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
            />
            {files.length > 0 && (
              <p className="mt-1 text-sm text-gray-500">
                {files.length}件のファイルが選択されています
              </p>
            )}
          </div>

          {/* アップロードボタン */}
          <button
            type="submit"
            disabled={uploading || files.length === 0 || !selectedAssignmentId}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? "アップロード中..." : "一括アップロード"}
          </button>
        </form>
      </div>

      {/* 進捗表示 */}
      {progress && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-3">進捗</h3>
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-gray-200 rounded-full h-3">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                style={{
                  width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%`,
                }}
              />
            </div>
            <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
              {progress.current} / {progress.total}
            </span>
          </div>
          {uploading && (
            <p className="mt-2 text-sm text-gray-500">処理中...</p>
          )}
        </div>
      )}

      {/* 完了サマリー */}
      {result && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            アップロード結果
          </h3>

          {/* 成功/失敗サマリー */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-900">{result.totalFiles}</p>
              <p className="text-xs text-gray-500">全ファイル数</p>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-700">{result.successCount}</p>
              <p className="text-xs text-green-600">成功</p>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <p className="text-2xl font-bold text-red-700">{result.failureCount}</p>
              <p className="text-xs text-red-600">失敗</p>
            </div>
          </div>

          {/* 成功リスト */}
          {result.successes.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-green-700 mb-2">
                ✅ 成功 ({result.successCount}件)
              </h4>
              <div className="max-h-40 overflow-y-auto">
                <ul className="text-sm text-gray-600 space-y-1">
                  {result.successes.map((s, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="text-green-500">•</span>
                      <span className="font-mono text-xs">{s.filename}</span>
                      <span className="text-gray-400">→</span>
                      <span>{s.studentName}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* 失敗リスト */}
          {result.failures.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-red-700 mb-2">
                ❌ 失敗 ({result.failureCount}件)
              </h4>
              <div className="max-h-40 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-1 text-gray-500 font-medium">ファイル名</th>
                      <th className="text-left py-1 text-gray-500 font-medium">理由</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.failures.map((f, i) => (
                      <tr key={i} className="border-b border-gray-100">
                        <td className="py-1 font-mono text-xs">{f.filename}</td>
                        <td className="py-1 text-red-600">{getFailureReasonLabel(f.reason)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function getFailureReasonLabel(reason: string): string {
  switch (reason) {
    case "FILENAME_PATTERN_MISMATCH":
      return "ファイル名が命名規則に不一致";
    case "STUDENT_NOT_FOUND":
      return "学籍番号が未登録";
    case "FILE_TOO_LARGE":
      return "ファイルサイズが2MB超過";
    case "INVALID_FORMAT":
      return "PNG以外のファイル形式";
    case "STORAGE_ERROR":
      return "ストレージ保存エラー";
    default:
      return "不明なエラー";
  }
}
