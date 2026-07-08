import { readFile } from "node:fs/promises";
import sharp from "sharp";
import { readPsd, initializeCanvas } from "ag-psd";
import { createCanvas, Image } from "canvas";

// ag-psd にNode.js用Canvas実装を渡す
// eslint-disable-next-line @typescript-eslint/no-explicit-any
initializeCanvas(
  (width: number, height: number) => createCanvas(width, height) as any,
  (data: Uint8Array) => {
    const img = new Image();
    img.src = Buffer.from(data);
    return img as any;
  },
);

/**
 * PSDファイルをPNG Bufferに変換する
 *
 * 変換戦略:
 * 1. sharpで直接PSDを読み込みPNG変換（libvipsがPSDをサポートしている場合）
 * 2. 失敗時はag-psdでPSDを解析し、compositeイメージデータからsharpでPNG変換
 */
export async function convertPsdToPng(inputPath: string): Promise<Buffer> {
  // まずsharpで直接変換を試みる（シンプルで高速）
  try {
    const buffer = await sharp(inputPath).png().toBuffer();
    return buffer;
  } catch {
    // sharpで読めない場合はag-psdにフォールバック
  }

  // ag-psd + sharp による変換
  const fileBuffer = await readFile(inputPath);
  const psd = readPsd(fileBuffer, { useImageData: true });

  if (!psd.imageData) {
    throw new Error(
      `PSDファイルからイメージデータを取得できませんでした: ${inputPath}`,
    );
  }

  const { width, height } = psd;
  if (!width || !height) {
    throw new Error(
      `PSDファイルのサイズ情報が不正です: ${inputPath}`,
    );
  }

  // imageData.data は RGBA の Uint8ClampedArray
  const rawPixelData = Buffer.from(psd.imageData.data.buffer);

  const pngBuffer = await sharp(rawPixelData, {
    raw: {
      width,
      height,
      channels: 4,
    },
  })
    .png()
    .toBuffer();

  return pngBuffer;
}
