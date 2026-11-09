import { useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, Text, View } from 'react-native';
import { useEvent } from 'expo';
import { VideoView, type VideoPlayer } from 'expo-video';
import { FileText, Maximize2, Minimize2, Pause, Play, RotateCcw, RotateCw, Settings, Volume2, VolumeX } from 'lucide-react-native';
import { SubtitleOverlay } from '@/components/player/SubtitleOverlay';
import { usePlayerTime, useReallyPlaying } from '@/hooks/usePlayerTime';
import type { SubtitleSegment } from '@/types/lesson';
import type { SubtitleSettings } from '@/lib/subtitleSettings';

export const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

function seekTo(player: VideoPlayer, sec: number) {
  try {
    player.currentTime = Math.max(0, player.duration > 0 ? Math.min(player.duration, sec) : sec);
  } catch {
    // Player đã giải phóng.
  }
}

function togglePlay(player: VideoPlayer, reallyPlaying: boolean) {
  try {
    if (reallyPlaying) player.pause();
    else player.play();
  } catch {
    // Player đã giải phóng.
  }
}

function toggleVideoMute(player: VideoPlayer) {
  try {
    player.muted = !player.muted;
  } catch {
    // Player đã giải phóng.
  }
}

function fmt(raw: number): string {
  const t = Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 0;
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = String(t % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}

/** Bộ xử lý cử chỉ cho thanh tua: kéo/chạm để chọn vị trí, thả tay thì tua. Đặt ngoài component để không đọc ref lúc render. */
function createSeekPan(
  barRef: React.RefObject<View | null>,
  boxRef: React.RefObject<{ left: number; width: number }>,
  durationRef: React.RefObject<number>,
  setDrag: (v: number | null) => void,
  seek: (sec: number) => void,
) {
  const pct = (pageX: number) => Math.min(1, Math.max(0, (pageX - boxRef.current.left) / boxRef.current.width));
  // Dùng toạ độ của `gestureState` (x0 lúc chạm, moveX lúc kéo/thả) — `nativeEvent.pageX` lúc thả tay có thể
  // thiếu/NaN trên cảm ứng (touchend không còn ngón nào) khiến thao tác tua bị bỏ qua.
  return PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (_e, g) => {
      barRef.current?.measureInWindow((x, _y, w) => {
        boxRef.current.left = x;
        boxRef.current.width = Math.max(1, w);
      });
      setDrag(pct(g.x0));
    },
    onPanResponderMove: (_e, g) => setDrag(pct(g.moveX || g.x0)),
    onPanResponderRelease: (_e, g) => {
      const ratio = pct(g.moveX || g.x0);
      setDrag(null);
      seek(ratio * durationRef.current);
    },
    onPanResponderTerminate: () => setDrag(null),
  });
}

