import { Stack } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { BackButton } from '@/components/BackButton';
import { COLORS } from '@/lib/theme/colors';
import { WEB_URL } from '@/lib/webUrl';

const PAGES: { label: string; path: string }[] = [
  { label: 'Giới thiệu', path: '/about' },
  { label: 'Điều khoản dịch vụ', path: '/legal/terms' },
  { label: 'Chính sách quyền riêng tư', path: '/legal/privacy' },
  { label: 'Chính sách hoàn tiền', path: '/legal/refund' },
  { label: 'Chính sách cookie', path: '/legal/cookies' },
  { label: 'Kiểm duyệt nội dung', path: '/legal/content-moderation' },
  { label: 'Chia sẻ doanh thu', path: '/legal/revenue-share' },
  { label: 'Khả năng tiếp cận', path: '/legal/accessibility' },
  { label: 'Sơ đồ trang', path: '/legal/sitemap' },
];

export default function LegalScreen() {
  const [code, setCode] = useState('');

  const open = (path: string) => {
    WebBrowser.openBrowserAsync(`${WEB_URL}${path}`).catch(() => Alert.alert('Lỗi', 'Không mở được trang.'));
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.surface }}>
      <Stack.Screen options={{ headerShown: true, title: 'Thông tin & Chính sách', headerLeft: () => <BackButton /> }} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }} keyboardShouldPersistTaps="handled">
        <View style={{ backgroundColor: COLORS.surfaceRaised, borderRadius: 12, borderWidth: 1, borderColor: COLORS.line }}>
          {PAGES.map((p, i) => (
            <Pressable
              key={p.path}
              onPress={() => open(p.path)}
              style={{ padding: 14, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: COLORS.lineSoft, flexDirection: 'row', justifyContent: 'space-between' }}
            >
              <Text style={{ color: COLORS.ink, fontWeight: '600' }}>{p.label}</Text>
              <Text style={{ color: COLORS.inkFaint }}>›</Text>
            </Pressable>
          ))}
        </View>

        <View style={{ backgroundColor: COLORS.surfaceRaised, borderRadius: 12, borderWidth: 1, borderColor: COLORS.line, padding: 14, gap: 8 }}>
          <Text style={{ fontWeight: '700', color: COLORS.ink }}>Xác thực chứng chỉ</Text>
          <Text style={{ fontSize: 12, color: COLORS.inkMuted }}>Nhập mã chứng chỉ để kiểm tra tính hợp lệ.</Text>
          <TextInput placeholderTextColor={COLORS.inkFaint}
            placeholder="Mã chứng chỉ"
            value={code}
            onChangeText={setCode}
            autoCapitalize="characters"
            style={{ borderWidth: 1, borderColor: COLORS.line, borderRadius: 8, padding: 10, color: COLORS.ink }}
          />
          <Pressable
            disabled={!code.trim()}
            onPress={() => open(`/verify/${encodeURIComponent(code.trim())}`)}
            style={{ backgroundColor: COLORS.accent, borderRadius: 8, padding: 12, alignItems: 'center', opacity: code.trim() ? 1 : 0.5 }}
          >
            <Text style={{ color: COLORS.white, fontWeight: '700' }}>Xác thực</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
