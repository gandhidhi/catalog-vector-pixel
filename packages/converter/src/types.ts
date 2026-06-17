export interface ConversionOptions {
  inputDir: string;
  outputDir: string;
  assignment: number;
  maxLongSide: number;
  maxSizeBytes: number;
}

export interface ConversionResult {
  success: boolean;
  inputPath: string;
  outputPath?: string;
  outputSize?: number;
  width?: number;
  height?: number;
  error?: string;
  durationMs: number;
}

export interface ConversionSummary {
  totalFiles: number;
  successCount: number;
  failureCount: number;
  skippedCount: number;
  outputDir: string;
  results: ConversionResult[];
  skipped: { filename: string; reason: string }[];
}
