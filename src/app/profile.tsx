import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Redirect, router, type Href } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, Switch, Text, View, ScrollView } from 'react-native';
import { Monitor } from 'lucide-react-native';

import { TopNav } from '@/components/TopNav';
import { BottomNav } from '@/components/BottomNav';
import { ApiError } from '@/lib/api/client';
import { streakApi } from '@/lib/api/streak';
import { usersApi } from '@/lib/api/users';
import { useAuth } from '@/lib/auth/AuthContext';
import type { UserProfile } from '@/types/user';
import { COLORS } from '@/lib/theme/colors';
import { Award, Bell, BookOpen, Trophy, ChevronRight, FileText, Heart, LifeBuoy, MessageSquare, Radio, Receipt, ShieldAlert, WifiOff, type LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';

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
    <View style={{ flex: 1, backgroundColor: COLORS.surface }}>
      <TopNav />
      <ScrollView style={{ flex: 1 }}>
        <View style={{ padding: 16 }}>
          <Text style={{ color: COLORS.ink, fontSize: 22, fontWeight: '800' }}>Tài khoản</Text>
        </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator />
        </View>
      ) : error || !me ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 }}>
          <Text style={{ color: COLORS.ink }}>{error instanceof ApiError ? error.message : 'Không tải được hồ sơ.'}</Text>
          <Pressable onPress={() => refetch()}>
            <Text style={{ color: COLORS.accentDark }}>Thử lại</Text>
          </Pressable>
          {/* Hồ sơ không tải được (vd phiên đăng nhập hỏng) vẫn phải đăng xuất được để đăng nhập lại. */}
          <Pressable onPress={() => logout()}>
            <Text style={{ color: COLORS.danger, fontWeight: '600' }}>Đăng xuất</Text>
          </Pressable>
        </View>
      ) : (
        <View style={{ padding: 16, gap: 12 }}>
          {/* UI v2: thẻ hồ sơ ngang (avatar trái, tên/email phải), vai trò hiện nhãn tiếng Việt thay vì mã thô. */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: COLORS.surfaceRaised, borderWidth: 1, borderColor: COLORS.line, borderRadius: 12, padding: 14 }}>
            {me.avatarUrl ? (
              <Image source={{ uri: me.avatarUrl }} style={{ width: 64, height: 64, borderRadius: 32 }} />
            ) : (
              <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.tint, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 24, fontWeight: '800', color: COLORS.accentDark }}>{me.fullName.charAt(0).toUpperCase()}</Text>
              </View>
            )}
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: COLORS.ink }} numberOfLines={1}>{me.fullName}</Text>
              <Text style={{ fontSize: 13, color: COLORS.inkMuted }} numberOfLines={1}>{me.email}</Text>
              {me.headline ? <Text style={{ fontSize: 13, color: COLORS.inkMuted }} numberOfLines={1}>{me.headline}</Text> : null}
              <Text style={{ alignSelf: 'flex-start', marginTop: 4, fontSize: 11.5, fontWeight: '700', color: COLORS.accentDark, backgroundColor: COLORS.tint, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, overflow: 'hidden' }}>
                {ROLE_LABELS[me.role] ?? me.role}
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <QuickAction label="Sửa hồ sơ" onPress={() => router.push('/edit-profile' as Href)} />
            {me.authProvider !== 'GOOGLE' ? (
              <QuickAction label="Đổi mật khẩu" onPress={() => router.push('/profile/change-password' as Href)} />
            ) : null}
            <QuickAction label="Trang cá nhân" onPress={() => router.push(`/u/${me.id}` as Href)} />
          </View>

          {streak ? (
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-around',
                width: '100%',
                backgroundColor: COLORS.warningTint,
                borderRadius: 12,
                padding: 14,
              }}
            >
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 20, fontWeight: '800', color: COLORS.streakFlame }}>🔥 {streak.currentStreak}</Text>
                <Text style={{ fontSize: 11, color: COLORS.warningInk }}>Chuỗi ngày học</Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 20, fontWeight: '800', color: COLORS.streakFlame }}>{streak.longestStreak}</Text>
                <Text style={{ fontSize: 11, color: COLORS.warningInk }}>Kỷ lục</Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 20, fontWeight: '800', color: COLORS.streakFlame }}>{streak.freezesRemaining}</Text>
                <Text style={{ fontSize: 11, color: COLORS.warningInk }}>Lượt đóng băng</Text>
              </View>
            </View>
          ) : null}

          {/* UI v2: chia menu thành nhóm có tiêu đề, mỗi dòng có icon — dễ dò hơn 1 danh sách 10 dòng liền. */}
          <MenuGroup title="Học tập">
            <MenuRow icon={BookOpen} label="Khoá học của tôi" href={'/my-courses' as Href} />
            <MenuRow icon={WifiOff} label="Ôn tập offline" href={'/offline-flashcards' as Href} />
            <MenuRow icon={Heart} label="Yêu thích" href={'/wishlist' as Href} />
            <MenuRow icon={Award} label="Chứng chỉ của tôi" href={'/certificates' as Href} />
            <MenuRow icon={Radio} label="Buổi live" href={'/live' as Href} />
            <MenuRow icon={Trophy} label="Bảng xếp hạng" href={'/community' as Href} last />
          </MenuGroup>
          <MenuGroup title="Giao dịch">
            <MenuRow icon={Receipt} label="Lịch sử thanh toán" href={'/payments' as Href} />
            <MenuRow icon={ShieldAlert} label="Khiếu nại giao dịch" href={'/disputes' as Href} last />
          </MenuGroup>
          <MenuGroup title="Liên lạc & hỗ trợ">
            <MenuRow icon={MessageSquare} label="Tin nhắn" href={'/messages' as Href} />
            <MenuRow icon={Bell} label="Thông báo" href={'/notifications' as Href} />
            <MenuRow icon={LifeBuoy} label="Trợ giúp & Hỗ trợ" href={'/help' as Href} />
            <MenuRow icon={FileText} label="Thông tin & Chính sách" href={'/legal' as Href} last />
          </MenuGroup>

          <PrivacySection me={me} />
          <SecuritySection />

          <Pressable
            onPress={() =>
              Alert.alert('Xác nhận đăng xuất', 'Bạn có chắc chắn muốn đăng xuất khỏi hệ thống không?', [
                { text: 'Hủy bỏ', style: 'cancel' },
                { text: 'Đăng xuất', style: 'destructive', onPress: () => logout() },
              ])
            }
            accessibilityRole="button"
            style={{ marginTop: 8, borderWidth: 1, borderColor: COLORS.danger, borderRadius: 10, minHeight: 48, alignItems: 'center', justifyContent: 'center', width: '100%', backgroundColor: COLORS.surfaceRaised }}
          >
            <Text style={{ color: COLORS.danger, fontWeight: '600' }}>Đăng xuất</Text>
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
    <View style={{ width: '100%', marginTop: 16, borderTopWidth: 1, borderTopColor: COLORS.lineSoft, paddingTop: 16, gap: 10 }}>
      <Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.ink }}>Quyền riêng tư hồ sơ công khai</Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontSize: 13, color: COLORS.ink }}>Hiện khóa học đã học</Text>
        <Switch
          value={!!me.coursesPublic}
          disabled={updatePrivacy.isPending}
          onValueChange={(checked) => updatePrivacy.mutate({ coursesPublic: checked, wishlistPublic: !!me.wishlistPublic })}
        />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontSize: 13, color: COLORS.ink }}>Hiện danh sách yêu thích</Text>
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

  const [expanded, setExpanded] = useState(false);

  const logoutAll = useMutation({
    mutationFn: () => usersApi.logoutAllOtherDevices(),
  });

  return (
    <View style={{ width: '100%', marginTop: 16, borderTopWidth: 1, borderTopColor: COLORS.lineSoft, paddingTop: 16, gap: 10 }}>
      <Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.ink }}>Bảo mật & Thiết bị</Text>

      {sessions && sessions.length > 0 ? (
        <View style={{ gap: 6 }}>
          {(expanded ? sessions : sessions.slice(0, 3)).map((s, idx) => (
            <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: COLORS.lineSoft, borderRadius: 8, padding: 10 }}>
              <Monitor size={16} color={COLORS.inkFaint} />
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={{ fontSize: 12.5, fontWeight: '600', color: COLORS.ink }}>{s.deviceName}</Text>
                <Text style={{ fontSize: 10.5, color: COLORS.lineDot }}>
                  {s.ip ? `IP: ${s.ip} · ` : ''}Hoạt động: {new Date(s.lastActiveAt).toLocaleString('vi-VN')}
                </Text>
              </View>
            </View>
          ))}
          {sessions.length > 3 && (
            <Pressable onPress={() => setExpanded(!expanded)} style={{ paddingVertical: 8, alignItems: 'center' }}>
              <Text style={{ color: COLORS.accentDark, fontWeight: '600', fontSize: 13 }}>
                {expanded ? 'Thu gọn' : `Xem thêm ${sessions.length - 3} thiết bị`}
              </Text>
            </Pressable>
          )}
        </View>
      ) : null}

      <Pressable
        onPress={() => logoutAll.mutate()}
        disabled={logoutAll.isPending}
        style={{ borderWidth: 1, borderColor: COLORS.lineSoft, borderRadius: 8, padding: 12, alignItems: 'center', opacity: logoutAll.isPending ? 0.6 : 1 }}
      >
        <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.ink }}>
          {logoutAll.isSuccess ? 'Đã đăng xuất khỏi các thiết bị khác' : 'Đăng xuất khỏi tất cả các thiết bị khác'}
        </Text>
      </Pressable>
    </View>
  );
}

