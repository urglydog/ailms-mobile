import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams, type Href } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { coursesApi } from '@/lib/api/courses';
import { ApiError } from '@/lib/api/client';
import { PaymentAbortedError, purchaseCourseWithPayOs } from '@/lib/payment/payosCheckout';
import { paymentsApi } from '@/lib/api/payments';
import { CouponSection } from '@/components/checkout/CouponSection';
import { useCheckoutCoupons } from '@/hooks/useCheckoutCoupons';
import { BackButton } from '@/components/BackButton';
import type { PaymentRecord } from '@/types/payment';
import { COLORS } from '@/lib/theme/colors';

export default function CheckoutScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const queryClient = useQueryClient();
  const [billingName, setBillingName] = useState('');
  const [billingPhone, setBillingPhone] = useState('');
  // Đơn đang chờ thanh toán — để nút "Hủy thanh toán" gọi được API hủy và dừng vòng poll.
  const createdRef = useRef<string | null>(null);
  const stopRef = useRef(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PaymentRecord | null>(null);

  const { data: course, isLoading } = useQuery({
    queryKey: ['course', slug],
    queryFn: () => coursesApi.getDetail(slug),
    enabled: !!slug,
  });

  const coupons = useCheckoutCoupons(course ? [course.id] : []);
  const priced = course ? coupons.prices.get(course.id) : undefined;
  const finalPrice = priced?.finalPrice ?? course?.price ?? 0;

  const checkoutMutation = useMutation({
    mutationFn: () => {
      stopRef.current = false;
      createdRef.current = null;
      return purchaseCourseWithPayOs(
        {
          courseId: course!.id,
          billingName: billingName || undefined,
          billingPhone: billingPhone || undefined,
          ...coupons.paymentCouponParams,
          courseAccessPassword: course?.requiresPassword ? password : undefined,
        },
        { onCreated: (ref) => { createdRef.current = ref; }, shouldStop: () => stopRef.current },
      );
    },
    onSuccess: (payment) => {
      setError(null);
      setResult(payment);
      if (payment.status === 'PAID') {
        queryClient.invalidateQueries({ queryKey: ['enrollments'] });
      }
    },
    onError: (err: unknown) => {
      if (err instanceof PaymentAbortedError) return;
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
        <Text style={{ color: COLORS.inkMuted, textAlign: 'center' }}>
          {result.status === 'PAID'
            ? `Bạn đã ghi danh khoá học "${course.title}".`
            : 'Giao dịch đã bị huỷ hoặc hết hạn — bạn có thể thử lại.'}
        </Text>
        <Pressable
          onPress={() => (result.status === 'PAID' ? router.replace('/my-courses' as Href) : router.back())}
          style={{ backgroundColor: COLORS.accent, borderRadius: 8, padding: 14, paddingHorizontal: 24 }}
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
        <Text style={{ color: COLORS.inkMuted, textAlign: 'center' }}>
          Đang chờ xác nhận thanh toán — đừng tắt app, hoàn tất thanh toán trên trình duyệt rồi quay lại đây.
        </Text>
        <Pressable
          onPress={() => {
            stopRef.current = true;
            const ref = createdRef.current;
            if (ref) paymentsApi.cancel(ref).catch(() => {});
            checkoutMutation.reset();
          }}
          style={{ borderWidth: 1, borderColor: COLORS.danger, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 20, marginTop: 8 }}
        >
          <Text style={{ color: COLORS.danger, fontWeight: '600' }}>Hủy thanh toán</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Stack.Screen options={{ headerShown: true, title: 'Thanh toán', headerLeft: () => <BackButton /> }} />
      <Text style={{ fontSize: 18, fontWeight: '700' }}>{course.title}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
        <Text style={{ fontSize: 22, fontWeight: '700', color: COLORS.accent }}>{finalPrice.toLocaleString('vi-VN')}đ</Text>
        {finalPrice < course.price ? (
          <Text style={{ color: COLORS.inkFaint, textDecorationLine: 'line-through' }}>{course.price.toLocaleString('vi-VN')}đ</Text>
        ) : null}
      </View>

      <TextInput
        placeholder="Họ tên xuất hoá đơn (không bắt buộc)"
        value={billingName}
        onChangeText={setBillingName}
        style={{ borderWidth: 1, borderColor: COLORS.line, borderRadius: 8, padding: 12 }}
      />
      <TextInput
        placeholder="Số điện thoại (không bắt buộc)"
        value={billingPhone}
        onChangeText={setBillingPhone}
        keyboardType="phone-pad"
        style={{ borderWidth: 1, borderColor: COLORS.line, borderRadius: 8, padding: 12 }}
      />
      <CouponSection
        available={coupons.available}
        loading={coupons.loading}
        selectedId={coupons.selectedId}
        onSelect={coupons.setSelectedId}
        appliedCode={coupons.appliedCode}
        applying={coupons.applying}
        codeError={coupons.codeError}
        onApplyCode={(c) => void coupons.applyCode(c)}
        onRemoveCode={coupons.removeCode}
      />
      {course.requiresPassword ? (
        <TextInput
          placeholder="Mật khẩu khoá học"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={{ borderWidth: 1, borderColor: COLORS.line, borderRadius: 8, padding: 12 }}
        />
      ) : null}

      {error ? <Text style={{ color: COLORS.danger }}>{error}</Text> : null}

      <Pressable
        onPress={() => checkoutMutation.mutate()}
        style={{ backgroundColor: COLORS.accent, borderRadius: 8, padding: 14, alignItems: 'center' }}
      >
        <Text style={{ color: '#fff', fontWeight: '600' }}>Thanh toán qua PayOS</Text>
      </Pressable>
    </ScrollView>
  );
}
