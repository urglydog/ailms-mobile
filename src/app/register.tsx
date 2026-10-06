import { useState } from 'react';
import { Link, Redirect, router } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { authApi } from '@/lib/api/auth';
import { ApiError } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/AuthContext';

function passwordStrengthLabel(password: string): { score: number; label: string; color: string } {
  if (!password) return { score: 0, label: '', color: '#CBD5E1' };
  if (password.length < 6) return { score: 1, label: 'Quá ngắn (tối thiểu 6 ký tự)', color: '#DC2626' };
  const hasLetter = /[A-Za-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[@$!%*#?&.]/.test(password);
  if (hasLetter && hasNumber && hasSpecial && password.length >= 8) return { score: 4, label: 'Mạnh', color: '#16A34A' };
  if (hasLetter && hasNumber) return { score: 3, label: 'Tốt', color: '#2563EB' };
  return { score: 2, label: 'Yếu (cần cả chữ và số)', color: '#D97706' };
}

export default function RegisterScreen() {
  const { isAuthenticated } = useAuth();
  const [step, setStep] = useState<'register' | 'otp'>('register');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isAuthenticated) {
    return <Redirect href="/courses" />;
  }

  const strength = passwordStrengthLabel(password);
  const isMatch = confirmPassword.length > 0 && confirmPassword === password;

  const handleRegister = async () => {
    setError(null);
    if (strength.score < 3) {
      setError('Mật khẩu chưa đủ mạnh — cần ít nhất 6 ký tự gồm cả chữ và số.');
      return;
    }
    if (confirmPassword !== password) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }
    setIsSubmitting(true);
    try {
      await authApi.register({ fullName, email, password });
      setStep('otp');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Đăng ký thất bại, vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerify = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      await authApi.verifyOtp({ email, otp });
      router.replace('/login');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Mã OTP không hợp lệ.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (step === 'otp') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', padding: 24, gap: 12 }}>
        <Text style={{ fontSize: 24, fontWeight: '700', marginBottom: 4 }}>Xác thực OTP</Text>
        <Text style={{ color: '#475569' }}>
          Vui lòng kiểm tra email <Text style={{ fontWeight: '700' }}>{email}</Text> để lấy mã OTP (6 chữ số).
        </Text>
        <TextInput
          placeholder="Mã OTP"
          value={otp}
          onChangeText={(v) => setOtp(v.slice(0, 6))}
          keyboardType="number-pad"
          maxLength={6}
          style={{ borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 12, textAlign: 'center', letterSpacing: 4, fontSize: 18 }}
        />
        {error ? <Text style={{ color: '#DC2626' }}>{error}</Text> : null}
        <Pressable
          onPress={handleVerify}
          disabled={isSubmitting}
          style={{ backgroundColor: '#2563EB', borderRadius: 8, padding: 14, alignItems: 'center', opacity: isSubmitting ? 0.6 : 1 }}
        >
          {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '600' }}>Xác thực</Text>}
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24, gap: 12 }}>
      <Text style={{ fontSize: 24, fontWeight: '700', marginBottom: 8 }}>Đăng ký tài khoản</Text>

      <TextInput
        placeholder="Họ tên"
        value={fullName}
        onChangeText={setFullName}
        style={{ borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 12 }}
      />
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        style={{ borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 12 }}
      />
      <View style={{ gap: 4 }}>
        <TextInput
          placeholder="Mật khẩu"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={{ borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 12 }}
        />
        {password.length > 0 ? <Text style={{ color: strength.color, fontSize: 12 }}>Mức độ bảo mật: {strength.label}</Text> : null}
      </View>
      <View style={{ gap: 4 }}>
        <TextInput
          placeholder="Xác nhận mật khẩu"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          style={{ borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 12 }}
        />
        {confirmPassword.length > 0 ? (
          <Text style={{ color: isMatch ? '#16A34A' : '#DC2626', fontSize: 12 }}>
            {isMatch ? 'Mật khẩu khớp' : 'Mật khẩu chưa khớp'}
          </Text>
        ) : null}
      </View>

      {error ? <Text style={{ color: '#DC2626' }}>{error}</Text> : null}

      <Pressable
        onPress={handleRegister}
        disabled={isSubmitting}
        style={{ backgroundColor: '#2563EB', borderRadius: 8, padding: 14, alignItems: 'center', opacity: isSubmitting ? 0.6 : 1 }}
      >
        {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '600' }}>Đăng ký</Text>}
      </Pressable>

      <Link href="/login" style={{ textAlign: 'center', color: '#2563EB', marginTop: 8 }}>
        Đã có tài khoản? Đăng nhập ngay
      </Link>
    </ScrollView>
  );
}
