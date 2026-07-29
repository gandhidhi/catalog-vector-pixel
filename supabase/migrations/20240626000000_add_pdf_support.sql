-- ============================================================
-- PDF対応: works テーブルにfile_type, thumbnail_urlカラムを追加
-- ============================================================

-- file_type: アップロードされたファイルの種類（'png' or 'pdf'）
-- 既存データはすべてPNGなのでデフォルト値 'png' を設定
ALTER TABLE works
  ADD COLUMN file_type VARCHAR(10) NOT NULL DEFAULT 'png'
    CHECK (file_type IN ('png', 'pdf'));

-- thumbnail_url: PDFの場合のサムネイル画像URL（PNGの場合はNULL、image_urlがそのまま使われる）
ALTER TABLE works
  ADD COLUMN thumbnail_url VARCHAR(1000);

-- pdf_url: PDF閲覧用のPublic URL（PNGの場合はNULL）
-- image_urlはサムネイル/PNG表示用に使い、pdf_urlはPDFプレビュー用に使う
ALTER TABLE works
  ADD COLUMN pdf_url VARCHAR(1000);
