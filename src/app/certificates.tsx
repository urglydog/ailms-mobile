import { useMutation, useQuery } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useState } from 'react';
import * as Clipboard from 'expo-clipboard';
import { ActivityIndicator, Alert, FlatList, Linking, Pressable, Share, Text, View } from 'react-native';

import { certificatesApi } from '@/lib/api/certificates';
import { ApiError } from '@/lib/api/client';
import { saveAndShareBlob } from '@/lib/files';
import { BackButton } from '@/components/BackButton';
import type { Certificate } from '@/types/certificate';
import { COLORS } from '@/lib/theme/colors';

export default function CertificatesScreen() {
  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['certificates'],
    queryFn: () => certificatesApi.getMine(),
  });

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ headerShown: true, title: 'Chứng chỉ của tôi', headerLeft: () => <BackButton /> }} />

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator />
        </View>
      ) : error ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 }}>
          <Text>{error instanceof ApiError ? error.message : 'Không tải được danh sách chứng chỉ.'}</Text>
          <Pressable onPress={() => refetch()}>
            <Text style={{ color: COLORS.accent }}>Thử lại</Text>
          </Pressable>
        </View>
      ) : !data || data.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Text style={{ color: COLORS.inkFaint }}>Hoàn thành 1 khoá học để nhận chứng chỉ đầu tiên.</Text>
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

/** Định dạng "Add to Profile" công khai của LinkedIn — cùng web (`buildLinkedInAddUrl`). */
function buildLinkedInAddUrl(c: Certificate): string {
  const d = new Date(c.completedAt);
  const params = new URLSearchParams({
    startTask: 'CERTIFICATION_NAME',
    name: c.courseTitle,
    organizationName: 'LinguaLearn',
    issueYear: String(d.getFullYear()),
    issueMonth: String(d.getMonth() + 1),
    certUrl: c.verifyUrl,
    certId: c.certificateCode,
  });
  return `https://www.linkedin.com/profile/add?${params.toString()}`;
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
    <View style={{ borderWidth: 1, borderColor: COLORS.line, borderRadius: 8, padding: 14, gap: 6 }}>
      <Text style={{ fontWeight: '700', fontSize: 16 }}>{certificate.courseTitle}</Text>
      <Text style={{ color: COLORS.inkMuted }}>{certificate.instructorName}</Text>
      <Text style={{ color: COLORS.lineDot, fontSize: 12 }}>
        Hoàn thành {new Date(certificate.completedAt).toLocaleDateString('vi-VN')} · {certificate.courseHours}h
      </Text>
      {certificate.status === 'REVOKED' ? (
        <Text style={{ color: COLORS.danger, fontSize: 12 }}>Chứng chỉ đã bị thu hồi</Text>
      ) : null}
      {downloadError ? <Text style={{ color: COLORS.danger, fontSize: 12 }}>{downloadError}</Text> : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 4 }}>
        <Pressable onPress={() => downloadMutation.mutate()} disabled={downloadMutation.isPending}>
          {downloadMutation.isPending ? (
            <ActivityIndicator size="small" />
          ) : (
            <Text style={{ color: COLORS.accent, fontWeight: '600' }}>Tải PDF</Text>
          )}
        </Pressable>
        {certificate.status !== 'REVOKED' ? (
          <>
            <Pressable
              onPress={async () => {
                await Clipboard.setStringAsync(certificate.verifyUrl);
                Alert.alert('Đã sao chép', 'Link xác thực chứng chỉ đã được sao chép.');
              }}
            >
              <Text style={{ color: COLORS.accent, fontWeight: '600' }}>Sao chép link xác thực</Text>
            </Pressable>
            <Pressable onPress={() => void Share.share({ message: `${certificate.courseTitle} — ${certificate.verifyUrl}`, url: certificate.verifyUrl })}>
              <Text style={{ color: COLORS.accent, fontWeight: '600' }}>Chia sẻ</Text>
            </Pressable>
            <Pressable onPress={() => void Linking.openURL(buildLinkedInAddUrl(certificate))}>
              <Text style={{ color: COLORS.accent, fontWeight: '600' }}>Thêm vào LinkedIn</Text>
            </Pressable>
          </>
        ) : null}
      </View>
    </View>
  );
}
