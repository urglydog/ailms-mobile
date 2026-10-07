import { useMemo } from 'react';
import { WebView } from 'react-native-webview';

import { buildMermaidHtml } from './mermaidHtml';

/** Bản native (iOS/Android thật, Expo Go) — web dùng `MindmapView.web.tsx` thay thế. */
export function MindmapView({ mermaidCode }: { mermaidCode: string }) {
  const html = useMemo(() => buildMermaidHtml(mermaidCode), [mermaidCode]);
  return <WebView source={{ html }} style={{ flex: 1 }} originWhitelist={['*']} />;
}
