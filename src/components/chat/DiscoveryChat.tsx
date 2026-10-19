import { useRef, useState } from 'react';
import { router, usePathname, type Href } from 'expo-router';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MessageCircle, Send, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api } from '@/lib/api/client';
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer';
import { COLORS } from '@/lib/theme/colors';

interface DiscoveryCourseCard {
  id: number;
  title: string;
  slug: string;
  instructor_name: string;
  price_label: string;
  is_free: boolean;
  rating: number;
  level_label: string;
}

interface DiscoveryChatResponse {
  reply?: string;
  courses?: DiscoveryCourseCard[];
}

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  courses?: DiscoveryCourseCard[];
}

const MAX_MESSAGE_LENGTH = 1000;

/** Ẩn khi đang làm bài thi chính thức, cùng quy tắc với `fe`'s `DiscoveryChat.tsx`
 * (`/exam/{quizId}`, KHÔNG phải `/exam/{quizId}/history`) — tránh học viên hỏi AI lúc đang thi. */
const EXAM_TAKING_PATH = /^\/exam\/[^/]+\/?$/;

/** Port từ `fe/components/chat/DiscoveryChat.tsx` (12/10/2026) — nút chat nổi "AI Course
 * Discovery", trước đây mobile hoàn toàn chưa có. Tin nhắn AI dùng `MarkdownRenderer` (tin nhắn
 * của user giữ `Text` thuần, không parse markdown — khớp `fe`'s cách phân nhánh `msg.role ===
 * 'user' ? msg.text : <MarkdownRenderer .../>`). */
