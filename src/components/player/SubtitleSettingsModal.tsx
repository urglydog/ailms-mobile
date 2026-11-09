import { Modal, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { COLORS } from '@/lib/theme/colors';
import { COLOR_SWATCHES, type SubtitleFontSize, type SubtitleSettings } from '@/lib/subtitleSettings';

const SIZES: { value: SubtitleFontSize; label: string; px: number }[] = [
  { value: 'sm', label: 'Nhỏ', px: 12 },
  { value: 'md', label: 'Vừa', px: 14 },
  { value: 'lg', label: 'Lớn', px: 17 },
  { value: 'xl', label: 'Rất lớn', px: 21 },
];
const OPACITIES = [0, 40, 70, 100];

interface Props {
  visible: boolean;
  settings: SubtitleSettings;
  hasTranslated: boolean;
  onChange: (next: SubtitleSettings) => void;
  onClose: () => void;
  rate: number;
  onRateChange: (rate: number) => void;
  autoNext: boolean;
  onAutoNextChange: (v: boolean) => void;
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: active ? COLORS.accent : COLORS.line,
        backgroundColor: active ? COLORS.tint : COLORS.white,
      }}
    >
      <Text style={{ color: active ? COLORS.accent : COLORS.inkMuted, fontWeight: '600', fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ fontWeight: '700', color: COLORS.ink, fontSize: 13 }}>{label}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>{children}</View>
    </View>
  );
}

export function SubtitleSettingsModal({ visible, settings, hasTranslated, onChange, onClose, rate, onRateChange, autoNext, onAutoNextChange }: Props) {
  const set = (patch: Partial<SubtitleSettings>) => onChange({ ...settings, ...patch });
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
        <Pressable onPress={() => {}} style={{ backgroundColor: COLORS.white, borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '88%' }}>
          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 32, gap: 18 }}>
          <Text style={{ fontSize: 16, fontWeight: '800', color: COLORS.ink }}>Cài đặt</Text>

          <Row label="Tốc độ phát">
            {[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((r) => (
              <Chip key={r} label={`${r}×`} active={rate === r} onPress={() => onRateChange(r)} />
            ))}
          </Row>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: COLORS.ink }}>Tự chuyển bài tiếp theo</Text>
            <Switch value={autoNext} onValueChange={onAutoNextChange} trackColor={{ true: COLORS.accent, false: COLORS.line }} />
          </View>

          <Text style={{ fontSize: 14, fontWeight: '800', color: COLORS.ink, marginTop: 4 }}>Phụ đề</Text>

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: COLORS.ink }}>Phụ đề gốc</Text>
            <Switch value={settings.showOriginal} onValueChange={(v) => set({ showOriginal: v })} trackColor={{ true: COLORS.accent, false: COLORS.line }} />
          </View>
          {hasTranslated ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ color: COLORS.ink }}>Phụ đề dịch</Text>
              <Switch value={settings.showTranslated} onValueChange={(v) => set({ showTranslated: v })} trackColor={{ true: COLORS.accent, false: COLORS.line }} />
            </View>
          ) : null}

          <Row label="Cỡ chữ">
            {SIZES.map((s) => (
              <Chip key={s.value} label={s.label} active={settings.fontSize === s.value} onPress={() => set({ fontSize: s.value })} />
            ))}
          </Row>
          <Row label="Màu chữ">
            {COLOR_SWATCHES.map((c) => (
              <Pressable
                key={c}
                onPress={() => set({ textColor: c })}
                style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: c, borderWidth: settings.textColor === c ? 3 : 1, borderColor: settings.textColor === c ? COLORS.accent : COLORS.lineDot }}
              />
            ))}
          </Row>
          <Row label="Độ đậm nền">
            {OPACITIES.map((o) => (
              <Chip key={o} label={o === 0 ? 'Không nền' : `${o}%`} active={settings.backgroundOpacity === o} onPress={() => set({ backgroundOpacity: o })} />
            ))}
          </Row>
          <Row label="Vị trí">
            <Chip label="Phía dưới" active={settings.position === 'bottom'} onPress={() => set({ position: 'bottom' })} />
            <Chip label="Phía trên" active={settings.position === 'top'} onPress={() => set({ position: 'top' })} />
            <Chip label="Viền chữ" active={settings.outline} onPress={() => set({ outline: !settings.outline })} />
          </Row>

          <Pressable onPress={onClose} style={{ backgroundColor: COLORS.accent, borderRadius: 8, padding: 12, alignItems: 'center' }}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>Xong</Text>
          </Pressable>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
