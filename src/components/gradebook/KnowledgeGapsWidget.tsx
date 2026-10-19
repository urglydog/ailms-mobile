import { useQuery } from '@tanstack/react-query';
import { router, type Href } from 'expo-router';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { AlertTriangle, Lightbulb, PlayCircle, Trophy } from 'lucide-react-native';

import { knowledgeGapsApi } from '@/lib/api/knowledgeGaps';
import { COLORS } from '@/lib/theme/colors';

function getGapColorTheme(errorRate: number) {
  if (errorRate >= 0.7) {
    return {
      text: '#E11D48', // rose-600
      bg: '#F43F5E', // rose-500
      borderColor: 'rgba(244, 63, 94, 0.2)',
      backgroundColor: '#FFF1F2', // rose-50
    };
  }
  if (errorRate >= 0.4) {
    return {
      text: COLORS.warning, // amber-600
      bg: COLORS.star, // amber-500
      borderColor: 'rgba(245, 158, 11, 0.2)',
      backgroundColor: '#FFFBEB', // amber-50
    };
  }
  return {
    text: '#0284C7', // sky-600
    bg: '#0EA5E9', // sky-500
    borderColor: 'rgba(14, 165, 233, 0.2)',
    backgroundColor: '#F0F9FF', // sky-50
  };
}

export function KnowledgeGapsWidget({ courseId }: { courseId: number }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['knowledge-gaps', courseId],
    queryFn: () => knowledgeGapsApi.getForCourse(courseId),
  });

  if (isLoading) {
    return (
      <View style={{ padding: 16, backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: COLORS.lineSoft, marginBottom: 16, marginHorizontal: 16 }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (error || !data?.gaps) return null;

  const gaps = data.gaps;

  if (gaps.length === 0) {
    return (
      <View style={{ padding: 16, backgroundColor: '#F0FDF4', borderRadius: 8, borderWidth: 1, borderColor: '#DCFCE7', marginBottom: 16, marginHorizontal: 16, flexDirection: 'row', gap: 12 }}>
        <View style={{ backgroundColor: '#DCFCE7', borderRadius: 999, padding: 8, alignSelf: 'flex-start' }}>
          <Trophy size={24} color={COLORS.success} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: '700', color: '#166534', fontSize: 16, marginBottom: 4 }}>Tuyệt vời!</Text>
          <Text style={{ color: COLORS.inkMuted, fontSize: 13, lineHeight: 18 }}>
            Bạn chưa có lỗ hổng kiến thức đáng chú ý nào. Hãy tiếp tục phát huy và duy trì phong độ xuất sắc này nhé!
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ padding: 16, backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: COLORS.lineSoft, marginBottom: 16, marginHorizontal: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <AlertTriangle size={20} color={COLORS.accent} />
        <Text style={{ fontWeight: '700', fontSize: 16, color: COLORS.ink }}>Phân tích lỗ hổng kiến thức</Text>
      </View>
      <Text style={{ fontSize: 13, color: COLORS.inkFaint, marginBottom: 16, lineHeight: 18 }}>
        Hệ thống phát hiện các chủ đề bạn thường xuyên trả lời sai trong 5 bài gần nhất. Hãy ưu tiên ôn tập để cải thiện điểm số:
      </Text>

      <View style={{ gap: 12 }}>
        {gaps.map((gap, index) => {
          const theme = getGapColorTheme(gap.errorRate);
          const percent = Math.round(gap.errorRate * 100);

          return (
            <View key={index} style={{ padding: 16, borderRadius: 12, borderWidth: 1, borderColor: theme.borderColor, backgroundColor: theme.backgroundColor, gap: 12 }}>
              <View>
                <Text style={{ fontWeight: '700', fontSize: 15, color: COLORS.ink, marginBottom: 8 }}>{gap.topic}</Text>
                <View style={{ flexDirection: 'row', gap: 16, marginBottom: 12 }}>
                  <Text style={{ color: theme.text, fontSize: 13, fontWeight: '600' }}>Sai {gap.incorrectCount}/{gap.totalCount} lần</Text>
                  <Text style={{ color: COLORS.inkFaint, fontSize: 13, fontWeight: '500' }}>Tỷ lệ lỗi: {percent}%</Text>
                </View>
                <View style={{ height: 8, backgroundColor: COLORS.lineSoft, borderRadius: 4, overflow: 'hidden' }}>
                  <View style={{ height: '100%', width: `${percent}%`, backgroundColor: theme.bg, borderRadius: 4 }} />
                </View>
              </View>

              {gap.referenceLessonId ? (
                <Pressable
                  onPress={() => router.push(`/lessons/${gap.referenceLessonId}${gap.videoTimestamp ? `?seek=${gap.videoTimestamp}` : ''}` as Href)}
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10, backgroundColor: '#fff', borderRadius: 999, borderWidth: 1, borderColor: COLORS.lineSoft }}
                >
                  <PlayCircle size={16} color={COLORS.ink} />
                  <Text style={{ fontWeight: '600', fontSize: 13, color: COLORS.ink }}>Ôn tập lý thuyết</Text>
                </Pressable>
              ) : (
                <Pressable
                  onPress={() => router.push(`/materials/${courseId}` as Href)}
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10, backgroundColor: '#fff', borderRadius: 999, borderWidth: 1, borderColor: COLORS.lineSoft }}
                >
                  <Lightbulb size={16} color={COLORS.inkFaint} />
                  <Text style={{ fontWeight: '600', fontSize: 13, color: COLORS.inkFaint }}>Kiến thức tổng hợp</Text>
                </Pressable>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}
