import { useMemo } from 'react';

import { buildMermaidHtml } from './mermaidHtml';

/**
 * Bản web — `react-native-webview` tự báo "does not support this platform" khi Platform.OS ===
 * 'web' (chỉ hỗ trợ iOS/Android thật), nên dùng thẳng `<iframe>` chuẩn web thay thế. Metro tự
 * chọn file này thay vì `MindmapView.tsx` khi build cho web (quy ước `.web.tsx`), không cần
 * check `Platform.OS` thủ công ở nơi gọi.
 */
export function MindmapView({ mermaidCode }: { mermaidCode: string }) {
  const html = useMemo(() => buildMermaidHtml(mermaidCode), [mermaidCode]);
  return <iframe srcDoc={html} style={{ flex: 1, width: '100%', border: 'none' }} sandbox="allow-scripts" />;
}
