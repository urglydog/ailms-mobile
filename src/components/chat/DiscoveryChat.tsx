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

import { api } from '@/lib/api/client';

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
 * Discovery", trước đây mobile hoàn toàn chưa có. Không dùng markdown renderer (mobile chưa có
 * lib nào cho việc này, `TutorChat` cũng đang hiện text thuần) — hiện thẳng text AI trả về. */
export function DiscoveryChat() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const listRef = useRef<FlatList<ChatMessage>>(null);

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
          position: 'absolute', bottom: 28, right: 20, width: 56, height: 56, borderRadius: 16,
          backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center',
          shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6,
        }}
      >
        <MessageCircle size={24} color="#fff" />
      </Pressable>

      <Modal visible={isOpen} animationType="slide" transparent onRequestClose={() => setIsOpen(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1, justifyContent: 'flex-end' }}
        >
          <Pressable style={{ flex: 1 }} onPress={() => setIsOpen(false)} />
          <View style={{ height: '75%', backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden' }}>
            <View style={{ backgroundColor: '#2563EB', paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
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
                <Text style={{ textAlign: 'center', color: '#64748B', fontSize: 13, marginTop: 16 }}>
                  Xin chào! Tôi là trợ lý AI. Bạn muốn tìm khóa học gì hôm nay?
                </Text>
              }
              ListFooterComponent={
                loading ? (
                  <View style={{ alignSelf: 'flex-start', backgroundColor: '#F1F5F9', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10 }}>
                    <ActivityIndicator size="small" color="#2563EB" />
                  </View>
                ) : null
              }
              renderItem={({ item }) => (
                <View style={{ alignItems: item.role === 'user' ? 'flex-end' : 'flex-start', gap: 8 }}>
                  <View
                    style={{
                      maxWidth: '85%', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 9,
                      backgroundColor: item.role === 'user' ? '#2563EB' : '#F1F5F9',
                    }}
                  >
                    <Text style={{ color: item.role === 'user' ? '#fff' : '#0F172A', fontSize: 13.5, lineHeight: 19 }}>{item.text}</Text>
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
                          style={{ width: 190, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 12, gap: 6 }}
                        >
                          <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#0F172A' }} numberOfLines={2}>{c.title}</Text>
                          <Text style={{ fontSize: 11, color: '#64748B' }} numberOfLines={1}>GV. {c.instructor_name}</Text>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: 6, borderTopWidth: 1, borderTopColor: '#F1F5F9' }}>
                            <Text style={{ fontSize: 12.5, fontWeight: '700', color: c.is_free ? '#16A34A' : '#0F172A' }}>{c.price_label}</Text>
                            <Text style={{ fontSize: 9.5, fontWeight: '700', color: '#64748B', backgroundColor: '#F8FAFC', borderRadius: 999, paddingHorizontal: 6, paddingVertical: 2 }}>
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

            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, borderTopWidth: 1, borderTopColor: '#E2E8F0', padding: 10 }}>
              <TextInput
                value={input}
                onChangeText={setInput}
                placeholder="Ví dụ: Khoá học IT cho người mới..."
                maxLength={MAX_MESSAGE_LENGTH}
                multiline
                style={{ flex: 1, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 9, fontSize: 13.5, maxHeight: 100, backgroundColor: '#F8FAFC' }}
              />
              <Pressable
                onPress={sendMessage}
                disabled={loading || !input.trim()}
                style={{
                  width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center',
                  backgroundColor: '#2563EB', opacity: loading || !input.trim() ? 0.5 : 1,
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
