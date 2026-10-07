/** HTML dùng chung cho cả 2 bản native (react-native-webview) và web (iframe) — xem
 * `MindmapView.tsx` (native) và `MindmapView.web.tsx` (web, react-native-webview không hỗ trợ
 * nền web — tự báo lỗi "does not support this platform"). */
export function buildMermaidHtml(mermaidCode: string): string {
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
          <pre class="mermaid" id="graph">${mermaidCode.replace(/</g, '&lt;')}</pre>
        </div>
        <script>
          mermaid.initialize({ startOnLoad: true, theme: 'default' });
          var observer = new MutationObserver(function () {
            var svg = document.querySelector('#graph svg');
            if (svg) {
              svg.removeAttribute('style');
              svg.setAttribute('width', '100%');
              svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
              observer.disconnect();
            }
          });
          observer.observe(document.getElementById('graph'), { childList: true, subtree: true });
        </script>
      </body>
    </html>
  `;
}
