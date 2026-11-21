import { useState } from 'react';
import { Pressable, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { COLORS } from '@/lib/theme/colors';

/** Ô nhập mật khẩu có nút hiện/ẩn (như web `PasswordField`). Nhận mọi prop của `TextInput`; `style` áp lên khung ngoài. */
export function PasswordInput({ style, ...rest }: Omit<TextInputProps, 'style'> & { style?: StyleProp<ViewStyle> }) {
  const [visible, setVisible] = useState(false);
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center' }, style]}>
      <TextInput placeholderTextColor={COLORS.inkFaint} {...rest} secureTextEntry={!visible} autoCapitalize="none" autoCorrect={false} style={{ flex: 1, padding: 0, color: COLORS.ink }} />
      <Pressable onPress={() => setVisible((v) => !v)} hitSlop={10} accessibilityLabel={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}>
        {visible ? <EyeOff size={18} color={COLORS.inkFaint} /> : <Eye size={18} color={COLORS.inkFaint} />}
      </Pressable>
    </View>
  );
}
