import { router, usePathname, type Href } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { ShoppingCart } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { cartApi } from '@/lib/api/cart';
import { useAuth } from '@/lib/auth/AuthContext';

const TABS = [
  { href: '/courses', label: 'Khoá học' },
  { href: '/my-courses', label: 'Của tôi' },
  { href: '/profile', label: 'Hồ sơ' },
] as const;

/** Thanh điều hướng tối giản — app chưa cần (tabs) layout riêng vì mới có 3 màn hình chính. */
export function TopNav() {
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();
  
  const { data: cart } = useQuery({
    queryKey: ['cart'],
    queryFn: () => cartApi.list(),
    enabled: isAuthenticated === true,
  });

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
      {isAuthenticated && (
        <Pressable
          onPress={() => router.push('/cart' as Href)}
          style={{ paddingHorizontal: 16, justifyContent: 'center', alignItems: 'center' }}
        >
          <View>
            <ShoppingCart size={24} color="#475569" />
            {cart && cart.length > 0 && (
              <View style={{ position: 'absolute', top: -6, right: -8, backgroundColor: '#EF4444', borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ color: 'white', fontSize: 11, fontWeight: 'bold' }}>{cart.length}</Text>
              </View>
            )}
          </View>
        </Pressable>
      )}
    </View>
  );
}
