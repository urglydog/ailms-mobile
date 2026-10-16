import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';

import { buildMermaidHtml, type MermaidDirection } from './mermaidHtml';
import type { MindmapViewHandle } from './MindmapView';

interface MindmapViewProps {
  mermaidCode: string;
  direction?: MermaidDirection | null;
  onSvgExtracted?: (svg: string | null) => void;
  onReady?: () => void;
}

/**
 * Bản web — `react-native-webview` tự báo "does not support this platform" khi Platform.OS ===
 * 'web' (chỉ hỗ trợ iOS/Android thật), nên dùng thẳng `<iframe>` chuẩn web thay thế. Metro tự
 * chọn file này thay vì `MindmapView.tsx` khi build cho web (quy ước `.web.tsx`), không cần
 * check `Platform.OS` thủ công ở nơi gọi.
 *
 * `sandbox="allow-scripts"` (không có `allow-same-origin`) nên không đọc được `contentDocument`
 * trực tiếp — lấy SVG qua `postMessage` hai chiều với script nhúng trong `buildMermaidHtml`.
 */
export const MindmapView = forwardRef<MindmapViewHandle, MindmapViewProps>(function MindmapView(
  { mermaidCode, direction, onSvgExtracted, onReady },
  ref,
) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const html = useMemo(() => buildMermaidHtml(mermaidCode, direction ?? undefined), [mermaidCode, direction]);

  useImperativeHandle(ref, () => ({
    requestSvg: () => {
      iframeRef.current?.contentWindow?.postMessage('mm-get-svg', '*');
    },
  }));

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow) return;
      if (event.data?.type === 'mm-ready') {
        onReady?.();
      } else if (event.data?.type === 'mm-svg') {
        onSvgExtracted?.(event.data.svg ?? null);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [onReady, onSvgExtracted]);

  return <iframe ref={iframeRef} srcDoc={html} style={{ flex: 1, width: '100%', border: 'none' }} sandbox="allow-scripts" />;
});
