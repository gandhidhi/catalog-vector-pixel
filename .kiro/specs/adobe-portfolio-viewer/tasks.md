# Implementation Plan: Adobe Portfolio Viewer

## Overview

Adobe Portfolio Viewerの実装計画。Next.js 14 (App Router) + Supabase (PostgreSQL, Storage, Auth) をVercelにデプロイし、ローカル変換ツール（packages/converter）を含むモノレポ構成で実装する。TypeScriptを全コンポーネントで使用する。

## Tasks

- [x] 1. プロジェクトセットアップとコアインターフェース
  - [x] 1.1 モノレポ構成とNext.jsプロジェクト初期化
    - Next.js 14 (App Router) プロジェクトを作成し、TypeScript設定を行う
    - `packages/converter` ディレクトリを作成し、package.jsonとtsconfig.jsonを設定する
    - ルートのpackage.jsonにworkspaces設定を追加する
    - ESLint、Prettierの設定を追加する
    - _Requirements: 全般_

  - [x] 1.2 Supabaseクライアント設定と型定義
    - `lib/supabase/client.ts`（ブラウザ用）、`lib/supabase/server.ts`（サーバー用）、`lib/supabase/admin.ts`（Service Role Key用）を作成する
    - `@supabase/supabase-js` および `@supabase/ssr` をインストールする
    - `lib/types/index.ts` にStudent, Course, Assignment, Work, BadgeType, WorkBadge等の型定義を作成する
    - 環境変数テンプレート（`.env.local.example`）を作成する
    - _Requirements: 9.1, 9.2_

  - [x] 1.3 共通バリデーター実装
    - `lib/validators/upload.ts`: PNGファイルバリデーション（拡張子 `.png`、サイズ ≤ 2MB）
    - `lib/validators/filename.ts`: ファイル名パース（`{学籍番号}_{氏名}.png` パターン）
    - `lib/validators/master-data.ts`: 学籍番号（8桁数字）、氏名（1〜50文字）、課題番号（1〜7）、課題名（1〜100文字）バリデーション
    - `lib/validators/csv-import.ts`: CSVパーサー（BOM付きUTF-8対応、必須カラム検証、200行上限）
    - _Requirements: 2.2, 2.3, 2.4, 3.3, 8.1, 8.2, 8.4_

  - [ ]\* 1.4 Property 3: アップロードファイルバリデーション プロパティテスト
    - **Property 3: アップロードファイルバリデーション**
    - fast-checkで拡張子・サイズの組み合わせを網羅的に検証する
    - **Validates: Requirements 2.2, 2.3, 2.4**

  - [ ]\* 1.5 Property 4: ファイル名パース プロパティテスト
    - **Property 4: ファイル名パース**
    - fast-checkで `{8桁数字}_{氏名}.png` パターンの適合・不適合を検証する
    - **Validates: Requirements 3.3, 4.6**

  - [ ]\* 1.6 Property 14: マスターデータバリデーション プロパティテスト
    - **Property 14: マスターデータバリデーション**
    - fast-checkで学籍番号・氏名・課題番号・課題名の入力バリデーションを検証する
    - **Validates: Requirements 8.1, 8.2**

- [x] 2. データベーススキーマとマイグレーション
  - [x] 2.1 Supabaseマイグレーションファイル作成
    - `supabase/migrations/` にcourses, students, assignments, works, badge_types, work_badgesテーブルのDDLを作成する
    - CHECK制約、UNIQUE制約、外部キー制約を設定する
    - RLS (Row Level Security) ポリシーを設定する（閲覧: 全員、書き込み: authenticated）
    - _Requirements: 9.1, 9.2, 9.3_

  - [x] 2.2 シードデータ作成
    - `supabase/seed.sql` にbadge_types初期データ（「丁寧な仕事！」「新しいことにチャレンジ！」等）を作成する
    - 開発用テストデータ（コース、学生、課題のサンプル）を含める
    - _Requirements: 7.3_

- [x] 3. 認証システム実装
  - [x] 3.1 ログインページとAuthGuard実装
    - `app/auth/login/page.tsx`: メール/パスワードログインフォーム（Supabase Auth使用）
    - `app/(admin)/layout.tsx`: AuthGuardレイアウト（未認証→ `/auth/login` リダイレクト）
    - Next.js Middleware (`middleware.ts`): 管理ページへの未認証アクセスをリダイレクト
    - セッションタイムアウト（60分）の実装
    - ログアウト機能の実装
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

  - [ ]\* 3.2 Property 1: ログインロックアウト プロパティテスト
    - **Property 1: ログインロックアウト**
    - fast-checkで連続失敗5回でのロック動作と成功時のカウンターリセットを検証する
    - _Requirements: 1.3_
    - **Validates: Requirements 1.3**

  - [ ]\* 3.3 Property 2: セッションタイムアウト プロパティテスト
    - **Property 2: セッションタイムアウト**
    - fast-checkで60分経過判定の正確性を検証する
    - **Validates: Requirements 1.6**

