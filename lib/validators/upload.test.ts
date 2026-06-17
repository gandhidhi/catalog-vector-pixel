import { describe, it, expect } from "vitest";
import {
  validatePngFile,
  validatePngExtension,
  validateFileSize,
} from "./upload";

describe("upload validator", () => {
  describe("validatePngExtension", () => {
    it("accepts .png extension", () => {
      expect(validatePngExtension("test.png")).toBe(true);
    });

    it("accepts .PNG extension (case insensitive)", () => {
      expect(validatePngExtension("test.PNG")).toBe(true);
    });

    it("rejects .jpg extension", () => {
      expect(validatePngExtension("test.jpg")).toBe(false);
    });

    it("rejects .psd extension", () => {
      expect(validatePngExtension("test.psd")).toBe(false);
    });

    it("rejects no extension", () => {
      expect(validatePngExtension("testpng")).toBe(false);
    });
  });

  describe("validateFileSize", () => {
    it("accepts 0 bytes", () => {
      expect(validateFileSize(0)).toBe(true);
    });

    it("accepts exactly 2MB", () => {
      expect(validateFileSize(2_097_152)).toBe(true);
    });

    it("rejects 2MB + 1 byte", () => {
      expect(validateFileSize(2_097_153)).toBe(false);
    });

    it("rejects negative size", () => {
      expect(validateFileSize(-1)).toBe(false);
    });
  });

  describe("validatePngFile", () => {
    it("valid PNG under 2MB", () => {
      const result = validatePngFile({ name: "photo.png", size: 1_000_000 });
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("rejects non-PNG with appropriate error", () => {
      const result = validatePngFile({ name: "photo.jpg", size: 100 });
      expect(result.valid).toBe(false);
      expect(result.error).toContain(".png");
    });

    it("rejects oversized PNG with appropriate error", () => {
      const result = validatePngFile({ name: "large.png", size: 3_000_000 });
      expect(result.valid).toBe(false);
      expect(result.error).toContain("2MB");
    });

    it("checks extension before size (extension error takes priority)", () => {
      const result = validatePngFile({ name: "large.jpg", size: 3_000_000 });
      expect(result.valid).toBe(false);
      expect(result.error).toContain(".png");
    });
  });
});
