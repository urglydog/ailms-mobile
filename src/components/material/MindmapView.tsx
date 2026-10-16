import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { buildMermaidHtml, type MermaidDirection } from './mermaidHtml';

export interface MindmapViewHandle {
  /** Yêu cầu WebView xuất sơ đồ thành ảnh PNG (data URL) — kết quả trả qua `onImageExtracted`. */
  requestImage: () => void;
}

interface MindmapViewProps {
  mermaidCode: string;
  direction?: MermaidDirection | null;
  onImageExtracted?: (dataUrl: string | null) => void;
  onReady?: () => void;
}

/** Bản native (iOS/Android thật, Expo Go) — web dùng `MindmapView.web.tsx` thay thế. */
export const MindmapView = forwardRef<MindmapViewHandle, MindmapViewProps>(function MindmapView(
  { mermaidCode, direction, onImageExtracted, onReady },
  ref,
) {
  const webviewRef = useRef<WebView>(null);
  const html = useMemo(() => buildMermaidHtml(mermaidCode, direction ?? undefined), [mermaidCode, direction]);

  useImperativeHandle(ref, () => ({
    requestImage: () => {
      webviewRef.current?.injectJavaScript(`
        (window.__getMindmapPng ? window.__getMindmapPng() : Promise.resolve(null))
          .then(function (dataUrl) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'mm-image', dataUrl: dataUrl }));
          })
          .catch(function () {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'mm-image', dataUrl: null }));
          });
        true;
      `);
    },
  }));

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const parsed = JSON.parse(event.nativeEvent.data);
      if (parsed?.type === 'mm-ready') {
        onReady?.();
      } else if (parsed?.type === 'mm-image') {
        onImageExtracted?.(parsed.dataUrl ?? null);
      }
    } catch {
      // Message không phải JSON hợp lệ — bỏ qua.
    }
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
