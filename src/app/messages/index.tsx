import { useQuery } from '@tanstack/react-query';
import { router, Stack, type Href } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, Text, TextInput, View } from 'react-native';

import { BackButton } from '@/components/BackButton';
import { ApiError } from '@/lib/api/client';
import { messageApi } from '@/lib/api/communication';
import { COLORS } from '@/lib/theme/colors';

export function Avatar({ name, url, size }: { name: string; url: string | null; size: number }) {
  return url ? (
    <Image source={{ uri: url }} style={{ width: size, height: size, borderRadius: size / 2 }} />
  ) : (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: COLORS.lineSoft, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: COLORS.inkMuted, fontWeight: '700' }}>{name.charAt(0).toUpperCase()}</Text>
    </View>
  );
}

export default function MessagesScreen() {
  const [search, setSearch] = useState('');
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['messages', 'conversations'],
    queryFn: () => messageApi.listConversations(),
    refetchInterval: 15000,
  });

  const visible = useMemo(() => {
    const list = [...(data ?? [])].sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
    const q = search.trim().toLowerCase();
    return q
      ? list.filter((c) => c.otherUserName.toLowerCase().includes(q) || (c.lastMessagePreview ?? '').toLowerCase().includes(q))
      : list;
  }, [data, search]);

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.surface }}>
      <Stack.Screen options={{ headerShown: true, title: 'Tin nhắn', headerLeft: () => <BackButton /> }} />
      <View style={{ padding: 12 }}>
        <TextInput placeholderTextColor={COLORS.inkFaint}
          placeholder="Tìm theo tên, nội dung..."
          value={search}
          onChangeText={setSearch}
          style={{ borderWidth: 1, borderColor: COLORS.line, borderRadius: 8, padding: 10, backgroundColor: COLORS.surfaceRaised, color: COLORS.ink }}
        />
      </View>
      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator />
        </View>
      ) : error ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 }}>
          <Text style={{ color: COLORS.ink }}>{error instanceof ApiError ? error.message : 'Không tải được tin nhắn.'}</Text>
          <Pressable onPress={() => refetch()}>
            <Text style={{ color: COLORS.accentDark }}>Thử lại</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(c) => String(c.id)}
          ListEmptyComponent={
            <Text style={{ textAlign: 'center', color: COLORS.inkFaint, marginTop: 40 }}>
              {data && data.length > 0 ? 'Không tìm thấy hội thoại phù hợp.' : 'Chưa có hội thoại nào. Bắt đầu từ tab Tổng quan của khóa học đã ghi danh.'}
            </Text>
          }
          renderItem={({ item: c }) => (
            <Pressable
              onPress={() => router.push(`/messages/${c.id}` as Href)}
              style={{ flexDirection: 'row', gap: 12, padding: 14, backgroundColor: COLORS.surfaceRaised, borderBottomWidth: 1, borderBottomColor: COLORS.lineSoft }}
            >
              <Avatar name={c.otherUserName} url={c.otherUserAvatarUrl} size={44} />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                  <Text style={{ fontWeight: '700', color: COLORS.ink, flex: 1 }} numberOfLines={1}>{c.otherUserName}</Text>
                  {c.unreadCount > 0 ? (
                    <View style={{ backgroundColor: COLORS.accent, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 }}>
                      <Text style={{ color: COLORS.white, fontSize: 11, fontWeight: '700' }}>{c.unreadCount > 9 ? '9+' : c.unreadCount}</Text>
                    </View>
                  ) : null}
                </View>
                {c.courseTitle ? <Text style={{ fontSize: 11, color: COLORS.inkFaint }} numberOfLines={1}>{c.courseTitle}</Text> : null}
                {c.lastMessagePreview ? <Text style={{ fontSize: 13, color: COLORS.inkMuted, marginTop: 2 }} numberOfLines={1}>{c.lastMessagePreview}</Text> : null}
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}
