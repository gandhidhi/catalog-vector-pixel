/**
 * Web UI ページ（自己完結型HTML）
 * インラインCSS/JSでブラウザGUIを提供する
 */
export function getHtmlPage(): string {
  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>convert-works - Web UI</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Hiragino Sans", sans-serif;
      background: #f5f5f7;
      color: #1d1d1f;
      min-height: 100vh;
      padding: 2rem;
    }
    .container { max-width: 900px; margin: 0 auto; }
    h1 {
      font-size: 1.5rem;
      font-weight: 600;
      margin-bottom: 0.5rem;
    }
    .subtitle {
      color: #6e6e73;
      font-size: 0.9rem;
      margin-bottom: 2rem;
    }
    .card {
      background: white;
      border-radius: 12px;
      padding: 1.5rem;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
      margin-bottom: 1.5rem;
    }
    .card h2 {
      font-size: 1rem;
      font-weight: 600;
      margin-bottom: 1rem;
      color: #1d1d1f;
    }
    .form-group {
      margin-bottom: 1rem;
    }
    .form-group label {
      display: block;
      font-size: 0.85rem;
      font-weight: 500;
      color: #6e6e73;
      margin-bottom: 0.3rem;
    }
    .form-group input {
      width: 100%;
      padding: 0.6rem 0.8rem;
      border: 1px solid #d2d2d7;
      border-radius: 8px;
      font-size: 0.9rem;
      outline: none;
      transition: border-color 0.2s;
    }
    .form-group input:focus {
      border-color: #0071e3;
    }
    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.7rem 1.5rem;
      border: none;
      border-radius: 8px;
      font-size: 0.9rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-primary {
      background: #0071e3;
      color: white;
    }
    .btn-primary:hover { background: #0077ed; }
    .btn-primary:disabled {
      background: #d2d2d7;
      cursor: not-allowed;
    }
    .progress-section { display: none; }
    .progress-section.active { display: block; }
    .progress-bar-container {
      background: #e8e8ed;
      border-radius: 4px;
      height: 6px;
      margin: 0.8rem 0;
      overflow: hidden;
    }
    .progress-bar {
      background: #0071e3;
      height: 100%;
      width: 0%;
      transition: width 0.3s ease;
      border-radius: 4px;
    }
    .progress-text {
      font-size: 0.85rem;
      color: #6e6e73;
    }
    .progress-filename {
      font-size: 0.85rem;
      color: #1d1d1f;
      font-weight: 500;
      margin-top: 0.3rem;
    }
    .log {
      max-height: 200px;
      overflow-y: auto;
      background: #f5f5f7;
      border-radius: 8px;
      padding: 0.8rem;
      margin-top: 0.8rem;
      font-size: 0.8rem;
      font-family: "SF Mono", Monaco, monospace;
    }
    .log-entry { margin-bottom: 0.3rem; }
    .log-entry.success { color: #34c759; }
    .log-entry.error { color: #ff3b30; }
    .log-entry.warning { color: #ff9500; }
    .log-entry.info { color: #6e6e73; }
    .summary-section { display: none; }
    .summary-section.active { display: block; }
    .summary-stats {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1rem;
      margin-bottom: 1rem;
    }
    .stat-card {
      text-align: center;
      padding: 1rem;
      background: #f5f5f7;
      border-radius: 8px;
    }
    .stat-value {
      font-size: 1.5rem;
      font-weight: 700;
    }
    .stat-value.success { color: #34c759; }
    .stat-value.failure { color: #ff3b30; }
    .stat-value.skipped { color: #ff9500; }
    .stat-label {
      font-size: 0.75rem;
      color: #6e6e73;
      margin-top: 0.2rem;
    }
    .preview-section { display: none; }
    .preview-section.active { display: block; }
    .preview-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      gap: 1rem;
    }
    .preview-item {
      background: #f5f5f7;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid #e8e8ed;
    }
    .preview-item img {
      width: 100%;
      height: 120px;
      object-fit: contain;
      background: #fff;
      padding: 0.3rem;
    }
    .preview-item .preview-info {
      padding: 0.5rem;
      font-size: 0.75rem;
    }
    .preview-item .preview-filename {
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .preview-item .preview-meta {
      color: #6e6e73;
      margin-top: 0.2rem;
    }
    .preview-item.error-item {
      border-color: #ff3b30;
    }
    .preview-item.error-item .preview-info {
      color: #ff3b30;
    }
    .error-banner {
      display: none;
      background: #fff2f0;
      border: 1px solid #ffccc7;
      border-radius: 8px;
      padding: 1rem;
      margin-bottom: 1rem;
      color: #ff3b30;
      font-size: 0.85rem;
    }
    .error-banner.active { display: block; }
    .gs-status {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      font-size: 0.8rem;
      padding: 0.3rem 0.6rem;
      border-radius: 12px;
      margin-bottom: 1rem;
    }
    .gs-status.ok { background: #e8f8ef; color: #34c759; }
    .gs-status.ng { background: #fff2f0; color: #ff3b30; }
    .gs-status.checking { background: #f5f5f7; color: #6e6e73; }
  </style>
</head>
<body>
  <div class="container">
    <h1>convert-works</h1>
    <p class="subtitle">.ai / .psd → PNG 変換ツール (Web UI)</p>

    <div id="gsStatus" class="gs-status checking">⏳ Ghostscript確認中...</div>

    <div class="card">
      <h2>変換設定</h2>
      <div id="errorBanner" class="error-banner"></div>
      <form id="convertForm">
        <div class="form-group">
          <label for="inputDir">入力フォルダパス</label>
          <input type="text" id="inputDir" placeholder="/Users/your-name/Desktop/submissions" required>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="assignment">課題番号 (任意)</label>
            <input type="number" id="assignment" min="1" max="7" placeholder="例: 1">
          </div>
          <div class="form-group">
            <label for="outputDir">出力フォルダ (任意)</label>
            <input type="text" id="outputDir" placeholder="デフォルト: 入力フォルダ/converted">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="maxSize">最大ファイルサイズ (KB)</label>
            <input type="number" id="maxSize" value="500" min="100">
          </div>
          <div class="form-group">
            <label for="maxWidth">最大長辺 (px)</label>
            <input type="number" id="maxWidth" value="1280" min="100">
          </div>
        </div>
        <button type="submit" class="btn btn-primary" id="submitBtn">変換開始</button>
      </form>
    </div>

    <div class="card progress-section" id="progressSection">
      <h2>変換進捗</h2>
      <div class="progress-text" id="progressText">準備中...</div>
      <div class="progress-bar-container">
        <div class="progress-bar" id="progressBar"></div>
      </div>
      <div class="progress-filename" id="progressFilename"></div>
      <div class="log" id="logArea"></div>
    </div>

    <div class="card summary-section" id="summarySection">
      <h2>変換結果サマリー</h2>
      <div class="summary-stats">
        <div class="stat-card">
          <div class="stat-value success" id="statSuccess">0</div>
          <div class="stat-label">成功</div>
        </div>
        <div class="stat-card">
          <div class="stat-value failure" id="statFailure">0</div>
          <div class="stat-label">失敗</div>
        </div>
        <div class="stat-card">
          <div class="stat-value skipped" id="statSkipped">0</div>
          <div class="stat-label">スキップ</div>
        </div>
      </div>
      <div id="outputDirDisplay" style="font-size:0.85rem;color:#6e6e73;"></div>
    </div>

    <div class="card preview-section" id="previewSection">
      <h2>変換済みPNG プレビュー</h2>
      <div class="preview-grid" id="previewGrid"></div>
    </div>
  </div>

  <script>
    const form = document.getElementById('convertForm');
    const submitBtn = document.getElementById('submitBtn');
    const progressSection = document.getElementById('progressSection');
    const progressText = document.getElementById('progressText');
    const progressBar = document.getElementById('progressBar');
    const progressFilename = document.getElementById('progressFilename');
    const logArea = document.getElementById('logArea');
    const summarySection = document.getElementById('summarySection');
    const previewSection = document.getElementById('previewSection');
    const previewGrid = document.getElementById('previewGrid');
    const errorBanner = document.getElementById('errorBanner');
    const gsStatus = document.getElementById('gsStatus');

    // Check Ghostscript on page load
    (async () => {
      try {
        const res = await fetch('/api/check-gs');
        const data = await res.json();
        if (data.installed) {
          gsStatus.className = 'gs-status ok';
          gsStatus.textContent = '✓ Ghostscript インストール済み';
        } else {
          gsStatus.className = 'gs-status ng';
          gsStatus.textContent = '✗ Ghostscript 未インストール';
        }
      } catch {
        gsStatus.className = 'gs-status ng';
        gsStatus.textContent = '✗ サーバー接続エラー';
      }
    })();

    function addLog(message, type) {
      const entry = document.createElement('div');
      entry.className = 'log-entry ' + (type || 'info');
      entry.textContent = message;
      logArea.appendChild(entry);
      logArea.scrollTop = logArea.scrollHeight;
    }

    function showError(message) {
      errorBanner.textContent = message;
      errorBanner.classList.add('active');
    }

    function hideError() {
      errorBanner.classList.remove('active');
    }

    function addPreviewItem(data) {
      const item = document.createElement('div');
      item.className = 'preview-item' + (data.success ? '' : ' error-item');

      if (data.success && data.preview) {
        item.innerHTML =
          '<img src="' + data.preview + '" alt="' + data.filename + '">' +
          '<div class="preview-info">' +
            '<div class="preview-filename" title="' + data.filename + '">' + data.filename + '</div>' +
            '<div class="preview-meta">' + data.width + '×' + data.height + ' / ' + data.sizeKB + ' KB</div>' +
            (data.suggestion ? '<div class="preview-meta" style="color:#ff9500">候補: ' + data.suggestion + '</div>' : '') +
          '</div>';
      } else {
        item.innerHTML =
          '<div style="height:120px;display:flex;align-items:center;justify-content:center;background:#fff2f0;">✗</div>' +
          '<div class="preview-info">' +
            '<div class="preview-filename" title="' + data.filename + '">' + data.filename + '</div>' +
            '<div class="preview-meta">' + (data.error || 'エラー') + '</div>' +
          '</div>';
      }

      previewGrid.appendChild(item);
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideError();

      const inputDir = document.getElementById('inputDir').value.trim();
      if (!inputDir) {
        showError('入力フォルダパスを入力してください');
        return;
      }

      const body = {
        inputDir,
        outputDir: document.getElementById('outputDir').value.trim() || undefined,
        maxSize: parseInt(document.getElementById('maxSize').value) || 500,
        maxWidth: parseInt(document.getElementById('maxWidth').value) || 1280,
        assignment: parseInt(document.getElementById('assignment').value) || undefined,
      };

      // Reset UI
      submitBtn.disabled = true;
      submitBtn.textContent = '変換中...';
      progressSection.classList.add('active');
      summarySection.classList.remove('active');
      previewSection.classList.remove('active');
      previewGrid.innerHTML = '';
      logArea.innerHTML = '';
      progressBar.style.width = '0%';
      progressText.textContent = '準備中...';
      progressFilename.textContent = '';

      try {
        const response = await fetch('/api/convert', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        if (!response.ok && !response.headers.get('content-type')?.includes('text/event-stream')) {
          const err = await response.json();
          showError(err.error || '変換リクエストに失敗しました');
          submitBtn.disabled = false;
          submitBtn.textContent = '変換開始';
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\\n');
          buffer = lines.pop() || '';

          let currentEvent = '';
          for (const line of lines) {
            if (line.startsWith('event: ')) {
              currentEvent = line.slice(7);
            } else if (line.startsWith('data: ')) {
              const data = JSON.parse(line.slice(6));
              handleEvent(currentEvent, data);
            }
          }
        }
      } catch (err) {
        showError('通信エラー: ' + err.message);
      }

      submitBtn.disabled = false;
      submitBtn.textContent = '変換開始';
    });

    function handleEvent(event, data) {
      switch (event) {
        case 'status':
          addLog(data.message, 'info');
          progressText.textContent = data.message;
          break;

        case 'progress':
          if (data.total > 0) {
            const pct = Math.round((data.current / data.total) * 100);
            progressBar.style.width = pct + '%';
            progressText.textContent = data.current + ' / ' + data.total + ' (' + pct + '%)';
          }
          if (data.filename) {
            progressFilename.textContent = data.filename;
          }
          break;

        case 'fileComplete':
          if (data.success) {
            addLog('✓ ' + data.filename + ' (' + data.width + '×' + data.height + ', ' + data.sizeKB + 'KB)', 'success');
          } else {
            addLog('✗ ' + data.filename + ': ' + data.error, 'error');
          }
          // Show preview
          previewSection.classList.add('active');
          addPreviewItem(data);
          break;

        case 'skipped':
          for (const f of data.files) {
            addLog('⊘ スキップ: ' + f, 'warning');
          }
          break;

        case 'error':
          addLog('ERROR: ' + data.message, 'error');
          if (data.details) {
            addLog(data.details, 'info');
          }
          showError(data.message);
          break;

        case 'done':
          if (data.summary) {
            summarySection.classList.add('active');
            document.getElementById('statSuccess').textContent = data.summary.successCount;
            document.getElementById('statFailure').textContent = data.summary.failureCount;
            document.getElementById('statSkipped').textContent = data.summary.skippedCount;
            document.getElementById('outputDirDisplay').textContent = '出力先: ' + data.summary.outputDir;
          }
          progressText.textContent = '変換完了';
          progressBar.style.width = '100%';
          progressFilename.textContent = '';
          break;
      }
    }
  </script>
</body>
</html>`;
}
