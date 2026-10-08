import { router, type Href } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

/** Dùng chung cho mọi tab yêu cầu sở hữu khoá học (Lộ trình AI/Hỏi đáp/Bài tập/AI Gia sư) —
 * port từ `LockedFeatureNotice` trong `fe/app/(learn)/learn/[lessonId]/page.tsx`. */
export function LockedFeatureNotice({ feature, courseSlug }: { feature: string; courseSlug: string }) {
  return (
    <View style={{ padding: 24, alignItems: 'center', gap: 10 }}>
      <Text style={{ fontSize: 22 }}>🔒</Text>
      <Text style={{ color: '#64748B', fontSize: 13, textAlign: 'center' }}>
        {feature} chỉ dành cho học viên đã sở hữu khóa học.
      </Text>
      <Pressable
        onPress={() => router.push(`/courses/${courseSlug}` as Href)}
        style={{ backgroundColor: '#2563EB', borderRadius: 999, paddingVertical: 10, paddingHorizontal: 20, marginTop: 4 }}
      >
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Mua khóa học ngay</Text>
      </Pressable>
    </View>
  );
}
