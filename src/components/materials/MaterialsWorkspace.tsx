import { useQuery } from '@tanstack/react-query';
import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Linking, Pressable, Text, View } from 'react-native';
import { Brain, FileText, Layers, ListChecks, Timer } from 'lucide-react-native';

import { ApiError } from '@/lib/api/client';
import { materialsApi } from '@/lib/api/materials';
import { courseResourcesApi } from '@/lib/api/courseResources';
import { AssignmentsTab } from '@/components/lesson/AssignmentsTab';
import { LockedFeatureNotice } from '@/components/lesson/LockedFeatureNotice';
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
 * với ôn tập thường, tránh nhầm (bug thật 07/10/2026: 2 loại từng hiện giống hệt nhau).
 *
 * (12/10/2026, sửa lỗi) — BE có bug data: quiz cá nhân tạo ở scope KHÓA HỌC/CHƯƠNG từng bị mặc
 * định `quizType='OFFICIAL_EXAM'` dù không phải quiz chính thức thật. Quiz cá nhân KHÔNG THỂ là
 * thi chính thức thật theo định nghĩa (chỉ giảng viên publish mới thành Official) — chỉ tin
 * `quizType === 'OFFICIAL_EXAM'` khi item có field `isOfficial` thật và cũng là `true`. */
function displayFor(item: Row): { Icon: typeof Brain; label: string } {
  if (isResource(item)) {
    return { Icon: FileText, label: formatFileSize(item.fileSize) };
  }
  if (item.materialType === 'QUIZ') {
    const isRealOfficialExam = item.quizType === 'OFFICIAL_EXAM' && 'isOfficial' in item && item.isOfficial === true;
    return isRealOfficialExam
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

/** Port từ `fe/components/materials/MaterialManager.tsx` + `LessonAssignmentsList` (12/10/2026,
 * sửa theo phản hồi) — web KHÔNG có 4 tab tách riêng như bản mobile cũ (Bài tập GV giao/Kho Học
 * Liệu Official/Tài nguyên/Lịch sử cá nhân). Cấu trúc thật của web: Bài tập GV giao đứng XẾP
 * CHỒNG (không phải tab) phía trên, rồi `MaterialManager` chỉ có ĐÚNG 2 tab — "Kho Học Liệu
 * Official" (gộp chung tài nguyên tĩnh + học liệu official, KHÔNG tách riêng) và "Kho Học Liệu Cá
 * Nhân". Dùng chung component này cho cả màn `/materials/[courseId]` (điều hướng độc lập) lẫn tab
 * "Học liệu" lồng trong lesson player (`lessons/[id].tsx`). */
export function MaterialsWorkspace({
  courseId, lessonId, enrolled, courseSlug,
}: {
  courseId: number;
  lessonId?: number;
  enrolled: boolean;
  courseSlug: string;
}) {
  const [activeTab, setActiveTab] = useState<'official' | 'personal'>('official');

  const personalQuery = useQuery({
    queryKey: ['materials', courseId, 'personal'],
    queryFn: () => materialsApi.listForCourse(courseId),
    enabled: !!courseId && enrolled,
  });

  const sharedQuery = useQuery({
    queryKey: ['materials', courseId, 'shared'],
    queryFn: () => materialsApi.listSharedForCourse(courseId),
    enabled: !!courseId && enrolled,
  });

  const resourcesQuery = useQuery({
    queryKey: ['course-resources', courseId],
    queryFn: () => courseResourcesApi.listForCourse(courseId),
    enabled: !!courseId && enrolled,
  });

  if (!enrolled) {
    return <LockedFeatureNotice feature="Học liệu" courseSlug={courseSlug} />;
  }

  const isLoading = personalQuery.isLoading || sharedQuery.isLoading || resourcesQuery.isLoading;
  const error = personalQuery.error || sharedQuery.error || resourcesQuery.error;

  if (isLoading) {
    return (
      <View style={{ alignItems: 'center', paddingVertical: 40 }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ alignItems: 'center', gap: 12, paddingVertical: 24 }}>
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
  // "Kho Học Liệu Official" gộp chung tài nguyên tĩnh + học liệu official vào 1 danh sách, khớp
  // đúng `fe`'s `filteredCourseResources.map(...)` rồi `filteredOfficialMaterials.map(...)` nối
  // tiếp nhau trong CÙNG `<div className="space-y-4">`.
  const official: Row[] = [...resources, ...shared];
  const currentData: Row[] = activeTab === 'official' ? official : personal;

  return (
    <View style={{ gap: 16 }}>
      {lessonId != null ? <AssignmentsTab lessonId={lessonId} enrolled={enrolled} courseSlug={courseSlug} /> : null}

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TabPill
          label="Kho Học Liệu Official"
          count={official.length}
          active={activeTab === 'official'}
          onPress={() => setActiveTab('official')}
        />
        <TabPill label="Kho Học Liệu Cá Nhân" active={activeTab === 'personal'} onPress={() => setActiveTab('personal')} />
      </View>

      {currentData.length === 0 ? (
        <Text style={{ color: '#64748B', textAlign: 'center', paddingVertical: 24 }}>Không có dữ liệu trong mục này.</Text>
      ) : (
        <View style={{ gap: 10 }}>
          {currentData.map((item, index) => {
            const { Icon, label } = displayFor(item);
            return (
              <Pressable
                key={`${item.id}-${index}`}
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
          })}
        </View>
      )}
    </View>
  );
}

function TabPill({ label, count, active, onPress }: { label: string; count?: number; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 999,
        backgroundColor: active ? '#2563EB' : '#F1F5F9',
      }}
    >
      <Text style={{ fontSize: 13, fontWeight: '700', color: active ? '#fff' : '#475569' }}>{label}</Text>
      {!!count && (
        <View style={{ backgroundColor: active ? 'rgba(255,255,255,0.25)' : '#CBD5E1', borderRadius: 999, paddingHorizontal: 6, paddingVertical: 1 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: active ? '#fff' : '#334155' }}>{count}</Text>
        </View>
      )}
    </Pressable>
  );
}
