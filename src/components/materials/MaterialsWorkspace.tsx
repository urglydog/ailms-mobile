import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Linking, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { Brain, Check, FileText, Layers, ListChecks, Plus, Timer, X } from 'lucide-react-native';

import { ApiError } from '@/lib/api/client';
import { materialsApi, type LanguageAvailability } from '@/lib/api/materials';
import { courseResourcesApi } from '@/lib/api/courseResources';
import { AssignmentsTab } from '@/components/lesson/AssignmentsTab';
import { LockedFeatureNotice } from '@/components/lesson/LockedFeatureNotice';
import type { MaterialAssignment, MaterialListItem, MaterialType, SharedMaterialListItem } from '@/types/material';
import type { CourseResource } from '@/types/courseResource';
import type { ChapterNav } from '@/types/lesson';

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

/** Lọc học liệu Official theo ngữ cảnh đang xem — khớp CHÍNH XÁC `fe`'s
 * `filteredOfficialMaterials`/`filteredCourseResources` (`MaterialManager.tsx`). Không truyền
 * `lessonId` (xem ở mức khoá học) → chỉ hiện học liệu KHÔNG gán riêng bài/chương nào (mức cả
 * khoá). Có `lessonId` (xem trong 1 bài học) → hiện học liệu gán trực tiếp cho bài đó, HOẶC gán
 * cho chương chứa bài đó. */
export function matchesLessonContext(assignments: MaterialAssignment[], lessonId: number | undefined, chapters: ChapterNav[] | undefined): boolean {
  if (lessonId == null) {
    return !assignments.some((a) => a.lessonId != null) && !assignments.some((a) => a.chapterId != null);
  }
  if (assignments.some((a) => a.lessonId === lessonId)) return true;
  const chapterAssignment = assignments.find((a) => a.chapterId != null);
  if (chapterAssignment && chapters) {
    const chapter = chapters.find((c) => c.chapterId === chapterAssignment.chapterId);
    if (chapter && chapter.lessons.some((l) => l.lessonId === lessonId)) return true;
  }
  return false;
}

/** Port từ `fe/components/materials/MaterialManager.tsx` + `LessonAssignmentsList` (12/10/2026,
 * sửa theo phản hồi) — web KHÔNG có 4 tab tách riêng như bản mobile cũ (Bài tập GV giao/Kho Học
 * Liệu Official/Tài nguyên/Lịch sử cá nhân). Cấu trúc thật của web: Bài tập GV giao đứng XẾP
 * CHỒNG (không phải tab) phía trên, rồi `MaterialManager` chỉ có ĐÚNG 2 tab — "Kho Học Liệu
 * Official" (gộp chung tài nguyên tĩnh + học liệu official, KHÔNG tách riêng) và "Kho Học Liệu Cá
 * Nhân". Dùng chung component này cho cả màn `/materials/[courseId]` (điều hướng độc lập) lẫn tab
 * "Học liệu" lồng trong lesson player (`lessons/[id].tsx`). */
export function MaterialsWorkspace({
  courseId, lessonId, chapters, enrolled, courseSlug,
}: {
  courseId: number;
  lessonId?: number;
  /** Để resolve "học liệu gán theo CHƯƠNG chứa bài học hiện tại" — không truyền thì bỏ qua nhánh
   * đó, chỉ khớp theo gán trực tiếp lessonId (xem {@link filterByLessonContext}). */
  chapters?: ChapterNav[];
  enrolled: boolean;
  courseSlug: string;
}) {
  const [activeTab, setActiveTab] = useState<'official' | 'personal'>('official');
  const [createOpen, setCreateOpen] = useState(false);

  const personalQuery = useQuery({
    queryKey: ['materials', courseId, 'personal'],
    queryFn: () => materialsApi.listForCourse(courseId),
    enabled: !!courseId && enrolled,
    // Port từ `fe`'s `useCourseMaterials` — tự poll lại khi còn item đang xử lý AI, để học liệu
    // vừa yêu cầu tạo tự xuất hiện trong list mà không cần người dùng tự kéo-làm-mới.
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data?.some((m) => m.status === 'PENDING' || m.status === 'PROCESSING')) return 3000;
      return false;
    },
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
  const shared = (sharedQuery.data ?? [])
    .filter((m) => m.status === 'COMPLETED')
    .filter((m) => matchesLessonContext(m.assignments, lessonId, chapters));
  const resources = (resourcesQuery.data ?? []).filter((r) =>
    matchesLessonContext(
      r.chapterId != null || r.lessonId != null ? [{ id: 0, chapterId: r.chapterId ?? undefined, lessonId: r.lessonId ?? undefined }] : [],
      lessonId,
      chapters,
    ),
  );
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

      {activeTab === 'personal' ? (
        <Pressable
          onPress={() => setCreateOpen(true)}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: '#2563EB', borderRadius: 10, paddingVertical: 10, backgroundColor: '#EFF6FF' }}
        >
          <Plus size={16} color="#2563EB" strokeWidth={2.5} />
          <Text style={{ color: '#2563EB', fontWeight: '700', fontSize: 13 }}>Tạo học liệu AI mới</Text>
        </Pressable>
      ) : null}

      {createOpen ? (
        <CreateMaterialModal courseId={courseId} onClose={() => setCreateOpen(false)} />
      ) : null}

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

