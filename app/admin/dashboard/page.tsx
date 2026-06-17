import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

interface StatCard {
  label: string;
  count: number;
}

interface NavItem {
  href: string;
  label: string;
  description: string;
}

const navItems: NavItem[] = [
  {
    href: "/admin/upload",
    label: "アップロード",
    description: "変換済みPNGファイルを1件ずつアップロード",
  },
  {
    href: "/admin/bulk-upload",
    label: "一括アップロード",
    description: "複数のPNGファイルをまとめてアップロード",
  },
  {
    href: "/admin/students",
    label: "学生管理",
    description: "学生情報の登録・CSVインポート",
  },
  {
    href: "/admin/assignments",
    label: "課題管理",
    description: "課題情報の登録と管理",
  },
  {
    href: "/admin/courses",
    label: "コース管理",
    description: "コース情報の登録と管理",
  },
  {
    href: "/admin/badges",
    label: "バッジ管理",
    description: "作品へのバッジ付与・削除",
  },
];

export default async function DashboardPage() {
  const supabase = createClient();

  const [studentsResult, assignmentsResult, worksResult, badgesResult] =
    await Promise.all([
      supabase.from("students").select("*", { count: "exact", head: true }),
      supabase.from("assignments").select("*", { count: "exact", head: true }),
      supabase.from("works").select("*", { count: "exact", head: true }),
      supabase.from("work_badges").select("*", { count: "exact", head: true }),
    ]);

  const stats: StatCard[] = [
    { label: "登録学生数", count: studentsResult.count ?? 0 },
    { label: "登録課題数", count: assignmentsResult.count ?? 0 },
    { label: "アップロード済み作品数", count: worksResult.count ?? 0 },
    { label: "バッジ付与数", count: badgesResult.count ?? 0 },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">ダッシュボード</h2>
        <p className="mt-1 text-sm text-gray-500">
          システム全体の概要と各管理機能へのアクセス
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-white shadow rounded-lg p-6 text-center"
          >
            <p className="text-3xl font-bold text-gray-900">{stat.count}</p>
            <p className="mt-1 text-sm text-gray-500">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Navigation Grid */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">管理メニュー</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block bg-white shadow rounded-lg p-6 hover:shadow-md hover:bg-gray-50 transition-all"
            >
              <p className="text-base font-medium text-gray-900">
                {item.label}
              </p>
              <p className="mt-1 text-sm text-gray-500">{item.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
