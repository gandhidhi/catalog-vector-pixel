-- ============================================================
-- Adobe Portfolio Viewer - Seed Data
-- ============================================================

-- badge_types 初期データ（冪等: ON CONFLICT DO NOTHING）
INSERT INTO badge_types (name, description) VALUES
  ('丁寧な仕事！', '細部まで丁寧に仕上げている作品に付与'),
  ('勝手にチャレンジ！', '新しい技法やアイデアに挑戦している作品に付与'),
  ('独自の視点！', '独自の視点やオリジナリティがある作品に付与'),
  ('構成が美しい！', 'レイアウトや構成に優れた作品に付与'),
  ('技術力が高い！', '高い技術力で表現している作品に付与')
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- 以下は開発用テストデータ（ローカル開発環境のみ）
-- Development test data - for local development only
-- ============================================================

-- コース テストデータ
INSERT INTO courses (name, prefix) VALUES
  ('〇〇Aコース', '12345'),
  ('〇〇Bコース', '56789')
ON CONFLICT (name) DO NOTHING;

-- 学生 テストデータ
-- コースA: 3名
INSERT INTO students (student_id, name, name_kana, course_id) VALUES
  ('12345001', '田中太郎', 'タナカタロウ', (SELECT id FROM courses WHERE prefix = '12345')),
  ('12345002', '鈴木花子', 'スズキハナコ', (SELECT id FROM courses WHERE prefix = '12345')),
  ('12345003', '佐藤一郎', 'サトウイチロウ', (SELECT id FROM courses WHERE prefix = '12345'))
ON CONFLICT (student_id) DO NOTHING;

-- コースB: 2名
INSERT INTO students (student_id, name, name_kana, course_id) VALUES
  ('56789001', '山田次郎', 'ヤマダジロウ', (SELECT id FROM courses WHERE prefix = '56789')),
  ('56789002', '高橋美咲', 'タカハシミサキ', (SELECT id FROM courses WHERE prefix = '56789'))
ON CONFLICT (student_id) DO NOTHING;

-- 課題 テストデータ
INSERT INTO assignments (number, name) VALUES
  (1, '課題1：基礎デザイン'),
  (2, '課題2：タイポグラフィ'),
  (3, '課題3：イラストレーション')
ON CONFLICT (number) DO NOTHING;
