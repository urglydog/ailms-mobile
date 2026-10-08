import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { Sparkles } from 'lucide-react-native';

import { ApiError } from '@/lib/api/client';
import { tutorApi } from '@/lib/api/tutor';
import { LockedFeatureNotice } from '@/components/lesson/LockedFeatureNotice';

interface ChatItem {
  id: string;
  sender: 'USER' | 'AI';
  content: string;
}

/** Port rút gọn từ `fe/components/tutor/TutorEmbedded.tsx` — bỏ lịch sử nhiều phiên (đổi
 * tên/ghim/tìm kiếm/xoá), bỏ đính kèm tệp/hình ảnh — chỉ còn hỏi-đáp 1 phiên liên tục, tự phục
 * hồi phiên gần nhất khi mở lại (giữ đúng tinh thần UC30, trim bớt tính năng phụ như các màn
 * khác đã làm trong mobile). */
export function TutorChat({ courseId, lessonId, enrolled, courseSlug }: { courseId: number; lessonId: number; enrolled: boolean; courseSlug: string }) {
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatItem[]>([]);
  const [input, setInput] = useState('');
  const [isRestoring, setIsRestoring] = useState(true);
  const listRef = useRef<FlatList<ChatItem>>(null);

  const sessionsQuery = useQuery({
    queryKey: ['tutor-sessions', courseId],
    queryFn: () => tutorApi.listSessions(courseId),
    enabled: enrolled,
  });

  useEffect(() => {
    if (!enrolled || !sessionsQuery.data || sessionId !== null) return;
    const latest = sessionsQuery.data[0];
    if (!latest) {
      // Chưa có phiên chat nào — không có gì để phục hồi, chỉ cần tắt cờ "đang phục hồi".
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsRestoring(false);
      return;
    }
    tutorApi
      .getMessages(courseId, latest.id)
      .then((msgs) => {
        setSessionId(latest.id);
        setMessages(msgs.map((m) => ({ id: String(m.id), sender: m.sender, content: m.content })));
      })
      .catch(() => {})
      .finally(() => setIsRestoring(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionsQuery.data, enrolled]);

  const ask = useMutation({
    mutationFn: (question: string) => tutorApi.ask(courseId, { question, sessionId, currentLessonId: lessonId }),
    onSuccess: (res) => {
      setSessionId(res.sessionId);
      setMessages((prev) => [...prev, { id: `ai-${Date.now()}`, sender: 'AI', content: res.answer }]);
    },
  });

  if (!enrolled) {
    return <LockedFeatureNotice feature="Gia sư AI" courseSlug={courseSlug} />;
  }

  const handleSend = () => {
    const question = input.trim();
    if (!question || ask.isPending) return;
    setMessages((prev) => [...prev, { id: `user-${Date.now()}`, sender: 'USER', content: question }]);
    setInput('');
    ask.mutate(question);
  };

  if (isRestoring) {
    return (
      <View style={{ padding: 24, alignItems: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ height: 420 }}>
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 12, gap: 10 }}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => <TutorBubble item={item} />}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', marginTop: 24, gap: 8 }}>
            <Sparkles size={28} color="#94A3B8" strokeWidth={1.5} />
            <Text style={{ color: '#94A3B8', fontSize: 12.5, textAlign: 'center' }}>
              Hỏi Gia sư AI về bất kỳ điều gì trong bài học này.
            </Text>
          </View>
        }
        ListFooterComponent={ask.isPending ? <ActivityIndicator style={{ marginTop: 8 }} /> : null}
      />
      {ask.error ? (
        <Text style={{ color: '#DC2626', fontSize: 11.5, paddingHorizontal: 12 }}>
          {ask.error instanceof ApiError ? ask.error.message : 'Không gửi được câu hỏi, vui lòng thử lại.'}
        </Text>
      ) : null}
      <View style={{ flexDirection: 'row', gap: 8, padding: 10, borderTopWidth: 1, borderTopColor: '#E2E8F0' }}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Hỏi Gia sư AI..."
          style={{ flex: 1, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, fontSize: 13 }}
          onSubmitEditing={handleSend}
        />
        <Pressable
          onPress={handleSend}
          disabled={!input.trim() || ask.isPending}
          style={{ backgroundColor: '#2563EB', borderRadius: 999, paddingHorizontal: 16, justifyContent: 'center', opacity: !input.trim() || ask.isPending ? 0.5 : 1 }}
        >
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12.5 }}>Gửi</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function TutorBubble({ item }: { item: ChatItem }) {
  const isUser = item.sender === 'USER';
  return (
    <View style={{ alignSelf: isUser ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
      <View style={{ backgroundColor: isUser ? '#2563EB' : '#F1F5F9', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8 }}>
        <Text style={{ color: isUser ? '#fff' : '#0F172A', fontSize: 13 }}>{item.content}</Text>
      </View>
    </View>
  );
}