interface Props {
  player: VideoPlayer;
  originalSubtitles: SubtitleSegment[];
  translatedSubtitles: SubtitleSegment[];
  settings: SubtitleSettings;
  onSettingsChange: (next: SubtitleSettings) => void;
  /** Đang lồng tiếng → nút loa điều khiển giọng lồng tiếng (video luôn câm); không thì điều khiển âm thanh gốc. */
  dubActive: boolean;
  dubMuted: boolean;
  onToggleDubMute: () => void;
  rate: number;
  onRateChange: (rate: number) => void;
  onOpenSettings: () => void;
  onToggleTranscript: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

/** Khung video + thanh điều khiển tuỳ biến nằm TRONG khung (giống `fe` `PlayerControls`): phát/dừng, lùi/tua 5s,
 * tốc độ, thanh tua, thời gian, loa, Gốc/Dịch, Transcript, Cài đặt, Toàn màn hình. Chạm vào video để hiện/ẩn;
 * luôn hiện (điện thoại không có hover). Dùng chung cho khung nhúng và toàn màn hình (chỉ 1 khung mount tại 1 thời điểm). */
export function PlayerSurface(p: Props) {
  const { player } = p;
  const isPlaying = useReallyPlaying(player);
  const { muted: videoMuted } = useEvent(player, 'mutedChange', { muted: player.muted });
  const sec = usePlayerTime(player, true);
  const duration = player.duration;

  const [drag, setDrag] = useState<number | null>(null);

  // Thanh tua: kéo/chạm để tua (đo vị trí thanh trong cửa sổ để tính %).
  const barRef = useRef<View>(null);
  const barBox = useRef({ left: 0, width: 1 });
  const durationRef = useRef(0);
  useEffect(() => {
    durationRef.current = duration;
  }, [duration]);
  // Các ref chỉ được đọc trong callback cử chỉ (không phải lúc render) — lint không phân biệt được.
  /* eslint-disable react-hooks/refs */
  const pan = useMemo(
    () => createSeekPan(barRef, barBox, durationRef, setDrag, (sec) => seekTo(player, sec)),
    [player],
  );
  /* eslint-enable react-hooks/refs */

  const ratio = drag ?? (duration > 0 ? Math.min(1, sec / duration) : 0);
  const showMuted = p.dubActive ? p.dubMuted : videoMuted;

  const txt = { color: '#fff', fontSize: 11.5, fontWeight: '700' } as const;

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <VideoView player={player} style={{ width: '100%', height: '100%' }} contentFit="contain" fullscreenOptions={{ enable: false }} nativeControls={false} />
      <SubtitleOverlay
        originalSubtitles={p.originalSubtitles}
        translatedSubtitles={p.translatedSubtitles}
        player={player}
        settings={p.settings}
        raised
      />

      {/* Chạm vào giữa video = phát/dừng (thanh điều khiển luôn hiện, không ẩn/hiện như web desktop hover). */}
      <Pressable onPress={() => togglePlay(player, isPlaying)} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 56 }} />

      <>
          {!isPlaying ? (
            <Pressable
              onPress={() => togglePlay(player, isPlaying)}
              accessibilityLabel="Phát"
              style={{ position: 'absolute', alignSelf: 'center', top: '35%', width: 54, height: 54, borderRadius: 27, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' }}
            >
              <Play size={26} color="#fff" fill="#fff" />
            </Pressable>
          ) : null}
          <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 8, paddingBottom: 6, paddingTop: 14, backgroundColor: 'rgba(0,0,0,0.45)' }}>
            <View
              ref={barRef}
              {...pan.panHandlers}
              style={{ height: 22, justifyContent: 'center' }}
            >
              <View style={{ height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.3)' }}>
                <View style={{ height: 4, borderRadius: 2, width: `${ratio * 100}%`, backgroundColor: '#3B82F6' }} />
              </View>
              <View style={{ position: 'absolute', left: `${ratio * 100}%`, marginLeft: -6, width: 12, height: 12, borderRadius: 6, backgroundColor: '#fff' }} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
              <Btn label={isPlaying ? 'Tạm dừng' : 'Phát'} onPress={() => togglePlay(player, isPlaying)}>
                {isPlaying ? <Pause size={18} color="#fff" fill="#fff" /> : <Play size={18} color="#fff" fill="#fff" />}
              </Btn>
              <Btn label="Lùi 5 giây" onPress={() => seekTo(player, player.currentTime - 5)}>
                <RotateCcw size={16} color="#fff" />
              </Btn>
              <Btn label="Tua tới 5 giây" onPress={() => seekTo(player, player.currentTime + 5)}>
                <RotateCw size={16} color="#fff" />
              </Btn>
              <Btn label="Tốc độ phát" active={p.rate !== 1} onPress={() => p.onRateChange(SPEEDS[(SPEEDS.indexOf(p.rate) + 1) % SPEEDS.length] ?? 1)}>
                <Text style={txt}>{p.rate}×</Text>
              </Btn>
              <Text style={{ ...txt, fontVariant: ['tabular-nums'], marginLeft: 2 }} numberOfLines={1}>
                {fmt(drag !== null ? drag * duration : sec)} / {fmt(duration)}
              </Text>
              <View style={{ flex: 1 }} />
              <Btn
               
                label={p.dubActive ? 'Bật/tắt giọng lồng tiếng' : showMuted ? 'Bật tiếng' : 'Tắt tiếng'}
                onPress={() => {
                  if (p.dubActive) p.onToggleDubMute();
                  else toggleVideoMute(player);
                }}
              >
                {showMuted ? <VolumeX size={17} color="#fff" /> : <Volume2 size={17} color="#fff" />}
              </Btn>
              <Btn label="Phụ đề gốc" active={p.settings.showOriginal} disabled={p.originalSubtitles.length === 0} onPress={() => p.onSettingsChange({ ...p.settings, showOriginal: !p.settings.showOriginal })}>
                <Text style={txt}>Gốc</Text>
              </Btn>
              <Btn label="Phụ đề đã dịch" active={p.settings.showTranslated} disabled={p.translatedSubtitles.length === 0} onPress={() => p.onSettingsChange({ ...p.settings, showTranslated: !p.settings.showTranslated })}>
                <Text style={txt}>Dịch</Text>
              </Btn>
              <Btn label="Bản ghi lời thoại" onPress={p.onToggleTranscript}>
                <FileText size={16} color="#fff" />
              </Btn>
              <Btn label="Cài đặt" onPress={p.onOpenSettings}>
                <Settings size={16} color="#fff" />
              </Btn>
              <Btn label={p.isFullscreen ? 'Thoát toàn màn hình' : 'Toàn màn hình'} onPress={p.onToggleFullscreen}>
                {p.isFullscreen ? <Minimize2 size={16} color="#fff" /> : <Maximize2 size={16} color="#fff" />}
              </Btn>
            </View>
          </View>
      </>
    </View>
  );
}

function Btn({ onPress, children, label, active, disabled }: { onPress: () => void; children: React.ReactNode; label: string; active?: boolean; disabled?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={label}
      hitSlop={6}
      style={{ minWidth: 30, height: 30, paddingHorizontal: 5, alignItems: 'center', justifyContent: 'center', borderRadius: 6, borderWidth: active !== undefined ? 1 : 0, borderColor: active ? '#fff' : 'rgba(255,255,255,0.35)', opacity: disabled ? 0.4 : 1 }}
    >
      {children}
    </Pressable>
  );
}

