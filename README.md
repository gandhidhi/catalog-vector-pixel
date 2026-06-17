# Adobe Portfolio Viewer

学生の課題作品（.ai / .psd）をPNGに変換し、Webブラウザで閲覧できるシステム。

## システム構成

| コンポーネント | 説明 | URL |
|--------------|------|-----|
| 閲覧フロントエンド | 学生が作品を閲覧するページ（認証不要） | http://localhost:3000 |
| 管理フロントエンド | 教員がアップロード・バッジ付与を行うページ（認証必須） | http://localhost:3000/auth/login |
| 変換ツール (Web UI) | .ai/.psd → PNG 変換をGUIで操作 | http://localhost:3001 |
| 変換ツール (CLI) | .ai/.psd → PNG 変換をコマンドラインで実行 | — |

## セットアップ

```bash
# 依存パッケージをインストール
npm install

# 環境変数を設定
cp .env.local.example .env.local
# .env.local を編集して Supabase の接続情報を入力
```

### 前提条件

- Node.js 18+
- Ghostscript（.aiファイル変換に必要）
  ```bash
  brew install ghostscript
  ```

## 起動方法

### 1. 閲覧フロントエンド + 管理フロントエンド（Next.js）

```bash
npm run dev
```

- 閲覧ページ: http://localhost:3000
- ログイン: http://localhost:3000/auth/login

### 2. 変換ツール (Web UI モード)

```bash
cd packages/converter
npm run build
node dist/server.js
```

ブラウザが自動で開き、http://localhost:3001 でGUIから操作できます。

- フォルダ選択ダイアログで入力/出力フォルダを指定
- 解像度を選択（150 / 200 / 300 / 600 dpi）
- 変換ボタンを押すとリアルタイムで進捗表示
- 変換後にPNGプレビュー一覧を表示

### 3. 変換ツール (CLI モード)

```bash
cd packages/converter
npm run build
node dist/cli.js /path/to/ai-files --assignment 1
```

オプション:
```
node dist/cli.js <入力フォルダ> [オプション]

  -a, --assignment <number>  課題番号（表示用）
  -o, --output <dir>         出力先（デフォルト: 入力フォルダ/converted）
  -s, --max-size <kb>        最大ファイルサイズ（デフォルト: 1000 KB）
  -w, --max-width <px>       最大長辺（デフォルト: 2048 px）
```

## 教員の運用フロー

1. **初回のみ**: 管理画面でコースを登録 → 学生CSVをインポート → 課題を登録
2. **毎週の課題ごと**:
   - 変換ツール（Web UIまたはCLI）で .ai/.psd → PNG 変換
   - 管理画面の「一括アップロード」でPNGをまとめてアップロード
   - 必要に応じてバッジを付与

## ファイル命名規則

バルクアップロード時のPNGファイル名:

```
{学籍番号}_{氏名}.png
```

例: `12345001_黒須哲郎.png`

変換ツールがファイル名の検証と修正候補の提示を行います。

## 技術スタック

- Next.js 14 (App Router) / TypeScript / Tailwind CSS
- Supabase (PostgreSQL + Storage + Auth)
- Vercel (デプロイ先)
- Ghostscript (.ai変換) / sharp + ag-psd (.psd変換)

## ルーティング構成

```
/                     → 閲覧ページ（ギャラリー、認証不要）
/auth/login           → ログインページ
/admin/dashboard      → 管理ダッシュボード（認証必須）
/admin/upload         → 単体アップロード
/admin/bulk-upload    → 一括アップロード
/admin/students       → 学生管理 + CSVインポート
/admin/assignments    → 課題管理
/admin/courses        → コース管理
/admin/badges         → バッジ管理
/api/works            → 作品一覧API（公開）
/api/assignments      → 課題一覧API（公開）
/api/badges/types     → バッジ種別API（公開）
/api/uploads/*        → アップロードAPI（認証必須）
/api/students/*       → 学生API（認証必須）
/api/courses          → コースAPI（認証必須）
/api/badges           → バッジ付与/削除API（認証必須）
```

未認証で `/admin/*` にアクセスすると自動的に `/auth/login` にリダイレクトされます。

## Vercelデプロイ

1. VercelでGitHubリポジトリをインポート
2. 環境変数を設定:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. Supabaseダッシュボードの Authentication > URL Configuration に本番ドメインを追加
