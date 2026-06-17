import { describe, it, expect } from "vitest";
import {
  validateStudentId,
  validateStudentName,
  validateAssignmentNumber,
  validateAssignmentName,
} from "./master-data";

describe("master-data validators", () => {
  describe("validateStudentId", () => {
    it("accepts 8-digit number", () => {
      expect(validateStudentId("12345678")).toBe(true);
    });

    it("accepts all zeros", () => {
      expect(validateStudentId("00000000")).toBe(true);
    });

    it("rejects 7-digit number", () => {
      expect(validateStudentId("1234567")).toBe(false);
    });

    it("rejects 9-digit number", () => {
      expect(validateStudentId("123456789")).toBe(false);
    });

    it("rejects letters", () => {
      expect(validateStudentId("1234abcd")).toBe(false);
    });

    it("rejects empty string", () => {
      expect(validateStudentId("")).toBe(false);
    });

    it("rejects string with spaces", () => {
      expect(validateStudentId("1234 678")).toBe(false);
    });
  });

  describe("validateStudentName", () => {
    it("accepts single character", () => {
      expect(validateStudentName("A")).toBe(true);
    });

    it("accepts 50 characters", () => {
      expect(validateStudentName("あ".repeat(50))).toBe(true);
    });

    it("rejects empty string", () => {
      expect(validateStudentName("")).toBe(false);
    });

    it("rejects 51 characters", () => {
      expect(validateStudentName("あ".repeat(51))).toBe(false);
    });

    it("accepts Japanese names", () => {
      expect(validateStudentName("黒須哲郎")).toBe(true);
    });
  });

  describe("validateAssignmentNumber", () => {
    it("accepts 1", () => {
      expect(validateAssignmentNumber(1)).toBe(true);
    });

    it("accepts 7", () => {
      expect(validateAssignmentNumber(7)).toBe(true);
    });

    it("rejects 0", () => {
      expect(validateAssignmentNumber(0)).toBe(false);
    });

    it("rejects 8", () => {
      expect(validateAssignmentNumber(8)).toBe(false);
    });

    it("rejects non-integer (1.5)", () => {
      expect(validateAssignmentNumber(1.5)).toBe(false);
    });

    it("rejects negative number", () => {
      expect(validateAssignmentNumber(-1)).toBe(false);
    });
  });

  describe("validateAssignmentName", () => {
    it("accepts single character", () => {
      expect(validateAssignmentName("A")).toBe(true);
    });

    it("accepts 100 characters", () => {
      expect(validateAssignmentName("a".repeat(100))).toBe(true);
    });

    it("rejects empty string", () => {
      expect(validateAssignmentName("")).toBe(false);
    });

    it("rejects 101 characters", () => {
      expect(validateAssignmentName("a".repeat(101))).toBe(false);
    });
  });
});
