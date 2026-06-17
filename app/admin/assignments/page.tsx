"use client";

import { useState, useEffect } from "react";
import type { Assignment } from "@/lib/types";
import {
  validateAssignmentNumber,
  validateAssignmentName,
} from "@/lib/validators/master-data";

export default function AssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [number, setNumber] = useState("");
  const [name, setName] = useState("");
  const [formErrors, setFormErrors] = useState<{
    number?: string;
    name?: string;
  }>({});

  useEffect(() => {
    fetchAssignments();
  }, []);

  async function fetchAssignments() {
    setLoading(true);
    try {
      const res = await fetch("/api/assignments");
      if (!res.ok) {
        throw new Error("課題一覧の取得に失敗しました");
      }
      const data = await res.json();
      setAssignments(data.assignments);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "エラーが発生しました",
      );
    } finally {
      setLoading(false);
    }
  }

  function validateForm(): boolean {
    const errors: { number?: string; name?: string } = {};

    const num = parseInt(number, 10);
    if (!number) {
      errors.number = "課題番号は必須です";
    } else if (!validateAssignmentNumber(num)) {
      errors.number = "課題番号は1〜7の整数で入力してください";
    }

    if (!name.trim()) {
      errors.name = "課題名は必須です";
    } else if (!validateAssignmentName(name.trim())) {
      errors.name = "課題名は1〜100文字で入力してください";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          number: parseInt(number, 10),
          name: name.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "課題の登録に失敗しました");
        return;
      }

      setSuccess(
        `課題${data.assignment.number}「${data.assignment.name}」を登録しました`,
      );
      setNumber("");
      setName("");
      setFormErrors({});
      fetchAssignments();
    } catch {
      setError("通信エラーが発生しました。再度お試しください");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteAssignment(id: string, name: string) {
    if (!confirm(`課題「${name}」を削除しますか？`)) return;
    try {
      const res = await fetch(`/api/assignments/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "削除に失敗しました");
        return;
      }
      setSuccess(`課題「${name}」を削除しました`);
      fetchAssignments();
    } catch {
      setError("通信エラーが発生しました");
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">課題管理</h2>
        <p className="mt-1 text-sm text-gray-500">
          課題情報の登録と一覧表示を行います。課題番号は1〜7の範囲で設定できます。
        </p>
      </div>

      {/* 課題登録フォーム */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          課題登録
        </h3>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
            <p className="text-sm text-green-700">{success}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="assignment-number"
              className="block text-sm font-medium text-gray-700"
            >
              課題番号（1〜7）
            </label>
            <input
              id="assignment-number"
              type="number"
              min={1}
              max={7}
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              placeholder="例: 1"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {formErrors.number && (
              <p className="mt-1 text-sm text-red-600">
                {formErrors.number}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="assignment-name"
              className="block text-sm font-medium text-gray-700"
            >
              課題名（1〜100文字）
            </label>
            <input
              id="assignment-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例: イラスト制作基礎"
              maxLength={100}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {formErrors.name && (
              <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "登録中..." : "登録"}
          </button>
        </form>
      </div>

      {/* 課題一覧 */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          登録済み課題一覧
        </h3>

        {loading ? (
          <p className="text-sm text-gray-500">読み込み中...</p>
        ) : assignments.length === 0 ? (
          <p className="text-sm text-gray-500">
            登録された課題はありません。
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    課題番号
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    課題名
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    登録日
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {assignments.map((assignment) => (
                  <tr key={assignment.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {assignment.number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {assignment.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(assignment.createdAt).toLocaleDateString(
                        "ja-JP",
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        type="button"
                        onClick={() => handleDeleteAssignment(assignment.id, assignment.name)}
                        className="text-red-600 hover:text-red-800 text-xs"
                      >
                        削除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
