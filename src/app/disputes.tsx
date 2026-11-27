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
import {
  EMPTY_REFUND_ACCOUNT,
  RefundAccountFields,
  refundAccountDigits,
  refundAccountHasInput,
  refundAccountProblem,
  type RefundAccountDraft,
} from '@/components/disputes/RefundAccountFields';
import type { DisputeCategory, DisputeRes, PickedEvidence } from '@/types/dispute';
import type { PaymentRecord } from '@/types/payment';

const STATUS_LABEL: Record<DisputeRes['status'], string> = {
  OPEN: 'Chưa xử lý',
  RESOLVED_REFUNDED: 'Đã hoàn tiền',
  RESOLVED_REJECTED: 'Đã từ chối',
  REOPENED: 'Đang chờ xử lý lại',
};
/** Nhãn cho học viên: "Đã hoàn tiền" CHỈ khi tiền đã thật sự được chuyển; đã duyệt mà chưa chuyển thì nói rõ đang chờ chuyển, hoặc cần cập nhật tài khoản. */
function statusLabel(d: DisputeRes): string {
  if (d.status === 'RESOLVED_REFUNDED' && d.refundTransferStatus === 'PENDING_TRANSFER') return 'Đã duyệt · chờ chuyển tiền';
  if (d.status === 'RESOLVED_REFUNDED' && d.refundTransferStatus === 'AWAITING_ACCOUNT') return 'Cần cập nhật tài khoản';
  return STATUS_LABEL[d.status];
}
function statusTone(d: DisputeRes): string {
  if (d.status === 'RESOLVED_REFUNDED' && d.refundTransferStatus === 'PENDING_TRANSFER') return COLORS.accent;
  if (d.status === 'RESOLVED_REFUNDED' && d.refundTransferStatus === 'AWAITING_ACCOUNT') return COLORS.danger;
  return statusColor()[d.status];
}
const statusColor = (): Record<DisputeRes['status'], string> => ({
  OPEN: COLORS.warning,
  RESOLVED_REFUNDED: COLORS.success,
  RESOLVED_REJECTED: COLORS.inkMuted,
  REOPENED: COLORS.danger,
});
const CATEGORY_LABEL: Record<DisputeCategory, string> = {
  CHANGED_MIND: 'Tôi đổi ý / không phù hợp',
  CONTENT_MISMATCH: 'Nội dung khác mô tả',
  TECHNICAL_ERROR: 'Lỗi kỹ thuật',
  DOUBLE_CHARGE: 'Bị trừ tiền hai lần',
  NOT_ENROLLED: 'Trừ tiền nhưng không ghi danh',
  OTHER: 'Lý do khác',
};
const CATEGORIES = Object.keys(CATEGORY_LABEL) as DisputeCategory[];
const MAX_FILES = 5;
/** Phải khớp `lms.rules.dispute-reopen-window-days` ở BE — chỉ để ẩn/hiện nút, BE vẫn validate thật. */
const REOPEN_WINDOW_DAYS = 7;

// Hàm (không phải hằng) để đọc màu theo chế độ sáng/tối hiện tại mỗi lần render.
const inputStyle = () => ({
  borderWidth: 1,
  borderColor: COLORS.line,
  borderRadius: 8,
  padding: 12,
  backgroundColor: COLORS.surfaceRaised,
  color: COLORS.ink,
});

const money = (v: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v);

