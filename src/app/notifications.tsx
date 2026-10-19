import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';

import { ApiError } from '@/lib/api/client';
import { notificationsApi } from '@/lib/api/notifications';
import { BackButton } from '@/components/BackButton';
import type { Notification } from '@/types/notification';
import { COLORS } from '@/lib/theme/colors';

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'vừa xong';
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  return `${Math.floor(hours / 24)} ngày trước`;
}

export default function NotificationsScreen() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.getAll(),
  });

  const markReadMutation = useMutation({
    mutationFn: (id: number) => notificationsApi.markAsRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const unreadCount = data?.filter((n) => !n.isRead).length ?? 0;
  const filteredData = activeTab === 'all' ? data : data?.filter(n => !n.isRead);

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Thông báo',
          headerLeft: () => <BackButton />,
          headerRight: () =>
            unreadCount > 0 ? (
              <Pressable onPress={() => markAllReadMutation.mutate()}>
                <Text style={{ color: COLORS.accent }}>Đọc hết</Text>
              </Pressable>
            ) : null,
        }}
      />

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator />
        </View>
      ) : error ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 }}>
          <Text>{error instanceof ApiError ? error.message : 'Không tải được thông báo.'}</Text>
          <Pressable onPress={() => refetch()}>
            <Text style={{ color: COLORS.accent }}>Thử lại</Text>
          </Pressable>
        </View>
      ) : !data || data.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Text style={{ color: COLORS.inkFaint }}>Chưa có thông báo nào.</Text>
        </View>
      ) : (
        <>
          <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: COLORS.lineSoft, backgroundColor: '#fff' }}>
            <Pressable
              onPress={() => setActiveTab('all')}
              style={{ flex: 1, alignItems: 'center', paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: activeTab === 'all' ? COLORS.accent : 'transparent' }}
            >
              <Text style={{ fontWeight: '600', color: activeTab === 'all' ? COLORS.accent : COLORS.inkFaint }}>Tất cả</Text>
            </Pressable>
            <Pressable
              onPress={() => setActiveTab('unread')}
              style={{ flex: 1, alignItems: 'center', paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: activeTab === 'unread' ? COLORS.accent : 'transparent' }}
            >
              <Text style={{ fontWeight: '600', color: activeTab === 'unread' ? COLORS.accent : COLORS.inkFaint }}>Chưa đọc</Text>
            </Pressable>
          </View>
          <FlatList
            data={filteredData}
            keyExtractor={(item) => String(item.id)}
            refreshing={isRefetching}
            onRefresh={refetch}
            ListEmptyComponent={
              <View style={{ alignItems: 'center', justifyContent: 'center', padding: 40 }}>
                <Text style={{ color: COLORS.inkFaint }}>Không có thông báo chưa đọc.</Text>
              </View>
            }
            renderItem={({ item }) => (
              <NotificationRow item={item} onPress={() => !item.isRead && markReadMutation.mutate(item.id)} />
            )}
          />
        </>
      )}
    </View>
  );
}

function NotificationRow({ item, onPress }: { item: Notification; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        gap: 10,
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.lineSoft,
        backgroundColor: item.isRead ? '#fff' : COLORS.tint,
      }}
    >
      {!item.isRead ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.accent, marginTop: 6 }} /> : <View style={{ width: 8 }} />}
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontWeight: '600' }}>{item.title}</Text>
        <Text style={{ color: COLORS.inkMuted }}>{item.content}</Text>
        <Text style={{ color: COLORS.lineDot, fontSize: 12 }}>{timeAgo(item.createdAt)}</Text>
      </View>
    </Pressable>
  );
}
