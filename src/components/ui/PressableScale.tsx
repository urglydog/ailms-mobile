import { useState, type ReactNode } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { cubicBezier, useReducedMotion } from 'react-native-reanimated';
import { MOTION } from '@/lib/theme/tokens';

const [x1, y1, x2, y2] = MOTION.easeOut;
const EASE_OUT = cubicBezier(x1, y1, x2, y2);

/**
 * Phản hồi khi nhấn dùng chung (UI v2, skill expo-animation "Press feedback"): thu nhỏ 3% trong
 * 120 ms ngay lúc chạm (press-in), trả lại khi nhả. Thao tác lặp hàng chục lần/ngày nên giữ gần như
 * không nhận ra; bật "Giảm chuyển động" thì chỉ hơi mờ đi, không co giãn.
 *
 * `style` áp lên khối bên trong (khối co giãn) — truyền kích thước/viền/nền của thẻ vào đây.
 * Dòng danh sách full-width KHÔNG dùng thành phần này (đổi màu nền thay vì co cả hàng).
 */
export function PressableScale({
  children,
  style,
  containerStyle,
  ...rest
}: Omit<PressableProps, 'style' | 'children'> & {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  containerStyle?: StyleProp<ViewStyle>;
}) {
  const [pressed, setPressed] = useState(false);
  const reduced = useReducedMotion();

  return (
    <Pressable
      {...rest}
      style={containerStyle}
      pressRetentionOffset={16}
      onPressIn={(e) => {
        setPressed(true);
        rest.onPressIn?.(e);
      }}
      onPressOut={(e) => {
        setPressed(false);
        rest.onPressOut?.(e);
      }}
    >
      <Animated.View
        style={[
          {
            transform: [{ scale: pressed && !reduced ? 0.97 : 1 }],
            opacity: pressed && reduced ? 0.85 : 1,
            transitionProperty: ['transform', 'opacity'],
            transitionDuration: MOTION.fast,
            transitionTimingFunction: EASE_OUT,
          },
          style,
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}
