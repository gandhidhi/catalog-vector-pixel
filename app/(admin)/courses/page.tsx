"use client";

import { useState, useEffect } from "react";
import type { Course } from "@/lib/types";

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [prefix, setPrefix] = useState("");
  const [formErrors, setFormErrors] = useState<{
    name?: string;
    prefix?: string;
  }>({});

  useEffect(() => {
    fetchCourses();
  }, []);

  async function fetchCourses() {
    setLoading(true);
    try {
      const res = await fetch("/api/courses");
      if (!res.ok) {
        throw new Error("コース一覧の取得に失敗しました");
      }
      const data = await res.json();
      setCourses(data.courses);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "エラーが発生しました",
      );
    } finally {
      setLoading(false);
    }
  }

  function validateForm(): boolean {
    const errors: { name?: string; prefix?: string } = {};

    if (!name.trim()) {
      errors.name = "コース名は必須です";
    }

    if (!prefix) {
      errors.prefix = "プレフィックスは必須です";
    } else if (!/^\d{5}$/.test(prefix)) {
      errors.prefix = "プレフィックスは5桁の数字で入力してください";
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
      const res = await fetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), prefix }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "コースの登録に失敗しました");
        return;
      }

      setSuccess(`コース「${data.course.name}」を登録しました`);
      setName("");
      setPrefix("");
      setFormErrors({});
      fetchCourses();
    } catch {
      setError("通信エラーが発生しました。再度お試しください");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">コース管理</h2>
        <p className="mt-1 text-sm text-gray-500">
          コース情報の登録と一覧表示を行います。プレフィックスは学籍番号の先頭5桁です。
        </p>
      </div>

      {/* コース登録フォーム */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          コース登録
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
              htmlFor="course-name"
              className="block text-sm font-medium text-gray-700"
            >
              コース名
            </label>
            <input
              id="course-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例: デザインAコース"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {formErrors.name && (
              <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="course-prefix"
              className="block text-sm font-medium text-gray-700"
            >
              学籍番号プレフィックス（5桁数字）
            </label>
            <input
              id="course-prefix"
              type="text"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
              placeholder="例: 12345"
              maxLength={5}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {formErrors.prefix && (
              <p className="mt-1 text-sm text-red-600">
                {formErrors.prefix}
              </p>
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

      {/* コース一覧 */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          登録済みコース一覧
        </h3>

        {loading ? (
          <p className="text-sm text-gray-500">読み込み中...</p>
        ) : courses.length === 0 ? (
          <p className="text-sm text-gray-500">
            登録されたコースはありません。
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    コース名
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    プレフィックス
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    登録日
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {courses.map((course) => (
                  <tr key={course.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {course.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                      {course.prefix}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(course.createdAt).toLocaleDateString("ja-JP")}
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