export default function DisputesScreen() {
  const { ref } = useLocalSearchParams<{ ref?: string }>();
  const queryClient = useQueryClient();
  const [selectedRef, setSelectedRef] = useState<string | null>(ref ?? null);
  const [category, setCategory] = useState<DisputeCategory>('CHANGED_MIND');
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [account, setAccount] = useState<RefundAccountDraft>(EMPTY_REFUND_ACCOUNT);
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
  // Mỗi giao dịch chỉ có MỘT khiếu nại (BE từ 11/11/2026) — đã có khiếu nại ở bất kỳ trạng thái nào thì không gửi thêm.
  const alreadyDisputed = (txnRef: string) => (disputes.data ?? []).some((d) => d.paymentTxnRef === txnRef);

  const accountProblem = refundAccountProblem(account, false);

  const canReopen = (d: DisputeRes) =>
    d.status === 'RESOLVED_REFUNDED' &&
    d.refundTransferStatus !== 'PENDING_TRANSFER' &&
    d.refundTransferStatus !== 'AWAITING_ACCOUNT' &&
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
          termsAccepted: accepted,
          category,
          ...(refundAccountHasInput(account)
            ? {
                refundBankCode: account.bankCode,
                refundAccountNumber: refundAccountDigits(account),
                refundAccountHolder: account.holder.trim(),
                refundAccountOwnConfirmed: account.own,
              }
            : {}),
        },
        files,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['my-disputes'] });
      setSelectedRef(null);
      setCategory('CHANGED_MIND');
      setReason('');
      setDescription('');
      setAccount(EMPTY_REFUND_ACCOUNT);
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
                        backgroundColor: COLORS.surfaceRaised,
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
                          Giao dịch này đã có khiếu nại
                        </Text>
                      ) : null}
                    </Pressable>
                  );
                })
              )}
            </View>
          ) : (
            <View style={{ backgroundColor: COLORS.surfaceRaised, borderRadius: 12, borderWidth: 1, borderColor: COLORS.line, padding: 14, gap: 12 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '600', color: COLORS.ink }}>{selected.courseTitle}</Text>
                  <Text style={{ fontSize: 12, color: COLORS.inkMuted }}>
                    Mã GD: {selected.txnRef} · {money(selected.amount)}
                  </Text>
                </View>
                <Pressable onPress={() => setSelectedRef(null)}>
                  <Text style={{ color: COLORS.accentDark, fontWeight: '600' }}>Đổi</Text>
                </Pressable>
              </View>

              {error ? (
                <Text style={{ color: COLORS.danger, borderWidth: 1, borderColor: COLORS.danger, borderRadius: 8, padding: 8 }}>
                  {error}
                </Text>
              ) : null}

              <View style={{ gap: 6 }}>
                <Text style={{ fontWeight: '600', color: COLORS.ink }}>Loại vấn đề</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {CATEGORIES.map((c) => (
                    <Pressable
                      key={c}
                      onPress={() => setCategory(c)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: category === c }}
                      style={{
                        borderWidth: 1,
                        borderColor: category === c ? COLORS.accent : COLORS.line,
                        backgroundColor: category === c ? COLORS.tint : COLORS.surfaceRaised,
                        borderRadius: 999,
                        paddingVertical: 6,
                        paddingHorizontal: 12,
                      }}
                    >
                      <Text style={{ color: category === c ? COLORS.accent : COLORS.ink, fontSize: 12, fontWeight: '600' }}>
                        {CATEGORY_LABEL[c]}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <Text style={{ fontSize: 12, color: COLORS.inkMuted }}>
                  Hoàn tiền theo chính sách về thời hạn và tiến độ học; lỗi kỹ thuật được xét riêng. Giảng viên của khóa được báo và có thể phản hồi trước khi chúng tôi quyết định.
                </Text>
              </View>

              <TextInput placeholderTextColor={COLORS.inkFaint}
                placeholder="Lý do * (vd: Bị trừ tiền nhưng không ghi danh được)"
                value={reason}
                onChangeText={setReason}
                style={inputStyle()}
              />
              <TextInput placeholderTextColor={COLORS.inkFaint}
                placeholder="Mô tả chi tiết"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                style={[inputStyle(), { minHeight: 90, textAlignVertical: 'top' }]}
              />
              <View style={{ gap: 8, borderWidth: 1, borderColor: COLORS.lineSoft, borderRadius: 10, padding: 12, backgroundColor: COLORS.surface }}>
                <Text style={{ fontWeight: '700', color: COLORS.ink }}>Tài khoản nhận hoàn tiền (nên điền)</Text>
                <Text style={{ fontSize: 12, color: COLORS.inkMuted }}>
                  Khoản hoàn được chuyển đúng theo thông tin bạn khai. Hãy nhập thật cẩn thận: nếu số tài khoản sai mà vẫn là một tài khoản có thật, tiền sẽ chuyển tới người khác và khó thu hồi.
                  Nếu chưa điền ở bước này, bạn có thể bổ sung sau khi khiếu nại được duyệt.
                </Text>
                <RefundAccountFields draft={account} onChange={setAccount} />
              </View>

              <View style={{ gap: 6 }}>
                <Pressable
                  onPress={() => void pickEvidence()}
                  style={{ borderWidth: 1, borderColor: COLORS.accent, borderRadius: 8, padding: 10, alignItems: 'center' }}
                >
                  <Text style={{ color: COLORS.accentDark, fontWeight: '600' }}>
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
                disabled={fileMutation.isPending || !reason.trim() || !accepted || accountProblem !== null}
                onPress={() => fileMutation.mutate()}
                style={{
                  backgroundColor: COLORS.accent,
                  borderRadius: 8,
                  padding: 12,
                  alignItems: 'center',
                  opacity: fileMutation.isPending || !reason.trim() || !accepted || accountProblem !== null ? 0.5 : 1,
                }}
              >
                <Text style={{ color: COLORS.white, fontWeight: '700' }}>
                  {fileMutation.isPending ? 'Đang gửi...' : 'Gửi khiếu nại'}
                </Text>
              </Pressable>
            </View>
          )}

          {(disputes.data ?? []).length > 0 ? (
            <View style={{ gap: 8 }}>
              <Text style={{ fontWeight: '700', fontSize: 16, color: COLORS.ink }}>Khiếu nại của tôi</Text>
              {(disputes.data ?? []).map((d) => (
                <View key={d.id} style={{ backgroundColor: COLORS.surfaceRaised, borderWidth: 1, borderColor: COLORS.line, borderRadius: 12, padding: 14, gap: 8 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: '600', color: COLORS.ink }}>{d.courseTitle}</Text>
                      <Text style={{ fontSize: 12, color: COLORS.inkMuted }}>
                        Mã GD: {d.paymentTxnRef} — {d.reason}
                      </Text>
                    </View>
                    <Text style={{ color: statusTone(d), fontWeight: '700', fontSize: 12 }}>
                      {statusLabel(d)}
                    </Text>
                  </View>

                  {d.category ? (
                    <Text style={{ fontSize: 12, color: COLORS.inkMuted }}>Loại vấn đề: {CATEGORY_LABEL[d.category]}</Text>
                  ) : null}

                  {d.status === 'RESOLVED_REFUNDED' && d.refundTransferStatus === 'PENDING_TRANSFER' ? (
                    <Text style={{ fontSize: 12, color: COLORS.ink }}>
                      Yêu cầu hoàn tiền đã được chấp nhận, quyền truy cập khóa học đã được thu hồi. LinguaLearn sẽ chuyển khoản hoàn vào tài khoản bạn đã khai và báo lại qua email và thông báo khi hoàn tất.
                    </Text>
                  ) : null}
                  {d.status === 'RESOLVED_REFUNDED' && (d.refundTransferStatus === 'PENDING_TRANSFER' || d.refundTransferStatus === 'AWAITING_ACCOUNT') ? (
                    <RefundAccountEditor dispute={d} />
                  ) : null}
                  {d.status === 'RESOLVED_REFUNDED' && d.refundTransferStatus === 'TRANSFERRED' ? (
                    <Text style={{ fontSize: 12, color: COLORS.success }}>
                      {`Khoản hoàn tiền đã được chuyển vào ${d.refundAccountSummary ? `tài khoản ${d.refundAccountSummary}` : 'tài khoản bạn đã đăng ký'}. Nếu chưa nhận được, bạn có thể báo lại bên dưới.`}
                    </Text>
                  ) : null}

                  {(d.status === 'RESOLVED_REFUNDED' || d.status === 'RESOLVED_REJECTED') && d.adminNote ? (
                    <Text style={{ fontSize: 13, color: COLORS.ink }}>Phản hồi từ hỗ trợ: {d.adminNote}</Text>
                  ) : null}

                  {canReopen(d) && reopeningId !== d.id ? (
                    <Pressable onPress={() => { setReopeningId(d.id); setReopenReason(''); }}>
                      <Text style={{ color: COLORS.danger, fontWeight: '600' }}>Tôi chưa nhận được tiền</Text>
                    </Pressable>
                  ) : null}

                  {reopeningId === d.id ? (
                    <View style={{ gap: 8, borderWidth: 1, borderColor: COLORS.danger, borderRadius: 8, padding: 10 }}>
                      <TextInput placeholderTextColor={COLORS.inkFaint}
                        placeholder="Mô tả rõ hơn (ngân hàng, thời điểm kiểm tra...)"
                        value={reopenReason}
                        onChangeText={setReopenReason}
                        multiline
                        style={[inputStyle(), { minHeight: 70, textAlignVertical: 'top' }]}
                      />
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <Pressable
                          disabled={reopenMutation.isPending || !reopenReason.trim()}
                          onPress={() => reopenMutation.mutate(d.id)}
                          style={{ backgroundColor: COLORS.danger, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 14, opacity: reopenMutation.isPending || !reopenReason.trim() ? 0.5 : 1 }}
                        >
                          <Text style={{ color: COLORS.white, fontWeight: '700' }}>Gửi yêu cầu</Text>
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

/** Học viên cập nhật tài khoản nhận hoàn tiền sau khi đã gửi khiếu nại. Máy chủ quyết định được sửa hay không (`canEditRefundAccount`):
 * không được thì chỉ hiện lý do. Cần nhập lại số tài khoản và xác nhận chính chủ. */
function RefundAccountEditor({ dispute }: { dispute: DisputeRes }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(dispute.refundTransferStatus === 'AWAITING_ACCOUNT');
  const [draft, setDraft] = useState<RefundAccountDraft>(EMPTY_REFUND_ACCOUNT);
  const problem = refundAccountProblem(draft, true);

  const save = useMutation({
    mutationFn: () =>
      disputesApi.updateRefundAccount(dispute.id, {
        refundBankCode: draft.bankCode,
        refundAccountNumber: refundAccountDigits(draft),
        refundAccountHolder: draft.holder.trim(),
        refundAccountOwnConfirmed: draft.own,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['my-disputes'] });
      setOpen(false);
      setDraft(EMPTY_REFUND_ACCOUNT);
      Alert.alert('Đã cập nhật', 'Tài khoản nhận hoàn tiền của bạn đã được cập nhật. Chúng tôi sẽ chuyển khoản hoàn vào tài khoản này.');
    },
    onError: (err: unknown) =>
      Alert.alert('Chưa cập nhật được', err instanceof ApiError ? err.message : 'Không cập nhật được tài khoản, vui lòng thử lại.'),
  });

  if (!dispute.canEditRefundAccount) {
    return dispute.refundAccountHint ? <Text style={{ fontSize: 12, color: COLORS.inkMuted }}>{dispute.refundAccountHint}</Text> : null;
  }

  return (
    <View style={{ gap: 8, borderWidth: 1, borderColor: COLORS.line, borderRadius: 10, padding: 10, backgroundColor: COLORS.surface }}>
      {dispute.refundAccountHint ? <Text style={{ fontSize: 12, color: COLORS.ink }}>{dispute.refundAccountHint}</Text> : null}
      {dispute.refundAccountSummary ? (
        <Text style={{ fontSize: 12, color: COLORS.inkMuted }}>Tài khoản đang khai: {dispute.refundAccountSummary}</Text>
      ) : null}
      {!open ? (
        <Pressable onPress={() => setOpen(true)}>
          <Text style={{ color: COLORS.accentDark, fontWeight: '600' }}>Đổi tài khoản nhận hoàn tiền</Text>
        </Pressable>
      ) : (
        <View style={{ gap: 10 }}>
          <RefundAccountFields draft={draft} onChange={setDraft} required />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Pressable
              disabled={save.isPending || problem !== null}
              onPress={() => save.mutate()}
              style={{ backgroundColor: COLORS.accent, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 16, opacity: save.isPending || problem !== null ? 0.5 : 1 }}
            >
              <Text style={{ color: COLORS.white, fontWeight: '700' }}>{save.isPending ? 'Đang lưu...' : 'Lưu tài khoản'}</Text>
            </Pressable>
            <Pressable onPress={() => setOpen(false)}>
              <Text style={{ color: COLORS.inkMuted, fontWeight: '600' }}>Hủy</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}
