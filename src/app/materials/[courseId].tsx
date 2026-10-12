import { Stack, useLocalSearchParams } from 'expo-router';
import { ScrollView, View } from 'react-native';

import { BackButton } from '@/components/BackButton';
import { MaterialsWorkspace } from '@/components/materials/MaterialsWorkspace';

/** Màn điều hướng độc lập (vd từ trang chi tiết khoá học) tới `MaterialsWorkspace` — cùng
 * component được nhúng INLINE làm tab "Học liệu" trong `lessons/[id].tsx` (12/10/2026, sửa theo
 * phản hồi: trước đây "Học liệu" chỉ là nút điều hướng sang màn riêng, không phải tab ngang hàng
 * Tổng quan/Hỏi đáp/... như bên web). */
export default function MaterialsScreen() {
  const { courseId, lessonId } = useLocalSearchParams<{ courseId: string; lessonId?: string }>();
  const id = Number(courseId);

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <Stack.Screen options={{ headerShown: true, title: 'Học liệu', headerLeft: () => <BackButton /> }} />
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <MaterialsWorkspace courseId={id} lessonId={lessonId ? Number(lessonId) : undefined} enrolled courseSlug="" />
      </ScrollView>
    </View>
  );
}
