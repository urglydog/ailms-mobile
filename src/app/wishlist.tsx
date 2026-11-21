import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Redirect, router, Stack, type Href } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, Pressable, Text, TextInput, View } from 'react-native';
import { Search } from 'lucide-react-native';
import { cartApi } from '@/lib/api/cart';
import { enrollmentsApi } from '@/lib/api/enrollments';

import { ApiError } from '@/lib/api/client';
import { wishlistApi } from '@/lib/api/wishlist';
import { useAuth } from '@/lib/auth/AuthContext';
import { BackButton } from '@/components/BackButton';
import type { WishlistItem } from '@/types/wishlist';
import { COLORS } from '@/lib/theme/colors';

export default function WishlistScreen() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['wishlist'],
    queryFn: () => wishlistApi.getMine(),
    enabled: isAuthenticated === true,
  });

  const { data: cartItems } = useQuery({
    queryKey: ['cart'],
    queryFn: () => cartApi.list(),
    enabled: isAuthenticated === true,
  });
  const { data: enrolled } = useQuery({
    queryKey: ['enrollments'],
    queryFn: () => enrollmentsApi.getMine(),
    enabled: isAuthenticated === true,
  });
  const [search, setSearch] = useState('');
  const needle = search.trim().toLowerCase();
  const visible = (data ?? []).filter((i) => !needle || i.courseTitle.toLowerCase().includes(needle));

  const addToCart = useMutation({
    mutationFn: (courseId: number) => cartApi.add(courseId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cart'] }),
    onError: (err) => Alert.alert('Lỗi', err instanceof ApiError ? err.message : 'Không thêm được vào giỏ, thử lại sau.'),
  });
  const enrollFree = useMutation({
    mutationFn: (courseId: number) => enrollmentsApi.enrollFree(courseId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['enrollments'] });
      Alert.alert('Thành công', 'Đăng ký thành công!');
    },
    onError: (err) => Alert.alert('Lỗi', err instanceof ApiError ? err.message : 'Không đăng ký được, thử lại sau.'),
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
          <Text style={{ color: COLORS.ink }}>{error instanceof ApiError ? error.message : 'Không tải được danh sách yêu thích.'}</Text>
          <Pressable onPress={() => refetch()}>
            <Text style={{ color: COLORS.accentDark }}>Thử lại</Text>
          </Pressable>
        </View>
      ) : !data || data.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Text style={{ color: COLORS.inkFaint }}>Chưa có khoá học yêu thích nào.</Text>
        </View>
      ) : (
        <FlatList
          data={visible}
          ListHeaderComponent={
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: COLORS.line, borderRadius: 8, paddingHorizontal: 10, backgroundColor: COLORS.surfaceRaised }}>
              <Search size={16} color={COLORS.inkFaint} />
              <TextInput value={search} onChangeText={setSearch} placeholder="Tìm trong danh sách yêu thích…" placeholderTextColor={COLORS.lineDot} style={{ flex: 1, paddingVertical: 9, color: COLORS.ink }} />
            </View>
          }
          ListEmptyComponent={
            <View style={{ alignItems: 'center', padding: 24, gap: 4 }}>
              <Text style={{ color: COLORS.ink, fontWeight: '700' }}>Không tìm thấy khoá học phù hợp</Text>
              <Text style={{ color: COLORS.inkFaint }}>Thử đổi từ khoá khác.</Text>
            </View>
          }
          keyExtractor={(item) => String(item.courseId)}
          refreshing={isRefetching}
          onRefresh={refetch}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          renderItem={({ item }) => (
            <WishlistCard
              item={item}
              inCart={cartItems?.some((c) => c.courseId === item.courseId) ?? false}
              enrolled={enrolled?.some((e) => e.courseId === item.courseId) ?? false}
              busy={addToCart.isPending || enrollFree.isPending}
              onRemove={() => removeMutation.mutate(item.courseId)}
              onAddCart={() => addToCart.mutate(item.courseId)}
              onEnroll={() => enrollFree.mutate(item.courseId)}
            />
          )}
        />
      )}
    </View>
  );
}

function WishlistCard({ item, inCart, enrolled, busy, onRemove, onAddCart, onEnroll }: { item: WishlistItem; inCart: boolean; enrolled: boolean; busy: boolean; onRemove: () => void; onAddCart: () => void; onEnroll: () => void }) {
  return (
    <Pressable
      onPress={() => router.push(`/courses/${item.courseSlug}` as Href)}
      style={{ flexDirection: 'row', borderWidth: 1, borderColor: COLORS.line, borderRadius: 8, overflow: 'hidden' }}
    >
      {item.thumbnailUrl ? (
        <Image source={{ uri: item.thumbnailUrl }} style={{ width: 100, height: 100 }} resizeMode="cover" />
      ) : (
        <View style={{ width: 100, height: 100, backgroundColor: COLORS.lineSoft }} />
      )}
      <View style={{ flex: 1, padding: 10, gap: 4, justifyContent: 'center' }}>
        <Text style={{ color: COLORS.ink, fontWeight: '600' }} numberOfLines={2}>
          {item.courseTitle}
        </Text>
        <Text style={{ color: COLORS.inkMuted, fontSize: 12 }}>{item.instructorName}</Text>
        <Text style={{ color: COLORS.accentDark, fontWeight: '600' }}>
          {item.isFree ? 'Miễn phí' : `${item.finalPrice.toLocaleString('vi-VN')}đ`}
        </Text>
        {enrolled ? (
          <Text style={{ color: COLORS.successInk, fontSize: 12, fontWeight: '600' }}>✓ Đã ghi danh</Text>
        ) : item.isFree ? (
          <Pressable onPress={onEnroll} disabled={busy} style={{ alignSelf: 'flex-start', backgroundColor: COLORS.accent, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 5 }}>
            <Text style={{ color: COLORS.white, fontSize: 12, fontWeight: '700' }}>Đăng ký</Text>
          </Pressable>
        ) : (
          <Pressable onPress={() => !inCart && onAddCart()} disabled={inCart || busy} style={{ alignSelf: 'flex-start', backgroundColor: inCart ? COLORS.successTint : COLORS.accent, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 5 }}>
            <Text style={{ color: inCart ? COLORS.successInk : COLORS.white, fontSize: 12, fontWeight: '700' }}>{inCart ? '✓ Đã có trong giỏ' : 'Thêm vào giỏ'}</Text>
          </Pressable>
        )}
      </View>
      <Pressable onPress={onRemove} style={{ padding: 12, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: COLORS.danger, fontSize: 18 }}>♥</Text>
      </Pressable>
    </Pressable>
  );
}
