import { useCallback, useEffect } from 'react';
import { useFocusEffect } from 'expo-router';
import { useAudioPlayer } from 'expo-audio';

interface VideoLike {
  playing: boolean;
  currentTime: number;
}

/** Phát giọng lồng tiếng song song video và giữ đồng bộ (không render gì). Tách thành component riêng
 * để chỉ mount ở phía client — `useAudioPlayer` trên web tạo `Audio` (không có khi render server →
 * lỗi "Audio is not defined" khi tải lại trang) — và để đổi ngôn ngữ thì remount theo `key`. */
export function DubAudioSync({ src, video }: { src: string; video: VideoLike }) {
  const dub = useAudioPlayer(src);

  useEffect(() => {
    const id = setInterval(() => {
      try {
        if (video.playing) {
          if (!dub.playing) dub.play();
          // Lệch quá 0.7s (đổi ngôn ngữ giữa chừng, tua video) → kéo giọng về đúng vị trí video.
          if (Math.abs(dub.currentTime - video.currentTime) > 0.7) {
            void dub.seekTo(video.currentTime);
          }
        } else if (dub.playing) {
          dub.pause();
        }
      } catch {
        // Player đã bị giải phóng — bỏ qua.
      }
    }, 300);
    return () => clearInterval(id);
  }, [dub, video]);

  // Rời màn hình (expo-router giữ màn trong stack) thì dừng giọng — video tự pause ở màn cha.
  useFocusEffect(
    useCallback(() => {
      return () => {
        try {
          dub.pause();
        } catch {
          // Đã giải phóng.
        }
      };
    }, [dub]),
  );

  return null;
}
