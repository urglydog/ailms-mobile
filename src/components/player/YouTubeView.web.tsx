import type { YouTubeController } from '@/components/player/youtubeController';

interface Props {
  controller: YouTubeController;
  youtubeId: string;
  startSec: number;
}

/** Bản web: `react-native-webview` không chạy trên web nên không nhúng ở đây; màn hình bài học tự hiện nút mở YouTube. */
export function YouTubeView(_props: Props) {
  return null;
}
