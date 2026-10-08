import { useQuery } from '@tanstack/react-query';
import { Stack, router } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { paymentsApi } from '@/lib/api/payments';
import { ApiError } from '@/lib/api/client';
import { BackButton } from '@/components/BackButton';
import type { PaymentRecord } from '@/types/payment';

export default function PaymentsScreen() {
  const { data: payments, isLoading, error, refetch } = useQuery({
    queryKey: ['my-payments'],
    queryFn: () => paymentsApi.listMine(),
  });

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <Stack.Screen options={{ headerShown: true, title: 'Lịch sử thanh toán', headerLeft: () => <BackButton /> }} />

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator />
        </View>
      ) : error ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 }}>
          <Text>{error instanceof ApiError ? error.message : 'Không tải được lịch sử thanh toán.'}</Text>
          <Pressable onPress={() => refetch()}>
            <Text style={{ color: '#2563EB' }}>Thử lại</Text>
          </Pressable>
        </View>
      ) : !payments || payments.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Text style={{ color: '#64748B' }}>Chưa có giao dịch nào.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
          {payments.map((p) => (
            <PaymentCard key={p.txnRef} payment={p} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function PaymentCard({ payment }: { payment: PaymentRecord }) {
  const isPaid = payment.status === 'PAID';
  const isPending = payment.status === 'PENDING';
  const isFailed = payment.status === 'FAILED' || payment.status === 'EXPIRED';

  const statusColor = isPaid ? '#16A34A' : isPending ? '#D97706' : '#DC2626';
  const statusBg = isPaid ? '#DCFCE7' : isPending ? '#FEF3C7' : '#FEE2E2';
  const statusText = isPaid ? 'Thành công' : isPending ? 'Đang chờ' : 'Thất bại/Hết hạn';

  return (
    <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E2E8F0', gap: 8 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Text style={{ fontWeight: '700', fontSize: 15, color: '#0F172A', flex: 1, marginRight: 8 }}>
          {payment.courseTitle}
        </Text>
        <View style={{ backgroundColor: statusBg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 }}>
          <Text style={{ color: statusColor, fontSize: 11, fontWeight: '700' }}>{statusText}</Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
        <Text style={{ fontWeight: '800', fontSize: 18, color: '#2563EB' }}>
          {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(payment.amount)}
        </Text>
        <Text style={{ color: '#64748B', fontSize: 12, fontWeight: '600' }}>{payment.paymentMethod}</Text>
      </View>

      <View style={{ height: 1, backgroundColor: '#F1F5F9', marginVertical: 4 }} />

      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ color: '#64748B', fontSize: 12 }}>Mã giao dịch</Text>
        <Text style={{ color: '#0F172A', fontSize: 12, fontWeight: '500' }}>{payment.txnRef}</Text>
      </View>

      {payment.paidAt ? (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ color: '#64748B', fontSize: 12 }}>Ngày thanh toán</Text>
          <Text style={{ color: '#0F172A', fontSize: 12, fontWeight: '500' }}>
            {new Date(payment.paidAt).toLocaleString('vi-VN')}
          </Text>
        </View>
      ) : null}

      {payment.couponCode && payment.discountAmount ? (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ color: '#64748B', fontSize: 12 }}>Mã giảm giá ({payment.couponCode})</Text>
          <Text style={{ color: '#16A34A', fontSize: 12, fontWeight: '500' }}>
            -{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(payment.discountAmount)}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
