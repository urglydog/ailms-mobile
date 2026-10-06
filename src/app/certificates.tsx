import { useMutation, useQuery } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';

import { certificatesApi } from '@/lib/api/certificates';
import { ApiError } from '@/lib/api/client';
import { saveAndShareBlob } from '@/lib/files';
import type { Certificate } from '@/types/certificate';

export default function CertificatesScreen() {
  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['certificates'],
    queryFn: () => certificatesApi.getMine(),
  });

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ headerShown: true, title: 'Chứng chỉ của tôi' }} />

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator />
        </View>
      ) : error ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 }}>
          <Text>{error instanceof ApiError ? error.message : 'Không tải được danh sách chứng chỉ.'}</Text>
          <Pressable onPress={() => refetch()}>
            <Text style={{ color: '#2563EB' }}>Thử lại</Text>
          </Pressable>
        </View>
      ) : !data || data.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Text style={{ color: '#64748B' }}>Hoàn thành 1 khoá học để nhận chứng chỉ đầu tiên.</Text>
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.certificateCode}
          refreshing={isRefetching}
          onRefresh={refetch}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          renderItem={({ item }) => <CertificateCard certificate={item} />}
        />
      )}
    </View>
  );
}

function CertificateCard({ certificate }: { certificate: Certificate }) {
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const downloadMutation = useMutation({
    mutationFn: async () => {
      const blob = await certificatesApi.getPdf(certificate.certificateCode);
      await saveAndShareBlob(blob, `chung-chi-${certificate.certificateCode}.pdf`, 'application/pdf');
    },
    onError: (err: unknown) => {
      setDownloadError(err instanceof ApiError ? err.message : 'Tải PDF thất bại, vui lòng thử lại.');
    },
  });

  return (
    <View style={{ borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 14, gap: 6 }}>
      <Text style={{ fontWeight: '700', fontSize: 16 }}>{certificate.courseTitle}</Text>
      <Text style={{ color: '#475569' }}>{certificate.instructorName}</Text>
      <Text style={{ color: '#94A3B8', fontSize: 12 }}>
        Hoàn thành {new Date(certificate.completedAt).toLocaleDateString('vi-VN')} · {certificate.courseHours}h
      </Text>
      {certificate.status === 'REVOKED' ? (
        <Text style={{ color: '#DC2626', fontSize: 12 }}>Chứng chỉ đã bị thu hồi</Text>
      ) : null}
      {downloadError ? <Text style={{ color: '#DC2626', fontSize: 12 }}>{downloadError}</Text> : null}
      <Pressable
        onPress={() => downloadMutation.mutate()}
        disabled={downloadMutation.isPending}
        style={{ alignSelf: 'flex-start', marginTop: 4 }}
      >
        {downloadMutation.isPending ? (
          <ActivityIndicator size="small" />
        ) : (
          <Text style={{ color: '#2563EB', fontWeight: '600' }}>Tải PDF</Text>
        )}
      </Pressable>
    </View>
  );
}
