-- ============================================================
-- works_with_student ビュー: 学籍番号でのソートを可能にする
-- ============================================================

CREATE OR REPLACE VIEW works_with_student AS
SELECT
  w.id,
  w.student_id,
  w.assignment_id,
  w.filename,
  w.storage_path,
  w.image_url,
  w.file_size,
  w.width,
  w.height,
  w.uploaded_at,
  w.file_type,
  w.thumbnail_url,
  w.pdf_url,
  s.student_id AS student_number,
  s.name AS student_name,
  a.name AS assignment_name,
  a.number AS assignment_number
FROM works w
JOIN students s ON s.id = w.student_id
JOIN assignments a ON a.id = w.assignment_id;
