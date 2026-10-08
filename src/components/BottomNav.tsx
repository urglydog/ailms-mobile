import { router, usePathname, type Href } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { BookOpen, User, LibraryBig } from 'lucide-react-native';

const TABS = [
  { href: '/courses', label: 'Khám phá', Icon: BookOpen },
  { href: '/my-courses', label: 'Của tôi', Icon: LibraryBig },
  { href: '/profile', label: 'Hồ sơ', Icon: User },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#E2E8F0', backgroundColor: '#FFFFFF', paddingBottom: 24, paddingTop: 8 }}>
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        const { Icon } = tab;
        return (
          <Pressable
            key={tab.href}
            onPress={() => router.push(tab.href as Href)}
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 }}
          >
            <Icon size={24} color={active ? '#2563EB' : '#64748B'} strokeWidth={active ? 2.5 : 2} />
            <Text style={{ color: active ? '#2563EB' : '#64748B', fontWeight: active ? '600' : '500', fontSize: 11 }}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
