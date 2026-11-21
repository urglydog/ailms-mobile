import { useQuery } from '@tanstack/react-query';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { BarChart3, BrainCircuit, Cloud, Code2, Folder, Gamepad2, Languages, PenTool, ShieldCheck, Smartphone, Table2, Users, Wallet, type LucideIcon } from 'lucide-react-native';

import { categoriesApi } from '@/lib/api/courses';
import { COLORS } from '@/lib/theme/colors';

/** Biểu tượng theo từ khoá trong slug danh mục (bản rút gọn `fe/lib/home/categoryVisual.ts`). */
const RULES: { test: RegExp; icon: LucideIcon }[] = [
  { test: /code|program|lap-trinh|web|dev|it|cong-nghe/, icon: Code2 },
  { test: /data|chart|analytic|du-lieu/, icon: BarChart3 },
  { test: /ai|brain|machine|tri-tue/, icon: BrainCircuit },
  { test: /design|thiet-ke|art/, icon: PenTool },
  { test: /lang|ngon-ngu|english|tieng/, icon: Languages },
  { test: /game|unity/, icon: Gamepad2 },
  { test: /mobile|app/, icon: Smartphone },
  { test: /cloud|devops/, icon: Cloud },
  { test: /secur|bao-mat/, icon: ShieldCheck },
  { test: /financ|business|tai-chinh|kinh-doanh/, icon: Wallet },
  { test: /excel|sheet|office/, icon: Table2 },
  { test: /soft|ky-nang|manage|quan-ly/, icon: Users },
];
const TINTS = [COLORS.tint, COLORS.successTint, COLORS.streakBg, COLORS.tint, COLORS.dangerTint, COLORS.aiTint];

function iconFor(slug: string): LucideIcon {
  return RULES.find((r) => r.test.test(slug))?.icon ?? Folder;
}

/** "Khám phá theo chủ đề" — bấm 1 ô để lọc danh sách khoá học theo danh mục (như web `CategoryTiles`). */
export function CategoryTiles({ onPick }: { onPick: (slug: string) => void }) {
  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: () => categoriesApi.list(), staleTime: 10 * 60 * 1000 });
  if (!categories || categories.length === 0) return null;
  return (
    <View style={{ gap: 10, paddingHorizontal: 16, paddingTop: 12 }}>
      <View>
        <Text style={{ fontSize: 18, fontWeight: '700', color: COLORS.ink }}>Khám phá theo chủ đề</Text>
        <Text style={{ fontSize: 12.5, color: COLORS.inkMuted }}>Chọn lĩnh vực bạn muốn học</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
        {categories.map((c, i) => {
          const Icon = iconFor(c.slug);
          return (
            <Pressable
              key={c.id}
              onPress={() => onPick(c.slug)}
              style={{ width: 108, height: 84, borderRadius: 12, backgroundColor: TINTS[i % TINTS.length], padding: 10, justifyContent: 'space-between' }}
            >
              <Icon size={22} color={COLORS.accentDark} />
              <Text style={{ fontSize: 12.5, fontWeight: '700', color: COLORS.ink }} numberOfLines={2}>{c.name}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
