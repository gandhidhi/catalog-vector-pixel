import { describe, it, expect } from "vitest";
import sharp from "sharp";
import { resizeAndCompress } from "./image-processor.js";

async function createTestImage(width: number, height: number): Promise<Buffer> {
  return sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 128, g: 64, b: 192, alpha: 1 },
    },
  })
    .png()
    .toBuffer();
}

describe("resizeAndCompress", () => {
  it("does not resize when image is already within bounds", async () => {
    const input = await createTestImage(800, 600);
    const result = await resizeAndCompress(input, 1280, 512_000);

    expect(result.width).toBe(800);
    expect(result.height).toBe(600);
    expect(result.buffer.length).toBeGreaterThan(0);
  });

  it("resizes landscape image when width exceeds maxLongSide", async () => {
    const input = await createTestImage(2560, 1440);
    const result = await resizeAndCompress(input, 1280, 512_000);

    expect(result.width).toBe(1280);
    // Aspect ratio preserved: 1440/2560 * 1280 = 720
    expect(result.height).toBe(720);
  });

  it("resizes portrait image when height exceeds maxLongSide", async () => {
    const input = await createTestImage(1440, 2560);
    const result = await resizeAndCompress(input, 1280, 512_000);

    expect(result.height).toBe(1280);
    // Aspect ratio preserved: 1440/2560 * 1280 = 720
    expect(result.width).toBe(720);
  });

  it("maintains aspect ratio within 1px tolerance", async () => {
    const input = await createTestImage(3000, 2000);
    const result = await resizeAndCompress(input, 1280, 512_000);

    const originalRatio = 3000 / 2000;
    const resultRatio = result.width / result.height;
    expect(Math.abs(originalRatio - resultRatio)).toBeLessThanOrEqual(0.01);
  });

  it("returns output under maxSizeBytes", async () => {
    const input = await createTestImage(1280, 1280);
    const result = await resizeAndCompress(input, 1280, 512_000);

    expect(result.buffer.length).toBeLessThanOrEqual(512_000);
  });

  it("handles square images", async () => {
    const input = await createTestImage(2000, 2000);
    const result = await resizeAndCompress(input, 1280, 512_000);

    expect(result.width).toBe(1280);
    expect(result.height).toBe(1280);
  });

  it("uses custom maxLongSide parameter", async () => {
    const input = await createTestImage(2000, 1000);
    const result = await resizeAndCompress(input, 800, 512_000);

    expect(result.width).toBe(800);
    expect(result.height).toBe(400);
  });
});
