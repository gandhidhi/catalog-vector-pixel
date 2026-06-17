-- ============================================================
-- Adobe Portfolio Viewer - Initial Schema Migration
-- ============================================================

-- courses テーブル
CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL,
  prefix VARCHAR(5) UNIQUE NOT NULL CHECK (prefix ~ '^\d{5}$'),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- students テーブル
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id VARCHAR(8) UNIQUE NOT NULL CHECK (student_id ~ '^\d{8}$'),
  name VARCHAR(50) NOT NULL CHECK (char_length(name) >= 1),
  name_kana VARCHAR(100),
  name_en VARCHAR(100),
  course_id UUID REFERENCES courses(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- assignments テーブル
CREATE TABLE assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number INT UNIQUE NOT NULL CHECK (number BETWEEN 1 AND 7),
  name VARCHAR(100) NOT NULL CHECK (char_length(name) >= 1),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- works テーブル
CREATE TABLE works (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id),
  assignment_id UUID NOT NULL REFERENCES assignments(id),
  filename VARCHAR(255) NOT NULL,
  storage_path VARCHAR(500) NOT NULL,
  image_url VARCHAR(1000) NOT NULL,
  file_size BIGINT NOT NULL,
  width INT,
  height INT,
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (student_id, assignment_id)
);

-- badge_types テーブル
CREATE TABLE badge_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- work_badges テーブル
CREATE TABLE work_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_id UUID NOT NULL REFERENCES works(id) ON DELETE CASCADE,
  badge_type_id UUID NOT NULL REFERENCES badge_types(id),
  assigned_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (work_id, badge_type_id)
);

-- ============================================================
-- Row Level Security (RLS) の有効化
-- ============================================================

ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE works ENABLE ROW LEVEL SECURITY;
ALTER TABLE badge_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_badges ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS ポリシー: 読み取り（全員許可）
-- ============================================================

CREATE POLICY "Public read" ON courses FOR SELECT USING (true);
CREATE POLICY "Public read" ON students FOR SELECT USING (true);
CREATE POLICY "Public read" ON assignments FOR SELECT USING (true);
CREATE POLICY "Public read" ON works FOR SELECT USING (true);
CREATE POLICY "Public read" ON badge_types FOR SELECT USING (true);
CREATE POLICY "Public read" ON work_badges FOR SELECT USING (true);

-- ============================================================
-- RLS ポリシー: 書き込み（認証済みユーザーのみ）
-- ============================================================

-- courses: 認証済みユーザーのみ登録可能
CREATE POLICY "Auth insert" ON courses FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- students: 認証済みユーザーのみ登録可能
CREATE POLICY "Auth insert" ON students FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- assignments: 認証済みユーザーのみ登録可能
CREATE POLICY "Auth insert" ON assignments FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- works: 認証済みユーザーのみ登録・更新・削除可能（重複アップロード上書き対応）
CREATE POLICY "Auth insert" ON works FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Auth update" ON works FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Auth delete" ON works FOR DELETE USING (auth.role() = 'authenticated');

-- work_badges: 認証済みユーザーのみ付与・削除可能
CREATE POLICY "Auth insert" ON work_badges FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Auth delete" ON work_badges FOR DELETE USING (auth.role() = 'authenticated');
