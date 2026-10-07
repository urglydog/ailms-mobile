import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Redirect, router, Stack, type Href } from 'expo-router';
import { ActivityIndicator, FlatList, Image, Pressable, Text, View } from 'react-native';

import { ApiError } from '@/lib/api/client';
import { wishlistApi } from '@/lib/api/wishlist';
import { useAuth } from '@/lib/auth/AuthContext';
import { BackButton } from '@/components/BackButton';
import type { WishlistItem } from '@/types/wishlist';

export default function WishlistScreen() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['wishlist'],
    queryFn: () => wishlistApi.getMine(),
    enabled: isAuthenticated === true,
  });

  const removeMutation = useMutation({
    mutationFn: (courseId: number) => wishlistApi.removeItem(courseId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wishlist'] }),
  });

  if (isAuthenticated === false) {
    return <Redirect href="/login" />;
  }

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ headerShown: true, title: 'Yêu thích', headerLeft: () => <BackButton /> }} />

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator />
        </View>
      ) : error ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 }}>
          <Text>{error instanceof ApiError ? error.message : 'Không tải được danh sách yêu thích.'}</Text>
          <Pressable onPress={() => refetch()}>
            <Text style={{ color: '#2563EB' }}>Thử lại</Text>
          </Pressable>
        </View>
      ) : !data || data.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Text style={{ color: '#64748B' }}>Chưa có khoá học yêu thích nào.</Text>
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => String(item.courseId)}
          refreshing={isRefetching}
          onRefresh={refetch}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          renderItem={({ item }) => (
            <WishlistCard item={item} onRemove={() => removeMutation.mutate(item.courseId)} />
          )}
        />
      )}
    </View>
  );
}

function WishlistCard({ item, onRemove }: { item: WishlistItem; onRemove: () => void }) {
  return (
    <Pressable
      onPress={() => router.push(`/courses/${item.courseSlug}` as Href)}
      style={{ flexDirection: 'row', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, overflow: 'hidden' }}
    >
      {item.thumbnailUrl ? (
        <Image source={{ uri: item.thumbnailUrl }} style={{ width: 100, height: 100 }} resizeMode="cover" />
      ) : (
        <View style={{ width: 100, height: 100, backgroundColor: '#E2E8F0' }} />
      )}
      <View style={{ flex: 1, padding: 10, gap: 4, justifyContent: 'center' }}>
        <Text style={{ fontWeight: '600' }} numberOfLines={2}>
          {item.courseTitle}
        </Text>
        <Text style={{ color: '#475569', fontSize: 12 }}>{item.instructorName}</Text>
        <Text style={{ color: '#2563EB', fontWeight: '600' }}>
          {item.isFree ? 'Miễn phí' : `${item.finalPrice.toLocaleString('vi-VN')}đ`}
        </Text>
      </View>
      <Pressable onPress={onRemove} style={{ padding: 12, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#DC2626', fontSize: 18 }}>♥</Text>
      </Pressable>
    </Pressable>
  );
}
