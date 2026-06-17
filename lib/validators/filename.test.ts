import { describe, it, expect } from "vitest";
import { parseFilename } from "./filename";

describe("filename parser", () => {
  it("parses valid filename with Japanese name", () => {
    const result = parseFilename("12345001_黒須哲郎.png");
    expect(result).toEqual({ studentId: "12345001", name: "黒須哲郎" });
  });

  it("parses valid filename with single character name", () => {
    const result = parseFilename("99999999_A.png");
    expect(result).toEqual({ studentId: "99999999", name: "A" });
  });

  it("parses filename with multiple underscores in name", () => {
    const result = parseFilename("12345001_名前_苗字.png");
    expect(result).toEqual({ studentId: "12345001", name: "名前_苗字" });
  });

  it("is case-insensitive for extension", () => {
    const result = parseFilename("12345001_田中太郎.PNG");
    expect(result).toEqual({ studentId: "12345001", name: "田中太郎" });
  });

  it("returns null for missing student ID", () => {
    expect(parseFilename("_田中太郎.png")).toBeNull();
  });

  it("returns null for 7-digit student ID", () => {
    expect(parseFilename("1234567_田中太郎.png")).toBeNull();
  });

  it("returns null for 9-digit student ID", () => {
    expect(parseFilename("123456789_田中太郎.png")).toBeNull();
  });

  it("returns null for non-numeric student ID", () => {
    expect(parseFilename("1234abcd_田中太郎.png")).toBeNull();
  });

  it("returns null for missing underscore", () => {
    expect(parseFilename("12345001田中太郎.png")).toBeNull();
  });

  it("returns null for non-PNG extension", () => {
    expect(parseFilename("12345001_田中太郎.jpg")).toBeNull();
  });

  it("returns null for no extension", () => {
    expect(parseFilename("12345001_田中太郎")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(parseFilename("")).toBeNull();
  });
});