const CREATE_TYPES: { id: MaterialType; label: string; Icon: typeof Brain }[] = [
  { id: 'MINDMAP', label: 'Sơ đồ tư duy', Icon: Brain },
  { id: 'FLASHCARD', label: 'Flashcard', Icon: Layers },
  { id: 'QUIZ', label: 'Câu hỏi ôn tập', Icon: ListChecks },
];

/** Port MVP từ `fe/components/materials/MaterialManager.tsx` (phần "Tạo học liệu AI mới") — chỉ
 * hỗ trợ scope "Toàn bộ khoá học" (web có thêm chọn theo chương/bài lẻ — ngoài phạm vi lần này).
 * Dùng chung logic polling trạng thái PENDING/PROCESSING đã có sẵn trong `MaterialsWorkspace`
 * (list tự ẩn item chưa COMPLETED), không cần thêm UI trạng thái riêng ở đây. */
function CreateMaterialModal({ courseId, onClose }: { courseId: number; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [materialType, setMaterialType] = useState<MaterialType>('MINDMAP');
  const [language, setLanguage] = useState<string | null>(null);

  const languagesQuery = useQuery({
    queryKey: ['materials', courseId, 'available-languages'],
    queryFn: () => materialsApi.getAvailableLanguages(courseId),
  });

  const languages: LanguageAvailability[] = languagesQuery.data ?? [];
  const selectedLanguage = language ?? languages[0]?.code ?? null;

  const createMutation = useMutation({
    mutationFn: () => {
      if (!selectedLanguage) throw new Error('Chưa chọn ngôn ngữ.');
      return materialsApi.requestGeneration({ courseId, materialType, language: selectedLanguage, scopeType: 'WHOLE_COURSE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials', courseId, 'personal'] });
      Alert.alert('Đã gửi yêu cầu', 'AI đang tạo học liệu — chờ vài phút rồi quay lại tab "Kho Học Liệu Cá Nhân" để xem.');
      onClose();
    },
    onError: (err) => {
      Alert.alert('Lỗi', err instanceof ApiError ? err.message : 'Không gửi được yêu cầu tạo học liệu.');
    },
  });

  return (
    <Modal visible transparent presentationStyle="overFullScreen" animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'flex-end' }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        {/* (16/10/2026, sửa theo phản hồi) — trước đây không giới hạn chiều cao: list ngôn ngữ dài
            (nhiều ngôn ngữ) đẩy cả sheet cao quá màn hình, đẩy luôn nút X/tiêu đề ra NGOÀI màn
            hình phía trên, không bấm đóng được nữa. Giới hạn `maxHeight` + list ngôn ngữ cuộn
            riêng trong khung cố định thay vì để tự giãn theo nội dung. */}
        <View style={{ maxHeight: '85%', backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, gap: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#0F172A' }}>Tạo học liệu AI mới</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <X size={20} color="#64748B" />
            </Pressable>
          </View>

          <View style={{ gap: 8 }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#475569' }}>Loại học liệu</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {CREATE_TYPES.map(({ id, label, Icon }) => {
                const active = materialType === id;
                return (
                  <Pressable
                    key={id}
                    onPress={() => setMaterialType(id)}
                    style={{ flex: 1, alignItems: 'center', gap: 4, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: active ? '#2563EB' : '#E2E8F0', backgroundColor: active ? '#EFF6FF' : '#fff' }}
                  >
                    <Icon size={18} color={active ? '#2563EB' : '#64748B'} strokeWidth={1.75} />
                    <Text style={{ fontSize: 11, fontWeight: '600', color: active ? '#2563EB' : '#475569' }}>{label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={{ gap: 8 }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#475569' }}>Ngôn ngữ</Text>
            {languagesQuery.isLoading ? (
              <ActivityIndicator />
            ) : languages.length === 0 ? (
              <Text style={{ color: '#94A3B8', fontSize: 12.5 }}>Khoá học chưa có ngôn ngữ nào khả dụng.</Text>
            ) : (
              <ScrollView style={{ maxHeight: 180 }} contentContainerStyle={{ gap: 6 }}>
                {languages.map((lang) => {
                  const active = selectedLanguage === lang.code;
                  return (
                    <Pressable
                      key={lang.code}
                      onPress={() => setLanguage(lang.code)}
                      style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: active ? '#2563EB' : '#E2E8F0', backgroundColor: active ? '#EFF6FF' : '#fff' }}
                    >
                      <Text style={{ fontSize: 13.5, fontWeight: '600', color: active ? '#2563EB' : '#334155' }}>{lang.label}</Text>
                      {active ? <Check size={16} color="#2563EB" strokeWidth={2.5} /> : null}
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
          </View>

          <Pressable
            onPress={() => createMutation.mutate()}
            disabled={!selectedLanguage || createMutation.isPending}
            style={{ alignItems: 'center', paddingVertical: 12, borderRadius: 10, backgroundColor: '#2563EB', opacity: !selectedLanguage || createMutation.isPending ? 0.6 : 1 }}
          >
            {createMutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Tạo ngay</Text>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
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
