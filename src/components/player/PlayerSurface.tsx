import { useEffect, useMemo, useRef, useState, type ComponentRef, type ReactNode } from 'react';
import { Animated, PanResponder, Pressable, Text, View } from 'react-native';
import { FileText, Maximize2, Minimize2, Pause, Play, RotateCcw, RotateCw, Settings, Volume2, VolumeX } from 'lucide-react-native';
import { SubtitleOverlay } from '@/components/player/SubtitleOverlay';
import { usePlayerMuted, usePlayerTime, useReallyPlaying } from '@/hooks/usePlayerTime';
import type { SubtitleSegment } from '@/types/lesson';
import type { PlayerLike } from '@/types/player';
import type { SubtitleSettings } from '@/lib/subtitleSettings';

import { COLORS } from '@/lib/theme/colors';
export const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

/** Thời gian (mili giây) không chạm thì thanh điều khiển bắt đầu mờ đi khi video đang phát. */
const CONTROLS_HIDE_AFTER_MS = 3000;

function seekTo(player: PlayerLike, sec: number) {
  try {
    player.currentTime = Math.max(0, player.duration > 0 ? Math.min(player.duration, sec) : sec);
  } catch {
    // Player đã giải phóng.
  }
}

function togglePlay(player: PlayerLike, reallyPlaying: boolean) {
  try {
    if (reallyPlaying) player.pause();
    else player.play();
  } catch {
    // Player đã giải phóng.
  }
}

