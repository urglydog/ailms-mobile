import { router, type Href } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { ShoppingCart, Bell, MessageCircle } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cartApi } from '@/lib/api/cart';
import { messageApi } from '@/lib/api/communication';
import { notificationsApi } from '@/lib/api/notifications';
import { useAuth } from '@/lib/auth/AuthContext';
import { COLORS } from '@/lib/theme/colors';

export function TopNav() {
  const { isAuthenticated } = useAuth();
  const insets = useSafeAreaInsets();
  
  const { data: cart } = useQuery({
    queryKey: ['cart'],
    queryFn: () => cartApi.list(),
    enabled: isAuthenticated === true,
  });

  const { data: notifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.getAll(),
    enabled: isAuthenticated === true,
    refetchInterval: 30000,
  });

  const { data: conversations } = useQuery({
    queryKey: ['messages', 'conversations'],
    queryFn: () => messageApi.listConversations(),
    enabled: isAuthenticated === true,
    refetchInterval: 15000,
  });
  const unreadMessages = conversations?.reduce((sum, c) => sum + c.unreadCount, 0) ?? 0;
  const unreadCount = notifications?.filter(n => !n.isRead).length || 0;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: insets.top + 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: COLORS.lineSoft, backgroundColor: COLORS.surfaceRaised }}>
      <Text style={{ fontSize: 20, fontWeight: '900', color: COLORS.accentDark, letterSpacing: -0.5 }}>ai<Text style={{ color: COLORS.ink }}>lms.</Text></Text>
      
      {isAuthenticated && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Pressable
            onPress={() => router.push('/messages' as Href)}
            style={{ padding: 8, justifyContent: 'center', alignItems: 'center' }}
          >
            <View>
              <MessageCircle size={24} color={COLORS.inkMuted} />
              {unreadMessages > 0 && (
                <View style={{ position: 'absolute', top: -4, right: -6, backgroundColor: COLORS.accent, borderRadius: 10, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>{unreadMessages > 9 ? '9+' : unreadMessages}</Text>
                </View>
              )}
            </View>
          </Pressable>
          <Pressable
            onPress={() => router.push('/notifications' as Href)}
            style={{ padding: 8, justifyContent: 'center', alignItems: 'center' }}
          >
            <View>
              <Bell size={24} color={COLORS.inkMuted} />
              {unreadCount > 0 && (
                <View style={{ position: 'absolute', top: -4, right: -6, backgroundColor: COLORS.danger, borderRadius: 10, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
              )}
            </View>
          </Pressable>
          <Pressable
            onPress={() => router.push('/cart' as Href)}
            style={{ padding: 8, justifyContent: 'center', alignItems: 'center' }}
          >
            <View>
              <ShoppingCart size={24} color={COLORS.inkMuted} />
              {cart && cart.length > 0 && (
                <View style={{ position: 'absolute', top: -6, right: -8, backgroundColor: COLORS.danger, borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={{ color: 'white', fontSize: 11, fontWeight: 'bold' }}>{cart.length}</Text>
                </View>
              )}
            </View>
          </Pressable>
        </View>
      )}
    </View>
  );
}
