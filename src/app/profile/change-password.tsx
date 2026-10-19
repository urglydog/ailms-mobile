import { useMutation } from '@tanstack/react-query';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';

import { ApiError } from '@/lib/api/client';
import { usersApi } from '@/lib/api/users';
import { BackButton } from '@/components/BackButton';
import { COLORS } from '@/lib/theme/colors';

/** Port từ `fe/app/(public)/profile/change-password-modal.tsx`. */
export default function ChangePasswordScreen() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formError, setFormError] = useState('');

  const changePassword = useMutation({
    mutationFn: () => usersApi.changePassword({ currentPassword, newPassword }),
    onSuccess: () => router.back(),
  });

  const handleSubmit = () => {
    setFormError('');
    if (newPassword !== confirmPassword) {
      setFormError('Mật khẩu xác nhận không khớp');
      return;
    }
    if (newPassword.length < 8) {
      setFormError('Mật khẩu phải >= 8 ký tự');
      return;
    }
    changePassword.mutate();
  };

  return (
    <View style={{ flex: 1, padding: 16, gap: 14 }}>
      <Stack.Screen options={{ headerShown: true, title: 'Đổi mật khẩu', headerLeft: () => <BackButton /> }} />

      <Field label="Mật khẩu hiện tại" value={currentPassword} onChangeText={setCurrentPassword} />
      <Field label="Mật khẩu mới" value={newPassword} onChangeText={setNewPassword} />
      <Field label="Xác nhận mật khẩu" value={confirmPassword} onChangeText={setConfirmPassword} />

      {formError ? <Text style={{ color: COLORS.danger, fontSize: 12.5 }}>{formError}</Text> : null}
      {changePassword.error ? (
        <Text style={{ color: COLORS.danger, fontSize: 12.5 }}>
          {changePassword.error instanceof ApiError ? changePassword.error.message : 'Có lỗi xảy ra.'}
        </Text>
      ) : null}

      <Pressable
        onPress={handleSubmit}
        disabled={changePassword.isPending}
        style={{ backgroundColor: COLORS.accent, borderRadius: 8, padding: 14, alignItems: 'center', opacity: changePassword.isPending ? 0.6 : 1 }}
      >
        {changePassword.isPending ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700' }}>Đổi mật khẩu</Text>}
      </Pressable>
    </View>
  );
}

function Field({ label, value, onChangeText }: { label: string; value: string; onChangeText: (v: string) => void }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontSize: 12.5, fontWeight: '600', color: COLORS.ink }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        secureTextEntry
        style={{ borderWidth: 1, borderColor: COLORS.line, borderRadius: 8, padding: 12, fontSize: 14 }}
      />
    </View>
  );
}