export function DiscoveryChat() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const insets = useSafeAreaInsets();

  if (EXAM_TAKING_PATH.test(pathname)) return null;

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text: trimmed }]);
    setLoading(true);

    try {
      const data = await api.post<DiscoveryChatResponse>('/api/v1/discovery/chat', { message: trimmed });
      setMessages((prev) => [...prev, { role: 'assistant', text: data.reply || 'Không có phản hồi.', courses: data.courses }]);
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', text: 'Xin lỗi, tôi đang gặp sự cố kết nối tới AI. Vui lòng kiểm tra lại.' }]);
    } finally {
      setLoading(false);
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    }
  };

  return (
    <>
      <Pressable
        onPress={() => setIsOpen(true)}
        style={{
          // (12/10/2026, sửa theo phản hồi) — bản cũ 56x56 + bottom:28 đè lên nút cuối trong hàng
          // nút đánh giá flashcard (và nhiều control đáy màn khác). Thu nhỏ còn 44x44, nhích cao
          // hơn hẳn (bottom: 90) để hầu hết nội dung đáy màn hình (hàng nút, thanh nộp bài...)
          // không bị che — vẫn không có cách nào loại trừ HOÀN TOÀN đè UI trên mọi màn hình với 1
          // nút nổi cố định vị trí toàn cục, đây là đánh đổi hợp lý thay vì làm riêng từng màn.
          position: 'absolute', bottom: 90, right: 16, width: 44, height: 44, borderRadius: 22,
          backgroundColor: COLORS.accent, alignItems: 'center', justifyContent: 'center', opacity: 0.92,
          shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 5,
        }}
      >
        <MessageCircle size={20} color="#fff" />
      </Pressable>

      {/* `presentationStyle="overFullScreen"` — bug thật (16/10/2026, user báo): mặc định
          `transparent` Modal trên iOS không phủ hết status bar/vùng trên cùng, để lộ `TopNav`
          thật sáng rõ phía dưới dù đã thêm backdrop mờ. `overFullScreen` ép modal che TRỌN màn
          hình kể cả status bar, đúng cách RN khuyến nghị khắc phục trường hợp này. */}
      <Modal visible={isOpen} animationType="slide" transparent presentationStyle="overFullScreen" onRequestClose={() => setIsOpen(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          // (16/10/2026, sửa theo phản hồi) — trước đây không có màu nền mờ phía sau sheet, nhìn
          // như panel chiếm toàn màn hình vì không có ranh giới trực quan giữa vùng dismiss và
          // vùng nội dung thật. Đặt màu mờ ở ĐÂY (container cha) thay vì chỉ ở `Pressable` bên
          // dưới — sheet có `borderTopLeftRadius/borderTopRightRadius` nên 2 góc trên bị "khuyết"
          // một tam giác nhỏ ngoài phần bo tròn; nếu Pressable (dừng đúng mép trên sheet) là nơi
          // DUY NHẤT tô màu mờ thì đúng 2 tam giác khuyết đó sẽ hở ra nền thật phía sau (bug thật
          // 16/10/2026, user báo "sót 2 góc"). Đặt màu mờ ở container cha thì sheet (vẽ đè lên
          // sau) vẫn che đúng phần bo tròn, còn 2 góc khuyết lộ ra màu mờ của cha thay vì nền thật.
          style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15,23,42,0.5)' }}
        >
          <Pressable style={{ flex: 1 }} onPress={() => setIsOpen(false)} />
          <View style={{ height: '70%', backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden' }}>
            <View style={{ backgroundColor: COLORS.accent, paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>AI Course Discovery</Text>
                <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 11.5, marginTop: 2 }}>Tìm kiếm khóa học bằng ngôn ngữ tự nhiên</Text>
              </View>
              <Pressable onPress={() => setIsOpen(false)} hitSlop={8}>
                <X size={22} color="#fff" />
              </Pressable>
            </View>

            <FlatList<ChatMessage>
              ref={listRef}
              data={messages}
              keyExtractor={(_, i) => String(i)}
              contentContainerStyle={{ padding: 14, gap: 12, flexGrow: 1 }}
              onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
              ListEmptyComponent={
                <Text style={{ textAlign: 'center', color: COLORS.inkFaint, fontSize: 13, marginTop: 16 }}>
                  Xin chào! Tôi là trợ lý AI. Bạn muốn tìm khóa học gì hôm nay?
                </Text>
              }
              ListFooterComponent={
                loading ? (
                  <View style={{ alignSelf: 'flex-start', backgroundColor: COLORS.surface, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10 }}>
                    <ActivityIndicator size="small" color={COLORS.accent} />
                  </View>
                ) : null
              }
              renderItem={({ item }) => (
                <View style={{ alignItems: item.role === 'user' ? 'flex-end' : 'flex-start', gap: 8 }}>
                  <View
                    style={{
                      maxWidth: '85%', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 9,
                      backgroundColor: item.role === 'user' ? COLORS.accent : COLORS.surface,
                    }}
                  >
                    {item.role === 'user' ? (
                      <Text style={{ color: '#fff', fontSize: 13.5, lineHeight: 19 }}>{item.text}</Text>
                    ) : (
                      <MarkdownRenderer content={item.text} />
                    )}
                  </View>

                  {item.courses && item.courses.length > 0 ? (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                      {item.courses.map((c) => (
                        <Pressable
                          key={c.id}
                          onPress={() => {
                            setIsOpen(false);
                            router.push(`/courses/${c.slug}` as Href);
                          }}
                          style={{ width: 190, borderWidth: 1, borderColor: COLORS.lineSoft, borderRadius: 12, padding: 12, gap: 6 }}
                        >
                          <Text style={{ fontSize: 12.5, fontWeight: '700', color: COLORS.ink }} numberOfLines={2}>{c.title}</Text>
                          <Text style={{ fontSize: 11, color: COLORS.inkFaint }} numberOfLines={1}>GV. {c.instructor_name}</Text>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: 6, borderTopWidth: 1, borderTopColor: COLORS.surface }}>
                            <Text style={{ fontSize: 12.5, fontWeight: '700', color: c.is_free ? COLORS.success : COLORS.ink }}>{c.price_label}</Text>
                            <Text style={{ fontSize: 9.5, fontWeight: '700', color: COLORS.inkFaint, backgroundColor: COLORS.surface, borderRadius: 999, paddingHorizontal: 6, paddingVertical: 2 }}>
                              {c.level_label === 'ALL' ? 'Mọi cấp độ' : c.level_label}
                            </Text>
                          </View>
                        </Pressable>
                      ))}
                    </ScrollView>
                  ) : null}
                </View>
              )}
            />

            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, borderTopWidth: 1, borderTopColor: COLORS.lineSoft, padding: 10, paddingBottom: Math.max(insets.bottom, 10) }}>
              <TextInput
                value={input}
                onChangeText={setInput}
                placeholder="Ví dụ: Khoá học IT cho người mới..."
                maxLength={MAX_MESSAGE_LENGTH}
                multiline
                style={{ flex: 1, borderWidth: 1, borderColor: COLORS.lineSoft, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 9, fontSize: 13.5, maxHeight: 100, backgroundColor: COLORS.surface }}
              />
              <Pressable
                onPress={sendMessage}
                disabled={loading || !input.trim()}
                style={{
                  width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center',
                  backgroundColor: COLORS.accent, opacity: loading || !input.trim() ? 0.5 : 1,
                }}
              >
                <Send size={17} color="#fff" />
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}
