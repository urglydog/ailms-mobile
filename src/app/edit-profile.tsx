import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { apiFormData, ApiError } from '@/lib/api/client';
import { usersApi } from '@/lib/api/users';
import type { UserProfile } from '@/types/user';

export default function EditProfileScreen() {
  const { data: me, isLoading } = useQuery({ queryKey: ['me'], queryFn: () => usersApi.getMe() });

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Stack.Screen options={{ headerShown: true, title: 'Chỉnh sửa hồ sơ' }} />
      {isLoading || !me ? (
        <ActivityIndicator style={{ marginTop: 40 }} />
      ) : (
        // key={me.id}: component chỉ mount lại khi đổi người dùng khác (thực tế không xảy ra ở
        // màn này) — mount 1 lần đúng lúc có dữ liệu, state form khởi tạo từ `me` ngay trong lazy
        // initializer, không cần effect đồng bộ lại (tránh react-hooks/set-state-in-effect).
        <EditProfileForm key={me.id} me={me} />
      )}
    </ScrollView>
  );
}

function EditProfileForm({ me }: { me: UserProfile }) {
  const queryClient = useQueryClient();
  const [fullName, setFullName] = useState(me.fullName);
  const [headline, setHeadline] = useState(me.headline ?? '');
  const [bio, setBio] = useState(me.bio ?? '');
  const [avatarUrl, setAvatarUrl] = useState(me.avatarUrl);
  const [error, setError] = useState<string | null>(null);

  const saveMutation = useMutation({
    mutationFn: () =>
      usersApi.updateMe({
        fullName,
        headline: headline || null,
        bio: bio || null,
        avatarUrl: null,
        preferredLanguage: null,
      }),
    onSuccess: (updated: UserProfile) => {
      queryClient.setQueryData(['me'], updated);
      router.back();
    },
    onError: (err: unknown) => setError(err instanceof ApiError ? err.message : 'Lưu thất bại, vui lòng thử lại.'),
  });

  const avatarMutation = useMutation({
    mutationFn: async () => {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) throw new Error('Cần quyền truy cập thư viện ảnh để đổi ảnh đại diện.');

      const picked = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: true,
        aspect: [1, 1],
      });
      if (picked.canceled || !picked.assets[0]) return null;

      const asset = picked.assets[0];
      const formData = new FormData();
      // React Native's FormData chấp nhận {uri, name, type} cho file thật — TS lib.dom chỉ biết
      // kiểu Blob/string nên ép kiểu qua unknown thay vì any (CẤM any theo quy tắc FE).
      formData.append('file', { uri: asset.uri, name: asset.fileName ?? 'avatar.jpg', type: asset.mimeType ?? 'image/jpeg' } as unknown as Blob);
      return apiFormData<UserProfile>('/api/v1/users/me/avatar', formData);
    },
    onSuccess: (updated) => {
      if (!updated) return;
      setAvatarUrl(updated.avatarUrl);
      queryClient.setQueryData(['me'], updated);
    },
    onError: (err: unknown) => setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Tải ảnh thất bại.'),
  });

  return (
    <>
      <Pressable onPress={() => avatarMutation.mutate()} style={{ alignSelf: 'center', marginBottom: 8 }}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={{ width: 88, height: 88, borderRadius: 44 }} />
        ) : (
          <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#475569', fontSize: 28 }}>{fullName.charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <Text style={{ textAlign: 'center', color: '#2563EB', marginTop: 6 }}>
          {avatarMutation.isPending ? 'Đang tải...' : 'Đổi ảnh'}
        </Text>
      </Pressable>

      <TextInput
        placeholder="Họ tên"
        value={fullName}
        onChangeText={setFullName}
        style={{ borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 12 }}
      />
      <TextInput
        placeholder="Chức danh (vd: Sinh viên năm 3)"
        value={headline}
        onChangeText={setHeadline}
        style={{ borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 12 }}
      />
      <TextInput
        placeholder="Giới thiệu bản thân"
        value={bio}
        onChangeText={setBio}
        multiline
        numberOfLines={4}
        style={{ borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 12, minHeight: 90, textAlignVertical: 'top' }}
      />

      {error ? <Text style={{ color: '#DC2626' }}>{error}</Text> : null}

      <Pressable
        onPress={() => saveMutation.mutate()}
        disabled={saveMutation.isPending}
        style={{ backgroundColor: '#2563EB', borderRadius: 8, padding: 14, alignItems: 'center', opacity: saveMutation.isPending ? 0.6 : 1 }}
      >
        {saveMutation.isPending ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '600' }}>Lưu thay đổi</Text>}
      </Pressable>
    </>
  );
}
