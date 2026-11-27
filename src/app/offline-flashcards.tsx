import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, Text, View } from 'react-native';
import { CloudDownload, Layers, RefreshCw, Trash2, WifiOff } from 'lucide-react-native';

import { BackButton } from '@/components/BackButton';
import { ApiError } from '@/lib/api/client';
import { enrollmentsApi } from '@/lib/api/enrollments';
import { materialsApi } from '@/lib/api/materials';
import { flashcardDb, type OfflineDeck } from '@/lib/db/flashcardDb';
import { syncService } from '@/lib/db/syncService';
import { useIsOnline } from '@/lib/network';
import { COLORS } from '@/lib/theme/colors';

/** Một bộ thẻ có trong tài khoản (chưa chắc đã lưu trên máy). */
interface RemoteDeck {
  id: number;
  title: string;
  courseTitle: string;
}

/** Gom mọi bộ flashcard đã tạo xong trong các khoá học bạn đã ghi danh (cá nhân + do giảng viên chia sẻ). */
async function fetchRemoteDecks(): Promise<RemoteDeck[]> {
  const enrollments = await enrollmentsApi.getMine();
  const decks = new Map<number, RemoteDeck>();
  for (const enrollment of enrollments) {
    const [personal, shared] = await Promise.all([
      materialsApi.listForCourse(enrollment.courseId).catch(() => []),
      materialsApi.listSharedForCourse(enrollment.courseId).catch(() => []),
    ]);
    for (const item of [...personal, ...shared]) {
      if (item.materialType === 'FLASHCARD' && item.status === 'COMPLETED') {
        decks.set(item.id, { id: item.id, title: item.title || `Bộ thẻ #${item.id}`, courseTitle: enrollment.courseTitle });
      }
    }
  }
  return [...decks.values()];
}

