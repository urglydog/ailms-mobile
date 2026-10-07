/** HTML dùng chung cho cả 2 bản native (react-native-webview) và web (iframe) — xem
 * `MindmapView.tsx` (native) và `MindmapView.web.tsx` (web, react-native-webview không hỗ trợ
 * nền web — tự báo lỗi "does not support this platform"). */
export function buildMermaidHtml(mermaidCode: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=3" />
        <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
        <style>
          body { margin: 0; padding: 16px; background: #fff; }
          #graph { display: flex; justify-content: center; }
        </style>
      </head>
      <body>
        <pre class="mermaid" id="graph">${mermaidCode.replace(/</g, '&lt;')}</pre>
        <script>
          mermaid.initialize({ startOnLoad: true, theme: 'default' });
        </script>
      </body>
    </html>
  `;
}