- [x] 4. マスターデータ管理API・UI
  - [x] 4.1 コース管理API・UI実装
    - `app/api/courses/route.ts`: GET（一覧取得）、POST（コース登録、プレフィックス5桁数字バリデーション）
    - `app/(admin)/courses/page.tsx`（または`students`ページ内に統合）: コース登録・一覧表示UI
    - _Requirements: 8.3_

  - [x] 4.2 学生管理API・UI実装
    - `app/api/students/route.ts`: GET（一覧取得）、POST（学生登録、学籍番号8桁・氏名1〜50文字バリデーション）
    - 学生レコード作成時にstudent_idの先頭5桁からcourse_idを自動紐づけ
    - `app/(admin)/students/page.tsx`: 学生登録フォーム・一覧表示UI
    - コース未紐づけの通知表示
    - _Requirements: 8.1, 8.5, 8.9_

  - [x] 4.3 学生CSVインポートAPI実装
    - `app/api/students/import/route.ts`: POST（CSVファイルアップロード）
    - BOM付きUTF-8対応（先頭`\uFEFF`自動除去）
    - 必須カラム検証（「学籍番号」「学生氏名」）、余分カラム自動無視
    - 200行上限チェック
    - バリデーションエラー行のスキップ＋残り行の続行
    - エラー行一覧と理由のレスポンス
    - CSVインポートUI（ファイル選択、結果表示）
    - _Requirements: 8.4, 8.7, 8.8, 8.9_

  - [ ]\* 4.4 Property 15: CSVインポート部分的失敗処理 プロパティテスト
    - **Property 15: CSVインポート部分的失敗処理**
    - fast-checkで成功行数 + エラー行数 = 全行数を検証する
    - **Validates: Requirements 8.6**

  - [x] 4.5 課題管理API・UI実装
    - `app/api/assignments/route.ts`: GET（一覧取得）、POST（課題登録、番号1〜7・名前1〜100文字バリデーション）
    - 重複課題番号の拒否
    - `app/(admin)/assignments/page.tsx`: 課題登録フォーム・一覧表示UI
    - _Requirements: 8.2, 8.6_

- [ ] 5. チェックポイント - マスターデータ管理の検証
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. ローカル変換ツール実装
  - [x] 6.1 変換ツール基盤実装
    - `packages/converter/src/converter/image-processor.ts`: sharpによるリサイズ（長辺1280px以下）＋圧縮（500KB以下）
    - `packages/converter/src/validators/filename.ts`: ファイル名バリデーション＋修正候補提示
    - 変換対象ファイルのフィルタリング（`.ai`/`.psd`のみ、それ以外スキップ）
    - _Requirements: 4.3, 4.4, 4.5, 4.6, 4.10_

  - [ ]\* 6.2 Property 6: 画像リサイズ制約 プロパティテスト
    - **Property 6: 画像リサイズ制約**
    - fast-checkで任意のwidth/heightに対するリサイズ結果を検証する（長辺≤1280px、アスペクト比維持）
    - **Validates: Requirements 4.3, 4.4**

  - [ ]\* 6.3 Property 7: 画像圧縮制約 プロパティテスト
    - **Property 7: 画像圧縮制約**
    - fast-checkで圧縮後のサイズが500KB以下であることを検証する
    - **Validates: Requirements 4.5**

  - [ ]\* 6.4 Property 8: 変換ツール ファイルフィルタリング プロパティテスト
    - **Property 8: 変換ツール ファイルフィルタリング**
    - fast-checkで`.ai`/`.psd`のみが変換対象として検出されることを検証する
    - **Validates: Requirements 4.10**

  - [x] 6.5 AIファイル変換（Ghostscript）実装
    - `packages/converter/src/converter/ai-converter.ts`: Ghostscriptプロセス呼び出し（タイムアウト60秒）
    - Ghostscript未インストール時のエラーメッセージ＋インストール手順表示
    - _Requirements: 4.3, 4.12_

  - [x] 6.6 PSDファイル変換（ag-psd + sharp）実装
    - `packages/converter/src/converter/psd-converter.ts`: ag-psdでレイヤー統合→Bufferデータ取得
    - sharpでPNG変換
    - _Requirements: 4.4_

  - [x] 6.7 CLIモード実装
    - `packages/converter/src/cli.ts`: `npx convert-works ./folder --assignment N` コマンド
    - 起動時プリフライトチェック（Ghostscriptインストール確認、入力ディレクトリ存在確認）
    - 進捗表示（処理済みファイル数/全ファイル数、現在処理中ファイル名）
    - エラー耐性（1ファイルの失敗が他に影響しない）
    - 完了サマリー（成功件数、失敗件数、スキップ件数、出力先フォルダ）
    - _Requirements: 4.1, 4.7, 4.8, 4.10, 4.11_

  - [ ]\* 6.8 Property 9: 変換ツール エラー耐性 プロパティテスト
    - **Property 9: 変換ツール エラー耐性**
    - fast-checkで1ファイルの変換エラーが他ファイルの処理を停止させないことを検証する
    - **Validates: Requirements 4.11**

  - [x] 6.9 Web UIモード実装
    - `packages/converter/src/server.ts`: `npx start-converter` でlocalhost:3000起動
    - `packages/converter/src/ui/`: ブラウザGUI（フォルダ選択、課題番号入力、変換実行）
    - 変換済みPNGプレビュー一覧表示
    - 進捗表示とエラー表示
    - _Requirements: 4.2, 4.7, 4.8, 4.9_

