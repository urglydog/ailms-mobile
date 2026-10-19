import { useQuery } from '@tanstack/react-query';
import { router, Stack, type Href } from 'expo-router';
import { ActivityIndicator, FlatList, Image, Pressable, Text, View } from 'react-native';
import { Trophy, Flame } from 'lucide-react-native';

import { BackButton } from '@/components/BackButton';
import { StreakCard } from '@/components/streak/StreakCard';
import { useLeaderboard, useMyRanking } from '@/hooks/useRanking';
import { useStreak } from '@/hooks/useStreak';
import { usersApi } from '@/lib/api/users';
import { useAuth } from '@/lib/auth/AuthContext';
import type { LeaderboardEntry } from '@/types/ranking';
import { COLORS } from '@/lib/theme/colors';

const LEADERBOARD_LIMIT = 30;

/** Port từ `fe/app/(public)/community/page.tsx` (12/10/2026) — trang đầy đủ thay cho
 * `RankingBanner` top-5 nhúng trong màn Courses. Bấm vào 1 hạng → `/u/{userId}?tab=certificates`,
 * giống hành vi web. Bỏ animation stagger CSS của web (mobile chưa dùng `react-native-reanimated`
 * ở đâu khác, babel.config.js cũng chưa thấy plugin — ưu tiên giữ an toàn hơn thêm animation
 * chưa verify chạy được, xem [[feedback_mobile_port_survey_first]]). */
export default function CommunityScreen() {
  const { isAuthenticated } = useAuth();
  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: () => usersApi.getMe(),
    enabled: isAuthenticated === true,
  });
  const { data: leaderboard, isLoading } = useLeaderboard(LEADERBOARD_LIMIT);
  const { data: myRanking } = useMyRanking(isAuthenticated === true);
  const { data: streak } = useStreak(isAuthenticated === true);

  const isMeInList = !!leaderboard?.some((entry) => entry.userId === me?.id);
  const showMyRankCard = isAuthenticated && !!myRanking?.ranked && !isMeInList;

  return (
    <View style={{ flex: 1, backgroundColor: '#FFF' }}>
      <Stack.Screen options={{ headerShown: true, title: 'Cộng đồng', headerLeft: () => <BackButton /> }} />

      <FlatList
        data={leaderboard ?? []}
        keyExtractor={(item) => String(item.userId)}
        contentContainerStyle={{ paddingBottom: 24 }}
        ListHeaderComponent={
          <View style={{ alignItems: 'center', gap: 8, paddingVertical: 24, paddingHorizontal: 16 }}>
            <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center' }}>
              <Trophy size={28} color={COLORS.star} />
            </View>
            <Text style={{ fontSize: 20, fontWeight: '700', color: COLORS.ink }}>Bảng xếp hạng cộng đồng</Text>
            <Text style={{ fontSize: 13, color: COLORS.inkFaint, textAlign: 'center' }}>
              Tích luỹ XP mỗi ngày học bài, làm quiz, giữ streak — thi đua cùng cả cộng đồng.
            </Text>

            {showMyRankCard && myRanking ? (
              <View style={{ width: '100%', borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', borderColor: '#93C5FD', padding: 14, marginTop: 8, gap: 2 }}>
                <Text style={{ fontSize: 11.5, fontWeight: '600', color: COLORS.inkFaint }}>Vị trí của bạn</Text>
                <Text style={{ fontSize: 20, fontWeight: '700', color: COLORS.accent }}>#{myRanking.rank}</Text>
                <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.ink }}>{myRanking.totalXp} XP</Text>
              </View>
            ) : null}

            {isAuthenticated && streak ? (
              <View style={{ width: '100%', marginTop: 8 }}>
                <StreakCard streak={streak} />
              </View>
            ) : null}

            {!isAuthenticated ? (
              <View style={{ width: '100%', borderRadius: 12, backgroundColor: COLORS.surface, padding: 16, marginTop: 8, alignItems: 'center', gap: 8 }}>
                <Flame size={22} color={COLORS.star} />
                <Text style={{ fontSize: 13, color: COLORS.inkFaint, textAlign: 'center' }}>
                  Đăng nhập để theo dõi streak và vị trí của bạn.
                </Text>
                <Pressable
                  onPress={() => router.push('/login' as Href)}
                  style={{ borderRadius: 999, backgroundColor: COLORS.accent, paddingHorizontal: 18, paddingVertical: 10 }}
                >
                  <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 13 }}>Đăng nhập</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <ActivityIndicator />
            </View>
          ) : (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <Text style={{ color: COLORS.inkFaint }}>Chưa có ai trên bảng xếp hạng.</Text>
            </View>
          )
        }
        renderItem={({ item }) => <RankRow entry={item} isMe={item.userId === me?.id} />}
      />
    </View>
  );
}

function rankStyle(rank: number): string {
  if (rank === 1) return COLORS.star;
  if (rank === 2) return COLORS.inkFaint;
  if (rank === 3) return '#EA580C';
  return COLORS.lineDot;
}

function RankRow({ entry, isMe }: { entry: LeaderboardEntry; isMe: boolean }) {
  return (
    <Pressable
      onPress={() => router.push(`/u/${entry.userId}?tab=certificates` as Href)}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: COLORS.surface,
        backgroundColor: isMe ? COLORS.tint : '#FFF',
      }}
    >
      <Text style={{ width: 32, textAlign: 'center', fontSize: 15, fontWeight: '700', color: rankStyle(entry.rank) }}>
        #{entry.rank}
      </Text>
      {entry.avatarUrl ? (
        <Image source={{ uri: entry.avatarUrl }} style={{ width: 36, height: 36, borderRadius: 18 }} />
      ) : (
        <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.line }} />
      )}
      <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: COLORS.ink }} numberOfLines={1}>
        {entry.fullName}
      </Text>
      <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.star }}>{entry.totalXp} XP</Text>
    </Pressable>
  );
}
