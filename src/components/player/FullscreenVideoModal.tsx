import { Modal, Pressable, StatusBar, Text, View, useWindowDimensions } from 'react-native';
import { VideoView, type VideoPlayer } from 'expo-video';
import { X } from 'lucide-react-native';
import { SubtitleOverlay } from '@/components/player/SubtitleOverlay';
import type { SubtitleSegment } from '@/types/lesson';
import type { SubtitleSettings } from '@/lib/subtitleSettings';

interface Props {
  visible: boolean;
  player: VideoPlayer;
  originalSubtitles: SubtitleSegment[];
  translatedSubtitles: SubtitleSegment[];
  settings: SubtitleSettings;
  onClose: () => void;
}

/** Toàn màn hình do app tự vẽ (thay nút fullscreen native) để phụ đề phủ lên video và giọng lồng tiếng
 * (phát ở màn cha, vẫn mounted) không bị mất — chế độ fullscreen native của `expo-video` không cho vẽ
 * lớp phủ lên trên và có thể ngắt phiên âm thanh. App khoá dọc (`orientation: portrait`) nên khi máy
 * đang dọc, khung video được xoay 90° để lấp đầy màn hình như xem ngang. */
export function FullscreenVideoModal({ visible, player, originalSubtitles, translatedSubtitles, settings, onClose }: Props) {
  const { width, height } = useWindowDimensions();
  const rotate = height > width;
  const boxW = rotate ? height : width;
  const boxH = rotate ? width : height;

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose} statusBarTranslucent supportedOrientations={['portrait', 'landscape']}>
      <StatusBar hidden />
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <View
          style={{
            position: 'absolute',
            width: boxW,
            height: boxH,
            left: (width - boxW) / 2,
            top: (height - boxH) / 2,
            transform: rotate ? [{ rotate: '90deg' }] : [],
            backgroundColor: '#000',
          }}
        >
          {visible ? (
            <VideoView player={player} style={{ width: '100%', height: '100%' }} contentFit="contain" fullscreenOptions={{ enable: false }} nativeControls />
          ) : null}
          <SubtitleOverlay originalSubtitles={originalSubtitles} translatedSubtitles={translatedSubtitles} player={player} settings={settings} />
          <Pressable
            onPress={onClose}
            accessibilityLabel="Thoát toàn màn hình"
            style={{ position: 'absolute', top: 16, left: 16, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 18, paddingHorizontal: 12, paddingVertical: 7 }}
          >
            <X size={16} color="#fff" />
            <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>Thu nhỏ</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
