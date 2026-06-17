#!/usr/bin/env node
/**
 * convert-works CLI
 * .ai/.psd ファイルを PNG に変換するコマンドラインツール
 *
 * Usage:
 *   npx convert-works <inputDir> [options]
 *
 * Options:
 *   --assignment, -a  課題番号 (optional, for display only)
 *   --output, -o      出力先ディレクトリ (default: <inputDir>/converted)
 *   --max-size, -s    最大ファイルサイズ in KB (default: 500)
 *   --max-width, -w   最大長辺 in px (default: 1280)
 */

import { Command } from "commander";
import { resolve, join, basename, extname } from "node:path";
import { readdir, mkdir, writeFile, access } from "node:fs/promises";
import { constants } from "node:fs";

import { checkGhostscriptInstalled, convertAiToPng } from "./converter/ai-converter.js";
import { convertPsdToPng } from "./converter/psd-converter.js";
import { resizeAndCompress } from "./converter/image-processor.js";
import { filterConvertibleFiles } from "./converter/file-filter.js";
import { parse, suggestCorrection } from "./validators/filename.js";

interface CliOptions {
  assignment?: string;
  output?: string;
  maxSize: string;
  maxWidth: string;
}

interface ProcessingResult {
  filename: string;
  success: boolean;
  outputPath?: string;
  error?: string;
  suggestion?: string | null;
}

const program = new Command();

program
  .name("convert-works")
  .description(".ai/.psd ファイルを PNG に変換するツール")
  .version("0.1.0")
  .argument("<inputDir>", "入力ディレクトリ")
  .option("-a, --assignment <number>", "課題番号 (表示用)")
  .option("-o, --output <dir>", "出力先ディレクトリ (default: <inputDir>/converted)")
  .option("-s, --max-size <kb>", "最大ファイルサイズ (KB)", "500")
  .option("-w, --max-width <px>", "最大長辺 (px)", "1280")
  .action(async (inputDir: string, options: CliOptions) => {
    await run(inputDir, options);
  });

program.parse();

async function run(inputDir: string, options: CliOptions): Promise<void> {
  const resolvedInputDir = resolve(inputDir);
  const outputDir = options.output ? resolve(options.output) : join(resolvedInputDir, "converted");
  const maxSizeBytes = parseInt(options.maxSize, 10) * 1024;
  const maxWidth = parseInt(options.maxWidth, 10);

  console.log("═══════════════════════════════════════════════════════");
  console.log("  convert-works: .ai/.psd → PNG 変換ツール");
  console.log("═══════════════════════════════════════════════════════");
  if (options.assignment) {
    console.log(`  課題番号: ${options.assignment}`);
  }
  console.log(`  入力: ${resolvedInputDir}`);
  console.log(`  出力: ${outputDir}`);
  console.log(`  最大サイズ: ${options.maxSize} KB`);
  console.log(`  最大長辺: ${maxWidth} px`);
  console.log("───────────────────────────────────────────────────────");
  console.log("");

  // === Preflight Checks ===
  console.log("[Preflight] チェック中...");

  // 1. Ghostscript インストール確認
  const gsInstalled = await checkGhostscriptInstalled();
  if (!gsInstalled) {
    console.error("✗ Ghostscript (gs) がインストールされていません。");
    console.error("");
    console.error("  以下の手順でインストールしてください:");
    console.error("    macOS:   brew install ghostscript");
    console.error("    Linux:   sudo apt-get install ghostscript");
    console.error("    Windows: https://ghostscript.com/releases/gsdnld.html");
    process.exit(1);
  }
  console.log("  ✓ Ghostscript インストール確認済み");

  // 2. 入力ディレクトリ存在確認
  try {
    await access(resolvedInputDir, constants.R_OK);
  } catch {
    console.error(`✗ 入力ディレクトリが見つかりません: ${resolvedInputDir}`);
    process.exit(1);
  }
  console.log("  ✓ 入力ディレクトリ確認済み");
  console.log("");

  // === Read and filter files ===
  const allFiles = await readdir(resolvedInputDir);
  const { convertible, skipped } = filterConvertibleFiles(allFiles);

  if (skipped.length > 0) {
    console.log(`[Skip] 変換対象外ファイル (${skipped.length}件):`);
    for (const file of skipped) {
      console.log(`  - ${file}`);
    }
    console.log("");
  }

  if (convertible.length === 0) {
    console.log("変換対象ファイルがありません。");
    process.exit(0);
  }

  console.log(`[Convert] 変換対象: ${convertible.length}件`);
  console.log("");

  // === Create output directory ===
  await mkdir(outputDir, { recursive: true });

  // === Process each file ===
  const results: ProcessingResult[] = [];

  for (let i = 0; i < convertible.length; i++) {
    const filename = convertible[i];
    const inputPath = join(resolvedInputDir, filename);
    const progress = `[${i + 1}/${convertible.length}]`;

    console.log(`${progress} Processing: ${filename}...`);

    try {
      // Detect type and convert
      const ext = extname(filename).toLowerCase();
      let pngBuffer: Buffer;

      if (ext === ".ai") {
        pngBuffer = await convertAiToPng(inputPath);
      } else if (ext === ".psd") {
        pngBuffer = await convertPsdToPng(inputPath);
      } else {
        // Should not reach here due to filtering, but just in case
        throw new Error(`サポートされていない拡張子: ${ext}`);
      }

      // Resize and compress
      const processed = await resizeAndCompress(pngBuffer, maxWidth, maxSizeBytes);

      // Validate/suggest filename correction
      const parseResult = parse(filename);
      let suggestion: string | null = null;
      if (!parseResult) {
        suggestion = suggestCorrection(filename);
        if (suggestion) {
          console.log(`  ⚠ ファイル名修正候補: ${suggestion}`);
        }
      }

      // Write output PNG
      const outputFilename = basename(filename, extname(filename)) + ".png";
      const outputPath = join(outputDir, outputFilename);
      await writeFile(outputPath, processed.buffer);

      const sizeKB = (processed.buffer.length / 1024).toFixed(1);
      console.log(`  ✓ 完了 (${processed.width}×${processed.height}, ${sizeKB} KB)`);

      results.push({ filename, success: true, outputPath, suggestion });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`  ✗ エラー: ${errorMessage}`);
      results.push({ filename, success: false, error: errorMessage });
    }
  }

  // === Summary ===
  const successCount = results.filter((r) => r.success).length;
  const failureCount = results.filter((r) => !r.success).length;

  console.log("");
  console.log("═══════════════════════════════════════════════════════");
  console.log("  変換完了サマリー");
  console.log("───────────────────────────────────────────────────────");
  console.log(`  成功: ${successCount}件`);
  console.log(`  失敗: ${failureCount}件`);
  console.log(`  スキップ: ${skipped.length}件`);
  console.log(`  出力先: ${outputDir}`);
  console.log("═══════════════════════════════════════════════════════");

  if (failureCount > 0) {
    console.log("");
    console.log("  失敗ファイル:");
    for (const result of results.filter((r) => !r.success)) {
      console.log(`    - ${result.filename}: ${result.error}`);
    }
  }

  // Exit with non-zero if any failures
  if (failureCount > 0) {
    process.exit(2);
  }
}
