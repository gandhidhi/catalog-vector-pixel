// @catalog-vector-pixel/converter
// ローカル変換ツール: .ai/.psd → PNG 変換

export { type ConversionOptions, type ConversionResult, type ConversionSummary } from "./types.js";

// Image processor
export { resizeAndCompress, type ImageProcessorResult, type BackgroundOption } from "./converter/image-processor.js";

// File filter
export { filterConvertibleFiles, type FilterResult } from "./converter/file-filter.js";

// AI converter (Ghostscript)
export { convertAiToPng, checkGhostscriptInstalled } from "./converter/ai-converter.js";

// PSD converter
export { convertPsdToPng } from "./converter/psd-converter.js";

// Filename validator
export {
  parse as parseFilename,
  suggestCorrection,
  type FilenameParseResult,
} from "./validators/filename.js";
