import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { buildYouTubeHtml } from '@/components/player/youtubeHtml';
import type { YouTubeController } from '@/components/player/youtubeController';
import { COLORS } from '@/lib/theme/colors';

interface Props {
  controller: YouTubeController;
  youtubeId: string;
  /** Vị trí bắt đầu (giây) khi nạp lần đầu; nạp lại giữa chừng thì dùng vị trí đã xem dở của bộ điều khiển. */
  startSec: number;
}

/** Khung phát YouTube (bản iOS/Android thật, Expo Go). Bản web dùng `YouTubeView.web.tsx`. Mọi thao tác
 * chạm do thanh điều khiển của ứng dụng xử lý, nên khung này không nhận chạm (`pointerEvents="none"`). */
export function YouTubeView({ controller, youtubeId, startSec }: Props) {
  const [initialStart] = useState(() => {
    const resume = controller.prepare(youtubeId);
    return resume > 1 ? resume : startSec;
  });
  const html = useMemo(() => buildYouTubeHtml(youtubeId, initialStart), [youtubeId, initialStart]);

  const handleMessage = (event: WebViewMessageEvent) => {
    controller.handleMessage(event.nativeEvent.data);
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.black, pointerEvents: 'none' }}>
      <WebView
        ref={controller.setView}
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
