import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';

import { BackButton } from '@/components/BackButton';
import { ApiError } from '@/lib/api/client';
import { messageApi } from '@/lib/api/communication';
import { COLORS } from '@/lib/theme/colors';

export default function ConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const conversationId = Number(id);
  const queryClient = useQueryClient();
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data: conversations } = useQuery({
    queryKey: ['messages', 'conversations'],
    queryFn: () => messageApi.listConversations(),
  });
  const conversation = conversations?.find((c) => c.id === conversationId);

  const { data: messages, isLoading } = useQuery({
    queryKey: ['messages', 'conversation', conversationId],
    queryFn: () => messageApi.getMessages(conversationId),
    enabled: Number.isFinite(conversationId),
    refetchInterval: 5000,
  });

  const send = useMutation({
    mutationFn: (text: string) => messageApi.sendMessage(conversationId, text),
    onSuccess: () => {
      setContent('');
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ['messages', 'conversation', conversationId] });
      void queryClient.invalidateQueries({ queryKey: ['messages', 'conversations'] });
    },
    onError: (err: unknown) => setError(err instanceof ApiError ? err.message : 'Không gửi được tin nhắn.'),
  });

  // FlatList inverted: tin mới nhất ở cuối màn hình (dữ liệu BE theo thứ tự cũ → mới).
  const data = [...(messages ?? [])].reverse();

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: COLORS.surface }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <Stack.Screen options={{ headerShown: true, title: conversation?.otherUserName ?? 'Tin nhắn', headerLeft: () => <BackButton /> }} />
      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator />
        </View>
      ) : (
        <FlatList
          inverted
          data={data}
          keyExtractor={(m) => String(m.id)}
          contentContainerStyle={{ padding: 12, gap: 8 }}
          renderItem={({ item: m }) => (
            <View style={{ alignSelf: m.mine ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
              <View style={{ backgroundColor: m.mine ? COLORS.accent : COLORS.tint, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8 }}>
                <Text style={{ color: m.mine ? COLORS.white : COLORS.ink }}>{m.content}</Text>
              </View>
              <Text style={{ fontSize: 10, color: COLORS.inkFaint, marginTop: 2, alignSelf: m.mine ? 'flex-end' : 'flex-start' }}>
                {new Date(m.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          )}
        />
      )}
      {error ? <Text style={{ color: COLORS.danger, paddingHorizontal: 12 }}>{error}</Text> : null}
      <View style={{ flexDirection: 'row', gap: 8, padding: 10, borderTopWidth: 1, borderTopColor: COLORS.lineSoft, backgroundColor: COLORS.surfaceRaised }}>
        <TextInput placeholderTextColor={COLORS.inkFaint}
          placeholder="Nhập tin nhắn..."
          value={content}
          onChangeText={setContent}
          style={{ flex: 1, borderWidth: 1, borderColor: COLORS.line, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, color: COLORS.ink }}
        />
        <Pressable
          disabled={!content.trim() || send.isPending}
          onPress={() => send.mutate(content.trim())}
          style={{ backgroundColor: COLORS.accent, borderRadius: 8, paddingHorizontal: 16, justifyContent: 'center', opacity: !content.trim() || send.isPending ? 0.5 : 1 }}
        >
          <Text style={{ color: COLORS.white, fontWeight: '700' }}>Gửi</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
