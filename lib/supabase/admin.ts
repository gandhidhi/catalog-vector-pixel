import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service Role Key を使用する管理者用Supabaseクライアント。
 * RLSをバイパスするため、サーバーサイドの管理操作専用。
 * ブラウザや公開APIからは絶対に使用しないこと。
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