- [ ] 7. チェックポイント - 変換ツールの検証
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. ファイルアップロード機能
  - [x] 8.1 単体アップロードAPI・UI実装
    - `app/api/uploads/single/route.ts`: POST（認証必須、PNGバリデーション、Supabase Storage保存、DBメタデータ登録）
    - トランザクション管理（Storage保存失敗時のロールバック）
    - 学生・課題の存在確認
    - 重複アップロード検知（同一学生×課題 → 上書き/スキップ選択）
    - `app/(admin)/upload/page.tsx`: 学生選択・課題選択・ファイル選択UI
    - アップロード成功時のフィードバック表示（ファイル名、学生名、課題名）
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 9.3, 9.4_

  - [x] 8.2 バルクアップロードAPI・UI実装
    - `app/api/uploads/bulk/route.ts`: POST（認証必須、最大150ファイル、ファイル名パース→学生自動紐づけ）
    - continue-on-error方式（有効ファイルは処理続行、無効ファイルは失敗理由記録）
    - `app/(admin)/bulk-upload/page.tsx`: 課題選択・複数ファイル選択UI
    - 進捗表示（処理済みファイル数/全ファイル数）
    - 命名規則ヒント常時表示（`{学籍番号}_{氏名}.png`）
    - 完了後サマリー表示（成功件数、失敗件数、失敗ファイル一覧と理由）
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9_

  - [ ]\* 8.3 Property 5: バルクアップロード部分的失敗処理 プロパティテスト
    - **Property 5: バルクアップロード部分的失敗処理**
    - fast-checkで有効/無効ファイル混合バッチの処理結果を検証する（successCount + failureCount = totalFiles）
    - **Validates: Requirements 3.5, 3.6**

  - [ ]\* 8.4 Property 16: 重複アップロード検知 プロパティテスト
    - **Property 16: 重複アップロード検知**
    - fast-checkで同一学生×課題の重複アップロード検知を検証する
    - **Validates: Requirements 9.4**

  - [ ] 8.5 バルクアップロード逐次送信対応（Vercelデプロイ対応）【優先度高】
    - Vercel Serverless Functionsのボディサイズ制限（4.5MB）に対応するため、バルクアップロードをクライアント側で1ファイルずつ逐次送信する方式に変更する
    - `app/(admin)/bulk-upload/page.tsx`: FormDataで全ファイル一括送信 → 1ファイルずつ `/api/uploads/single` にPOSTするループ処理に変更
    - リアルタイム進捗表示（処理済みファイル数/全ファイル数、現在処理中のファイル名）
    - 失敗ファイルは記録して続行（continue-on-error）
    - 完了後にサマリー表示（成功件数、失敗件数、失敗ファイル一覧と理由）
    - `/api/uploads/bulk/route.ts` は削除またはリダイレクト用に残す
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9_

