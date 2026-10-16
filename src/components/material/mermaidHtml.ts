export type MermaidDirection = 'TB' | 'LR' | 'BT' | 'RL';

/** Áp hướng vẽ sơ đồ — port đúng regex từ `fe/components/materials/MermaidViewer.tsx` (chỉ phần
 * đổi hướng graph/flowchart, không port phần sanitize FISHBONE/MATRIX/bullet-list — không liên quan). */
function applyDirection(mermaidCode: string, direction?: MermaidDirection): string {
  if (!direction) return mermaidCode;
  let code = mermaidCode.replace(/^(graph|flowchart)\s+(TB|TD|BT|RL|LR)/im, `$1 ${direction}`);
  if (!/^(graph|flowchart)\s+(TB|TD|BT|RL|LR)/im.test(code)) {
    code = code.replace(/^(graph|flowchart)/im, `$1 ${direction}`);
  }
  return code;
}

/** HTML dùng chung cho cả 2 bản native (react-native-webview) và web (iframe) — xem
 * `MindmapView.tsx` (native) và `MindmapView.web.tsx` (web, react-native-webview không hỗ trợ
 * nền web — tự báo lỗi "does not support this platform"). */
export function buildMermaidHtml(mermaidCode: string, direction?: MermaidDirection): string {
  const codeToRender = applyDirection(mermaidCode, direction);
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=4, user-scalable=yes" />
        <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
        <style>
          html, body { margin: 0; padding: 0; background: #fff; height: 100%; }
          /* Sơ đồ thường rộng hơn màn hình điện thoại — cho cuộn ngang/dọc thay vì bị mermaid tự
             co nhỏ vừa khung (bug thật 07/10/2026: mặc định hiện bé tí, chữ không đọc được). */
          #wrapper { width: 100%; height: 100vh; overflow: auto; -webkit-overflow-scrolling: touch; }
          #graph { display: inline-block; min-width: 100%; padding: 16px; box-sizing: border-box; }
          /* Ép chiều rộng tối thiểu để chữ trong node luôn đọc được, bất kể màn hình bé cỡ nào —
             cùng tinh thần bản Web (MermaidViewer.tsx: width/height=100%, bỏ max-width mermaid
             tự thêm, preserveAspectRatio=xMidYMid-meet) nhưng thêm min-width vì mobile không có
             chuột cuộn ngang sẵn như desktop. */
          #graph svg { min-width: 700px; height: auto !important; max-width: none !important; }
        </style>
      </head>
      <body>
        <div id="wrapper">
          <pre class="mermaid" id="graph">${codeToRender.replace(/</g, '&lt;')}</pre>
        </div>
        <script>
          mermaid.initialize({ startOnLoad: true, theme: 'default' });

          /* Lấy SVG đã vẽ xong, chèn style inline tối giản (bản rút gọn của web's
             handleDownloadSVG) để xuất ra file xem độc lập vẫn đúng màu/nét, không bị mất style
             khi mở ngoài WebView/trình duyệt. */
          window.__getMindmapSvg = function () {
            var svg = document.querySelector('#graph svg');
            if (!svg) return null;
            var clone = svg.cloneNode(true);
            clone.removeAttribute('style');
            var styleEl = document.createElementNS('http://www.w3.org/2000/svg', 'style');
            styleEl.textContent = '* { font-family: sans-serif; } text { fill: #000000; } ' +
              '.node rect, .node circle, .node ellipse, .node polygon, .node path { fill: #ffffff; stroke: #52525b; stroke-width: 1px; } ' +
              '.edgePath .path { stroke: #a1a1aa; stroke-width: 1.5px; } marker path { fill: #a1a1aa; stroke: none; }';
            clone.insertBefore(styleEl, clone.firstChild);
            var rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('width', '100%');
            rect.setAttribute('height', '100%');
            rect.setAttribute('fill', '#ffffff');
            clone.insertBefore(rect, clone.firstChild);
            return new XMLSerializer().serializeToString(clone);
          };

          function notifyReady() {
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'mm-ready' }));
            } else if (window.parent) {
              window.parent.postMessage({ type: 'mm-ready' }, '*');
            }
          }

          var observer = new MutationObserver(function () {
            var svg = document.querySelector('#graph svg');
            if (svg) {
              svg.removeAttribute('style');
              svg.setAttribute('width', '100%');
              svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
              observer.disconnect();
              notifyReady();
            }
          });
          observer.observe(document.getElementById('graph'), { childList: true, subtree: true });

          // Chỉ dùng cho bản web (iframe) — native (WebView) gọi window.__getMindmapSvg() trực
          // tiếp qua injectJavaScript, không cần roundtrip qua 'message'.
          window.addEventListener('message', function (e) {
            if (e.data === 'mm-get-svg') {
              var svg = window.__getMindmapSvg();
              if (window.parent) window.parent.postMessage({ type: 'mm-svg', svg: svg }, '*');
            }
          });
        </script>
      </body>
    </html>
  `;
}