const ROLE_LABELS: Record<string, string> = {
  STUDENT: 'Học viên',
  INSTRUCTOR: 'Giảng viên',
  ADMIN: 'Quản trị viên',
};

function QuickAction({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={{ flex: 1, minHeight: 44, borderRadius: 10, borderWidth: 1, borderColor: COLORS.line, backgroundColor: COLORS.surfaceRaised, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 }}
    >
      <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.accentDark }} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

function MenuGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ width: '100%', gap: 6 }}>
      <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.inkFaint, letterSpacing: 0.5, textTransform: 'uppercase', paddingHorizontal: 4 }}>{title}</Text>
      <View style={{ backgroundColor: COLORS.surfaceRaised, borderWidth: 1, borderColor: COLORS.line, borderRadius: 12, overflow: 'hidden' }}>
        {children}
      </View>
    </View>
  );
}

function MenuRow({ icon: Icon, label, href, last }: { icon: LucideIcon; label: string; href: Href; last?: boolean }) {
  return (
    <Pressable
      onPress={() => router.push(href)}
      accessibilityRole="button"
      style={({ pressed }) => ({
        flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48, paddingHorizontal: 14,
        borderBottomWidth: last ? 0 : 1, borderBottomColor: COLORS.lineSoft,
        backgroundColor: pressed ? COLORS.surface : 'transparent',
      })}
    >
      <Icon size={18} color={COLORS.inkMuted} />
      <Text style={{ flex: 1, fontSize: 15, color: COLORS.ink }}>{label}</Text>
      <ChevronRight size={18} color={COLORS.lineDot} />
    </Pressable>
  );
}
