import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readFile, unlink } from "node:fs/promises";
import { randomUUID } from "node:crypto";

const execFileAsync = promisify(execFile);

/** Ghostscript conversion timeout in milliseconds */
const GS_TIMEOUT_MS = 60_000;

/**
 * Ghostscript未インストール時に表示するエラーメッセージ
 */
const GHOSTSCRIPT_NOT_FOUND_MESSAGE = `Ghostscript (gs) がインストールされていません。

以下の手順でインストールしてください:

  macOS:    brew install ghostscript
  Linux:    sudo apt-get install ghostscript
  Windows:  https://ghostscript.com/releases/gsdnld.html からダウンロード
`;

/**
 * Ghostscriptがインストールされているか確認する
 * @returns true: インストール済み, false: 未インストール
 */
export async function checkGhostscriptInstalled(): Promise<boolean> {
  try {
    await execFileAsync("gs", ["--version"], { timeout: 5_000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * GhostscriptでAIファイルをPNGに変換する
 *
 * @param inputPath - 変換対象の.aiファイルパス
 * @param resolution - Ghostscript解像度 (dpi)。デフォルト 300
 * @returns 変換後のPNGデータ（Buffer）
 * @throws Ghostscript未インストール時、変換失敗時、タイムアウト時にエラーをスロー
 */
export async function convertAiToPng(inputPath: string, resolution: number = 300): Promise<Buffer> {
  const tempOutputPath = join(tmpdir(), `ai-convert-${randomUUID()}.png`);

  try {
    await execFileAsync(
      "gs",
      [
        "-dNOPAUSE",
        "-dBATCH",
        "-sDEVICE=pngalpha",
        `-r${resolution}`,
        `-sOutputFile=${tempOutputPath}`,
        inputPath,
      ],
      { timeout: GS_TIMEOUT_MS },
    );

    const buffer = await readFile(tempOutputPath);
    return buffer;
  } catch (error: unknown) {
    if (isExecError(error) && error.code === "ENOENT") {
      throw new Error(GHOSTSCRIPT_NOT_FOUND_MESSAGE);
    }

    if (isExecError(error) && error.killed) {
      throw new Error(
        `Ghostscript変換がタイムアウトしました（${GS_TIMEOUT_MS / 1000}秒）: ${inputPath}`,
      );
    }

    if (isExecError(error) && error.stderr) {
      throw new Error(`Ghostscript変換エラー: ${error.stderr}`);
    }

    throw error;
  } finally {
    // 一時ファイルを削除（存在する場合）
    try {
      await unlink(tempOutputPath);
    } catch {
      // ファイルが存在しない場合は無視
    }
  }
}

/** execFile のエラー型ガード */
function isExecError(
  error: unknown,
): error is Error & { code?: string; killed?: boolean; stderr?: string } {
  return error instanceof Error;
}
