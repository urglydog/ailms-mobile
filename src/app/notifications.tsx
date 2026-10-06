import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';

import { ApiError } from '@/lib/api/client';
import { notificationsApi } from '@/lib/api/notifications';
import type { Notification } from '@/types/notification';

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

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Thông báo',
          headerRight: () =>
            unreadCount > 0 ? (
              <Pressable onPress={() => markAllReadMutation.mutate()}>
                <Text style={{ color: '#2563EB' }}>Đọc hết</Text>
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
            <Text style={{ color: '#2563EB' }}>Thử lại</Text>
          </Pressable>
        </View>
      ) : !data || data.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Text style={{ color: '#64748B' }}>Chưa có thông báo nào.</Text>
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => String(item.id)}
          refreshing={isRefetching}
          onRefresh={refetch}
          renderItem={({ item }) => (
            <NotificationRow item={item} onPress={() => !item.isRead && markReadMutation.mutate(item.id)} />
          )}
        />
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
        borderBottomColor: '#E2E8F0',
        backgroundColor: item.isRead ? '#fff' : '#EFF6FF',
      }}
    >
      {!item.isRead ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#2563EB', marginTop: 6 }} /> : <View style={{ width: 8 }} />}
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontWeight: '600' }}>{item.title}</Text>
        <Text style={{ color: '#475569' }}>{item.content}</Text>
        <Text style={{ color: '#94A3B8', fontSize: 12 }}>{timeAgo(item.createdAt)}</Text>
      </View>
    </Pressable>
  );
}
