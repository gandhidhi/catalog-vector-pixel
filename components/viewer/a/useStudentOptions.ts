"use client";

import { useEffect, useState } from "react";
import { WorkListResponse } from "@/lib/types";
import { FilterOption } from "./types";

/**
 * 検索候補用の学生一覧を作品データから抽出する。
 * /api/students は認証必須のため、公開APIである /api/works から
 * 作品を持つ学生のみを候補として収集する（旧UIと同じ方式）。
 */
export function useStudentOptions(): FilterOption[] {
  const [options, setOptions] = useState<FilterOption[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function fetchStudents() {
      try {
        const uniqueStudents = new Map<string, string>();

        const res = await fetch("/api/works?page=1&pageSize=100");
        if (!res.ok) return;
        const data: WorkListResponse = await res.json();

        data.works.forEach((w) => {
          if (!uniqueStudents.has(w.studentId)) {
            uniqueStudents.set(w.studentId, w.studentName);
          }
        });

        if (data.totalPages > 1) {
          for (let p = 2; p <= Math.min(data.totalPages, 5); p++) {
            const pageRes = await fetch(`/api/works?page=${p}&pageSize=100`);
            if (!pageRes.ok) break;
            const pageData: WorkListResponse = await pageRes.json();
            pageData.works.forEach((w) => {
              if (!uniqueStudents.has(w.studentId)) {
                uniqueStudents.set(w.studentId, w.studentName);
              }
            });
          }
        }

        if (cancelled) return;

        setOptions(
          Array.from(uniqueStudents.entries())
            .map(([id, name]) => ({ id, label: name }))
            .sort((a, b) => a.label.localeCompare(b.label, "ja")),
        );
      } catch {
        // 候補が出ないだけで閲覧自体は可能なので黙って握りつぶす
      }
    }

    fetchStudents();
    return () => {
      cancelled = true;
    };
  }, []);

  return options;
}