/** Ôn flashcard bằng các bộ thẻ đã lưu trên máy — dùng được khi không có mạng. */
export default function OfflineFlashcardsScreen() {
  const queryClient = useQueryClient();
  const online = useIsOnline();
  const [busy, setBusy] = useState<string | null>(null);

  const { data: decks = [], isLoading, refetch } = useQuery({
    queryKey: ['offline-decks'],
    queryFn: () => flashcardDb.listOfflineDecks(),
  });
  const pending = decks.reduce((sum, d) => sum + d.pending, 0);

  // Các bộ thẻ trong tài khoản mà máy chưa lưu — hiện ra để bấm "Tải" từng bộ (cần có mạng).
  const { data: remoteDecks, isLoading: loadingRemote, refetch: refetchRemote } = useQuery({
    queryKey: ['remote-flashcard-decks'],
    queryFn: fetchRemoteDecks,
    enabled: online,
    staleTime: 60_000,
  });
  const savedIds = new Set(decks.map((d) => d.materialId));
  const downloadable = (remoteDecks ?? []).filter((d) => !savedIds.has(d.id));

  // Mở lại màn (vd vừa ôn xong một bộ) thì cập nhật số thẻ cần ôn.
  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );

  const refreshAll = () => {
    void refetch();
    void queryClient.invalidateQueries({ queryKey: ['flashcard-sync-pending'] });
  };

  const sendReviews = async () => {
    setBusy('Đang gửi kết quả ôn tập...');
    try {
      const { synced, remaining } = await syncService.syncOfflineReviews({ force: true });
      refreshAll();
      if (remaining > 0) {
        Alert.alert('Chưa gửi hết', `Còn ${remaining} lượt ôn chưa gửi được. Ứng dụng sẽ tự thử lại khi kết nối ổn định.`);
      } else if (synced > 0) {
        Alert.alert('Đã gửi xong', `Kết quả ${synced} lượt ôn đã được cập nhật vào tài khoản của bạn.`);
      }
    } finally {
      setBusy(null);
    }
  };

  /** Tải một danh sách bộ thẻ về máy. Một bộ lỗi thì bỏ qua và tiếp tục; mất mạng giữa chừng thì dừng. */
  const downloadDecks = async (list: RemoteDeck[]) => {
    let saved = 0;
    for (let i = 0; i < list.length; i += 1) {
      const deck = list[i];
      if (!deck) continue;
      setBusy(list.length > 1 ? `Đang tải bộ thẻ ${i + 1}/${list.length}...` : `Đang tải "${deck.title}"...`);
      try {
        const detail = await materialsApi.getDetail(deck.id);
        if (await flashcardDb.saveDeck(detail)) saved += 1;
      } catch (err) {
        if (!(err instanceof ApiError)) throw err;
      }
    }
    return saved;
  };

  const runDownload = async (list: RemoteDeck[]) => {
    if (list.length === 0) {
      Alert.alert('Đã lưu đủ', 'Tất cả bộ thẻ trong khoá học của bạn đã được lưu trên máy.');
      return;
    }
    try {
      const saved = await downloadDecks(list);
      refreshAll();
      void refetchRemote();
      Alert.alert('Đã lưu bộ thẻ', saved > 0 ? `Đã lưu ${saved} bộ thẻ trên máy. Bạn có thể ôn ngay cả khi không có mạng.` : 'Chưa lưu được bộ thẻ nào. Vui lòng thử lại.');
    } catch (err) {
      Alert.alert('Chưa tải được', err instanceof ApiError ? err.message : 'Kết nối mạng bị gián đoạn. Vui lòng thử lại khi có mạng ổn định.');
    } finally {
      setBusy(null);
    }
  };

  const downloadAll = () => {
    setBusy('Đang chuẩn bị...');
    void runDownload(downloadable);
  };

  const confirmRemove = (deck: OfflineDeck) => {
    Alert.alert('Xoá bản lưu trên máy?', `Bộ thẻ "${deck.title}" sẽ không còn ôn được khi không có mạng. Dữ liệu trong tài khoản của bạn không bị ảnh hưởng.`, [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Xoá',
        style: 'destructive',
        onPress: async () => {
          const removed = await flashcardDb.removeDeck(deck.materialId);
          if (!removed) {
            Alert.alert('Chưa xoá được', 'Bộ thẻ này còn kết quả ôn tập chưa gửi lên tài khoản. Hãy kết nối mạng và gửi kết quả trước khi xoá.');
          }
          refreshAll();
        },
      },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.surface }}>
      <Stack.Screen options={{ headerShown: true, title: 'Ôn tập offline', headerLeft: () => <BackButton /> }} />

      <View style={{ padding: 16, gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {online ? <CloudDownload size={18} color={COLORS.success} /> : <WifiOff size={18} color={COLORS.warning} />}
          <Text style={{ flex: 1, color: COLORS.inkMuted, fontSize: 13 }}>
            {online
              ? 'Đang có kết nối mạng. Bạn có thể lưu bộ thẻ về máy để ôn khi không có mạng.'
              : 'Hiện không có kết nối mạng. Bạn vẫn ôn được các bộ thẻ đã lưu trên máy.'}
          </Text>
        </View>

        {pending > 0 ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.streakBg, borderRadius: 10, padding: 10 }}>
            <Text style={{ flex: 1, color: COLORS.streakInk, fontSize: 12.5 }}>
              {pending} lượt ôn chưa được gửi lên tài khoản. Ứng dụng sẽ tự gửi khi có mạng.
            </Text>
            {online ? (
              <Pressable
                onPress={sendReviews}
                disabled={busy !== null}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: COLORS.accent, opacity: busy ? 0.6 : 1 }}
              >
                <RefreshCw size={14} color={COLORS.white} />
                <Text style={{ color: COLORS.white, fontWeight: '700', fontSize: 12.5 }}>Gửi ngay</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {online && downloadable.length > 1 ? (
          <Pressable
            onPress={downloadAll}
            disabled={busy !== null}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 11, borderRadius: 10, borderWidth: 1, borderColor: COLORS.accent, backgroundColor: COLORS.tint, opacity: busy ? 0.6 : 1 }}
          >
            {busy ? <ActivityIndicator size="small" color={COLORS.accent} /> : <CloudDownload size={16} color={COLORS.accent} />}
            <Text style={{ color: COLORS.accent, fontWeight: '700', fontSize: 13.5 }}>{busy ?? `Tải tất cả ${downloadable.length} bộ thẻ về máy`}</Text>
          </Pressable>
        ) : null}
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={decks}
          keyExtractor={(d) => String(d.materialId)}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32, gap: 10 }}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', gap: 8, padding: 24 }}>
              <Layers size={40} color={COLORS.lineDot} strokeWidth={1.5} />
              <Text style={{ color: COLORS.ink, fontWeight: '700', textAlign: 'center' }}>Chưa có bộ thẻ nào được lưu trên máy</Text>
              <Text style={{ color: COLORS.inkFaint, textAlign: 'center', fontSize: 13 }}>
                Khi có mạng, chọn bộ thẻ ở mục “Bộ thẻ có thể tải về máy” bên dưới. Mỗi bộ thẻ bạn mở cũng được tự động lưu lại.
              </Text>
            </View>
          }
          ListFooterComponent={
            online ? (
              <View style={{ gap: 10, marginTop: 16 }}>
                <Text style={{ color: COLORS.ink, fontWeight: '700', fontSize: 15 }}>Bộ thẻ có thể tải về máy</Text>
                {loadingRemote ? (
                  <ActivityIndicator />
                ) : downloadable.length === 0 ? (
                  <Text style={{ color: COLORS.inkFaint, fontSize: 13 }}>
                    {remoteDecks && remoteDecks.length > 0
                      ? 'Tất cả bộ thẻ trong khoá học của bạn đã được lưu trên máy.'
                      : 'Chưa có bộ thẻ nào trong khoá học của bạn. Hãy tạo flashcard trong mục Học liệu của khoá học.'}
                  </Text>
                ) : (
                  downloadable.map((d) => (
                    <View
                      key={d.id}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: COLORS.line, backgroundColor: COLORS.surfaceRaised }}
                    >
                      <Layers size={22} color={COLORS.inkFaint} strokeWidth={1.75} />
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={{ color: COLORS.ink, fontWeight: '700', fontSize: 14.5 }} numberOfLines={2}>{d.title}</Text>
                        <Text style={{ color: COLORS.inkFaint, fontSize: 12.5 }} numberOfLines={1}>{d.courseTitle}</Text>
                      </View>
                      <Pressable
                        onPress={() => {
                          setBusy('Đang tải...');
                          void runDownload([d]);
                        }}
                        disabled={busy !== null}
                        accessibilityLabel={`Tải bộ thẻ ${d.title} về máy`}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: COLORS.accent, opacity: busy ? 0.6 : 1 }}
                      >
                        <CloudDownload size={14} color={COLORS.white} />
                        <Text style={{ color: COLORS.white, fontWeight: '700', fontSize: 12.5 }}>Tải</Text>
                      </Pressable>
                    </View>
                  ))
                )}
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/material/${item.materialId}` as Href)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: COLORS.line, backgroundColor: COLORS.surfaceRaised }}
            >
              <Layers size={22} color={COLORS.accent} strokeWidth={1.75} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ color: COLORS.ink, fontWeight: '700', fontSize: 14.5 }} numberOfLines={2}>
                  {item.title}
                </Text>
                <Text style={{ color: COLORS.inkFaint, fontSize: 12.5 }}>
                  {item.total} thẻ · {item.due > 0 ? `${item.due} thẻ cần ôn` : 'Đã ôn hết thẻ đến hạn'}
                </Text>
                {item.pending > 0 ? (
                  <Text style={{ color: COLORS.streakInk, fontSize: 12 }}>{item.pending} lượt ôn chưa gửi lên tài khoản</Text>
                ) : null}
              </View>
              <Pressable onPress={() => confirmRemove(item)} hitSlop={10} accessibilityLabel="Xoá bản lưu trên máy">
                <Trash2 size={18} color={COLORS.inkFaint} strokeWidth={1.75} />
              </Pressable>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}
