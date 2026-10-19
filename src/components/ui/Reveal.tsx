import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing } from 'react-native';

/**
 * Tương đương `.reveal`/`useReveal` bên fe (app/globals.css + hooks/useReveal.ts):
 * fade-in + trượt lên 12px, so le theo `index` (60ms/bậc). Tôn trọng cờ "giảm chuyển
 * động" của hệ điều hành — khi đó hiện ngay, không animate.
 *
 * Dùng `Animated` built-in của React Native (không phải `react-native-reanimated`,
 * dù lib đó có trong package.json): lib đó chưa được dùng/verify ở đâu khác trong repo
 * mobile này (xem ghi chú ở `app/community/index.tsx`), nên ưu tiên API core an toàn hơn.
 */
export function Reveal({
  children,
  index = 0,
  style,
}: {
  children: React.ReactNode;
  index?: number;
  style?: object;
}) {
  const [opacity] = useState(() => new Animated.Value(0));
  const [translateY] = useState(() => new Animated.Value(12));

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      const delay = reduced ? 0 : index * 60;
      const duration = reduced ? 0 : 450;
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration,
          delay,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration,
          delay,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  return (
    <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
}
