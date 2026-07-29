import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readFile, unlink, stat } from "node:fs/promises";
import { randomUUID } from "node:crypto";

const execFileAsync = promisify(execFile);

/** Ghostscript compression timeout in milliseconds */
const GS_TIMEOUT_MS = 120_000;

/**
 * PDF圧縮レベル。サイズ優先で /screen をデフォルトにする。
 *
 * - screen: 最小サイズ（72dpi相当、Web閲覧向け）
 * - ebook:  中間サイズ（150dpi相当）
 * - printer: 高品質（300dpi相当）
 */
export type PdfCompressionLevel = "screen" | "ebook" | "printer";

export interface PdfCompressOptions {
  /** 圧縮レベル。デフォルト: "ebook" */
  level?: PdfCompressionLevel;
  /** 画像のダウンサンプリング解像度 (dpi)。デフォルト: 200 */
  imageDpi?: number;
  /** 出力ファイルサイズの上限（バイト）。超過時は解像度を段階的に下げてリトライ */
  maxSizeBytes?: number;
}

export interface PdfCompressResult {
  buffer: Buffer;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
}

/**
 * GhostscriptでPDFを圧縮する。全ページを保持し、サイズ優先で圧縮する。
 *
 * @param inputPath - 圧縮対象のPDFファイルパス
 * @param options - 圧縮オプション
 * @returns 圧縮後のPDFデータとサイズ情報
 */
export async function compressPdf(
  inputPath: string,
  options: PdfCompressOptions = {},
): Promise<PdfCompressResult> {
  const { level = "ebook", imageDpi = 200, maxSizeBytes } = options;

  // 元ファイルのサイズを取得
  const originalStat = await stat(inputPath);
  const originalSize = originalStat.size;

  // maxSizeBytes が設定されている場合: 解像度を段階的に下げてリトライ
  if (maxSizeBytes && maxSizeBytes > 0) {
    // 高解像度から順に試行し、上限以下になったら返す
    const dpiCandidates = [imageDpi, 150, 120, 100, 72, 50].filter(
      (d) => d <= imageDpi,
    );
    // 重複排除+降順
    const uniqueDpis = [...new Set(dpiCandidates)].sort((a, b) => b - a);

    let lastResult: PdfCompressResult | null = null;

    for (const dpi of uniqueDpis) {
      const result = await compressPdfOnce(inputPath, level, dpi, originalSize);
      lastResult = result;
      if (result.compressedSize <= maxSizeBytes) {
        return result;
      }
    }

    // 最低解像度でも上限を超える場合は最後の結果を返す（ベストエフォート）
    return lastResult!;
  }

  // maxSizeBytes 未設定: 1回だけ圧縮
  return compressPdfOnce(inputPath, level, imageDpi, originalSize);
}

/**
 * 指定DPIで1回だけPDF圧縮を実行する内部関数
 */
async function compressPdfOnce(
  inputPath: string,
  level: PdfCompressionLevel,
  imageDpi: number,
  originalSize: number,
): Promise<PdfCompressResult> {
  const tempOutputPath = join(tmpdir(), `pdf-compress-${randomUUID()}.pdf`);

  try {
    await execFileAsync(
      "gs",
      [
        "-dNOPAUSE",
        "-dBATCH",
        "-dQUIET",
        "-sDEVICE=pdfwrite",
        "-dCompatibilityLevel=1.5",
        `-dPDFSETTINGS=/${level}`,
        // 画像のダウンサンプリング設定（サイズ優先）
        "-dDownsampleColorImages=true",
        `-dColorImageResolution=${imageDpi}`,
        "-dDownsampleGrayImages=true",
        `-dGrayImageResolution=${imageDpi}`,
        "-dDownsampleMonoImages=true",
        `-dMonoImageResolution=${imageDpi}`,
        // 不要なメタデータを除去
        "-dDetectDuplicateImages=true",
        "-dCompressFonts=true",
        "-dSubsetFonts=true",
        `-sOutputFile=${tempOutputPath}`,
        inputPath,
      ],
      { timeout: GS_TIMEOUT_MS },
    );

    const buffer = await readFile(tempOutputPath);
    const compressedSize = buffer.length;

    return {
      buffer,
      originalSize,
      compressedSize,
      compressionRatio:
        originalSize > 0 ? Math.round((1 - compressedSize / originalSize) * 100) : 0,
    };
  } catch (error: unknown) {
    if (isExecError(error) && error.code === "ENOENT") {
      throw new Error(
        "Ghostscript (gs) がインストールされていません。PDF圧縮にはGhostscriptが必要です。",
      );
    }

    if (isExecError(error) && error.killed) {
      throw new Error(
        `PDF圧縮がタイムアウトしました（${GS_TIMEOUT_MS / 1000}秒）: ${inputPath}`,
      );
    }

    if (isExecError(error) && error.stderr) {
      throw new Error(`PDF圧縮エラー: ${error.stderr}`);
    }

    throw error;
  } finally {
    try {
      await unlink(tempOutputPath);
    } catch {
      // ファイルが存在しない場合は無視
    }
  }
}

/**
 * PDFの1ページ目をPNG画像に変換する（サムネイル生成用）
 *
 * @param inputPath - PDFファイルパス
 * @param resolution - 解像度 (dpi)。デフォルト: 150
 * @returns 1ページ目のPNGデータ（Buffer）
 */
export async function pdfFirstPageToPng(
  inputPath: string,
  resolution: number = 150,
): Promise<Buffer> {
  const tempOutputPath = join(tmpdir(), `pdf-thumb-${randomUUID()}.png`);

  try {
    await execFileAsync(
      "gs",
      [
        "-dNOPAUSE",
        "-dBATCH",
        "-dQUIET",
        "-sDEVICE=pngalpha",
        `-r${resolution}`,
        "-dFirstPage=1",
        "-dLastPage=1",
        `-sOutputFile=${tempOutputPath}`,
        inputPath,
      ],
      { timeout: GS_TIMEOUT_MS },
    );

    const buffer = await readFile(tempOutputPath);
    return buffer;
  } catch (error: unknown) {
    if (isExecError(error) && error.code === "ENOENT") {
      throw new Error(
        "Ghostscript (gs) がインストールされていません。",
      );
    }

    if (isExecError(error) && error.killed) {
      throw new Error(
        `PDFサムネイル生成がタイムアウトしました: ${inputPath}`,
      );
    }

    if (isExecError(error) && error.stderr) {
      throw new Error(`PDFサムネイル生成エラー: ${error.stderr}`);
    }

    throw error;
  } finally {
    try {
      await unlink(tempOutputPath);
    } catch {
      // ignore
    }
  }
}

/** execFile のエラー型ガード */
function isExecError(
  error: unknown,
): error is Error & { code?: string; killed?: boolean; stderr?: string } {
  return error instanceof Error;
}
