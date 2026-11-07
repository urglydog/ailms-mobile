import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';

import { BackButton } from '@/components/BackButton';
import { ApiError } from '@/lib/api/client';
import { disputesApi } from '@/lib/api/disputes';
import { paymentsApi } from '@/lib/api/payments';
import { COLORS } from '@/lib/theme/colors';
import type { DisputeRes, PickedEvidence } from '@/types/dispute';
import type { PaymentRecord } from '@/types/payment';

const STATUS_LABEL: Record<DisputeRes['status'], string> = {
  OPEN: 'Chưa xử lý',
  RESOLVED_REFUNDED: 'Đã hoàn tiền',
  RESOLVED_REJECTED: 'Đã từ chối',
  REOPENED: 'Đang chờ xử lý lại',
};
const STATUS_COLOR: Record<DisputeRes['status'], string> = {
  OPEN: COLORS.warning,
  RESOLVED_REFUNDED: COLORS.success,
  RESOLVED_REJECTED: COLORS.inkMuted,
  REOPENED: COLORS.danger,
};
const MAX_FILES = 5;
/** Phải khớp `lms.rules.dispute-reopen-window-days` ở BE — chỉ để ẩn/hiện nút, BE vẫn validate thật. */
const REOPEN_WINDOW_DAYS = 7;

const inputStyle = {
  borderWidth: 1,
  borderColor: COLORS.line,
  borderRadius: 8,
  padding: 12,
  backgroundColor: '#fff',
  color: COLORS.ink,
} as const;

const money = (v: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v);

