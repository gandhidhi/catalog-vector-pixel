"use client";

import { useState, useEffect, useRef } from "react";
import type { Student } from "@/lib/types";
import { validateStudentId, validateStudentName } from "@/lib/validators/master-data";

interface CsvImportResult {
  importedCount: number;
  skippedCount: number;
  errors: { line: number; reason: string }[];
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  // CSV Import state
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvResult, setCsvResult] = useState<CsvImportResult | null>(null);
  const [csvError, setCsvError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [studentId, setStudentId] = useState("");
  const [name, setName] = useState("");
  const [nameKana, setNameKana] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [formErrors, setFormErrors] = useState<{
    studentId?: string;
    name?: string;
  }>({});

  useEffect(() => {
    fetchStudents();
  }, []);

  async function fetchStudents() {
    setLoading(true);
    try {
      const res = await fetch("/api/students");
      if (!res.ok) {
        throw new Error("学生一覧の取得に失敗しました");
      }
      const data = await res.json();
      setStudents(data.students);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "エラーが発生しました",
      );
    } finally {
      setLoading(false);
    }
  }

  function validateForm(): boolean {
    const errors: { studentId?: string; name?: string } = {};

    if (!studentId) {
      errors.studentId = "学籍番号は必須です";
    } else if (!validateStudentId(studentId)) {
      errors.studentId = "学籍番号は8桁の数字で入力してください";
    }

    if (!name.trim()) {
      errors.name = "氏名は必須です";
    } else if (!validateStudentName(name.trim())) {
      errors.name = "氏名は1文字以上50文字以下で入力してください";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setWarning(null);

    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          name: name.trim(),
          nameKana: nameKana.trim() || undefined,
          nameEn: nameEn.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "学生の登録に失敗しました");
        return;
      }

      setSuccess(`学生「${data.student.name}」（${data.student.studentId}）を登録しました`);

      // コース未紐づけの警告表示
      if (data.warning) {
        setWarning(data.warning);
      }

      setStudentId("");
      setName("");
      setNameKana("");
      setNameEn("");
      setFormErrors({});
      fetchStudents();
    } catch {
      setError("通信エラーが発生しました。再度お試しください");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCsvImport() {
    if (!csvFile) return;

    setCsvImporting(true);
    setCsvResult(null);
    setCsvError(null);

    try {
      const formData = new FormData();
      formData.append("file", csvFile);

      const res = await fetch("/api/students/import", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setCsvError(data.error || "CSVインポートに失敗しました");
        return;
      }

      setCsvResult(data);
      setCsvFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      // インポート成功時に一覧を更新
      if (data.importedCount > 0) {
        fetchStudents();
      }
    } catch {
      setCsvError("通信エラーが発生しました。再度お試しください");
    } finally {
      setCsvImporting(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">学生管理</h2>
        <p className="mt-1 text-sm text-gray-500">
          学生情報の登録と一覧表示を行います。学籍番号の先頭5桁からコースが自動的に紐づけられます。
        </p>
      </div>

      {/* 学生登録フォーム */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          学生登録
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

        {warning && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-700">{warning}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="student-id"
              className="block text-sm font-medium text-gray-700"
            >
              学籍番号（8桁数字）
            </label>
            <input
              id="student-id"
              type="text"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              placeholder="例: 12345001"
              maxLength={8}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {formErrors.studentId && (
              <p className="mt-1 text-sm text-red-600">{formErrors.studentId}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="student-name"
              className="block text-sm font-medium text-gray-700"
            >
              氏名
            </label>
            <input
              id="student-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例: 黒須哲郎"
              maxLength={50}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {formErrors.name && (
              <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="student-name-kana"
              className="block text-sm font-medium text-gray-700"
            >
              ヨミガナ（任意）
            </label>
            <input
              id="student-name-kana"
              type="text"
              value={nameKana}
              onChange={(e) => setNameKana(e.target.value)}
              placeholder="例: クロス テツロウ"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label
              htmlFor="student-name-en"
              className="block text-sm font-medium text-gray-700"
            >
              英字氏名（任意）
            </label>
            <input
              id="student-name-en"
              type="text"
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              placeholder="例: Tetsuro Kurosu"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
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

      {/* CSVインポート */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          CSVインポート
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          CSVファイルから学生情報を一括登録します。必須カラム:「学籍番号」「学生氏名」。任意カラム:「ヨミガナ」「英字氏名」。最大200行まで。
        </p>

        {csvError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-700">{csvError}</p>
          </div>
        )}

        {csvResult && (
          <div className="mb-4 space-y-3">
            <div className="p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-700">
                インポート完了: {csvResult.importedCount}件登録、{csvResult.skippedCount}件スキップ
              </p>
            </div>
            {csvResult.errors.length > 0 && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-sm font-medium text-yellow-800 mb-2">
                  エラー一覧（{csvResult.errors.length}件）:
                </p>
                <ul className="list-disc list-inside space-y-1">
                  {csvResult.errors.map((err, idx) => (
                    <li key={idx} className="text-sm text-yellow-700">
                      {err.line > 0 ? `${err.line}行目: ` : ""}{err.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-4">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={(e) => {
              setCsvFile(e.target.files?.[0] ?? null);
              setCsvResult(null);
              setCsvError(null);
            }}
            className="block text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          <button
            type="button"
            onClick={handleCsvImport}
            disabled={!csvFile || csvImporting}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {csvImporting ? "インポート中..." : "インポート"}
          </button>
        </div>
      </div>

      {/* 学生一覧 */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          登録済み学生一覧
        </h3>

        {loading ? (
          <p className="text-sm text-gray-500">読み込み中...</p>
        ) : students.length === 0 ? (
          <p className="text-sm text-gray-500">
            登録された学生はいません。
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    学籍番号
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    氏名
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ヨミガナ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    コース
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    登録日
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {students.map((student) => (
                  <tr key={student.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                      {student.studentId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {student.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {student.nameKana || "—"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {student.course ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {student.course.name}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          未設定
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(student.createdAt).toLocaleDateString("ja-JP")}
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
