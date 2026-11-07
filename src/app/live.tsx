import { useQuery } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Radio } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, Text, View } from 'react-native';

import { BackButton } from '@/components/BackButton';
import { ApiError } from '@/lib/api/client';
import { liveViewApi } from '@/lib/api/liveView';
import { useAuth } from '@/lib/auth/AuthContext';
import { COLORS } from '@/lib/theme/colors';
import { WEB_URL } from '@/lib/webUrl';
import type { LiveFeedItem } from '@/types/courseDetailExtras';

type FeedTab = 'public' | 'enrolled';

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function languageName(code: string): string {
  try {
    return new Intl.DisplayNames(['vi'], { type: 'language' }).of(code) ?? code;
  } catch {
    return code;
  }
}

/** Trang khám phá buổi Live — port từ `fe/app/(public)/live/page.tsx`. Xem live thật mở bằng trình duyệt. */
export default function LiveFeedScreen() {
  const { isAuthenticated } = useAuth();
  const [tab, setTab] = useState<FeedTab>('public');

  const feed = useQuery({
    queryKey: ['live-feed', tab],
    queryFn: () => (tab === 'public' ? liveViewApi.listPublicFeed() : liveViewApi.listEnrolledFeed()),
    enabled: tab === 'public' || isAuthenticated === true,
    refetchInterval: 30000,
  });

  const tabs: { value: FeedTab; label: string }[] = [
    { value: 'public', label: 'Công khai' },
    { value: 'enrolled', label: 'Khóa học của tôi' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.surface }}>
      <Stack.Screen options={{ headerShown: true, title: 'Buổi live', headerLeft: () => <BackButton /> }} />
      <View style={{ flexDirection: 'row', gap: 6, padding: 12 }}>
        {tabs.map((t) => (
          <Pressable
            key={t.value}
            onPress={() => setTab(t.value)}
            style={{ paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999, backgroundColor: tab === t.value ? COLORS.accent : '#fff', borderWidth: 1, borderColor: tab === t.value ? COLORS.accent : COLORS.line }}
          >
            <Text style={{ color: tab === t.value ? '#fff' : COLORS.inkMuted, fontWeight: '600' }}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      {tab === 'enrolled' && isAuthenticated !== true ? (
        <Text style={{ textAlign: 'center', color: COLORS.inkFaint, marginTop: 40 }}>Đăng nhập để xem buổi live của các khóa bạn đã ghi danh.</Text>
      ) : feed.isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator />
        </View>
      ) : feed.error ? (
        <Text style={{ textAlign: 'center', color: COLORS.danger, margin: 24 }}>
          {feed.error instanceof ApiError ? feed.error.message : 'Không tải được danh sách buổi live.'}
        </Text>
      ) : (
        <FlatList
          data={feed.data ?? []}
          keyExtractor={(i) => String(i.id)}
          contentContainerStyle={{ padding: 12, gap: 12 }}
          refreshing={feed.isRefetching}
          onRefresh={() => void feed.refetch()}
          ListEmptyComponent={
            <Text style={{ textAlign: 'center', color: COLORS.inkFaint, marginTop: 40 }}>
              {tab === 'public' ? 'Hiện chưa có buổi live công khai nào đang hoặc sắp diễn ra.' : 'Các khóa bạn đã ghi danh chưa có buổi live nào.'}
            </Text>
          }
          renderItem={({ item }) => <LiveCard item={item} />}
        />
      )}
    </View>
  );
}

function LiveCard({ item }: { item: LiveFeedItem }) {
  const isLive = item.status === 'LIVE';
  return (
    <Pressable
      onPress={() => void WebBrowser.openBrowserAsync(`${WEB_URL}/live/${item.id}`)}
      style={{ backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: COLORS.lineSoft, overflow: 'hidden' }}
    >
      <View style={{ aspectRatio: 4 / 3, backgroundColor: COLORS.lineSoft }}>
        {item.thumbnailUrl ? <Image source={{ uri: item.thumbnailUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" /> : null}
        <View style={{ position: 'absolute', left: 8, top: 8, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: isLive ? COLORS.danger : COLORS.inkMuted, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 }}>
          {isLive ? <Radio size={12} color="#fff" /> : null}
          <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>
            {isLive ? 'LIVE' : item.scheduledAt ? formatDateTime(item.scheduledAt) : 'Sắp diễn ra'}
          </Text>
        </View>
      </View>
      <View style={{ padding: 12, gap: 2 }}>
        <Text style={{ fontWeight: '700', color: COLORS.ink }} numberOfLines={2}>{item.title}</Text>
        <Text style={{ fontSize: 12, color: COLORS.inkMuted }} numberOfLines={1}>{item.courseTitle}</Text>
        <Text style={{ fontSize: 12, color: COLORS.inkFaint }}>
          {item.instructorName} · {languageName(item.sourceLanguage)}
        </Text>
      </View>
    </Pressable>
  );
}
