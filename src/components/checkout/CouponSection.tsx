import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';

import { COLORS } from '@/lib/theme/colors';
import type { AvailableCoupon } from '@/types/payment';

const money = (v: number) => `${v.toLocaleString('vi-VN')}đ`;

interface Props {
  available: AvailableCoupon[];
  loading: boolean;
  selectedId: number | null | undefined;
  onSelect: (id: number | null) => void;
  appliedCode: string | null;
  applying: boolean;
  codeError: string | null;
  onApplyCode: (code: string) => void;
  onRemoveCode: () => void;
}

/** Danh sách khuyến mãi tự chọn (giảm nhiều nhất trên cùng) + ô nhập mã riêng — khớp web `CouponPicker`/`CouponBox`. */
export function CouponSection(p: Props) {
  const [code, setCode] = useState('');
  const selected = p.selectedId ?? null;

  const row = (active: boolean) => ({
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    gap: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: active ? COLORS.accent : COLORS.line,
    backgroundColor: active ? COLORS.tint : COLORS.surfaceRaised,
    borderRadius: 8,
  });
  const dot = (active: boolean) => ({
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: active ? COLORS.accent : COLORS.lineDot,
    backgroundColor: active ? COLORS.accent : COLORS.surfaceRaised,
    marginTop: 2,
  });

  return (
    <View style={{ gap: 10 }}>
      {p.loading ? (
        <ActivityIndicator />
      ) : p.available.length > 0 ? (
        <View style={{ gap: 8 }}>
          <Text style={{ fontWeight: '700', color: COLORS.ink }}>Khuyến mãi dành cho bạn</Text>
          {p.available.map((c) => {
            const active = selected === c.id;
            const label =
              c.discountType === 'PERCENTAGE' ? `Giảm ${c.discountValue}%` : `Giảm ${money(c.discountValue)}`;
            return (
              <Pressable key={c.id} onPress={() => p.onSelect(c.id)} style={row(active)}>
                <View style={dot(active)} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '700', color: COLORS.ink }}>{label}</Text>
                  <Text style={{ fontSize: 12, color: COLORS.inkMuted }}>
                    Tiết kiệm {money(c.savings)} · HSD {new Date(c.endAt).toLocaleDateString('vi-VN')}
                  </Text>
                </View>
              </Pressable>
            );
          })}
          <Pressable onPress={() => p.onSelect(null)} style={row(selected === null)}>
            <View style={dot(selected === null)} />
            <Text style={{ color: COLORS.inkMuted }}>Không dùng khuyến mãi</Text>
          </Pressable>
        </View>
      ) : null}

      {p.appliedCode ? (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.successTint, borderRadius: 8, padding: 10 }}>
          <Text style={{ fontWeight: '700', color: COLORS.successInk }}>{p.appliedCode.toUpperCase()}</Text>
          <Pressable onPress={p.onRemoveCode}>
            <Text style={{ color: COLORS.inkMuted, fontWeight: '600' }}>Bỏ mã</Text>
          </Pressable>
        </View>
      ) : (
        <View style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput placeholderTextColor={COLORS.inkFaint}
              placeholder="Nhập mã giảm giá"
              value={code}
              onChangeText={setCode}
              autoCapitalize="characters"
              style={{ flex: 1, borderWidth: 1, borderColor: COLORS.line, borderRadius: 8, padding: 10, color: COLORS.ink }}
            />
            <Pressable
              disabled={p.applying || !code.trim()}
              onPress={() => p.onApplyCode(code)}
              style={{ backgroundColor: COLORS.accent, borderRadius: 8, paddingHorizontal: 16, justifyContent: 'center', opacity: p.applying || !code.trim() ? 0.5 : 1 }}
            >
              <Text style={{ color: COLORS.white, fontWeight: '700' }}>{p.applying ? '...' : 'Áp dụng'}</Text>
            </Pressable>
          </View>
          {p.codeError ? <Text style={{ color: COLORS.danger, fontSize: 12 }}>{p.codeError}</Text> : null}
        </View>
      )}
    </View>
  );
}
