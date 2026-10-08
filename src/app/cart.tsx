import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack, type Href } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, Text, View, Image } from 'react-native';
import { Trash2 } from 'lucide-react-native';

import { cartApi } from '@/lib/api/cart';
import { ApiError } from '@/lib/api/client';
import { BackButton } from '@/components/BackButton';
import type { CartItem } from '@/types/cart';

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
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
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
          <Text style={{ color: '#64748B', fontSize: 16 }}>Giỏ hàng của bạn đang trống.</Text>
          <Pressable onPress={() => router.push('/courses' as Href)} style={{ marginTop: 16, backgroundColor: '#2563EB', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 }}>
            <Text style={{ color: 'white', fontWeight: '600' }}>Khám phá khoá học</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
            {cartItems.map((item) => (
              <View key={item.courseId} style={{ flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#E2E8F0', gap: 12 }}>
                {item.thumbnailUrl ? (
                  <Image source={{ uri: item.thumbnailUrl }} style={{ width: 80, height: 80, borderRadius: 8 }} />
                ) : (
                  <View style={{ width: 80, height: 80, borderRadius: 8, backgroundColor: '#E2E8F0' }} />
                )}
                <View style={{ flex: 1, justifyContent: 'space-between' }}>
                  <View>
                    <Text numberOfLines={2} style={{ fontWeight: '700', fontSize: 14, color: '#0F172A' }}>{item.courseTitle}</Text>
                    <Text style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>{item.instructorName}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                    <View>
                      <Text style={{ fontWeight: '800', fontSize: 16, color: '#2563EB' }}>
                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.finalPrice)}
                      </Text>
                      {item.discountPercent ? (
                        <Text style={{ fontSize: 12, color: '#94A3B8', textDecorationLine: 'line-through' }}>
                          {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.price)}
                        </Text>
                      ) : null}
                    </View>
                    <Pressable 
                      onPress={() => removeMutation.mutate(item.courseId)}
                      disabled={removeMutation.isPending}
                      style={{ padding: 8 }}
                    >
                      <Trash2 size={18} color={removeMutation.isPending ? '#94A3B8' : '#EF4444'} />
                    </Pressable>
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>

          <View style={{ padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E2E8F0', gap: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 15, color: '#475569', fontWeight: '600' }}>Tổng cộng:</Text>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 22, fontWeight: '800', color: '#2563EB' }}>
                  {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(totalFinalPrice)}
                </Text>
                {isDiscounted ? (
                  <Text style={{ fontSize: 13, color: '#94A3B8', textDecorationLine: 'line-through' }}>
                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(totalOriginalPrice)}
                  </Text>
                ) : null}
              </View>
            </View>
            <Pressable 
              onPress={() => router.push('/checkout/cart' as Href)}
              style={{ backgroundColor: '#2563EB', paddingVertical: 14, borderRadius: 8, alignItems: 'center' }}
            >
              <Text style={{ color: 'white', fontWeight: '700', fontSize: 15 }}>Tiến hành thanh toán</Text>
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}
