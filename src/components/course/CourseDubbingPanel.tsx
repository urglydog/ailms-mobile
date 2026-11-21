import { Languages } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { COLORS } from '@/lib/theme/colors';

/** Khối nhấn mạnh điểm khác biệt của nền tảng — port từ `fe/components/course/detail/CourseDubbingPanel.tsx`. */
export function CourseDubbingPanel({ languages }: { languages: string[] }) {
  if (languages.length === 0) return null;
  return (
    <View style={{ borderWidth: 1, borderColor: COLORS.line, backgroundColor: COLORS.surface, borderRadius: 12, padding: 14, gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ width: 34, height: 34, borderRadius: 8, backgroundColor: COLORS.accent, alignItems: 'center', justifyContent: 'center' }}>
          <Languages size={18} color={COLORS.white} />
        </View>
        <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.ink, flex: 1 }}>Học bằng giọng lồng tiếng AI</Text>
      </View>
      <Text style={{ color: COLORS.inkMuted, fontSize: 13, lineHeight: 19 }}>
        Mỗi bài giảng có thể nghe bằng giọng lồng tiếng AI theo ngôn ngữ của bạn, đồng bộ với video gốc.
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {languages.map((lang) => (
          <View key={lang} style={{ borderWidth: 1, borderColor: COLORS.line, backgroundColor: COLORS.surfaceRaised, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4 }}>
            <Text style={{ color: COLORS.accentDark, fontWeight: '600', fontSize: 13 }}>{lang}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
