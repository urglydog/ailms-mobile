import { useQuery } from '@tanstack/react-query';
import { Redirect, router, type Href } from 'expo-router';
import { ActivityIndicator, Image, Pressable, Text, View } from 'react-native';

import { TopNav } from '@/components/TopNav';
import { ApiError } from '@/lib/api/client';
import { usersApi } from '@/lib/api/users';
import { useAuth } from '@/lib/auth/AuthContext';

export default function ProfileScreen() {
  const { isAuthenticated, logout } = useAuth();

  const { data: me, isLoading, error, refetch } = useQuery({
    queryKey: ['me'],
    queryFn: () => usersApi.getMe(),
    enabled: isAuthenticated === true,
  });

  if (isAuthenticated === false) {
    return <Redirect href="/login" />;
  }

  return (
    <View style={{ flex: 1 }}>
      <TopNav />
      <View style={{ padding: 16 }}>
        <Text style={{ fontSize: 20, fontWeight: '700' }}>Hồ sơ</Text>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator />
        </View>
      ) : error || !me ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 }}>
          <Text>{error instanceof ApiError ? error.message : 'Không tải được hồ sơ.'}</Text>
          <Pressable onPress={() => refetch()}>
            <Text style={{ color: '#2563EB' }}>Thử lại</Text>
          </Pressable>
        </View>
      ) : (
        <View style={{ padding: 16, gap: 12, alignItems: 'center' }}>
          {me.avatarUrl ? (
            <Image source={{ uri: me.avatarUrl }} style={{ width: 96, height: 96, borderRadius: 48 }} />
          ) : (
            <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 32, color: '#475569' }}>{me.fullName.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <Text style={{ fontSize: 18, fontWeight: '700' }}>{me.fullName}</Text>
          <Text style={{ color: '#475569' }}>{me.email}</Text>
          {me.headline ? <Text style={{ color: '#475569' }}>{me.headline}</Text> : null}
          <Text style={{ color: '#94A3B8', fontSize: 12 }}>Vai trò: {me.role}</Text>

          <View style={{ width: '100%', marginTop: 16, borderTopWidth: 1, borderTopColor: '#E2E8F0' }}>
            <MenuRow label="Khoá học của tôi" href={'/my-courses' as Href} />
            <MenuRow label="Yêu thích" href={'/wishlist' as Href} />
            <MenuRow label="Chứng chỉ của tôi" href={'/certificates' as Href} />
            <MenuRow label="Thông báo" href={'/notifications' as Href} />
          </View>

          <Pressable
            onPress={() => logout()}
            style={{ marginTop: 16, borderWidth: 1, borderColor: '#DC2626', borderRadius: 8, padding: 12, alignItems: 'center', width: '100%' }}
          >
            <Text style={{ color: '#DC2626', fontWeight: '600' }}>Đăng xuất</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function MenuRow({ label, href }: { label: string; href: Href }) {
  return (
    <Pressable
      onPress={() => router.push(href)}
      style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' }}
    >
      <Text style={{ fontSize: 15 }}>{label}</Text>
      <Text style={{ color: '#94A3B8' }}>›</Text>
    </Pressable>
  );
}
