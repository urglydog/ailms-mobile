import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import { useState } from 'react';
import * as Linking from 'expo-linking';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { Paperclip } from 'lucide-react-native';

import { ApiError } from '@/lib/api/client';
import { assignmentApi } from '@/lib/api/communication';
import { LockedFeatureNotice } from '@/components/lesson/LockedFeatureNotice';
import type { StudentAssignmentItem } from '@/types/lessonPlayer';
import { COLORS } from '@/lib/theme/colors';

/** Port từ `fe/components/course/LessonAssignmentsList.tsx` — web đặt khối này NGAY TRONG tab
 * "Học liệu" (cùng `MaterialManager`), không có tab riêng nào (08/10/2026, sửa lại sau khi
 * khảo sát sai ban đầu tự tách thành 1 tab "Bài tập" không tồn tại trên web). Mobile đặt ở đầu
 * `MaterialsWorkspace` (12/10/2026, dùng chung cho cả tab "Học liệu" lồng trong lesson player lẫn
 * màn `/materials/[courseId]` điều hướng độc lập) — theo `lessonId` vì bài tập gắn với 1 bài học
 * cụ thể, không phải toàn khoá. */
export function AssignmentsTab({ lessonId, enrolled, courseSlug }: { lessonId: number; enrolled: boolean; courseSlug: string }) {
  const { data: assignments, isLoading } = useQuery({
    queryKey: ['lesson-assignments', lessonId],
    queryFn: () => assignmentApi.listForStudent(lessonId),
    enabled: enrolled,
  });

  if (!enrolled) {
    return <LockedFeatureNotice feature="Bài tập" courseSlug={courseSlug} />;
  }

  if (isLoading) {
    return (
      <View style={{ padding: 16, alignItems: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!assignments || assignments.length === 0) {
    return (
      <View style={{ padding: 24, alignItems: 'center' }}>
        <Text style={{ color: COLORS.inkFaint, fontSize: 13, textAlign: 'center' }}>
          Bài học này không có bài tập tự luận/nộp file nào.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ padding: 16, gap: 12 }}>
      {assignments.map((item) => (
        <AssignmentCard key={item.assignment.id} lessonId={lessonId} item={item} />
      ))}
    </View>
  );
}

function AssignmentCard({ lessonId, item }: { lessonId: number; item: StudentAssignmentItem }) {
  const queryClient = useQueryClient();
  const { assignment, mySubmission } = item;
  const [textContent, setTextContent] = useState('');
  const [file, setFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);

  const submit = useMutation({
    mutationFn: () =>
      assignmentApi.submit(assignment.id, {
        textContent: textContent.trim() || undefined,
        file: file ? { uri: file.uri, name: file.name, mimeType: file.mimeType ?? 'application/octet-stream' } : null,
      }),
    onSuccess: () => {
      setTextContent('');
      setFile(null);
      queryClient.invalidateQueries({ queryKey: ['lesson-assignments', lessonId] });
    },
  });

  const handlePickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: false });
    if (!result.canceled && result.assets[0]) setFile(result.assets[0]);
  };

  const isGraded = mySubmission?.score != null;

  return (
    <View style={{ borderWidth: 1, borderColor: COLORS.lineSoft, borderRadius: 10, padding: 14, gap: 8 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
        <Text style={{ fontWeight: '700', fontSize: 13.5, color: COLORS.ink, flex: 1 }}>{assignment.title}</Text>
        {assignment.maxScore != null ? (
          <Text style={{ fontSize: 11, fontWeight: '700', color: COLORS.accent, backgroundColor: COLORS.tint, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 }}>
            Tối đa {assignment.maxScore} điểm
          </Text>
        ) : null}
      </View>

      {assignment.dueDate ? (
        <Text style={{ fontSize: 11.5, color: COLORS.inkFaint }}>Hạn nộp: {new Date(assignment.dueDate).toLocaleDateString('vi-VN')}</Text>
      ) : null}
      {assignment.instructions ? <Text style={{ fontSize: 12.5, color: COLORS.inkFaint }}>{assignment.instructions}</Text> : null}

      {mySubmission ? (
        <View style={{ backgroundColor: COLORS.surface, borderRadius: 8, padding: 10, gap: 4 }}>
          <Text style={{ fontSize: 10.5, fontWeight: '700', color: COLORS.lineDot, textTransform: 'uppercase' }}>
            Bài đã nộp · {new Date(mySubmission.submittedAt).toLocaleString('vi-VN')}
          </Text>
          {mySubmission.textContent ? <Text style={{ fontSize: 12.5, color: COLORS.ink }}>{mySubmission.textContent}</Text> : null}
          {mySubmission.fileUrl ? (
            <Pressable onPress={() => Linking.openURL(mySubmission.fileUrl!)}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.accent }}>📎 {mySubmission.fileName ?? 'Tệp đã nộp'}</Text>
            </Pressable>
          ) : null}
          {isGraded ? (
            <View style={{ borderTopWidth: 1, borderTopColor: COLORS.lineSoft, paddingTop: 6, marginTop: 2 }}>
              <Text style={{ fontWeight: '700', fontSize: 13, color: COLORS.success }}>
                Điểm: {mySubmission.score}{assignment.maxScore != null ? `/${assignment.maxScore}` : ''}
              </Text>
              {mySubmission.feedback ? <Text style={{ fontSize: 12, color: COLORS.inkFaint }}>{mySubmission.feedback}</Text> : null}
            </View>
          ) : (
            <Text style={{ fontSize: 11.5, color: COLORS.inkFaint }}>Đang chờ giảng viên chấm điểm.</Text>
          )}
        </View>
      ) : (
        <View style={{ gap: 8 }}>
          <TextInput
            value={textContent}
            onChangeText={setTextContent}
            multiline
            numberOfLines={3}
            placeholder="Nhập nội dung bài làm..."
            style={{ borderWidth: 1, borderColor: COLORS.lineSoft, borderRadius: 8, padding: 10, fontSize: 13, minHeight: 60, textAlignVertical: 'top' }}
          />
          <Pressable onPress={handlePickFile} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' }}>
            <Paperclip size={14} color={COLORS.inkFaint} />
            <Text style={{ fontSize: 12, color: COLORS.inkFaint }}>{file ? file.name : 'Đính kèm tệp (tuỳ chọn)'}</Text>
          </Pressable>
          {submit.error ? (
            <Text style={{ color: COLORS.danger, fontSize: 12 }}>
              {submit.error instanceof ApiError ? submit.error.message : 'Nộp bài thất bại, vui lòng thử lại.'}
            </Text>
          ) : null}
          <Pressable
            disabled={(!textContent.trim() && !file) || submit.isPending}
            onPress={() => submit.mutate()}
            style={{
              alignSelf: 'flex-start',
              backgroundColor: COLORS.accent,
              borderRadius: 8,
              paddingVertical: 9,
              paddingHorizontal: 18,
              opacity: (!textContent.trim() && !file) || submit.isPending ? 0.5 : 1,
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12.5 }}>
              {submit.isPending ? 'Đang nộp...' : 'Nộp bài'}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
