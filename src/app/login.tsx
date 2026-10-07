import { useState } from 'react';
import { Link, Redirect, type Href } from 'expo-router';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';

import { ApiError } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/AuthContext';

export default function LoginScreen() {
  const { isAuthenticated, login, loginWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isAuthenticated) {
    return <Redirect href="/courses" />;
  }

  const handleSubmit = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      await login({ email, password });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Đăng nhập thất bại, vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSubmit = async () => {
    setError(null);
    setIsGoogleSubmitting(true);
    try {
      await loginWithGoogle();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Đăng nhập Google thất bại, vui lòng thử lại.');
    } finally {
      setIsGoogleSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 24, gap: 12 }}>
      <Text style={{ fontSize: 24, fontWeight: '700', marginBottom: 12 }}>Đăng nhập</Text>

      <Pressable
        onPress={handleGoogleSubmit}
        disabled={isGoogleSubmitting}
        style={{
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 8,
          borderWidth: 1,
          borderColor: '#CBD5E1',
          borderRadius: 8,
          padding: 14,
          backgroundColor: '#fff',
          opacity: isGoogleSubmitting ? 0.6 : 1,
        }}
      >
        {isGoogleSubmitting ? (
          <ActivityIndicator color="#1F2937" />
        ) : (
          <Text style={{ color: '#1F2937', fontWeight: '600' }}>Đăng nhập với Google</Text>
        )}
      </Pressable>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 4 }}>
        <View style={{ flex: 1, height: 1, backgroundColor: '#E2E8F0' }} />
        <Text style={{ color: '#94A3B8', fontSize: 12 }}>hoặc</Text>
        <View style={{ flex: 1, height: 1, backgroundColor: '#E2E8F0' }} />
      </View>

      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        style={{ borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 12 }}
      />
      <TextInput
        placeholder="Mật khẩu"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={{ borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 12 }}
      />
      {error ? <Text style={{ color: '#DC2626' }}>{error}</Text> : null}
      <Pressable
        onPress={handleSubmit}
        disabled={isSubmitting}
        style={{ backgroundColor: '#2563EB', borderRadius: 8, padding: 14, alignItems: 'center', opacity: isSubmitting ? 0.6 : 1 }}
      >
        {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '600' }}>Đăng nhập</Text>}
      </Pressable>

      <Link href={'/forgot-password' as Href} style={{ textAlign: 'center', color: '#2563EB', marginTop: 4 }}>
        Quên mật khẩu?
      </Link>
      <Link href={'/register' as Href} style={{ textAlign: 'center', color: '#475569', marginTop: 4 }}>
        Chưa có tài khoản? Đăng ký
      </Link>
    </View>
  );
}
