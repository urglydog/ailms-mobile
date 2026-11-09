import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import type { VideoPlayer } from 'expo-video';
import type { AudioTrack } from '@/types/lesson';

/** Chu kỳ kiểm tra (ms) và ngưỡng lệch (giây) — cổng từ `fe/hooks/useDualPlayerSync.ts` (web 0,2s;
 * mobile 0,6s vì player native báo `currentTime` thô hơn, ngưỡng chặt sẽ liên tục tua → lặp câu). */
const SYNC_INTERVAL_MS = 250;
const DRIFT_TOLERANCE_SEC = 0.6;
/** Giữa 2 lần tự tua giọng tối thiểu (ms) — chống vòng lặp "tua → chưa kịp cập nhật → tua tiếp". */
const MIN_SEEK_GAP_MS = 1500;

/** Chọn file giọng + mốc offset theo `BR-CHUNK-05` (giống `resolveAudio` của `fe` DualPlayer). */
function resolveAudio(track: AudioTrack, sec: number): { src: string | null; offsetSec: number } {
  if (track.finalUrl) return { src: track.finalUrl, offsetSec: 0 };
  const chunk = track.chunks.find((c) => sec >= c.startSec && sec < c.endSec) ?? track.chunks[0];
  return { src: chunk?.fileUrl ?? null, offsetSec: chunk?.startSec ?? 0 };
}

function silence(video: VideoPlayer) {
  try {
    video.muted = true;
  } catch {
    // Player đã giải phóng.
  }
}

function applyMuted(dub: { muted: boolean }, muted: boolean) {
  try {
    dub.muted = muted;
  } catch {
    // Player đã giải phóng.
  }
}

/**
 * Phát giọng lồng tiếng bám theo video (không render gì) — cổng từ `fe` `useDualPlayerSync`:
 *  - video luôn câm, mọi âm thanh đến từ giọng lồng tiếng (nghe giọng gốc = chọn "Âm thanh gốc");
 *  - mỗi 250ms so TRẠNG THÁI THẬT của giọng với video: video phát mà giọng chưa phát thì phát lại
 *    (web đặt `playing=true` ngay khi gọi `play()` dù trình duyệt có thể từ chối → không thể tin cờ
 *    `playing`, phải đọc `currentStatus`); video dừng thì dừng giọng; chỉ tua khi lệch quá ngưỡng.
 * Tách component riêng để chỉ mount phía client (`Audio` không tồn tại khi render server web) và
 * để đổi ngôn ngữ thì remount theo `key`.
 */
export function DubAudioSync({ track, video, muted }: { track: AudioTrack; video: VideoPlayer; muted: boolean }) {
  const [resolved, setResolved] = useState(() => resolveAudio(track, video.currentTime));
  const dub = useAudioPlayer(resolved.src);

  const offsetRef = useRef(resolved.offsetSec);
  useEffect(() => {
    offsetRef.current = resolved.offsetSec;
  }, [resolved.offsetSec]);
  const lastSeekAtRef = useRef(0);
  const warnedRef = useRef(false);

  // iOS: mặc định công tắc im lặng của máy chặn mọi âm thanh app → phải bật `playsInSilentMode`.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
  }, []);

  useEffect(() => {
    applyMuted(dub, muted);
  }, [dub, muted]);

  useEffect(() => {
    let playingSince = 0;
    const id = setInterval(() => {
      try {
        silence(video); // video luôn câm khi đang lồng tiếng

        const status = dub.currentStatus;
        if (!video.playing) {
          playingSince = 0;
          if (status.playing) dub.pause();
          return;
        }
        if (!playingSince) playingSince = Date.now();

        const next = resolveAudio(track, video.currentTime);
        if (next.src !== resolved.src) {
          setResolved(next);
          return;
        }

        if (!status.playing) dub.play();
        if (Math.abs(dub.playbackRate - video.playbackRate) > 0.01) dub.setPlaybackRate(video.playbackRate);

        const target = Math.max(0, video.currentTime - offsetRef.current);
        if (Math.abs(target - status.currentTime) > DRIFT_TOLERANCE_SEC && Date.now() - lastSeekAtRef.current > MIN_SEEK_GAP_MS) {
          void dub.seekTo(target);
          lastSeekAtRef.current = Date.now();
        }

        // Chẩn đoán: video đã phát >4s mà giọng vẫn chưa tải/phát được → báo 1 lần để dễ truy.
        if (!warnedRef.current && Date.now() - playingSince > 4000 && (!status.isLoaded || !status.playing)) {
          warnedRef.current = true;
          console.warn('[DubAudioSync] giọng lồng tiếng chưa phát sau 4s', { src: resolved.src, status });
        }
      } catch {
        // Player đã giải phóng — bỏ qua.
      }
    }, SYNC_INTERVAL_MS);
    return () => clearInterval(id);
  }, [dub, video, track, resolved.src]);

  // Rời màn hình (expo-router giữ màn trong stack) thì dừng giọng.
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
