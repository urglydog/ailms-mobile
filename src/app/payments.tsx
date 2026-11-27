import { useQuery } from '@tanstack/react-query';
import { Stack, router, type Href } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { FileText } from 'lucide-react-native';

import { paymentsApi } from '@/lib/api/payments';
import { invoicesApi } from '@/lib/api/invoices';
import { ApiError } from '@/lib/api/client';
import { saveAndShareBlob } from '@/lib/files';
import { BackButton } from '@/components/BackButton';
import type { Invoice } from '@/types/invoice';
import type { PaymentRecord } from '@/types/payment';
import { COLORS } from '@/lib/theme/colors';

type OrderInvoices = { receipt?: Invoice; refund?: Invoice };

export default function PaymentsScreen() {
  const { data: payments, isLoading, error, refetch } = useQuery({
    queryKey: ['my-payments'],
    queryFn: () => paymentsApi.listMine(),
  });

  // Chứng từ của chính mình, ghép vào từng giao dịch theo mã đơn: biên lai (đơn đã thanh toán) và phiếu hoàn tiền (đơn đã hoàn xong) — giống trang Thanh toán trên web.
  const { data: invoices } = useQuery({
    queryKey: ['my-invoices'],
    queryFn: () => invoicesApi.listMine(),
  });
  const byOrder = useMemo(() => {
    const map = new Map<string, OrderInvoices>();
    for (const inv of invoices ?? []) {
      if (inv.type !== 'RECEIPT' && inv.type !== 'REFUND') continue;
      for (const ref of inv.refs) {
        const entry = map.get(ref) ?? {};
        if (inv.type === 'RECEIPT') entry.receipt = inv;
        else entry.refund = inv;
        map.set(ref, entry);
      }
    }
    return map;
  }, [invoices]);

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.surface }}>
      <Stack.Screen options={{ headerShown: true, title: 'Lịch sử thanh toán', headerLeft: () => <BackButton /> }} />

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator />
        </View>
      ) : error ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 }}>
          <Text style={{ color: COLORS.ink }}>{error instanceof ApiError ? error.message : 'Không tải được lịch sử thanh toán.'}</Text>
          <Pressable onPress={() => refetch()}>
            <Text style={{ color: COLORS.accentDark }}>Thử lại</Text>
          </Pressable>
        </View>
      ) : !payments || payments.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Text style={{ color: COLORS.inkFaint }}>Chưa có giao dịch nào.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
          {payments.map((p) => (
            <PaymentCard key={p.txnRef} payment={p} invoices={byOrder.get(p.txnRef)} invoicesLoaded={invoices !== undefined} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function PaymentCard({ payment, invoices, invoicesLoaded }: { payment: PaymentRecord; invoices?: OrderInvoices; invoicesLoaded: boolean }) {
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const downloadInvoice = async (inv: Invoice) => {
    setDownloadingId(inv.id);
    try {
      const blob = await invoicesApi.pdf(inv.id);
      await saveAndShareBlob(blob, `${inv.number.replace(/[^A-Za-z0-9._-]/g, '_')}.pdf`, 'application/pdf');
    } catch (err) {
      Alert.alert('Chưa tải được chứng từ', err instanceof ApiError ? err.message : 'Vui lòng thử lại sau ít phút.');
    } finally {
      setDownloadingId(null);
    }
  };

  const isPaid = payment.status === 'PAID';
  const isPending = payment.status === 'PENDING';
  const isFailed = payment.status === 'FAILED' || payment.status === 'EXPIRED';
  // REFUNDED (11/11/2026): giao dịch đã hoàn tiền — không phải lỗi nên không dùng màu đỏ.
  const isRefunded = payment.status === 'REFUNDED';

  const statusColor = isPaid ? COLORS.success : isPending ? COLORS.warning : isRefunded ? COLORS.accent : COLORS.danger;
  const statusBg = isPaid ? COLORS.successTint : isPending ? COLORS.warningTint : isRefunded ? COLORS.tint : COLORS.dangerTint;
  const statusText = isPaid ? 'Thành công' : isPending ? 'Đang chờ' : isRefunded ? 'Đã hoàn tiền' : 'Thất bại/Hết hạn';

  return (
    <View style={{ backgroundColor: COLORS.surfaceRaised, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: COLORS.lineSoft, gap: 8 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Text style={{ fontWeight: '700', fontSize: 15, color: COLORS.ink, flex: 1, marginRight: 8 }}>
          {payment.courseTitle}
        </Text>
        <View style={{ backgroundColor: statusBg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 }}>
          <Text style={{ color: statusColor, fontSize: 11, fontWeight: '700' }}>{statusText}</Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
        <Text style={{ fontWeight: '800', fontSize: 18, color: COLORS.accentDark }}>
          {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(payment.amount)}
        </Text>
        <Text style={{ color: COLORS.inkFaint, fontSize: 12, fontWeight: '600' }}>{payment.paymentMethod}</Text>
      </View>

      <View style={{ height: 1, backgroundColor: COLORS.surface, marginVertical: 4 }} />

      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ color: COLORS.inkFaint, fontSize: 12 }}>Mã giao dịch</Text>
        <Text style={{ color: COLORS.ink, fontSize: 12, fontWeight: '500' }}>{payment.txnRef}</Text>
      </View>

      {payment.paidAt ? (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ color: COLORS.inkFaint, fontSize: 12 }}>Ngày thanh toán</Text>
          <Text style={{ color: COLORS.ink, fontSize: 12, fontWeight: '500' }}>
            {new Date(payment.paidAt).toLocaleString('vi-VN')}
          </Text>
        </View>
      ) : null}

      {isPaid || isRefunded ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
          {[invoices?.receipt, invoices?.refund].map((inv) =>
            inv ? (
              <Pressable
                key={inv.id}
                onPress={() => downloadInvoice(inv)}
                disabled={downloadingId === inv.id}
                accessibilityLabel={`Tải ${inv.type === 'REFUND' ? 'phiếu hoàn tiền' : 'biên lai'} ${inv.number}`}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: COLORS.line, opacity: downloadingId === inv.id ? 0.6 : 1 }}
              >
                {downloadingId === inv.id ? <ActivityIndicator size="small" color={COLORS.accentDark} /> : <FileText size={14} color={COLORS.accentDark} />}
                <Text style={{ color: COLORS.accentDark, fontSize: 12.5, fontWeight: '600' }}>{inv.type === 'REFUND' ? 'Phiếu hoàn' : 'Biên lai'}</Text>
              </Pressable>
            ) : null,
          )}
          {!invoices && invoicesLoaded ? (
            <Text style={{ color: COLORS.inkFaint, fontSize: 12 }}>Biên lai đang được tạo, thường trong vài phút.</Text>
          ) : null}
        </View>
      ) : null}

      {isPaid ? (
        <Pressable onPress={() => router.push(`/disputes?ref=${payment.txnRef}` as Href)} style={{ marginTop: 4 }}>
          <Text style={{ color: COLORS.danger, fontSize: 12, fontWeight: '600' }}>Khiếu nại giao dịch này</Text>
        </Pressable>
      ) : null}

      {payment.couponCode && payment.discountAmount ? (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ color: COLORS.inkFaint, fontSize: 12 }}>Mã giảm giá ({payment.couponCode})</Text>
          <Text style={{ color: COLORS.success, fontSize: 12, fontWeight: '500' }}>
            -{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(payment.discountAmount)}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
