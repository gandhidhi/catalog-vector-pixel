import { describe, it, expect, vi, beforeEach } from "vitest";
import { checkGhostscriptInstalled, convertAiToPng } from "./ai-converter.js";

// Mock child_process and fs
vi.mock("node:child_process", () => ({
  execFile: vi.fn(),
}));

vi.mock("node:fs/promises", () => ({
  readFile: vi.fn(),
  unlink: vi.fn(),
}));

import { execFile } from "node:child_process";
import { readFile, unlink } from "node:fs/promises";

describe("ai-converter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("checkGhostscriptInstalled", () => {
    it("should return true when gs --version succeeds", async () => {
      const mockExecFile = vi.mocked(execFile);
      mockExecFile.mockImplementation((_cmd: any, _args: any, _opts: any, callback?: any) => {
        const cb =
          typeof _args === "function"
            ? _args
            : typeof _opts === "function"
              ? _opts
              : callback;
        if (cb) cb(null, "10.02.1", "");
        return {} as any;
      });

      const result = await checkGhostscriptInstalled();
      expect(result).toBe(true);
    });

    it("should return false when gs is not found", async () => {
      const mockExecFile = vi.mocked(execFile);
      mockExecFile.mockImplementation((_cmd: any, _args: any, _opts: any, callback?: any) => {
        const cb =
          typeof _args === "function"
            ? _args
            : typeof _opts === "function"
              ? _opts
              : callback;
        const error = new Error("spawn gs ENOENT") as Error & { code: string };
        error.code = "ENOENT";
        if (cb) cb(error, "", "");
        return {} as any;
      });

      const result = await checkGhostscriptInstalled();
      expect(result).toBe(false);
    });
  });

  describe("convertAiToPng", () => {
    it("should throw with installation instructions when gs is not found", async () => {
      const mockExecFile = vi.mocked(execFile);
      mockExecFile.mockImplementation((_cmd: any, _args: any, _opts: any, callback?: any) => {
        const cb =
          typeof _args === "function"
            ? _args
            : typeof _opts === "function"
              ? _opts
              : callback;
        const error = new Error("spawn gs ENOENT") as Error & { code: string };
        error.code = "ENOENT";
        if (cb) cb(error, "", "");
        return {} as any;
      });

      vi.mocked(unlink).mockResolvedValue(undefined);

      await expect(convertAiToPng("/path/to/file.ai")).rejects.toThrow(
        "Ghostscript (gs) がインストールされていません",
      );
      await expect(convertAiToPng("/path/to/file.ai")).rejects.toThrow(
        "brew install ghostscript",
      );
    });

    it("should throw timeout error when gs process is killed", async () => {
      const mockExecFile = vi.mocked(execFile);
      mockExecFile.mockImplementation((_cmd: any, _args: any, _opts: any, callback?: any) => {
        const cb =
          typeof _args === "function"
            ? _args
            : typeof _opts === "function"
              ? _opts
              : callback;
        const error = new Error("timeout") as Error & {
          killed: boolean;
          stderr: string;
        };
        error.killed = true;
        error.stderr = "";
        if (cb) cb(error, "", "");
        return {} as any;
      });

      vi.mocked(unlink).mockResolvedValue(undefined);

      await expect(convertAiToPng("/path/to/file.ai")).rejects.toThrow(
        "タイムアウト",
      );
    });

    it("should throw with stderr when gs returns non-zero exit", async () => {
      const mockExecFile = vi.mocked(execFile);
      mockExecFile.mockImplementation((_cmd: any, _args: any, _opts: any, callback?: any) => {
        const cb =
          typeof _args === "function"
            ? _args
            : typeof _opts === "function"
              ? _opts
              : callback;
        const error = new Error("exit code 1") as Error & {
          killed: boolean;
          stderr: string;
        };
        error.killed = false;
        error.stderr = "Error: /undefinedfilename in (bad_file.ai)";
        if (cb) cb(error, "", "");
        return {} as any;
      });

      vi.mocked(unlink).mockResolvedValue(undefined);

      await expect(convertAiToPng("/path/to/file.ai")).rejects.toThrow(
        "Ghostscript変換エラー",
      );
    });

    it("should return buffer on successful conversion", async () => {
      const mockPngBuffer = Buffer.from("fake-png-data");
      const mockExecFile = vi.mocked(execFile);
      mockExecFile.mockImplementation((_cmd: any, _args: any, _opts: any, callback?: any) => {
        const cb =
          typeof _args === "function"
            ? _args
            : typeof _opts === "function"
              ? _opts
              : callback;
        if (cb) cb(null, "", "");
        return {} as any;
      });

      vi.mocked(readFile).mockResolvedValue(mockPngBuffer);
      vi.mocked(unlink).mockResolvedValue(undefined);

      const result = await convertAiToPng("/path/to/file.ai");
      expect(result).toEqual(mockPngBuffer);
    });

    it("should clean up temp file even on error", async () => {
      const mockExecFile = vi.mocked(execFile);
      mockExecFile.mockImplementation((_cmd: any, _args: any, _opts: any, callback?: any) => {
        const cb =
          typeof _args === "function"
            ? _args
            : typeof _opts === "function"
              ? _opts
              : callback;
        const error = new Error("spawn gs ENOENT") as Error & { code: string };
        error.code = "ENOENT";
        if (cb) cb(error, "", "");
        return {} as any;
      });

      vi.mocked(unlink).mockResolvedValue(undefined);

      try {
        await convertAiToPng("/path/to/file.ai");
      } catch {
        // expected
      }

      expect(unlink).toHaveBeenCalled();
    });
  });
});
