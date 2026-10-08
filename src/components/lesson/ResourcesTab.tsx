import { useQuery } from '@tanstack/react-query';
import * as Linking from 'expo-linking';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Download, FolderOpen, FileText } from 'lucide-react-native';

import { courseResourcesApi } from '@/lib/api/courseResources';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Port từ `fe/components/course/CourseResourcesTab.tsx` — tái dùng `courseResourcesApi` đã có
 * sẵn (Materials Workspace đã port xong nguồn này, xem UpComming_Plan.md mục 1b). Mở file qua
 * `Linking.openURL` (trình duyệt/app xem file mặc định của máy) thay vì tải về trong app —
 * đơn giản, đủ dùng cho bản port đầu tiên. */
export function ResourcesTab({ courseId }: { courseId: number }) {
  const { data: resources, isLoading, error } = useQuery({
    queryKey: ['course-resources', courseId],
    queryFn: () => courseResourcesApi.listForCourse(courseId),
  });

  if (isLoading) {
    return (
      <View style={{ padding: 16, alignItems: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (error) {
    return <Text style={{ padding: 16, color: '#DC2626' }}>Lỗi khi tải tài nguyên khoá học.</Text>;
  }

  if (!resources || resources.length === 0) {
    return (
      <View style={{ padding: 24, alignItems: 'center', gap: 8 }}>
        <FolderOpen size={36} color="#94A3B8" strokeWidth={1.5} />
        <Text style={{ fontWeight: '700', color: '#0F172A' }}>Chưa có tài nguyên tĩnh</Text>
        <Text style={{ color: '#64748B', fontSize: 12.5, textAlign: 'center' }}>
          Giảng viên chưa đăng tải tài liệu đính kèm nào cho khóa học này.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ padding: 16 }}>
      <Text style={{ fontWeight: '700', fontSize: 15, marginBottom: 10, color: '#0F172A' }}>Tài nguyên đính kèm</Text>
      <View style={{ borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, overflow: 'hidden' }}>
        {resources.map((res, idx) => (
          <Pressable
            key={res.id}
            onPress={() => Linking.openURL(res.fileUrl)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              padding: 12,
              borderTopWidth: idx === 0 ? 0 : 1,
              borderTopColor: '#F1F5F9',
            }}
          >
            <View style={{ width: 34, height: 34, borderRadius: 8, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={17} color="#2563EB" strokeWidth={1.75} />
            </View>
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={{ fontWeight: '600', fontSize: 13, color: '#0F172A' }}>{res.title}</Text>
              <Text style={{ fontSize: 11, color: '#64748B', marginTop: 1 }}>
                {res.fileType} · {formatBytes(res.fileSize)}
              </Text>
            </View>
            <Download size={16} color="#94A3B8" />
          </Pressable>
        ))}
      </View>
    </View>
  );
}
