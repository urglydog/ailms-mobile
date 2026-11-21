import { useState } from 'react';
import { Link, Redirect, type Href } from 'expo-router';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { GraduationCap } from 'lucide-react-native';

import { ApiError } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/AuthContext';
import { COLORS } from '@/lib/theme/colors';
import { PressableScale } from '@/components/ui/PressableScale';
import { PasswordInput } from '@/components/ui/PasswordInput';

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
    // UI v2: logo + lời chào ở trên, form nằm trong thẻ, cuộn được khi bàn phím mở trên máy nhỏ.
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: COLORS.surface }}>
    <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20, gap: 20 }} keyboardShouldPersistTaps="handled">
      <View style={{ alignItems: 'center', gap: 6 }}>
        <View style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: COLORS.accent, alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
          <GraduationCap size={30} color={COLORS.white} />
        </View>
        <Text style={{ fontSize: 26, fontWeight: '900', color: COLORS.accentDark, letterSpacing: -0.5 }}>
          ai<Text style={{ color: COLORS.ink }}>lms.</Text>
        </Text>
        <Text style={{ fontSize: 15, color: COLORS.inkMuted, textAlign: 'center' }}>Học mọi khoá học bằng ngôn ngữ của bạn</Text>
      </View>

      <View style={{ backgroundColor: COLORS.surfaceRaised, borderWidth: 1, borderColor: COLORS.line, borderRadius: 16, padding: 20, gap: 12 }}>
      <Text style={{ fontSize: 22, fontWeight: '800', color: COLORS.ink }} accessibilityRole="header">Đăng nhập</Text>

      <Pressable
        onPress={handleGoogleSubmit}
        disabled={isGoogleSubmitting}
        style={{
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 8,
          borderWidth: 1,
          borderColor: COLORS.line,
          borderRadius: 10,
          minHeight: 48,
          backgroundColor: COLORS.surfaceRaised,
          opacity: isGoogleSubmitting ? 0.6 : 1,
        }}
      >
        {isGoogleSubmitting ? (
          <ActivityIndicator color={COLORS.ink} />
        ) : (
          <Text style={{ color: COLORS.ink, fontWeight: '700' }}>
            <Text style={{ color: COLORS.accentDark, fontWeight: '900' }}>G</Text>  Tiếp tục với Google
          </Text>
        )}
      </Pressable>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 4 }}>
        <View style={{ flex: 1, height: 1, backgroundColor: COLORS.lineSoft }} />
        <Text style={{ color: COLORS.inkFaint, fontSize: 12 }}>hoặc dùng email</Text>
        <View style={{ flex: 1, height: 1, backgroundColor: COLORS.lineSoft }} />
      </View>

      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
        placeholderTextColor={COLORS.inkFaint}
        accessibilityLabel="Email"
        style={{ borderWidth: 1, borderColor: COLORS.line, borderRadius: 10, paddingHorizontal: 14, minHeight: 48, fontSize: 16, color: COLORS.ink, backgroundColor: COLORS.surfaceRaised }}
      />
      <PasswordInput
        placeholder="Mật khẩu"
        value={password}
        onChangeText={setPassword}
        style={{ borderWidth: 1, borderColor: COLORS.line, borderRadius: 10, paddingHorizontal: 14, minHeight: 48, backgroundColor: COLORS.surfaceRaised }}
      />
      {error ? <Text style={{ color: COLORS.danger }}>{error}</Text> : null}
      <PressableScale
        onPress={handleSubmit}
        disabled={isSubmitting}
        accessibilityRole="button"
        style={{ backgroundColor: COLORS.accent, borderRadius: 10, minHeight: 48, alignItems: 'center', justifyContent: 'center', opacity: isSubmitting ? 0.6 : 1 }}
      >
        {isSubmitting ? <ActivityIndicator color={COLORS.white} /> : <Text style={{ color: COLORS.white, fontWeight: '700', fontSize: 15 }}>Đăng nhập</Text>}
      </PressableScale>

      <Link href={'/forgot-password' as Href} style={{ textAlign: 'right', color: COLORS.accentDark, fontWeight: '600', paddingVertical: 4 }}>
        Quên mật khẩu?
      </Link>
      </View>

      <View style={{ alignItems: 'center', gap: 10 }}>
        <Text style={{ color: COLORS.inkMuted, fontSize: 14 }}>
          Chưa có tài khoản?{' '}
          <Link href={'/register' as Href} style={{ color: COLORS.accentDark, fontWeight: '700' }}>Đăng ký</Link>
        </Text>
        <Link href={'/help' as Href} style={{ color: COLORS.inkFaint, fontSize: 13 }}>
          Trợ giúp & Hỗ trợ
        </Link>
      </View>
    </ScrollView>
    </KeyboardAvoidingView>
  );
}
