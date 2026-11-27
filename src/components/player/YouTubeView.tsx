import { useCallback, useMemo, useState } from 'react';
import { Platform, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { buildYouTubeHtml } from '@/components/player/youtubeHtml';
import type { YouTubeController } from '@/components/player/youtubeController';
import { COLORS } from '@/lib/theme/colors';
import { WEB_URL } from '@/lib/webUrl';

// WebView mặc định có chuỗi nhận diện khác trình duyệt thật; YouTube có thể phát chế độ chỉ tiếng cho kiểu đó. Dùng chuỗi của Safari/Chrome di động.
const IOS_SAFARI_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const ANDROID_CHROME_UA =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36';

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
    <View style={{ flex: 1, backgroundColor: COLORS.black }}>
      <WebView
        ref={attach}
        source={{ html, baseUrl: WEB_URL }}
        originWhitelist={['*']}
        onMessage={handleMessage}
        style={{ flex: 1, backgroundColor: COLORS.black }}
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        userAgent={Platform.OS === 'ios' ? IOS_SAFARI_UA : ANDROID_CHROME_UA}
        allowsFullscreenVideo={false}
        scrollEnabled={false}
        bounces={false}
        setSupportMultipleWindows={false}
        androidLayerType="hardware"
      />
    </View>
  );
}
