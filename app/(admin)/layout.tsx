import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/admin/LogoutButton";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <h1 className="text-lg font-semibold text-gray-900">
                Portfolio Viewer 管理
              </h1>
              <nav className="hidden sm:flex items-center gap-2">
                <a
                  href="/admin/dashboard"
                  className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 rounded-md hover:bg-gray-100"
                >
                  ダッシュボード
                </a>
                <a
                  href="/admin/upload"
                  className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 rounded-md hover:bg-gray-100"
                >
                  アップロード
                </a>
                <a
                  href="/admin/students"
                  className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 rounded-md hover:bg-gray-100"
                >
                  学生管理
                </a>
                <a
                  href="/admin/assignments"
                  className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 rounded-md hover:bg-gray-100"
                >
                  課題管理
                </a>
                <a
                  href="/admin/courses"
                  className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 rounded-md hover:bg-gray-100"
                >
                  コース管理
                </a>
                <a
                  href="/admin/badges"
                  className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 rounded-md hover:bg-gray-100"
                >
                  バッジ管理
                </a>
              </nav>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500">{user.email}</span>
              <LogoutButton />
            </div>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
