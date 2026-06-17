import { describe, it, expect } from "vitest";
import { parseAndValidate } from "./csv-import";

describe("csv-import validator", () => {
  describe("BOM handling", () => {
    it("strips BOM from CSV content", () => {
      const csv = "\uFEFF学籍番号,学生氏名\n12345001,田中太郎";
      const result = parseAndValidate(csv);
      expect(result.valid).toBe(true);
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].studentId).toBe("12345001");
    });

    it("works without BOM", () => {
      const csv = "学籍番号,学生氏名\n12345001,田中太郎";
      const result = parseAndValidate(csv);
      expect(result.valid).toBe(true);
      expect(result.rows).toHaveLength(1);
    });
  });

  describe("header validation", () => {
    it("rejects missing 学籍番号 column", () => {
      const csv = "学生氏名,ヨミガナ\n田中太郎,タナカタロウ";
      const result = parseAndValidate(csv);
      expect(result.valid).toBe(false);
      expect(result.headerError).toContain("学籍番号");
    });

    it("rejects missing 学生氏名 column", () => {
      const csv = "学籍番号,ヨミガナ\n12345001,タナカタロウ";
      const result = parseAndValidate(csv);
      expect(result.valid).toBe(false);
      expect(result.headerError).toContain("学生氏名");
    });

    it("rejects empty CSV", () => {
      const result = parseAndValidate("");
      expect(result.valid).toBe(false);
      expect(result.headerError).toBeDefined();
    });
  });

  describe("optional columns", () => {
    it("parses ヨミガナ when present", () => {
      const csv = "学籍番号,学生氏名,ヨミガナ\n12345001,田中太郎,タナカタロウ";
      const result = parseAndValidate(csv);
      expect(result.valid).toBe(true);
      expect(result.rows[0].nameKana).toBe("タナカタロウ");
    });

    it("parses 英字氏名 when present", () => {
      const csv =
        '学籍番号,学生氏名,英字氏名\n12345001,黒須哲郎,"KUROSU, Tetsuro"';
      const result = parseAndValidate(csv);
      expect(result.valid).toBe(true);
      expect(result.rows[0].nameEn).toBe("KUROSU, Tetsuro");
    });

    it("handles all optional columns", () => {
      const csv =
        '学籍番号,学生氏名,ヨミガナ,英字氏名\n12345001,黒須哲郎,クロステツロウ,"KUROSU, Tetsuro"';
      const result = parseAndValidate(csv);
      expect(result.valid).toBe(true);
      expect(result.rows[0]).toEqual({
        studentId: "12345001",
        name: "黒須哲郎",
        nameKana: "クロステツロウ",
        nameEn: "KUROSU, Tetsuro",
      });
    });

    it("omits empty optional values from result", () => {
      const csv = "学籍番号,学生氏名,ヨミガナ\n12345001,田中太郎,";
      const result = parseAndValidate(csv);
      expect(result.valid).toBe(true);
      expect(result.rows[0].nameKana).toBeUndefined();
    });
  });

  describe("extra columns ignored", () => {
    it("ignores extra columns", () => {
      const csv =
        "学籍番号,学生氏名,コメント,,,\n12345001,田中太郎,メモ,,,";
      const result = parseAndValidate(csv);
      expect(result.valid).toBe(true);
      expect(result.rows[0]).toEqual({
        studentId: "12345001",
        name: "田中太郎",
      });
    });
  });

  describe("quoted fields", () => {
    it("handles comma within quoted field", () => {
      const csv =
        '学籍番号,学生氏名,英字氏名\n12345001,黒須哲郎,"KUROSU, Tetsuro"';
      const result = parseAndValidate(csv);
      expect(result.rows[0].nameEn).toBe("KUROSU, Tetsuro");
    });

    it("handles escaped double quotes", () => {
      const csv =
        '学籍番号,学生氏名,英字氏名\n12345001,田中太郎,"He said ""hello"""';
      const result = parseAndValidate(csv);
      expect(result.rows[0].nameEn).toBe('He said "hello"');
    });
  });

  describe("row validation", () => {
    it("reports invalid student ID", () => {
      const csv = "学籍番号,学生氏名\n1234567,田中太郎";
      const result = parseAndValidate(csv);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].line).toBe(2);
      expect(result.errors[0].reason).toContain("学籍番号");
    });

    it("reports empty student name", () => {
      const csv = "学籍番号,学生氏名\n12345001,";
      const result = parseAndValidate(csv);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].reason).toContain("学生氏名");
    });

    it("valid rows are kept despite other row errors", () => {
      const csv =
        "学籍番号,学生氏名\n12345001,田中太郎\nINVALID,佐藤花子\n12345003,鈴木一郎";
      const result = parseAndValidate(csv);
      expect(result.valid).toBe(false);
      expect(result.rows).toHaveLength(2);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].line).toBe(3);
    });
  });

  describe("row limit", () => {
    it("accepts exactly 200 rows", () => {
      const header = "学籍番号,学生氏名";
      const rows = Array.from(
        { length: 200 },
        (_, i) => `${String(i).padStart(8, "0")},名前${i}`,
      );
      const csv = [header, ...rows].join("\n");
      const result = parseAndValidate(csv);
      expect(result.headerError).toBeUndefined();
      expect(result.rows.length + result.errors.length).toBeLessThanOrEqual(
        200,
      );
    });

    it("rejects more than 200 data rows", () => {
      const header = "学籍番号,学生氏名";
      const rows = Array.from(
        { length: 201 },
        (_, i) => `${String(i).padStart(8, "0")},名前${i}`,
      );
      const csv = [header, ...rows].join("\n");
      const result = parseAndValidate(csv);
      expect(result.valid).toBe(false);
      expect(result.headerError).toContain("200");
    });
  });

  describe("line endings", () => {
    it("handles CRLF line endings", () => {
      const csv = "学籍番号,学生氏名\r\n12345001,田中太郎\r\n12345002,佐藤花子";
      const result = parseAndValidate(csv);
      expect(result.valid).toBe(true);
      expect(result.rows).toHaveLength(2);
    });

    it("handles trailing newline", () => {
      const csv = "学籍番号,学生氏名\n12345001,田中太郎\n";
      const result = parseAndValidate(csv);
      expect(result.valid).toBe(true);
      expect(result.rows).toHaveLength(1);
    });
  });
});