function toggleVideoMute(player: PlayerLike) {
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
  barRef: React.RefObject<ComponentRef<typeof View> | null>,
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
  player: PlayerLike;
  /** Lớp hình ảnh nằm dưới thanh điều khiển: `VideoView` (video tải lên) hoặc `YouTubeView` (YouTube). */
  video: ReactNode;
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
  const videoMuted = usePlayerMuted(player);
  const sec = usePlayerTime(player, true);
  const duration = player.duration;

  const [drag, setDrag] = useState<number | null>(null);

  // Thanh điều khiển tự ẩn như YouTube: đang phát thì sau ~3 giây không chạm sẽ mờ dần rồi ẩn; chạm vào video để hiện lại / ẩn ngay;
  // đang tạm dừng hoặc đang kéo thanh tua thì luôn hiện. Chạm vào bất kỳ nút nào cũng kéo dài thời gian hiện.
  const [awake, setAwake] = useState(true);
  const [pokeTick, setPokeTick] = useState(0);
  const showControls = awake || !isPlaying || drag !== null;
  const [fade] = useState(() => new Animated.Value(1));
  const poke = () => {
    setAwake(true);
    setPokeTick((n) => n + 1);
  };
  useEffect(() => {
    if (!isPlaying || !awake || drag !== null) return;
    const timer = setTimeout(() => setAwake(false), CONTROLS_HIDE_AFTER_MS);
    return () => clearTimeout(timer);
  }, [isPlaying, awake, drag, pokeTick]);
  useEffect(() => {
    Animated.timing(fade, { toValue: showControls ? 1 : 0, duration: showControls ? 150 : 450, useNativeDriver: true }).start();
  }, [showControls, fade]);
  const onTapVideo = () => {
    if (showControls && isPlaying) setAwake(false);
    else poke();
  };

  // Thanh tua: kéo/chạm để tua (đo vị trí thanh trong cửa sổ để tính %).
  const barRef = useRef<ComponentRef<typeof View>>(null);
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

  const txt = { color: COLORS.white, fontSize: 11.5, fontWeight: '700' } as const;

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.black }}>
      {p.video}
      <SubtitleOverlay
        originalSubtitles={p.originalSubtitles}
        translatedSubtitles={p.translatedSubtitles}
        player={player}
        settings={p.settings}
        raised={showControls}
      />

      {/* Chạm vào video: hiện thanh điều khiển nếu đang ẩn, ẩn ngay nếu đang hiện lúc video chạy. Phát/dừng dùng nút giữa hoặc nút ở thanh dưới. */}
      <Pressable onPress={onTapVideo} accessibilityLabel="Hiện hoặc ẩn thanh điều khiển" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />

      <Animated.View
        onTouchStart={poke}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: fade, pointerEvents: showControls ? 'box-none' : 'none' }}
      >
          <Pressable
            onPress={() => togglePlay(player, isPlaying)}
            accessibilityLabel={isPlaying ? 'Tạm dừng' : 'Phát'}
            style={{ position: 'absolute', alignSelf: 'center', top: '32%', width: 54, height: 54, borderRadius: 27, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' }}
          >
            {isPlaying ? <Pause size={26} color={COLORS.white} fill={COLORS.white} /> : <Play size={26} color={COLORS.white} fill={COLORS.white} />}
          </Pressable>
          <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 8, paddingBottom: 6, paddingTop: 14, backgroundColor: 'rgba(0,0,0,0.45)' }}>
            <View
              ref={barRef}
              {...pan.panHandlers}
              style={{ height: 22, justifyContent: 'center' }}
            >
              <View style={{ height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.3)' }}>
                <View style={{ height: 4, borderRadius: 2, width: `${ratio * 100}%`, backgroundColor: COLORS.accent }} />
              </View>
              <View style={{ position: 'absolute', left: `${ratio * 100}%`, marginLeft: -6, width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.white }} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
              <Btn label={isPlaying ? 'Tạm dừng' : 'Phát'} onPress={() => togglePlay(player, isPlaying)}>
                {isPlaying ? <Pause size={18} color={COLORS.white} fill={COLORS.white} /> : <Play size={18} color={COLORS.white} fill={COLORS.white} />}
              </Btn>
              <Btn label="Lùi 5 giây" onPress={() => seekTo(player, player.currentTime - 5)}>
                <RotateCcw size={16} color={COLORS.white} />
              </Btn>
              <Btn label="Tua tới 5 giây" onPress={() => seekTo(player, player.currentTime + 5)}>
                <RotateCw size={16} color={COLORS.white} />
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
                {showMuted ? <VolumeX size={17} color={COLORS.white} /> : <Volume2 size={17} color={COLORS.white} />}
              </Btn>
              <Btn label="Phụ đề gốc" active={p.settings.showOriginal} disabled={p.originalSubtitles.length === 0} onPress={() => p.onSettingsChange({ ...p.settings, showOriginal: !p.settings.showOriginal })}>
                <Text style={txt}>Gốc</Text>
              </Btn>
              <Btn label="Phụ đề đã dịch" active={p.settings.showTranslated} disabled={p.translatedSubtitles.length === 0} onPress={() => p.onSettingsChange({ ...p.settings, showTranslated: !p.settings.showTranslated })}>
                <Text style={txt}>Dịch</Text>
              </Btn>
              <Btn label="Bản ghi lời thoại" onPress={p.onToggleTranscript}>
                <FileText size={16} color={COLORS.white} />
              </Btn>
              <Btn label="Cài đặt" onPress={p.onOpenSettings}>
                <Settings size={16} color={COLORS.white} />
              </Btn>
              <Btn label={p.isFullscreen ? 'Thoát toàn màn hình' : 'Toàn màn hình'} onPress={p.onToggleFullscreen}>
                {p.isFullscreen ? <Minimize2 size={16} color={COLORS.white} /> : <Maximize2 size={16} color={COLORS.white} />}
              </Btn>
            </View>
          </View>
      </Animated.View>
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
      style={{ minWidth: 30, height: 30, paddingHorizontal: 5, alignItems: 'center', justifyContent: 'center', borderRadius: 6, borderWidth: active !== undefined ? 1 : 0, borderColor: active ? COLORS.white : 'rgba(255,255,255,0.35)', opacity: disabled ? 0.4 : 1 }}
    >
      {children}
    </Pressable>
  );
}

