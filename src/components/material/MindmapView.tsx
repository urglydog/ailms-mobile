import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { buildMermaidHtml, type MermaidDirection } from './mermaidHtml';

export interface MindmapViewHandle {
  requestSvg: () => void;
}

interface MindmapViewProps {
  mermaidCode: string;
  direction?: MermaidDirection | null;
  onSvgExtracted?: (svg: string | null) => void;
  onReady?: () => void;
}

/** Bản native (iOS/Android thật, Expo Go) — web dùng `MindmapView.web.tsx` thay thế. */
export const MindmapView = forwardRef<MindmapViewHandle, MindmapViewProps>(function MindmapView(
  { mermaidCode, direction, onSvgExtracted, onReady },
  ref,
) {
  const webviewRef = useRef<WebView>(null);
  const html = useMemo(() => buildMermaidHtml(mermaidCode, direction ?? undefined), [mermaidCode, direction]);

  useImperativeHandle(ref, () => ({
    requestSvg: () => {
      webviewRef.current?.injectJavaScript(
        "window.ReactNativeWebView.postMessage(window.__getMindmapSvg ? (window.__getMindmapSvg()||'') : ''); true;",
      );
    },
  }));

  const handleMessage = (event: WebViewMessageEvent) => {
    const data = event.nativeEvent.data;
    try {
      const parsed = JSON.parse(data);
      if (parsed?.type === 'mm-ready') {
        onReady?.();
        return;
      }
    } catch {
      // Không phải JSON -> là chuỗi SVG thô trả về từ requestSvg().
    }
    onSvgExtracted?.(data || null);
  };

  return (
    <WebView
      ref={webviewRef}
      source={{ html }}
      style={{ flex: 1 }}
      originWhitelist={['*']}
      onMessage={handleMessage}
    />
  );
});