- [ ] 9. チェックポイント - アップロード機能の検証
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. 閲覧ページ実装
  - [x] 10.1 作品一覧ページ（ギャラリー）実装
    - `app/(viewer)/page.tsx`: SSG/ISRでグリッド形式のサムネイル一覧表示
    - `components/viewer/WorkGallery.tsx`: グリッドレイアウト
    - `components/viewer/WorkCard.tsx`: サムネイルカード（学生名、課題名、バッジ表示）
    - 課題番号の降順ソート（最新課題が先頭）
    - ページネーション（20件ずつ遅延読み込み）
    - 作品0件時のEmptyState表示
    - 画像読み込み失敗時のプレースホルダー表示
    - _Requirements: 5.1, 5.2, 5.4, 5.5, 5.6_

  - [x] 10.2 作品一覧API実装
    - `app/api/works/route.ts`: GET（フィルター・ページネーション対応、認証不要）
    - クエリパラメータ: studentIds, assignmentIds, badgeIds, hasBadge, page, pageSize
    - JOINクエリ（students, assignments, work_badges, badge_types）
    - 課題番号降順ソート
    - _Requirements: 5.1, 6.1, 6.2, 6.3, 6.4, 6.7_

  - [ ]\* 10.3 Property 10: 作品リスト ソート順 プロパティテスト
    - **Property 10: 作品リスト ソート順**
    - fast-checkで取得結果の課題番号降順を検証する
    - **Validates: Requirements 5.1**

  - [ ]\* 10.4 Property 11: ページネーション正確性 プロパティテスト
    - **Property 11: ページネーション正確性**
    - fast-checkでページ分割の正確性（アイテム数、totalPages、全ページ結合＝全データ）を検証する
    - **Validates: Requirements 5.4**

  - [ ]\* 10.5 Property 12: フィルター結合（AND条件）プロパティテスト
    - **Property 12: フィルター結合（AND条件）**
    - fast-checkで複数フィルター条件のAND結合の正確性を検証する
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.6**

  - [x] 10.6 フィルタリングUI実装
    - `components/viewer/FilterPanel.tsx`: 学生フィルター、課題フィルター、バッジフィルター
    - `components/viewer/FilterBadge.tsx`: 適用中フィルターのバッジ表示
    - `components/viewer/ResultCount.tsx`: フィルター適用後の件数表示
    - フィルター解除機能
    - フィルター結果0件時のメッセージ表示
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

  - [x] 10.7 作品拡大表示モーダル実装
    - `components/viewer/WorkModal.tsx`: ビューポート幅最大90%、アスペクト比維持
    - 閉じるボタンと画像外領域クリックで閉じる
    - _Requirements: 5.3_

- [x] 11. バッジシステム実装
  - [x] 11.1 バッジ付与・削除API実装
    - `app/api/badges/route.ts`: POST（バッジ付与、認証必須）
    - 付与上限チェック（1作品最大3個）
    - 同一バッジ重複付与の禁止（UNIQUE制約）
    - `app/api/badges/[id]/route.ts`: DELETE（バッジ削除、認証必須）
    - `app/api/badges/types/route.ts`: GET（バッジ種別一覧、認証不要）
    - _Requirements: 7.1, 7.2, 7.5, 7.6_

  - [ ]\* 11.2 Property 13: バッジ付与制約 プロパティテスト
    - **Property 13: バッジ付与制約**
    - fast-checkで1作品あたりのバッジ数≤3、重複なし、3個超過時の拒否を検証する
    - **Validates: Requirements 7.2, 7.6**

  - [x] 11.3 バッジ管理UI実装
    - `app/(admin)/badges/page.tsx`: 作品一覧から選択→バッジ付与/削除UI
    - 定義済みバッジ一覧からの選択インターフェース
    - 2秒以内の反映（楽観的UI更新）
    - バッジ上限エラーメッセージ表示
    - _Requirements: 7.1, 7.3, 7.4, 7.5, 7.6_

- [x] 12. 管理ダッシュボード
  - [x] 12.1 管理ダッシュボードページ実装
    - `app/(admin)/dashboard/page.tsx`: 登録学生数、課題数、アップロード済み作品数、バッジ付与数のサマリー表示
    - 各管理機能（アップロード、バルクアップロード、学生管理、課題管理、バッジ管理）へのナビゲーション
    - _Requirements: 1.2_

- [ ] 13. 最終チェックポイント - 全体統合テスト
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- `*` マーク付きタスクはオプションであり、MVPのために省略可能
- 各タスクはRequirementsへの参照を含み、トレーサビリティを確保する
- チェックポイントで段階的な検証を行い、問題の早期発見に努める
- Property testsは正確性プロパティの網羅的検証、Unit testsは具体例とエッジケースの検証に使用する
- ローカル変換ツールはpackages/converterで独立して開発・テスト可能

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "2.1"] },
    { "id": 2, "tasks": ["1.3", "2.2", "3.1"] },
    { "id": 3, "tasks": ["1.4", "1.5", "1.6", "3.2", "3.3", "4.1"] },
    { "id": 4, "tasks": ["4.2", "4.5", "6.1"] },
    { "id": 5, "tasks": ["4.3", "6.2", "6.3", "6.4", "6.5", "6.6"] },
    { "id": 6, "tasks": ["4.4", "6.7", "6.8"] },
    { "id": 7, "tasks": ["6.9", "8.1"] },
    { "id": 8, "tasks": ["8.2"] },
    { "id": 9, "tasks": ["8.3", "8.4", "10.2"] },
    { "id": 10, "tasks": ["10.1", "10.6", "10.7"] },
    { "id": 11, "tasks": ["10.3", "10.4", "10.5", "11.1"] },
    { "id": 12, "tasks": ["11.2", "11.3", "12.1"] }
  ]
}
```
