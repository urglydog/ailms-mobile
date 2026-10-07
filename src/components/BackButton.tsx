import { router } from 'expo-router';
import { Pressable } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';

/**
 * `Stack.Screen` tự thêm nút back khi có lịch sử điều hướng trong app (bấm/chạm qua từng
 * màn) — nhưng khi vào thẳng 1 URL sâu (gõ tay/mở link ngoài, hay lúc test bằng `expo start
 * --web`), không có lịch sử nào để quay lại nên nút đó không tự hiện. Đặt icon này làm
 * `headerLeft` để luôn có đường thoát, kể cả trường hợp đó.
 */
export function BackButton() {
  return (
    <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} hitSlop={8} style={{ paddingHorizontal: 4 }}>
      <ChevronLeft size={26} color="#2563EB" strokeWidth={2} />
    </Pressable>
  );
}
