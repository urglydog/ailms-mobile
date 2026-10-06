import { useState } from 'react';
import { Redirect } from 'expo-router';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';

import { authApi } from '@/lib/api/auth';
import { ApiError } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/AuthContext';

function passwordStrengthScore(password: string): number {
  if (!password || password.length < 6) return password ? 1 : 0;
  const hasLetter = /[A-Za-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[@$!%*#?&.]/.test(password);
  if (hasLetter && hasNumber && hasSpecial && password.length >= 8) return 4;
  if (hasLetter && hasNumber) return 3;
  return 2;
}

export default function ForgotPasswordScreen() {
  const { isAuthenticated, markAuthenticated } = useAuth();
  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isAuthenticated) {
    return <Redirect href="/courses" />;
  }

  const handleRequestOtp = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      await authApi.forgotPassword({ email });
      setStep('reset');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không gửi được OTP, vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = async () => {
    setError(null);
    if (passwordStrengthScore(newPassword) < 3) {
      setError('Mật khẩu chưa đủ mạnh — cần ít nhất 6 ký tự gồm cả chữ và số.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }
    setIsSubmitting(true);
    try {
      await authApi.resetPassword({ email, otp, newPassword });
      markAuthenticated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'OTP không hợp lệ hoặc đã hết hạn.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (step === 'reset') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', padding: 24, gap: 12 }}>
        <Text style={{ fontSize: 24, fontWeight: '700' }}>Đặt lại mật khẩu</Text>
        <Text style={{ color: '#475569' }}>Nhập mã OTP vừa gửi tới {email} và mật khẩu mới.</Text>
        <TextInput
          placeholder="Mã OTP"
          value={otp}
          onChangeText={(v) => setOtp(v.slice(0, 6))}
          keyboardType="number-pad"
          maxLength={6}
          style={{ borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 12, textAlign: 'center', letterSpacing: 4, fontSize: 18 }}
        />
        <TextInput
          placeholder="Mật khẩu mới"
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
          style={{ borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 12 }}
        />
        <TextInput
          placeholder="Xác nhận mật khẩu mới"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          style={{ borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 12 }}
        />
        {error ? <Text style={{ color: '#DC2626' }}>{error}</Text> : null}
        <Pressable
          onPress={handleReset}
          disabled={isSubmitting}
          style={{ backgroundColor: '#2563EB', borderRadius: 8, padding: 14, alignItems: 'center', opacity: isSubmitting ? 0.6 : 1 }}
        >
          {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '600' }}>Đặt lại mật khẩu</Text>}
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 24, gap: 12 }}>
      <Text style={{ fontSize: 24, fontWeight: '700' }}>Quên mật khẩu</Text>
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        style={{ borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 12 }}
      />
      {error ? <Text style={{ color: '#DC2626' }}>{error}</Text> : null}
      <Pressable
        onPress={handleRequestOtp}
        disabled={isSubmitting}
        style={{ backgroundColor: '#2563EB', borderRadius: 8, padding: 14, alignItems: 'center', opacity: isSubmitting ? 0.6 : 1 }}
      >
        {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '600' }}>Gửi OTP</Text>}
      </Pressable>
    </View>
  );
}
