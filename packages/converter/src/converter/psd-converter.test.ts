import { describe, it, expect } from "vitest";
import { writeFile, mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import sharp from "sharp";
import { convertPsdToPng } from "./psd-converter.js";

describe("convertPsdToPng", () => {
  let tempDir: string;

  async function setup() {
    tempDir = await mkdtemp(join(tmpdir(), "psd-converter-test-"));
    return tempDir;
  }

  async function cleanup() {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  }

  it("converts a valid image file using sharp path", async () => {
    await setup();
    try {
      // Create a PNG file to simulate sharp being able to read it
      // (sharp can read PSD through libvips, but also read PNG/TIFF/etc)
      const testImage = await sharp({
        create: {
          width: 100,
          height: 80,
          channels: 4,
          background: { r: 255, g: 0, b: 0, alpha: 1 },
        },
      })
        .png()
        .toBuffer();

      const inputPath = join(tempDir, "test.png");
      await writeFile(inputPath, testImage);

      const result = await convertPsdToPng(inputPath);

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);

      // Verify the output is valid PNG by reading metadata with sharp
      const metadata = await sharp(result).metadata();
      expect(metadata.format).toBe("png");
      expect(metadata.width).toBe(100);
      expect(metadata.height).toBe(80);
    } finally {
      await cleanup();
    }
  });

  it("throws error for non-existent file", async () => {
    await expect(
      convertPsdToPng("/nonexistent/path/file.psd"),
    ).rejects.toThrow();
  });

  it("throws error for invalid file content", async () => {
    await setup();
    try {
      const invalidPath = join(tempDir, "invalid.psd");
      await writeFile(invalidPath, Buffer.from("not a valid psd file"));

      await expect(convertPsdToPng(invalidPath)).rejects.toThrow();
    } finally {
      await cleanup();
    }
  });

  it("returns PNG buffer with correct dimensions for TIFF input (libvips supported)", async () => {
    await setup();
    try {
      // Create a TIFF image to test sharp path with a non-PNG format
      const testImage = await sharp({
        create: {
          width: 200,
          height: 150,
          channels: 4,
          background: { r: 0, g: 128, b: 255, alpha: 1 },
        },
      })
        .tiff()
        .toBuffer();

      const inputPath = join(tempDir, "test.tiff");
      await writeFile(inputPath, testImage);

      const result = await convertPsdToPng(inputPath);

      expect(result).toBeInstanceOf(Buffer);

      const metadata = await sharp(result).metadata();
      expect(metadata.format).toBe("png");
      expect(metadata.width).toBe(200);
      expect(metadata.height).toBe(150);
    } finally {
      await cleanup();
    }
  });
});
