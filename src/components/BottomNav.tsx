import { router, usePathname, type Href } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { BookOpen, User, LibraryBig } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '@/lib/theme/colors';

const TABS = [
  { href: '/courses', label: 'Khám phá', Icon: BookOpen },
  { href: '/my-courses', label: 'Của tôi', Icon: LibraryBig },
  { href: '/profile', label: 'Hồ sơ', Icon: User },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  return (
    <View accessibilityRole="tablist" style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: COLORS.line, backgroundColor: COLORS.surfaceRaised, paddingBottom: Math.max(insets.bottom, 8), paddingTop: 6 }}>
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        const { Icon } = tab;
        return (
          <Pressable
            key={tab.href}
            onPress={() => router.push(tab.href as Href)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={tab.label}
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4, minHeight: 48 }}
          >
            {/* UI v2: mục đang chọn có nền "pill" nhạt quanh icon (kiểu Material 3) để dễ nhận ra hơn chỉ đổi màu. */}
            <View style={{ paddingHorizontal: 18, paddingVertical: 4, borderRadius: 999, backgroundColor: active ? COLORS.tint : 'transparent' }}>
              <Icon size={22} color={active ? COLORS.accent : COLORS.inkFaint} strokeWidth={active ? 2.4 : 2} />
            </View>
            <Text style={{ color: active ? COLORS.accent : COLORS.inkFaint, fontWeight: active ? '600' : '500', fontSize: 11 }}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
