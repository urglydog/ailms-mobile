import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Redirect, router, type Href } from 'expo-router';
import { ActivityIndicator, Image, Pressable, Switch, Text, View, ScrollView } from 'react-native';
import { Monitor } from 'lucide-react-native';

import { TopNav } from '@/components/TopNav';
import { BottomNav } from '@/components/BottomNav';
import { ApiError } from '@/lib/api/client';
import { streakApi } from '@/lib/api/streak';
import { usersApi } from '@/lib/api/users';
import { useAuth } from '@/lib/auth/AuthContext';
import type { UserProfile } from '@/types/user';

export default function ProfileScreen() {
  const { isAuthenticated, logout } = useAuth();

  const { data: me, isLoading, error, refetch } = useQuery({
    queryKey: ['me'],
    queryFn: () => usersApi.getMe(),
    enabled: isAuthenticated === true,
  });

  const { data: streak } = useQuery({
    queryKey: ['streak'],
    queryFn: () => streakApi.getMine(),
    enabled: isAuthenticated === true,
  });

  if (isAuthenticated === false) {
    return <Redirect href="/login" />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <TopNav />
      <ScrollView style={{ flex: 1 }}>
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

          <View style={{ flexDirection: 'row', gap: 16 }}>
            <Pressable onPress={() => router.push('/edit-profile' as Href)}>
              <Text style={{ color: '#2563EB', fontWeight: '600' }}>Chỉnh sửa hồ sơ</Text>
            </Pressable>
            {me.authProvider !== 'GOOGLE' ? (
              <Pressable onPress={() => router.push('/profile/change-password' as Href)}>
                <Text style={{ color: '#2563EB', fontWeight: '600' }}>Đổi mật khẩu</Text>
              </Pressable>
            ) : null}
            <Pressable onPress={() => router.push(`/u/${me.id}` as Href)}>
              <Text style={{ color: '#2563EB', fontWeight: '600' }}>Hồ sơ công khai</Text>
            </Pressable>
          </View>

          {streak ? (
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-around',
                width: '100%',
                backgroundColor: '#FFF7ED',
                borderRadius: 10,
                padding: 14,
                marginTop: 8,
              }}
            >
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 20, fontWeight: '800', color: '#EA580C' }}>🔥 {streak.currentStreak}</Text>
                <Text style={{ fontSize: 11, color: '#92400E' }}>Chuỗi ngày học</Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 20, fontWeight: '800', color: '#EA580C' }}>{streak.longestStreak}</Text>
                <Text style={{ fontSize: 11, color: '#92400E' }}>Kỷ lục</Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 20, fontWeight: '800', color: '#EA580C' }}>{streak.freezesRemaining}</Text>
                <Text style={{ fontSize: 11, color: '#92400E' }}>Lượt đóng băng</Text>
              </View>
            </View>
          ) : null}

          <View style={{ width: '100%', marginTop: 16, borderTopWidth: 1, borderTopColor: '#E2E8F0' }}>
            <MenuRow label="Khoá học của tôi" href={'/my-courses' as Href} />
            <MenuRow label="Yêu thích" href={'/wishlist' as Href} />
            <MenuRow label="Chứng chỉ của tôi" href={'/certificates' as Href} />
            <MenuRow label="Lịch sử thanh toán" href={'/payments' as Href} />
            <MenuRow label="Thông báo" href={'/notifications' as Href} />
          </View>

          <PrivacySection me={me} />
          <SecuritySection />

          <Pressable
            onPress={() => logout()}
            style={{ marginTop: 16, borderWidth: 1, borderColor: '#DC2626', borderRadius: 8, padding: 12, alignItems: 'center', width: '100%' }}
          >
            <Text style={{ color: '#DC2626', fontWeight: '600' }}>Đăng xuất</Text>
          </Pressable>
        </View>
      )}
      </ScrollView>
      <BottomNav />
    </View>
  );
}

/** Port từ 2 `PrivacyToggle` trong `fe/app/(public)/profile/page.tsx`. */
function PrivacySection({ me }: { me: UserProfile }) {
  const queryClient = useQueryClient();
  const updatePrivacy = useMutation({
    mutationFn: (data: { coursesPublic: boolean; wishlistPublic: boolean }) => usersApi.updatePrivacy(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['me'] }),
  });

  return (
    <View style={{ width: '100%', marginTop: 16, borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 16, gap: 10 }}>
      <Text style={{ fontSize: 14, fontWeight: '700', color: '#0F172A' }}>Quyền riêng tư hồ sơ công khai</Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontSize: 13, color: '#334155' }}>Hiện khóa học đã học</Text>
        <Switch
          value={!!me.coursesPublic}
          disabled={updatePrivacy.isPending}
          onValueChange={(checked) => updatePrivacy.mutate({ coursesPublic: checked, wishlistPublic: !!me.wishlistPublic })}
        />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontSize: 13, color: '#334155' }}>Hiện danh sách yêu thích</Text>
        <Switch
          value={!!me.wishlistPublic}
          disabled={updatePrivacy.isPending}
          onValueChange={(checked) => updatePrivacy.mutate({ coursesPublic: !!me.coursesPublic, wishlistPublic: checked })}
        />
      </View>
    </View>
  );
}

/** Port từ "Task 10: Quản lý thiết bị & Bảo mật" trong `fe/app/(public)/profile/page.tsx` — bỏ
 * phân trang (số phiên thường ít, cuộn tay đủ dùng trên mobile). */
function SecuritySection() {
  const { data: sessions } = useQuery({
    queryKey: ['my-sessions'],
    queryFn: () => usersApi.getSessions(),
  });

  const logoutAll = useMutation({
    mutationFn: () => usersApi.logoutAllOtherDevices(),
  });

  return (
    <View style={{ width: '100%', marginTop: 16, borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 16, gap: 10 }}>
      <Text style={{ fontSize: 14, fontWeight: '700', color: '#0F172A' }}>Bảo mật & Thiết bị</Text>

      {sessions && sessions.length > 0 ? (
        <View style={{ gap: 6 }}>
          {sessions.map((s, idx) => (
            <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, padding: 10 }}>
              <Monitor size={16} color="#64748B" />
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={{ fontSize: 12.5, fontWeight: '600', color: '#0F172A' }}>{s.deviceName}</Text>
                <Text style={{ fontSize: 10.5, color: '#94A3B8' }}>
                  {s.ip ? `IP: ${s.ip} · ` : ''}Hoạt động gần đây: {new Date(s.lastActiveAt).toLocaleString('vi-VN')}
                </Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}

      <Pressable
        onPress={() => logoutAll.mutate()}
        disabled={logoutAll.isPending}
        style={{ borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, padding: 12, alignItems: 'center', opacity: logoutAll.isPending ? 0.6 : 1 }}
      >
        <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F172A' }}>
          {logoutAll.isSuccess ? 'Đã đăng xuất khỏi các thiết bị khác' : 'Đăng xuất khỏi tất cả các thiết bị khác'}
        </Text>
      </Pressable>
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
