import { describe, it, expect } from "vitest";
import { filterConvertibleFiles } from "./file-filter.js";

describe("filterConvertibleFiles", () => {
  it("filters .ai files as convertible", () => {
    const result = filterConvertibleFiles(["design.ai"]);
    expect(result.convertible).toEqual(["design.ai"]);
    expect(result.skipped).toEqual([]);
  });

  it("filters .psd files as convertible", () => {
    const result = filterConvertibleFiles(["photo.psd"]);
    expect(result.convertible).toEqual(["photo.psd"]);
    expect(result.skipped).toEqual([]);
  });

  it("filters .pdf files as convertible", () => {
    const result = filterConvertibleFiles(["doc.pdf"]);
    expect(result.convertible).toEqual(["doc.pdf"]);
    expect(result.skipped).toEqual([]);
  });

  it("is case-insensitive for extensions", () => {
    const result = filterConvertibleFiles(["file.AI", "file.PSD", "file.Ai", "file.Psd", "file.PDF"]);
    expect(result.convertible).toEqual(["file.AI", "file.PSD", "file.Ai", "file.Psd", "file.PDF"]);
    expect(result.skipped).toEqual([]);
  });

  it("skips non-convertible files", () => {
    const result = filterConvertibleFiles(["readme.txt", "photo.jpg", "image.png"]);
    expect(result.convertible).toEqual([]);
    expect(result.skipped).toEqual(["readme.txt", "photo.jpg", "image.png"]);
  });

  it("correctly separates mixed file types", () => {
    const files = ["12345001_田中.ai", "readme.txt", "12345002_鈴木.psd", "notes.md", "report.pdf"];
    const result = filterConvertibleFiles(files);
    expect(result.convertible).toEqual(["12345001_田中.ai", "12345002_鈴木.psd", "report.pdf"]);
    expect(result.skipped).toEqual(["readme.txt", "notes.md"]);
  });

  it("returns empty arrays for empty input", () => {
    const result = filterConvertibleFiles([]);
    expect(result.convertible).toEqual([]);
    expect(result.skipped).toEqual([]);
  });

  it("does not match partial extensions", () => {
    const result = filterConvertibleFiles(["file.aiff", "file.psdx", "file.ai.bak"]);
    expect(result.convertible).toEqual([]);
    expect(result.skipped).toEqual(["file.aiff", "file.psdx", "file.ai.bak"]);
  });
});
