import { describe, it, expect } from "vitest";
import { parse, suggestCorrection } from "./filename.js";

describe("filename validator - parse", () => {
  it("parses valid .ai filename", () => {
    const result = parse("12345001_黒須哲郎.ai");
    expect(result).toEqual({ studentId: "12345001", name: "黒須哲郎" });
  });

  it("parses valid .psd filename", () => {
    const result = parse("12345001_田中太郎.psd");
    expect(result).toEqual({ studentId: "12345001", name: "田中太郎" });
  });

  it("parses valid .png filename", () => {
    const result = parse("12345001_田中太郎.png");
    expect(result).toEqual({ studentId: "12345001", name: "田中太郎" });
  });

  it("is case-insensitive for extension", () => {
    expect(parse("12345001_田中太郎.AI")).toEqual({ studentId: "12345001", name: "田中太郎" });
    expect(parse("12345001_田中太郎.PSD")).toEqual({ studentId: "12345001", name: "田中太郎" });
    expect(parse("12345001_田中太郎.Png")).toEqual({ studentId: "12345001", name: "田中太郎" });
  });

  it("parses filename with multiple underscores in name", () => {
    const result = parse("12345001_名前_苗字.psd");
    expect(result).toEqual({ studentId: "12345001", name: "名前_苗字" });
  });

  it("returns null for non-8-digit student ID", () => {
    expect(parse("1234567_田中太郎.ai")).toBeNull();
    expect(parse("123456789_田中太郎.ai")).toBeNull();
  });

  it("returns null for non-numeric student ID", () => {
    expect(parse("1234abcd_田中太郎.psd")).toBeNull();
  });

  it("returns null for unsupported extension", () => {
    expect(parse("12345001_田中太郎.jpg")).toBeNull();
    expect(parse("12345001_田中太郎.tiff")).toBeNull();
  });

  it("returns null for missing underscore", () => {
    expect(parse("12345001田中太郎.ai")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(parse("")).toBeNull();
  });
});

describe("filename validator - suggestCorrection", () => {
  it("returns null for already valid filename", () => {
    expect(suggestCorrection("12345001_田中太郎.ai")).toBeNull();
    expect(suggestCorrection("12345001_田中太郎.psd")).toBeNull();
  });

  it("fixes hyphen separator", () => {
    expect(suggestCorrection("12345001-田中太郎.ai")).toBe("12345001_田中太郎.ai");
  });

  it("fixes spaces to underscores", () => {
    expect(suggestCorrection("12345001 田中太郎.psd")).toBe("12345001_田中太郎.psd");
  });

  it("fixes fullwidth digits to halfwidth", () => {
    expect(suggestCorrection("１２３４５００１_田中太郎.ai")).toBe("12345001_田中太郎.ai");
  });

  it("fixes fullwidth underscore", () => {
    expect(suggestCorrection("12345001＿田中太郎.psd")).toBe("12345001_田中太郎.psd");
  });

  it("returns null for completely unparseable filename", () => {
    expect(suggestCorrection("random_file.txt")).toBeNull();
  });

  it("returns null for filename without extension", () => {
    expect(suggestCorrection("12345001_田中太郎")).toBeNull();
  });

  it("returns null for unsupported extension", () => {
    expect(suggestCorrection("12345001_田中太郎.jpg")).toBeNull();
  });
});
