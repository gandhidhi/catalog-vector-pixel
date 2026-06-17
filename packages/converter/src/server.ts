#!/usr/bin/env node
/**
 * start-converter Web UI サーバー
 * ブラウザGUIで .ai/.psd → PNG 変換を操作する
 *
 * Usage:
 *   npx start-converter
 *
 * localhost:3000 でサーバーを起動し、ブラウザを自動で開く
 */

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { exec } from "node:child_process";
import { resolve, join, basename, extname } from "node:path";
import { readdir, mkdir, writeFile, readFile, access } from "node:fs/promises";
import { constants } from "node:fs";
import { platform } from "node:os";

import { checkGhostscriptInstalled, convertAiToPng } from "./converter/ai-converter.js";
import { convertPsdToPng } from "./converter/psd-converter.js";
import { resizeAndCompress } from "./converter/image-processor.js";
import { filterConvertibleFiles } from "./converter/file-filter.js";
import { parse, suggestCorrection } from "./validators/filename.js";
import { getHtmlPage } from "./ui/page.js";

const PORT = 3000;

interface ConvertRequest {
  inputDir: string;
  outputDir?: string;
  maxSize?: number;
  maxWidth?: number;
  resolution?: number;
  assignment?: number;
}

/**
 * ブラウザを自動で開く（macOS: open, Linux: xdg-open, Windows: start）
 */
function openBrowser(url: string): void {
  const os = platform();
  let cmd: string;
  if (os === "darwin") {
    cmd = `open "${url}"`;
  } else if (os === "win32") {
    cmd = `start "${url}"`;
  } else {
    cmd = `xdg-open "${url}"`;
  }
  exec(cmd, (err) => {
    if (err) {
      console.log(`  ブラウザを手動で開いてください: ${url}`);
    }
  });
}

/**
 * リクエストボディをJSONとしてパースする
 */
async function parseBody<T>(req: IncomingMessage): Promise<T> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      try {
        const body = Buffer.concat(chunks).toString("utf-8");
        resolve(JSON.parse(body) as T);
      } catch (e) {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

/**
 * JSON レスポンスを送信する
 */
function sendJson(res: ServerResponse, status: number, data: unknown): void {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
  });
  res.end(JSON.stringify(data));
}

/**
 * 変換処理を実行し、SSEで進捗を送信する
 */
