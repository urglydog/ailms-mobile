import { useQuery } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams, type Href } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import { Brain, Layers, ListChecks } from 'lucide-react-native';

import { ApiError } from '@/lib/api/client';
import { materialsApi } from '@/lib/api/materials';
import { BackButton } from '@/components/BackButton';
import type { MaterialListItem } from '@/types/material';

const TYPE_ICON: Record<MaterialListItem['materialType'], typeof Brain> = {
  MINDMAP: Brain,
  FLASHCARD: Layers,
  QUIZ: ListChecks,
};

const TYPE_LABEL: Record<MaterialListItem['materialType'], string> = {
  MINDMAP: 'Sơ đồ tư duy',
  FLASHCARD: 'Flashcard',
  QUIZ: 'Câu hỏi ôn tập',
};

export default function MaterialsListScreen() {
  const { courseId } = useLocalSearchParams<{ courseId: string }>();
  const id = Number(courseId);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['materials', id],
    queryFn: () => materialsApi.listForCourse(id),
    enabled: !!id,
  });

  const completed = data?.filter((m) => m.status === 'COMPLETED') ?? [];

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 }}>
        <Text>{error instanceof ApiError ? error.message : 'Không tải được học liệu.'}</Text>
        <Pressable onPress={() => refetch()}>
          <Text style={{ color: '#2563EB' }}>Thử lại</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ headerShown: true, title: 'Học liệu AI', headerLeft: () => <BackButton /> }} />
      <FlatList
        data={completed}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        ListEmptyComponent={
          <Text style={{ color: '#64748B', textAlign: 'center', marginTop: 40 }}>
            Khoá học này chưa có học liệu AI nào (flashcard/sơ đồ tư duy) sẵn sàng.
          </Text>
        }
        renderItem={({ item }) => {
          const Icon = TYPE_ICON[item.materialType];
          return (
            <Pressable
              onPress={() => router.push(`/material/${item.id}` as Href)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                borderWidth: 1,
                borderColor: '#E2E8F0',
                borderRadius: 10,
                padding: 14,
              }}
            >
              <Icon size={22} color="#2563EB" strokeWidth={1.75} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '600' }}>{item.title || TYPE_LABEL[item.materialType]}</Text>
                <Text style={{ color: '#64748B', fontSize: 12 }}>{TYPE_LABEL[item.materialType]}</Text>
              </View>
            </Pressable>
          );
        }}
      />
    </View>
  );
}
