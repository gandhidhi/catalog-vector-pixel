/**
 * クライアント側でpdf.jsを使ってPDFの1ページ目からサムネイル（正方形クロップ PNG）を生成する。
 * 管理画面のアップロードフォームで使用。
 *
 * pdfjs-dist はブラウザ専用APIに依存するため、dynamic importで読み込む。
 */

let pdfjsLoaded: typeof import("pdfjs-dist") | null = null;

async function getPdfjs() {
  if (pdfjsLoaded) return pdfjsLoaded;
  const pdfjs = await import("pdfjs-dist");
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc =
      `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
  }
  pdfjsLoaded = pdfjs;
  return pdfjs;
}

/**
 * PDF の File から1ページ目のサムネイルを正方形クロップで生成する。
 *
 * @param pdfFile - PDF の File オブジェクト
 * @param size - 出力する正方形のサイズ（px）。デフォルト: 512
 * @returns サムネイルの PNG Blob
 */
export async function generatePdfThumbnail(
  pdfFile: File,
  size: number = 512,
): Promise<Blob> {
  const pdfjsLib = await getPdfjs();

  const arrayBuffer = await pdfFile.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({
    data: arrayBuffer,
    cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/standard_fonts/`,
    disableFontFace: false,
    useSystemFonts: true,
  });
  const pdf = await loadingTask.promise;
  const page = await pdf.getPage(1);

  // ページの元サイズを取得
  const viewport = page.getViewport({ scale: 1 });

  // 正方形クロップ用: 短辺に合わせてスケーリング
  const shortSide = Math.min(viewport.width, viewport.height);
  const scale = size / shortSide;
  const scaledViewport = page.getViewport({ scale });

  // Canvas にレンダリング（フォント読み込みを待つためOperatorListを先に取得）
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  // 中央クロップ: ページが正方形より大きい方向をオフセットして中央に配置
  const offsetX = (size - scaledViewport.width) / 2;
  const offsetY = (size - scaledViewport.height) / 2;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, size, size);

  await page.render({
    canvasContext: ctx,
    viewport: scaledViewport,
    transform: [1, 0, 0, 1, offsetX, offsetY],
    canvas,
  }).promise;

  // フォントのレンダリングが完全に完了するのを待つ
  await document.fonts.ready;
  // 少し待機してフォント描画を確実にする
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Canvas を PNG Blob に変換
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("サムネイルの生成に失敗しました"));
      },
      "image/png",
      0.9,
    );
  });
}

/**
 * PDF の File からページ数を取得する。
 */
export async function getPdfPageCount(pdfFile: File): Promise<number> {
  const pdfjsLib = await getPdfjs();
  const arrayBuffer = await pdfFile.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({
    data: arrayBuffer,
    cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/cmaps/`,
    cMapPacked: true,
  }).promise;
  return pdf.numPages;
}
