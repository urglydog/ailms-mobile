import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, PanResponder, Pressable, Text, View, type GestureResponderEvent } from 'react-native';
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

/** Bộ xử lý cử chỉ cho thanh tua: chạm/kéo để chọn vị trí, thả tay thì tua. Vị trí tính theo `locationX` TRONG thanh (các phần tử con của thanh
 * không nhận chạm nên `locationX` luôn tính theo thanh) chia cho bề rộng thanh — đúng cả khi khung bị xoay ở chế độ toàn màn hình và không phụ thuộc
 * toạ độ màn hình. Lúc nhấc ngón tay dùng giá trị gần nhất (toạ độ lúc nhấc có thể thiếu/NaN). Đặt ngoài component để không đọc ref lúc render. */
function createSeekPan(
  widthRef: React.RefObject<number>,
  lastRatioRef: React.RefObject<number>,
  setDrag: (v: number | null) => void,
  seekToRatio: (ratio: number) => void,
) {
  const ratioAt = (e: GestureResponderEvent, fallback: number) => {
    const x = e.nativeEvent.locationX;
    return Number.isFinite(x) && widthRef.current > 0 ? Math.min(1, Math.max(0, x / widthRef.current)) : fallback;
  };
  return PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    // Không nhường cử chỉ cho màn hình cha (cuộn dọc, vuốt quay lại) khi đang kéo thanh tua.
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: (e) => {
      lastRatioRef.current = ratioAt(e, 0);
      setDrag(lastRatioRef.current);
    },
    onPanResponderMove: (e) => {
      lastRatioRef.current = ratioAt(e, lastRatioRef.current);
      setDrag(lastRatioRef.current);
    },
    onPanResponderRelease: () => {
      setDrag(null);
      seekToRatio(lastRatioRef.current);
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

  // Thanh tua: kéo/chạm để tua.
  const barWidth = useRef(1);
  const lastRatio = useRef(0);
  const durationRef = useRef(0);
  useEffect(() => {
    durationRef.current = duration;
  }, [duration]);
  // Các ref chỉ được đọc trong callback cử chỉ (không phải lúc render) — lint không phân biệt được.
  /* eslint-disable react-hooks/refs */
  const pan = useMemo(
    () => createSeekPan(barWidth, lastRatio, setDrag, (ratio) => seekTo(player, ratio * durationRef.current)),
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
            {/* Chừa lề hai bên để không chạm vùng cử chỉ vuốt-quay-lại ở mép màn hình iOS; mọi phần tử con không nhận chạm để `locationX` luôn tính theo thanh. */}
            <View
              {...pan.panHandlers}
              onLayout={(e) => {
                barWidth.current = Math.max(1, e.nativeEvent.layout.width);
              }}
              style={{ height: 28, justifyContent: 'center', marginHorizontal: 14 }}
            >
              <View style={{ height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.3)', pointerEvents: 'none' }}>
                <View style={{ height: 4, borderRadius: 2, width: `${ratio * 100}%`, backgroundColor: COLORS.accent }} />
              </View>
              <View style={{ position: 'absolute', left: `${ratio * 100}%`, marginLeft: -7, width: 14, height: 14, borderRadius: 7, backgroundColor: COLORS.white, pointerEvents: 'none' }} />
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

