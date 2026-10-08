import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { VoicePicker } from '@/components/player/VoicePicker';
import type { VoiceOption } from '@/types/voiceOptions';

interface DubbingActivatePanelProps {
  languageLabel: string;
  onActivate: () => void;
  onWatchOriginal: () => void;
  quotaExceeded?: boolean;
  isSubmitting?: boolean;
  voices?: VoiceOption[];
  selectedVoice?: string | null;
  onSelectVoice?: (voiceName: string) => void;
}

export function DubbingActivatePanel({
  languageLabel,
  onActivate,
  onWatchOriginal,
  quotaExceeded = false,
  isSubmitting = false,
  voices = [],
  selectedVoice = null,
  onSelectVoice,
}: DubbingActivatePanelProps) {
  return (
    <View style={{ gap: 16 }}>
      <View style={{ gap: 12 }}>
        <Text style={{ fontSize: 14, color: '#0F172A', lineHeight: 20 }}>
          {quotaExceeded ? (
            'Bạn đã đạt giới hạn yêu cầu lồng tiếng hôm nay. Vui lòng quay lại vào ngày mai hoặc chọn ngôn ngữ đã có sẵn.'
          ) : (
            <Text>Ngôn ngữ <Text style={{ fontWeight: '700' }}>{languageLabel}</Text> chưa có bản lồng tiếng AI.</Text>
          )}
        </Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          {!quotaExceeded && (
            <Pressable
              onPress={onActivate}
              disabled={isSubmitting}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: isSubmitting ? '#A5B4FC' : '#4F46E5',
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderRadius: 8,
                gap: 8,
              }}
            >
              {isSubmitting && <ActivityIndicator color="#fff" size="small" />}
              <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>
                {isSubmitting ? 'Đang gửi…' : 'Kích hoạt lồng tiếng AI'}
              </Text>
            </Pressable>
          )}
          <Pressable onPress={onWatchOriginal}>
            <Text style={{ fontSize: 14, fontWeight: '500', color: '#64748B' }}>Để dành sau</Text>
          </Pressable>
        </View>
      </View>

      {!quotaExceeded && voices.length > 1 && onSelectVoice && (
        <VoicePicker voices={voices} selected={selectedVoice} onSelect={onSelectVoice} />
      )}
    </View>
  );
}
