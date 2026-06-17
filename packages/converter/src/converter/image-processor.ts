import sharp from "sharp";

export interface ImageProcessorResult {
  buffer: Buffer;
  width: number;
  height: number;
}

export type BackgroundOption = "transparent" | "white";

/**
 * sharpによる画像リサイズ＋圧縮処理
 * - 長辺が maxLongSide を超える場合、アスペクト比を維持してリサイズ
 * - PNG圧縮で maxSizeBytes 以下に収める
 * - background: "white" の場合、透過部分を白背景に合成する
 */
export async function resizeAndCompress(
  input: Buffer,
  maxLongSide: number = 1280,
  maxSizeBytes: number = 512_000,
  background: BackgroundOption = "transparent",
): Promise<ImageProcessorResult> {
  let pipeline = sharp(input);
  const metadata = await pipeline.metadata();

  const originalWidth = metadata.width ?? 0;
  const originalHeight = metadata.height ?? 0;

  // 白背景合成: 透過PNGの背景を白にする
  if (background === "white") {
    pipeline = pipeline.flatten({ background: { r: 255, g: 255, b: 255 } });
  }

  // 長辺がmaxLongSideを超える場合のみリサイズ
  const longSide = Math.max(originalWidth, originalHeight);
  if (longSide > maxLongSide) {
    if (originalWidth >= originalHeight) {
      pipeline = pipeline.resize({ width: maxLongSide, withoutEnlargement: true });
    } else {
      pipeline = pipeline.resize({ height: maxLongSide, withoutEnlargement: true });
    }
  }

  // 段階的PNG圧縮: compressionLevel 6→9, effort上げていく
  let compressionLevel = 6;
  let result = await pipeline
    .png({ compressionLevel, effort: 7 })
    .toBuffer({ resolveWithObject: true });

  // 圧縮がまだ足りない場合、段階的に圧縮レベルを上げる
  while (result.info.size > maxSizeBytes && compressionLevel < 9) {
    compressionLevel++;
    result = await pipeline
      .png({ compressionLevel, effort: 10 })
      .toBuffer({ resolveWithObject: true });
  }

  // まだサイズオーバーの場合、colorsを減らす（palette mode）
  if (result.info.size > maxSizeBytes) {
    let colors = 256;
    while (result.info.size > maxSizeBytes && colors > 16) {
      colors = Math.floor(colors * 0.7);
      result = await pipeline
        .png({ compressionLevel: 9, effort: 10, palette: true, colours: colors })
        .toBuffer({ resolveWithObject: true });
    }
  }

  // 最終手段: 画像サイズを段階的に縮小
  if (result.info.size > maxSizeBytes) {
    let scale = 0.9;
    while (result.info.size > maxSizeBytes && scale > 0.3) {
      const targetWidth = Math.round(result.info.width * scale);
      result = await sharp(input)
        .resize({ width: targetWidth, withoutEnlargement: true })
        .png({ compressionLevel: 9, effort: 10 })
        .toBuffer({ resolveWithObject: true });
      scale -= 0.1;
    }
  }

  return {
    buffer: result.data,
    width: result.info.width,
    height: result.info.height,
  };
}
