import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams, type Href } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { coursesApi } from '@/lib/api/courses';
import { ApiError } from '@/lib/api/client';
import { purchaseCourseWithPayOs } from '@/lib/payment/payosCheckout';
import { BackButton } from '@/components/BackButton';
import type { PaymentRecord } from '@/types/payment';

export default function CheckoutScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const queryClient = useQueryClient();
  const [billingName, setBillingName] = useState('');
  const [billingPhone, setBillingPhone] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PaymentRecord | null>(null);

  const { data: course, isLoading } = useQuery({
    queryKey: ['course', slug],
    queryFn: () => coursesApi.getDetail(slug),
    enabled: !!slug,
  });

  const checkoutMutation = useMutation({
    mutationFn: () =>
      purchaseCourseWithPayOs({
        courseId: course!.id,
        billingName: billingName || undefined,
        billingPhone: billingPhone || undefined,
        couponCode: couponCode || undefined,
        courseAccessPassword: course?.requiresPassword ? password : undefined,
      }),
    onSuccess: (payment) => {
      setError(null);
      setResult(payment);
      if (payment.status === 'PAID') {
        queryClient.invalidateQueries({ queryKey: ['enrollments'] });
      }
    },
    onError: (err: unknown) => {
      setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Thanh toán thất bại, vui lòng thử lại.');
    },
  });

  if (isLoading || !course) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (result) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 }}>
        <Stack.Screen options={{ headerShown: true, title: 'Kết quả thanh toán' }} />
        <Text style={{ fontSize: 20, fontWeight: '700', textAlign: 'center' }}>
          {result.status === 'PAID' ? 'Thanh toán thành công!' : 'Thanh toán không thành công'}
        </Text>
        <Text style={{ color: '#475569', textAlign: 'center' }}>
          {result.status === 'PAID'
            ? `Bạn đã ghi danh khoá học "${course.title}".`
            : 'Giao dịch đã bị huỷ hoặc hết hạn — bạn có thể thử lại.'}
        </Text>
        <Pressable
          onPress={() => (result.status === 'PAID' ? router.replace('/my-courses' as Href) : router.back())}
          style={{ backgroundColor: '#2563EB', borderRadius: 8, padding: 14, paddingHorizontal: 24 }}
        >
          <Text style={{ color: '#fff', fontWeight: '600' }}>{result.status === 'PAID' ? 'Vào khoá học của tôi' : 'Quay lại'}</Text>
        </Pressable>
      </View>
    );
  }

  if (checkoutMutation.isPending) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 }}>
        <ActivityIndicator />
        <Text style={{ color: '#475569', textAlign: 'center' }}>
          Đang chờ xác nhận thanh toán — đừng tắt app, hoàn tất thanh toán trên trình duyệt rồi quay lại đây.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Stack.Screen options={{ headerShown: true, title: 'Thanh toán', headerLeft: () => <BackButton /> }} />
      <Text style={{ fontSize: 18, fontWeight: '700' }}>{course.title}</Text>
      <Text style={{ fontSize: 22, fontWeight: '700', color: '#2563EB' }}>{course.finalPrice.toLocaleString('vi-VN')}đ</Text>

      <TextInput
        placeholder="Họ tên xuất hoá đơn (không bắt buộc)"
        value={billingName}
        onChangeText={setBillingName}
        style={{ borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 12 }}
      />
      <TextInput
        placeholder="Số điện thoại (không bắt buộc)"
        value={billingPhone}
        onChangeText={setBillingPhone}
        keyboardType="phone-pad"
        style={{ borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 12 }}
      />
      <TextInput
        placeholder="Mã giảm giá (không bắt buộc)"
        value={couponCode}
        onChangeText={setCouponCode}
        autoCapitalize="characters"
        style={{ borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 12 }}
      />
      {course.requiresPassword ? (
        <TextInput
          placeholder="Mật khẩu khoá học"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={{ borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 12 }}
        />
      ) : null}

      {error ? <Text style={{ color: '#DC2626' }}>{error}</Text> : null}

      <Pressable
        onPress={() => checkoutMutation.mutate()}
        style={{ backgroundColor: '#2563EB', borderRadius: 8, padding: 14, alignItems: 'center' }}
      >
        <Text style={{ color: '#fff', fontWeight: '600' }}>Thanh toán qua PayOS</Text>
      </Pressable>
    </ScrollView>
  );
}
