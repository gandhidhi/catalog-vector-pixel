"use client";

import {
  UIVersionProvider,
  useUIVersion,
} from "@/components/viewer/ui-version";
import ViewerHeader from "@/components/viewer/ViewerHeader";
import ClassicViewer from "@/components/viewer/classic/ClassicViewer";
import ViewerA from "@/components/viewer/a/ViewerA";
import ViewerB from "@/components/viewer/b/ViewerB";

/**
 * 公開ビューアのエントリーポイント。
 * ヘッダー（切り替えボタン付き）は共通で、下のUIだけを
 * 選択中のバージョンに応じて差し替える。
 */
export default function ViewerPage() {
  return (
    <UIVersionProvider>
      <ViewerContent />
    </UIVersionProvider>
  );
}

function ViewerContent() {
  const { version } = useUIVersion();

  if (version === "classic") {
    return (
      <main className="min-h-screen bg-gray-50">
        <ViewerHeader />
        <ClassicViewer />
      </main>
    );
  }

  if (version === "b") {
    return (
      <main className="flex h-dvh flex-col bg-orange-100 font-plex-sans">
        <ViewerHeader />
        <div className="min-h-0 flex-1">
          <ViewerB />
        </div>
      </main>
    );
  }

  // Aパターン
  return (
    <main className="flex h-dvh flex-col bg-slate-50 font-plex-sans">
      {/* デスクトップ: ヘッダーは常時表示 */}
      <div className="hidden md:block">
        <ViewerHeader />
      </div>
      <div className="min-h-0 flex-1">
        <ViewerA />
      </div>
    </main>
  );
}