async function handleConvert(req: IncomingMessage, res: ServerResponse): Promise<void> {
  let body: ConvertRequest;
  try {
    body = await parseBody<ConvertRequest>(req);
  } catch {
    sendJson(res, 400, { error: "Invalid request body" });
    return;
  }

  if (!body.inputDir) {
    sendJson(res, 400, { error: "inputDir is required" });
    return;
  }

  // SSE ヘッダー
  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": "*",
  });

  const sendEvent = (event: string, data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  const resolvedInputDir = resolve(body.inputDir);
  const outputDir = body.outputDir
    ? resolve(body.outputDir)
    : join(resolvedInputDir, "converted");
  const maxSizeBytes = (body.maxSize ?? 1000) * 1024;
  const maxWidth = body.maxWidth ?? 2048;
  const resolution = body.resolution ?? 300;

  // Preflight checks
  sendEvent("status", { message: "プリフライトチェック中..." });

  const gsInstalled = await checkGhostscriptInstalled();
  if (!gsInstalled) {
    sendEvent("error", {
      message: "Ghostscript (gs) がインストールされていません。",
      details:
        "macOS: brew install ghostscript\nLinux: sudo apt-get install ghostscript\nWindows: https://ghostscript.com/releases/gsdnld.html",
    });
    sendEvent("done", { success: false });
    res.end();
    return;
  }

  try {
    await access(resolvedInputDir, constants.R_OK);
  } catch {
    sendEvent("error", {
      message: `入力ディレクトリが見つかりません: ${resolvedInputDir}`,
    });
    sendEvent("done", { success: false });
    res.end();
    return;
  }

  // Read and filter files
  const allFiles = await readdir(resolvedInputDir);
  const { convertible, skipped } = filterConvertibleFiles(allFiles);

  sendEvent("status", {
    message: `ファイルスキャン完了: ${convertible.length}件の変換対象、${skipped.length}件スキップ`,
  });

  if (skipped.length > 0) {
    sendEvent("skipped", { files: skipped });
  }

  if (convertible.length === 0) {
    sendEvent("error", { message: "変換対象ファイルがありません。" });
    sendEvent("done", { success: false });
    res.end();
    return;
  }

  // Create output directory
  await mkdir(outputDir, { recursive: true });

  sendEvent("progress", {
    current: 0,
    total: convertible.length,
    filename: "",
    message: "変換を開始します...",
  });

  // Process each file
  const results: Array<{
    filename: string;
    success: boolean;
    outputPath?: string;
    error?: string;
    suggestion?: string | null;
    preview?: string;
    width?: number;
    height?: number;
    sizeKB?: number;
  }> = [];

  for (let i = 0; i < convertible.length; i++) {
    const filename = convertible[i];
    const inputPath = join(resolvedInputDir, filename);

    sendEvent("progress", {
      current: i + 1,
      total: convertible.length,
      filename,
      message: `変換中: ${filename}`,
    });

    try {
      const ext = extname(filename).toLowerCase();
      let pngBuffer: Buffer;

      if (ext === ".ai") {
        pngBuffer = await convertAiToPng(inputPath, resolution);
      } else if (ext === ".psd") {
        pngBuffer = await convertPsdToPng(inputPath);
      } else {
        throw new Error(`サポートされていない拡張子: ${ext}`);
      }

      // Resize and compress
      const processed = await resizeAndCompress(pngBuffer, maxWidth, maxSizeBytes);

      // Filename validation
      const parseResult = parse(filename);
      let suggestion: string | null = null;
      if (!parseResult) {
        suggestion = suggestCorrection(filename);
      }

      // Write output
      const outputFilename = basename(filename, extname(filename)) + ".png";
      const outputPath = join(outputDir, outputFilename);
      await writeFile(outputPath, processed.buffer);

      // Generate base64 preview (thumbnail)
      const preview = `data:image/png;base64,${processed.buffer.toString("base64")}`;
      const sizeKB = Math.round((processed.buffer.length / 1024) * 10) / 10;

      results.push({
        filename,
        success: true,
        outputPath,
        suggestion,
        preview,
        width: processed.width,
        height: processed.height,
        sizeKB,
      });

      sendEvent("fileComplete", {
        filename,
        success: true,
        width: processed.width,
        height: processed.height,
        sizeKB,
        suggestion,
        preview,
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      results.push({ filename, success: false, error: errorMessage });
      sendEvent("fileComplete", {
        filename,
        success: false,
        error: errorMessage,
      });
    }
  }

  // Summary
  const successCount = results.filter((r) => r.success).length;
  const failureCount = results.filter((r) => !r.success).length;

  sendEvent("done", {
    success: true,
    summary: {
      total: convertible.length,
      successCount,
      failureCount,
      skippedCount: skipped.length,
      outputDir,
    },
    results,
  });

  res.end();
}

/**
 * HTTPサーバーのリクエストハンドラ
 */
async function handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = req.url ?? "/";
  const method = req.method ?? "GET";

  // CORS preflight
  if (method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    res.end();
    return;
  }

  // Routes
  if (url === "/" && method === "GET") {
    // Serve HTML page
    const html = getHtmlPage();
    res.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
    });
    res.end(html);
    return;
  }

  if (url === "/api/convert" && method === "POST") {
    await handleConvert(req, res);
    return;
  }

  if (url === "/api/check-gs" && method === "GET") {
    const installed = await checkGhostscriptInstalled();
    sendJson(res, 200, { installed });
    return;
  }

  if (url === "/api/pick-folder" && method === "GET") {
    // macOSのosascriptでフォルダ選択ダイアログを表示
    const os = platform();
    if (os === "darwin") {
      try {
        const { stdout } = await new Promise<{ stdout: string; stderr: string }>(
          (resolve, reject) => {
            exec(
              'osascript -e \'choose folder with prompt "フォルダを選択してください"\' 2>/dev/null',
              (err, stdout, stderr) => {
                if (err) reject(err);
                else resolve({ stdout, stderr });
              },
            );
          },
        );
        // osascript returns "alias Macintosh HD:Users:..." format, convert to POSIX path
        const aliasPath = stdout.trim();
        if (aliasPath.startsWith("alias ")) {
          const hfsPath = aliasPath.replace("alias ", "").replace(/:/g, "/");
          // Remove volume name prefix and add leading /
          const parts = hfsPath.split("/");
          const posixPath = "/" + parts.slice(1).join("/");
          sendJson(res, 200, { path: posixPath });
        } else {
          sendJson(res, 200, { path: null });
        }
      } catch {
        sendJson(res, 200, { path: null });
      }
    } else {
      // Linux/Windows: フォルダ選択ダイアログはサポートしない（パス手入力で対応）
      sendJson(res, 200, { path: null });
    }
    return;
  }

  // 404
  sendJson(res, 404, { error: "Not found" });
}

// === Start Server ===
const server = createServer((req, res) => {
  handleRequest(req, res).catch((err) => {
    console.error("Server error:", err);
    if (!res.headersSent) {
      sendJson(res, 500, { error: "Internal server error" });
    }
  });
});

server.listen(PORT, () => {
  console.log("");
  console.log("═══════════════════════════════════════════════════════");
  console.log("  start-converter: Web UI モード");
  console.log("═══════════════════════════════════════════════════════");
  console.log(`  URL: http://localhost:${PORT}`);
  console.log("  Ctrl+C で終了");
  console.log("═══════════════════════════════════════════════════════");
  console.log("");

  openBrowser(`http://localhost:${PORT}`);
});
