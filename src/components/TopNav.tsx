import { router, usePathname, type Href } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

const TABS = [
  { href: '/courses', label: 'Khoá học' },
  { href: '/my-courses', label: 'Của tôi' },
  { href: '/profile', label: 'Hồ sơ' },
] as const;

/** Thanh điều hướng tối giản — app chưa cần (tabs) layout riêng vì mới có 3 màn hình chính. */
export function TopNav() {
  const pathname = usePathname();

  return (
    <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' }}>
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Pressable
            key={tab.href}
            onPress={() => router.push(tab.href as Href)}
            style={{ flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: active ? '#2563EB' : 'transparent' }}
          >
            <Text style={{ color: active ? '#2563EB' : '#475569', fontWeight: active ? '700' : '500' }}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
