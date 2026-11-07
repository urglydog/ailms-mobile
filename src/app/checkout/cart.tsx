import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack, type Href } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { cartApi } from '@/lib/api/cart';
import { ApiError } from '@/lib/api/client';
import { PaymentAbortedError, purchaseBatchWithPayOs } from '@/lib/payment/payosCheckout';
import { paymentsApi } from '@/lib/api/payments';
import { CouponSection } from '@/components/checkout/CouponSection';
import { useCheckoutCoupons } from '@/hooks/useCheckoutCoupons';
import { BackButton } from '@/components/BackButton';
import type { PaymentRecord } from '@/types/payment';
import { COLORS } from '@/lib/theme/colors';

export default function CartCheckoutScreen() {
  const queryClient = useQueryClient();
  const [billingName, setBillingName] = useState('');
  const [billingPhone, setBillingPhone] = useState('');
  const createdRef = useRef<string | null>(null);
  const stopRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PaymentRecord | null>(null);

  const { data: cartItems, isLoading } = useQuery({
    queryKey: ['cart'],
    queryFn: () => cartApi.list(),
  });

  const coupons = useCheckoutCoupons((cartItems ?? []).map((i) => i.courseId));

  const checkoutMutation = useMutation({
    mutationFn: () => {
      stopRef.current = false;
      createdRef.current = null;
      return purchaseBatchWithPayOs(
        {
          courseIds: cartItems!.map(i => i.courseId),
          billingName: billingName || undefined,
          billingPhone: billingPhone || undefined,
          ...coupons.paymentCouponParams,
        },
        { onCreated: (ref) => { createdRef.current = ref; }, shouldStop: () => stopRef.current },
      );
    },
    onSuccess: (payment) => {
      setError(null);
      setResult(payment);
      if (payment.status === 'PAID') {
        queryClient.invalidateQueries({ queryKey: ['enrollments'] });
        queryClient.invalidateQueries({ queryKey: ['cart'] });
      }
    },
    onError: (err: unknown) => {
      if (err instanceof PaymentAbortedError) return;
      setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Thanh toán thất bại, vui lòng thử lại.');
    },
  });

  if (isLoading || !cartItems) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (cartItems.length === 0 && !result) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Stack.Screen options={{ headerShown: true, title: 'Thanh toán' }} />
        <Text style={{ color: COLORS.inkFaint }}>Giỏ hàng trống.</Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: COLORS.accent }}>Quay lại</Text>
        </Pressable>
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
            ? `Bạn đã ghi danh thành công các khoá học trong giỏ.`
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

  const totalOriginal = cartItems.reduce((sum, item) => sum + item.price, 0);
  const totalFinalPrice = cartItems.reduce((sum, item) => sum + (coupons.prices.get(item.courseId)?.finalPrice ?? item.price), 0);

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Stack.Screen options={{ headerShown: true, title: 'Thanh toán giỏ hàng', headerLeft: () => <BackButton /> }} />
      <Text style={{ fontSize: 18, fontWeight: '700' }}>Thanh toán {cartItems.length} khoá học</Text>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
        <Text style={{ fontSize: 22, fontWeight: '700', color: COLORS.accent }}>{totalFinalPrice.toLocaleString('vi-VN')}đ</Text>
        {totalFinalPrice < totalOriginal ? (
          <Text style={{ color: COLORS.inkFaint, textDecorationLine: 'line-through' }}>{totalOriginal.toLocaleString('vi-VN')}đ</Text>
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
