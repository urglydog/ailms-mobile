import { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { buildYouTubeHtml } from '@/components/player/youtubeHtml';
import type { YouTubeController } from '@/components/player/youtubeController';
import { COLORS } from '@/lib/theme/colors';

interface Props {
  controller: YouTubeController;
  youtubeId: string;
  /** Vị trí bắt đầu (giây) khi nạp khung. Màn bài học truyền lại vị trí đang xem dở khi khung được tạo lại (vd sau khi giành lại quyền phát). */
  startSec: number;
}

/** Khung phát YouTube (bản iOS/Android thật, Expo Go). Bản web dùng `YouTubeView.web.tsx`. Mọi thao tác
 * chạm do thanh điều khiển của ứng dụng xử lý, nên khung này không nhận chạm (`pointerEvents="none"`). */
export function YouTubeView({ controller, youtubeId, startSec }: Props) {
  // Chỉ lấy vị trí bắt đầu lúc tạo khung; về sau đổi `startSec` không nạp lại trang YouTube.
  const [initialStart] = useState(startSec);
  const html = useMemo(() => buildYouTubeHtml(youtubeId, initialStart), [youtubeId, initialStart]);
  // Bọc `setView` trong hàm ổn định (không truyền trực tiếp thuộc tính của `controller` vào `ref`).
  const attach = useCallback((view: Parameters<YouTubeController['setView']>[0]) => controller.setView(view), [controller]);

  const handleMessage = (event: WebViewMessageEvent) => {
    controller.handleMessage(event.nativeEvent.data);
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.black, pointerEvents: 'none' }}>
      <WebView
        ref={attach}
        source={{ html, baseUrl: 'https://www.youtube.com' }}
        originWhitelist={['*']}
        onMessage={handleMessage}
        style={{ flex: 1, backgroundColor: COLORS.black }}
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        allowsFullscreenVideo={false}
        scrollEnabled={false}
        bounces={false}
        setSupportMultipleWindows={false}
        androidLayerType="hardware"
      />
    </View>
  );
}
