import { View, Text, Pressable } from 'react-native';
import type { VoiceOption } from '@/types/voiceOptions';

interface VoicePickerProps {
  voices: VoiceOption[];
  selected: string | null;
  onSelect: (voiceName: string) => void;
}

function prettyVoiceName(voiceName: string): string {
  const base = voiceName.replace(/^.*-/, '').replace(/Neural$/, '');
  return base.replace(/([a-z0-9])([A-Z])/g, '$1 $2');
}

export function VoicePicker({ voices, selected, onSelect }: VoicePickerProps) {
  if (voices.length === 0) return null;

  const female = voices.filter((v) => v.gender === 'FEMALE');
  const male = voices.filter((v) => v.gender === 'MALE');

  const renderGroup = (label: string, group: VoiceOption[]) => {
    if (group.length === 0) return null;
    return (
      <View style={{ gap: 6, marginBottom: 8 }}>
        <Text style={{ fontSize: 11, fontWeight: '700', textTransform: 'uppercase', color: '#94A3B8' }}>{label}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {group.map((voice) => {
            const isSelected = voice.voiceName === selected;
            return (
              <Pressable
                key={voice.voiceName}
                onPress={() => onSelect(voice.voiceName)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: isSelected ? '#2563EB' : '#CBD5E1',
                  backgroundColor: isSelected ? '#EFF6FF' : '#FFFFFF',
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '500', color: isSelected ? '#2563EB' : '#475569' }}>
                  {prettyVoiceName(voice.voiceName)}
                </Text>
                {voice.isDefault && (
                  <View style={{ backgroundColor: '#F1F5F9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 }}>
                    <Text style={{ fontSize: 10, color: '#94A3B8' }}>mặc định</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <View style={{ gap: 12 }}>
      <Text style={{ fontSize: 13, fontWeight: '500', color: '#0F172A' }}>Chọn giọng đọc</Text>
      <View style={{ gap: 12 }}>
        {renderGroup('Nữ', female)}
        {renderGroup('Nam', male)}
      </View>
    </View>
  );
}
