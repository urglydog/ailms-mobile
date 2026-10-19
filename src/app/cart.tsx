import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack, type Href } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, Text, View, Image } from 'react-native';
import { Trash2 } from 'lucide-react-native';

import { cartApi } from '@/lib/api/cart';
import { ApiError } from '@/lib/api/client';
import { BackButton } from '@/components/BackButton';
import type { CartItem } from '@/types/cart';
import { COLORS } from '@/lib/theme/colors';

export default function CartScreen() {
  const queryClient = useQueryClient();

  const { data: cartItems, isLoading, error } = useQuery({
    queryKey: ['cart'],
    queryFn: () => cartApi.list(),
  });

  const removeMutation = useMutation({
    mutationFn: (courseId: number) => cartApi.remove(courseId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cart'] }),
  });

  const totalOriginalPrice = cartItems?.reduce((sum, item) => sum + item.price, 0) || 0;
  const totalFinalPrice = cartItems?.reduce((sum, item) => sum + item.finalPrice, 0) || 0;
  const isDiscounted = totalFinalPrice < totalOriginalPrice;

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.surface }}>
      <Stack.Screen options={{ headerShown: true, title: 'Giỏ hàng', headerLeft: () => <BackButton /> }} />

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator />
        </View>
      ) : error ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 }}>
          <Text>{error instanceof ApiError ? error.message : 'Không tải được giỏ hàng.'}</Text>
        </View>
      ) : !cartItems || cartItems.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Text style={{ color: COLORS.inkFaint, fontSize: 16 }}>Giỏ hàng của bạn đang trống.</Text>
          <Pressable onPress={() => router.push('/courses' as Href)} style={{ marginTop: 16, backgroundColor: COLORS.accent, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 }}>
            <Text style={{ color: 'white', fontWeight: '600' }}>Khám phá khoá học</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
            {cartItems.map((item) => (
              <View key={item.courseId} style={{ flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: COLORS.lineSoft, gap: 12 }}>
                {item.thumbnailUrl ? (
                  <Image source={{ uri: item.thumbnailUrl }} style={{ width: 80, height: 80, borderRadius: 8 }} />
                ) : (
                  <View style={{ width: 80, height: 80, borderRadius: 8, backgroundColor: COLORS.lineSoft }} />
                )}
                <View style={{ flex: 1, justifyContent: 'space-between' }}>
                  <View>
                    <Text numberOfLines={2} style={{ fontWeight: '700', fontSize: 14, color: COLORS.ink }}>{item.courseTitle}</Text>
                    <Text style={{ fontSize: 12, color: COLORS.inkFaint, marginTop: 4 }}>{item.instructorName}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                    <View>
                      <Text style={{ fontWeight: '800', fontSize: 16, color: COLORS.accent }}>
                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.finalPrice)}
                      </Text>
                      {item.discountPercent ? (
                        <Text style={{ fontSize: 12, color: COLORS.lineDot, textDecorationLine: 'line-through' }}>
                          {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.price)}
                        </Text>
                      ) : null}
                    </View>
                    <Pressable 
                      onPress={() => removeMutation.mutate(item.courseId)}
                      disabled={removeMutation.isPending}
                      style={{ padding: 8 }}
                    >
                      <Trash2 size={18} color={removeMutation.isPending ? COLORS.lineDot : '#EF4444'} />
                    </Pressable>
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>

          <View style={{ padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: COLORS.lineSoft, gap: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 15, color: COLORS.inkMuted, fontWeight: '600' }}>Tổng cộng:</Text>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 22, fontWeight: '800', color: COLORS.accent }}>
                  {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(totalFinalPrice)}
                </Text>
                {isDiscounted ? (
                  <Text style={{ fontSize: 13, color: COLORS.lineDot, textDecorationLine: 'line-through' }}>
                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(totalOriginalPrice)}
                  </Text>
                ) : null}
              </View>
            </View>
            <Pressable 
              onPress={() => router.push('/checkout/cart' as Href)}
              style={{ backgroundColor: COLORS.accent, paddingVertical: 14, borderRadius: 8, alignItems: 'center' }}
            >
              <Text style={{ color: 'white', fontWeight: '700', fontSize: 15 }}>Tiến hành thanh toán</Text>
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}
