import { useQuery } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';

import { usersApi } from '@/lib/api/users';
import { useLessonChat } from '@/hooks/useLessonChat';
import { LockedFeatureNotice } from '@/components/lesson/LockedFeatureNotice';
import type { LessonChatMessage } from '@/types/lessonPlayer';

/** Port rút gọn từ `fe/components/community/LiveChatPanel.tsx` — chat realtime phẳng theo thời
 * gian (KHÔNG port phân trang trả lời kiểu bình luận Facebook/ghim câu trả lời giảng viên lên
 * đầu — giữ scope gọn, mọi tin nhắn hiện tuần tự theo thời gian giống nhóm chat thường). */
export function QnaTab({ lessonId, enrolled, courseSlug }: { lessonId: number; enrolled: boolean; courseSlug: string }) {
  const { data: me } = useQuery({ queryKey: ['users', 'me'], queryFn: () => usersApi.getMe(), enabled: enrolled });
  const { messages, sendMessage } = useLessonChat(enrolled ? lessonId : null);
  const [input, setInput] = useState('');
  const listRef = useRef<FlatList<LessonChatMessage>>(null);

  if (!enrolled) {
    return <LockedFeatureNotice feature="Hỏi đáp bài học" courseSlug={courseSlug} />;
  }

  const handleSend = () => {
    if (!input.trim() || !me) return;
    sendMessage(input.trim(), String(me.id), me.fullName);
    setInput('');
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ height: 420 }}>
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 12, gap: 10 }}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => <ChatBubble message={item} isMine={me != null && item.senderId === String(me.id)} />}
        ListEmptyComponent={
          <Text style={{ color: '#94A3B8', fontSize: 12.5, textAlign: 'center', marginTop: 24 }}>
            Chưa có câu hỏi nào — hãy là người đầu tiên hỏi về bài học này!
          </Text>
        }
      />
      <View style={{ flexDirection: 'row', gap: 8, padding: 10, borderTopWidth: 1, borderTopColor: '#E2E8F0' }}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Đặt câu hỏi về bài học..."
          style={{ flex: 1, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, fontSize: 13 }}
          onSubmitEditing={handleSend}
        />
        <Pressable
          onPress={handleSend}
          disabled={!input.trim()}
          style={{ backgroundColor: '#2563EB', borderRadius: 999, paddingHorizontal: 16, justifyContent: 'center', opacity: input.trim() ? 1 : 0.5 }}
        >
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12.5 }}>Gửi</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function ChatBubble({ message, isMine }: { message: LessonChatMessage; isMine: boolean }) {
  return (
    <View style={{ alignSelf: isMine ? 'flex-end' : 'flex-start', maxWidth: '80%', gap: 2 }}>
      <Text style={{ fontSize: 10.5, color: '#94A3B8', marginLeft: 4 }}>
        {message.senderName}{message.isInstructor ? ' · Giảng viên' : ''}
      </Text>
      <View
        style={{
          backgroundColor: isMine ? '#2563EB' : message.isInstructor ? '#F0FDF4' : '#F1F5F9',
          borderRadius: 14,
          paddingHorizontal: 12,
          paddingVertical: 8,
        }}
      >
        <Text style={{ color: isMine ? '#fff' : '#0F172A', fontSize: 13 }}>{message.content}</Text>
      </View>
    </View>
  );
}
