import { useCallback, useEffect, useRef, useState } from 'react';
import { useEvent } from 'expo';
import { useFocusEffect } from 'expo-router';
import { useAudioPlayer } from 'expo-audio';
import type { VideoPlayer } from 'expo-video';
import type { AudioTrack } from '@/types/lesson';

/** Chu kỳ kiểm tra độ lệch (ms) và ngưỡng lệch (giây) — cổng từ `fe/hooks/useDualPlayerSync.ts`
 * (web dùng 0,2s; mobile dùng 0,6s vì player native báo `currentTime` thô hơn, ngưỡng chặt sẽ khiến
 * liên tục tua lại → giọng bị lặp câu). */
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

/**
 * Phát giọng lồng tiếng bám theo video (không render gì) — cổng từ `fe` `useDualPlayerSync`:
 *  - video luôn câm, mọi âm thanh đến từ giọng lồng tiếng (nghe giọng gốc = chọn "Âm thanh gốc");
 *  - play/pause của giọng đi theo SỰ KIỆN `playingChange` của video (không suy ra từ polling);
 *  - vòng kiểm 250ms CHỈ chạy khi video đang phát và chỉ tua khi lệch quá ngưỡng, có giãn cách.
 * Tách component riêng để chỉ mount phía client (`Audio` không tồn tại khi render server web) và
 * để đổi ngôn ngữ thì remount theo `key`.
 */
export function DubAudioSync({ track, video }: { track: AudioTrack; video: VideoPlayer }) {
  const [resolved, setResolved] = useState(() => resolveAudio(track, video.currentTime));
  const dub = useAudioPlayer(resolved.src);
  const { isPlaying } = useEvent(video, 'playingChange', { isPlaying: video.playing });

  const offsetRef = useRef(resolved.offsetSec);
  useEffect(() => {
    offsetRef.current = resolved.offsetSec;
  }, [resolved.offsetSec]);
  const lastSeekAtRef = useRef(0);

  const seekToVideo = useCallback(() => {
    try {
      void dub.seekTo(Math.max(0, video.currentTime - offsetRef.current));
      lastSeekAtRef.current = Date.now();
    } catch {
      // Player đã giải phóng.
    }
  }, [dub, video]);

  // Video luôn câm khi đang lồng tiếng (kể cả khi người dùng bấm nút âm lượng gốc).
  useEffect(() => {
    silence(video);
  });

  // Play/pause đi theo video. Khi bắt đầu phát: tua giọng về đúng vị trí rồi mới phát.
  useEffect(() => {
    try {
      if (isPlaying) {
        seekToVideo();
        dub.play();
      } else {
        dub.pause();
      }
    } catch {
      // Player đã giải phóng.
    }
  }, [isPlaying, dub, seekToVideo]);

  // Vòng kiểm: đổi chunk (khi chưa có finalUrl) và sửa độ lệch tích luỹ — chỉ khi video đang phát.
  useEffect(() => {
    const id = setInterval(() => {
      try {
        if (!video.playing) return;
        const next = resolveAudio(track, video.currentTime);
        if (next.src !== resolved.src) {
          setResolved(next);
          return;
        }
        const target = Math.max(0, video.currentTime - offsetRef.current);
        if (!dub.playing) dub.play();
        if (Math.abs(target - dub.currentTime) > DRIFT_TOLERANCE_SEC && Date.now() - lastSeekAtRef.current > MIN_SEEK_GAP_MS) {
          seekToVideo();
        }
      } catch {
        // Player đã giải phóng.
      }
    }, SYNC_INTERVAL_MS);
    return () => clearInterval(id);
  }, [dub, video, track, resolved.src, seekToVideo]);

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
