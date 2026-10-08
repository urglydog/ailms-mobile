import { useQuery } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams, type Href } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Linking, Pressable, FlatList, ScrollView, Text, View } from 'react-native';
import { Brain, FileText, Layers, ListChecks, Timer } from 'lucide-react-native';

import { ApiError } from '@/lib/api/client';
import { materialsApi } from '@/lib/api/materials';
import { courseResourcesApi } from '@/lib/api/courseResources';
import { BackButton } from '@/components/BackButton';
import { AssignmentsTab } from '@/components/lesson/AssignmentsTab';
import type { MaterialListItem, MaterialType, SharedMaterialListItem } from '@/types/material';
import type { CourseResource } from '@/types/courseResource';

const TYPE_ICON: Record<MaterialType, typeof Brain> = {
  MINDMAP: Brain,
  FLASHCARD: Layers,
  QUIZ: ListChecks,
};

const TYPE_LABEL: Record<MaterialType, string> = {
  MINDMAP: 'Sơ đồ tư duy',
  FLASHCARD: 'Flashcard',
  QUIZ: 'Câu hỏi ôn tập',
};

type Row = (MaterialListItem | SharedMaterialListItem) | CourseResource;

function isResource(item: Row): item is CourseResource {
  return 'fileUrl' in item;
}

/** QUIZ cần phân biệt thêm theo quizType — icon/label khác cho bài thi chính thức (có giờ) so
 * với ôn tập thường, tránh nhầm (bug thật 07/10/2026: 2 loại từng hiện giống hệt nhau). */
function displayFor(item: Row): { Icon: typeof Brain; label: string } {
  if (isResource(item)) {
    return { Icon: FileText, label: formatFileSize(item.fileSize) };
  }
  if (item.materialType === 'QUIZ') {
    return item.quizType === 'OFFICIAL_EXAM'
      ? { Icon: Timer, label: 'Bài thi chính thức · có tính giờ' }
      : { Icon: ListChecks, label: 'Câu hỏi ôn tập · không tính giờ' };
  }
  return { Icon: TYPE_ICON[item.materialType], label: TYPE_LABEL[item.materialType] };
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function titleFor(item: Row): string {
  if (isResource(item)) return item.title;
  return item.title || TYPE_LABEL[item.materialType];
}

export default function MaterialsListScreen() {
  const { courseId, lessonId } = useLocalSearchParams<{ courseId: string; lessonId?: string }>();
  const id = Number(courseId);
  const [activeTab, setActiveTab] = useState<string>(lessonId ? 'assignments' : 'shared');

  const personalQuery = useQuery({
    queryKey: ['materials', id, 'personal'],
    queryFn: () => materialsApi.listForCourse(id),
    enabled: !!id,
  });

  const sharedQuery = useQuery({
    queryKey: ['materials', id, 'shared'],
    queryFn: () => materialsApi.listSharedForCourse(id),
    enabled: !!id,
  });

  const resourcesQuery = useQuery({
    queryKey: ['course-resources', id],
    queryFn: () => courseResourcesApi.listForCourse(id),
    enabled: !!id,
  });

  const isLoading = personalQuery.isLoading || sharedQuery.isLoading || resourcesQuery.isLoading;
  const error = personalQuery.error || sharedQuery.error || resourcesQuery.error;

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
        <Pressable
          onPress={() => {
            personalQuery.refetch();
            sharedQuery.refetch();
            resourcesQuery.refetch();
          }}
        >
          <Text style={{ color: '#2563EB' }}>Thử lại</Text>
        </Pressable>
      </View>
    );
  }

  const personal = (personalQuery.data ?? []).filter((m) => m.status === 'COMPLETED');
  const shared = (sharedQuery.data ?? []).filter((m) => m.status === 'COMPLETED');
  const resources = resourcesQuery.data ?? [];

  const tabs = [
    ...(lessonId ? [{ key: 'assignments', label: 'Bài tập GV giao' }] : []),
    { key: 'shared', label: 'Kho Học Liệu Official' },
    { key: 'resources', label: 'Tài nguyên khoá học' },
    { key: 'personal', label: 'Lịch sử tạo cá nhân' },
  ];

  let currentData: Row[] = [];
  if (activeTab === 'shared') currentData = shared;
  else if (activeTab === 'resources') currentData = resources;
  else if (activeTab === 'personal') currentData = personal;

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <Stack.Screen options={{ headerShown: true, title: 'Học liệu', headerLeft: () => <BackButton /> }} />
      
      {/* Tabs */}
      <View style={{ borderBottomWidth: 1, borderBottomColor: '#E2E8F0' }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 8 }}>
          {tabs.map((tab) => (
            <Pressable
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 14,
                borderBottomWidth: 2,
                borderBottomColor: activeTab === tab.key ? '#2563EB' : 'transparent',
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: '600', color: activeTab === tab.key ? '#2563EB' : '#64748B' }}>
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {activeTab === 'assignments' && lessonId ? (
        <ScrollView style={{ flex: 1, padding: 16 }}>
          <AssignmentsTab lessonId={Number(lessonId)} enrolled courseSlug="" />
        </ScrollView>
      ) : (
        <FlatList<Row>
          data={currentData}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          ListEmptyComponent={
            <Text style={{ color: '#64748B', textAlign: 'center', marginTop: 40 }}>
              Không có dữ liệu trong mục này.
            </Text>
          }
          renderItem={({ item }) => {
            const { Icon, label } = displayFor(item);
            return (
              <Pressable
                onPress={() => (isResource(item) ? Linking.openURL(item.fileUrl) : router.push(`/material/${item.id}` as Href))}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                  borderRadius: 10,
                  padding: 14,
                  backgroundColor: '#F8FAFC',
                }}
              >
                <Icon size={22} color="#2563EB" strokeWidth={1.75} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '600', fontSize: 14, color: '#1E293B' }}>{titleFor(item)}</Text>
                  <Text style={{ color: '#64748B', fontSize: 12, marginTop: 2 }}>{label}</Text>
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}
