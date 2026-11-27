import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, Switch, Text, TextInput, View } from 'react-native';
import { Check, ChevronDown, X } from 'lucide-react-native';

import { disputesApi } from '@/lib/api/disputes';
import { COLORS } from '@/lib/theme/colors';

/** Thông tin tài khoản nhận hoàn tiền đang nhập (cùng cách khai báo với web: chọn ngân hàng, nhập số tài khoản hai lần, tên chủ tài khoản, xác nhận chính chủ). */
export interface RefundAccountDraft {
  bankCode: string;
  number: string;
  numberAgain: string;
  holder: string;
  own: boolean;
}

export const EMPTY_REFUND_ACCOUNT: RefundAccountDraft = { bankCode: '', number: '', numberAgain: '', holder: '', own: false };

export function refundAccountHasInput(d: RefundAccountDraft): boolean {
  return d.bankCode !== '' || d.number.trim() !== '' || d.numberAgain.trim() !== '' || d.holder.trim() !== '';
}

/** Chỉ giữ chữ số của số tài khoản (bỏ khoảng trắng). */
export function refundAccountDigits(d: RefundAccountDraft): string {
  return d.number.replace(/\s/g, '');
}

/**
 * Lý do thông tin chưa hợp lệ, hoặc `null` nếu hợp lệ. Khi khiếu nại mới (`required = false`) để trống cả form vẫn được;
 * khi cập nhật tài khoản sau đó (`required = true`) phải điền đủ.
 */
export function refundAccountProblem(d: RefundAccountDraft, required: boolean): string | null {
  if (!required && !refundAccountHasInput(d)) return null;
  if (d.bankCode === '') return 'Hãy chọn ngân hàng nhận hoàn tiền.';
  if (!/^[0-9]{6,20}$/.test(refundAccountDigits(d))) return 'Số tài khoản chỉ gồm chữ số (6–20 số).';
  if (d.numberAgain.replace(/\s/g, '') !== refundAccountDigits(d)) return 'Hai lần nhập số tài khoản chưa khớp nhau.';
  if (d.holder.trim().length < 2) return 'Hãy nhập tên chủ tài khoản.';
  if (!d.own) return 'Bạn cần xác nhận đây là tài khoản của chính bạn.';
  return null;
}

const input = () => ({
  borderWidth: 1,
  borderColor: COLORS.line,
  borderRadius: 8,
  padding: 12,
  backgroundColor: COLORS.surfaceRaised,
  color: COLORS.ink,
});

interface Props {
  draft: RefundAccountDraft;
  onChange: (next: RefundAccountDraft) => void;
  /** Hiện lý do chưa hợp lệ ngay dưới form (khi đã nhập gì đó, hoặc bắt buộc điền). */
  required?: boolean;
}

export function RefundAccountFields({ draft, onChange, required = false }: Props) {
  const { data: banks = [], isLoading } = useQuery({
    queryKey: ['dispute-banks'],
    queryFn: () => disputesApi.banks(),
    staleTime: 60 * 60 * 1000,
  });
  const problem = refundAccountProblem(draft, required);
  const showProblem = problem !== null && (required || refundAccountHasInput(draft));
  const set = (patch: Partial<RefundAccountDraft>) => onChange({ ...draft, ...patch });

  return (
    <View style={{ gap: 10 }}>
      <BankPicker banks={banks} loading={isLoading} value={draft.bankCode} onChange={(bankCode) => set({ bankCode })} />
      <TextInput
        placeholder="Số tài khoản"
        placeholderTextColor={COLORS.inkFaint}
        value={draft.number}
        onChangeText={(number) => set({ number })}
        keyboardType="number-pad"
        autoComplete="off"
        maxLength={25}
        style={input()}
      />
      <TextInput
        placeholder="Nhập lại số tài khoản"
        placeholderTextColor={COLORS.inkFaint}
        value={draft.numberAgain}
        onChangeText={(numberAgain) => set({ numberAgain })}
        keyboardType="number-pad"
        autoComplete="off"
        contextMenuHidden
        maxLength={25}
        style={input()}
      />
      <TextInput
        placeholder="Tên chủ tài khoản (vd: NGUYEN VAN A)"
        placeholderTextColor={COLORS.inkFaint}
        value={draft.holder}
        onChangeText={(holder) => set({ holder })}
        autoCapitalize="characters"
        autoComplete="off"
        maxLength={100}
        style={input()}
      />
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
        <Switch value={draft.own} onValueChange={(own) => set({ own })} />
        <Text style={{ flex: 1, fontSize: 13, color: COLORS.ink }}>
          Tôi xác nhận đây là tài khoản của chính tôi, thông tin đã đúng và tôi chịu trách nhiệm về độ chính xác của nó.
        </Text>
      </View>
      {showProblem ? <Text style={{ color: COLORS.danger, fontSize: 12 }}>{problem}</Text> : null}
    </View>
  );
}

function BankPicker({ banks, loading, value, onChange }: { banks: { code: string; name: string }[]; loading: boolean; value: string; onChange: (code: string) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selected = banks.find((b) => b.code === value);
  const needle = query.trim().toLowerCase();
  const filtered = needle ? banks.filter((b) => `${b.name} ${b.code}`.toLowerCase().includes(needle)) : banks;

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={{ ...input(), flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}
        accessibilityLabel="Chọn ngân hàng"
      >
        <Text style={{ flex: 1, color: selected ? COLORS.ink : COLORS.inkFaint }} numberOfLines={1}>
          {selected ? selected.name : loading ? 'Đang tải danh sách ngân hàng...' : 'Chọn ngân hàng'}
        </Text>
        {loading ? <ActivityIndicator size="small" color={COLORS.inkFaint} /> : <ChevronDown size={18} color={COLORS.inkFaint} />}
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'flex-end' }}>
          <Pressable style={{ flex: 1 }} onPress={() => setOpen(false)} />
          <View style={{ maxHeight: '80%', backgroundColor: COLORS.surfaceRaised, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.ink }}>Chọn ngân hàng</Text>
              <Pressable onPress={() => setOpen(false)} hitSlop={8}>
                <X size={20} color={COLORS.inkFaint} />
              </Pressable>
            </View>
            <TextInput
              placeholder="Tìm ngân hàng"
              placeholderTextColor={COLORS.inkFaint}
              value={query}
              onChangeText={setQuery}
              autoCorrect={false}
              style={input()}
            />
            <FlatList
              data={filtered}
              keyExtractor={(b) => b.code}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={<Text style={{ color: COLORS.inkFaint, textAlign: 'center', padding: 16 }}>Không tìm thấy ngân hàng phù hợp.</Text>}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    onChange(item.code);
                    setOpen(false);
                    setQuery('');
                  }}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.lineSoft }}
                >
                  <Text style={{ flex: 1, color: COLORS.ink }}>{item.name}</Text>
                  {item.code === value ? <Check size={18} color={COLORS.accent} /> : null}
                </Pressable>
              )}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}