export default function DisputesScreen() {
  const { ref } = useLocalSearchParams<{ ref?: string }>();
  const queryClient = useQueryClient();
  const [selectedRef, setSelectedRef] = useState<string | null>(ref ?? null);
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [bank, setBank] = useState('');
  const [files, setFiles] = useState<PickedEvidence[]>([]);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reopeningId, setReopeningId] = useState<number | null>(null);
  const [reopenReason, setReopenReason] = useState('');
  const [nowMs] = useState(() => Date.now());

  const payments = useQuery({ queryKey: ['my-payments'], queryFn: () => paymentsApi.listMine() });
  const disputes = useQuery({ queryKey: ['my-disputes'], queryFn: () => disputesApi.listMine() });

  const paid = (payments.data ?? []).filter((p) => p.status === 'PAID');
  const selected: PaymentRecord | undefined = paid.find((p) => p.txnRef === selectedRef);
  const alreadyDisputed = (txnRef: string) =>
    (disputes.data ?? []).some((d) => d.paymentTxnRef === txnRef && d.status === 'OPEN');

  const canReopen = (d: DisputeRes) =>
    d.status === 'RESOLVED_REFUNDED' &&
    !d.reopenedAt &&
    d.resolvedAt != null &&
    nowMs - new Date(d.resolvedAt).getTime() < REOPEN_WINDOW_DAYS * 24 * 60 * 60 * 1000;

  const pickEvidence = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsMultipleSelection: true,
      selectionLimit: MAX_FILES,
      quality: 0.8,
    });
    if (res.canceled) return;
    if (res.assets.length > MAX_FILES) {
      Alert.alert('Quá số lượng', `Chỉ được đính kèm tối đa ${MAX_FILES} file minh chứng.`);
      return;
    }
    setFiles(
      res.assets.map((a, i) => ({
        uri: a.uri,
        name: a.fileName ?? `evidence-${i + 1}.${a.type === 'video' ? 'mp4' : 'jpg'}`,
        mimeType: a.mimeType ?? (a.type === 'video' ? 'video/mp4' : 'image/jpeg'),
      })),
    );
  };

  const fileMutation = useMutation({
    mutationFn: () =>
      disputesApi.file(
        {
          paymentTxnRef: selected!.txnRef,
          reason: reason.trim(),
          description: description.trim() || undefined,
          refundBankAccount: bank.trim() || undefined,
          termsAccepted: accepted,
        },
        files,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['my-disputes'] });
      setSelectedRef(null);
      setReason('');
      setDescription('');
      setBank('');
      setFiles([]);
      setAccepted(false);
      setError(null);
      Alert.alert('Đã gửi khiếu nại', 'Chúng tôi sẽ phản hồi qua email sau khi xử lý xong.');
    },
    onError: (err: unknown) =>
      setError(err instanceof ApiError ? err.message : 'Không gửi được khiếu nại, vui lòng thử lại.'),
  });

  const reopenMutation = useMutation({
    mutationFn: (id: number) => disputesApi.reopen(id, reopenReason.trim()),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['my-disputes'] });
      setReopeningId(null);
      setReopenReason('');
      Alert.alert('Đã gửi', 'Đội ngũ hỗ trợ sẽ xử lý lại sớm nhất.');
    },
    onError: (err: unknown) =>
      Alert.alert('Lỗi', err instanceof ApiError ? err.message : 'Không gửi được yêu cầu, vui lòng thử lại.'),
  });

  const loading = payments.isLoading || disputes.isLoading;

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.surface }}>
      <Stack.Screen options={{ headerShown: true, title: 'Khiếu nại giao dịch', headerLeft: () => <BackButton /> }} />
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }} keyboardShouldPersistTaps="handled">
          <Text style={{ color: COLORS.inkMuted, fontSize: 13 }}>
            Chọn đúng giao dịch liên quan, mô tả vấn đề và đính kèm minh chứng nếu có. Kết quả được gửi qua email.
          </Text>

          {!selected ? (
            <View style={{ gap: 8 }}>
              <Text style={{ fontWeight: '700', fontSize: 16, color: COLORS.ink }}>Chọn giao dịch cần khiếu nại</Text>
              {paid.length === 0 ? (
                <Text style={{ color: COLORS.inkFaint }}>Bạn chưa có giao dịch nào đã thanh toán thành công.</Text>
              ) : (
                paid.map((p) => {
                  const disabled = alreadyDisputed(p.txnRef);
                  return (
                    <Pressable
                      key={p.txnRef}
                      disabled={disabled}
                      onPress={() => setSelectedRef(p.txnRef)}
                      style={{
                        backgroundColor: '#fff',
                        borderWidth: 1,
                        borderColor: COLORS.line,
                        borderRadius: 12,
                        padding: 14,
                        opacity: disabled ? 0.5 : 1,
                      }}
                    >
                      <Text style={{ fontWeight: '600', color: COLORS.ink }}>{p.courseTitle}</Text>
                      <Text style={{ fontSize: 12, color: COLORS.inkMuted, marginTop: 2 }}>
                        Mã GD: {p.txnRef} · {money(p.amount)}
                      </Text>
                      {disabled ? (
                        <Text style={{ fontSize: 12, color: COLORS.warning, marginTop: 4 }}>
                          Đang có khiếu nại chờ xử lý
                        </Text>
                      ) : null}
                    </Pressable>
                  );
                })
              )}
            </View>
          ) : (
            <View style={{ backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: COLORS.line, padding: 14, gap: 12 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '600', color: COLORS.ink }}>{selected.courseTitle}</Text>
                  <Text style={{ fontSize: 12, color: COLORS.inkMuted }}>
                    Mã GD: {selected.txnRef} · {money(selected.amount)}
                  </Text>
                </View>
                <Pressable onPress={() => setSelectedRef(null)}>
                  <Text style={{ color: COLORS.accent, fontWeight: '600' }}>Đổi</Text>
                </Pressable>
              </View>

              {error ? (
                <Text style={{ color: COLORS.danger, borderWidth: 1, borderColor: COLORS.danger, borderRadius: 8, padding: 8 }}>
                  {error}
                </Text>
              ) : null}

              <TextInput
                placeholder="Lý do * (vd: Bị trừ tiền nhưng không ghi danh được)"
                value={reason}
                onChangeText={setReason}
                style={inputStyle}
              />
              <TextInput
                placeholder="Mô tả chi tiết"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                style={[inputStyle, { minHeight: 90, textAlignVertical: 'top' }]}
              />
              <TextInput
                placeholder="Tài khoản nhận hoàn tiền (vd: Vietcombank - 0123456789 - Nguyễn Văn A)"
                value={bank}
                onChangeText={setBank}
                style={inputStyle}
              />

              <View style={{ gap: 6 }}>
                <Pressable
                  onPress={() => void pickEvidence()}
                  style={{ borderWidth: 1, borderColor: COLORS.accent, borderRadius: 8, padding: 10, alignItems: 'center' }}
                >
                  <Text style={{ color: COLORS.accent, fontWeight: '600' }}>
                    Đính kèm minh chứng (ảnh/video, tối đa {MAX_FILES})
                  </Text>
                </Pressable>
                {files.map((f) => (
                  <Text key={f.uri} style={{ fontSize: 12, color: COLORS.inkMuted }}>
                    • {f.name}
                  </Text>
                ))}
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Switch value={accepted} onValueChange={setAccepted} />
                <Text style={{ flex: 1, fontSize: 13, color: COLORS.ink }}>
                  Tôi xác nhận thông tin khai báo là đúng sự thật và đồng ý với chính sách hoàn tiền.
                </Text>
              </View>

              <Pressable
                disabled={fileMutation.isPending || !reason.trim() || !accepted}
                onPress={() => fileMutation.mutate()}
                style={{
                  backgroundColor: COLORS.accent,
                  borderRadius: 8,
                  padding: 12,
                  alignItems: 'center',
                  opacity: fileMutation.isPending || !reason.trim() || !accepted ? 0.5 : 1,
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>
                  {fileMutation.isPending ? 'Đang gửi...' : 'Gửi khiếu nại'}
                </Text>
              </Pressable>
            </View>
          )}

          {(disputes.data ?? []).length > 0 ? (
            <View style={{ gap: 8 }}>
              <Text style={{ fontWeight: '700', fontSize: 16, color: COLORS.ink }}>Khiếu nại của tôi</Text>
              {(disputes.data ?? []).map((d) => (
                <View key={d.id} style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: COLORS.line, borderRadius: 12, padding: 14, gap: 8 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: '600', color: COLORS.ink }}>{d.courseTitle}</Text>
                      <Text style={{ fontSize: 12, color: COLORS.inkMuted }}>
                        Mã GD: {d.paymentTxnRef} — {d.reason}
                      </Text>
                    </View>
                    <Text style={{ color: STATUS_COLOR[d.status], fontWeight: '700', fontSize: 12 }}>
                      {STATUS_LABEL[d.status]}
                    </Text>
                  </View>

                  {canReopen(d) && reopeningId !== d.id ? (
                    <Pressable onPress={() => { setReopeningId(d.id); setReopenReason(''); }}>
                      <Text style={{ color: COLORS.danger, fontWeight: '600' }}>Tôi chưa nhận được tiền</Text>
                    </Pressable>
                  ) : null}

                  {reopeningId === d.id ? (
                    <View style={{ gap: 8, borderWidth: 1, borderColor: COLORS.danger, borderRadius: 8, padding: 10 }}>
                      <TextInput
                        placeholder="Mô tả rõ hơn (ngân hàng, thời điểm kiểm tra...)"
                        value={reopenReason}
                        onChangeText={setReopenReason}
                        multiline
                        style={[inputStyle, { minHeight: 70, textAlignVertical: 'top' }]}
                      />
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <Pressable
                          disabled={reopenMutation.isPending || !reopenReason.trim()}
                          onPress={() => reopenMutation.mutate(d.id)}
                          style={{ backgroundColor: COLORS.danger, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 14, opacity: reopenMutation.isPending || !reopenReason.trim() ? 0.5 : 1 }}
                        >
                          <Text style={{ color: '#fff', fontWeight: '700' }}>Gửi yêu cầu</Text>
                        </Pressable>
                        <Pressable onPress={() => setReopeningId(null)} style={{ paddingVertical: 10, paddingHorizontal: 14 }}>
                          <Text style={{ color: COLORS.inkMuted, fontWeight: '600' }}>Hủy</Text>
                        </Pressable>
                      </View>
                    </View>
                  ) : null}
                </View>
              ))}
            </View>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}
