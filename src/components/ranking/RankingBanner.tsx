import { router, type Href } from 'expo-router';
import { View, Text, ScrollView, Image, Pressable } from 'react-native';
import { Trophy, ChevronRight } from 'lucide-react-native';

import { useLeaderboard, useMyRanking } from '@/hooks/useRanking';
import { useAuth } from '@/lib/auth/AuthContext';
import type { LeaderboardEntry } from '@/types/ranking';
import { COLORS } from '@/lib/theme/colors';

/** (12/10/2026) — thêm điều hướng: bấm 1 hạng vào thẳng hồ sơ công khai (tab Chứng chỉ), nút
 * "Xem toàn bộ" trỏ `/community` (port từ `fe/components/ranking/RankingBanner.tsx`, cùng ngày
 * web rút gọn banner trang chủ về top 3 + trang đầy đủ riêng). */
export function RankingBanner() {
  const { isAuthenticated } = useAuth();

  const { data: leaderboard, isLoading } = useLeaderboard(5);
  const { data: myRanking } = useMyRanking(isAuthenticated === true);

  if (isLoading || !leaderboard || leaderboard.length === 0) return null;

  // Ở public, myRanking sẽ undefined nên luôn false.
  const isMeInTopList = myRanking?.rank ? leaderboard.some((entry) => entry.rank === myRanking.rank) : false;
  const showMyRankPin = isAuthenticated && myRanking?.ranked && !isMeInTopList;

  return (
    <View style={{ backgroundColor: '#FEF3C7', marginHorizontal: 16, marginTop: 16, borderRadius: 12, padding: 16, borderColor: '#FDE68A', borderWidth: 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Trophy size={20} color={COLORS.star} />
          <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.ink }}>Bảng xếp hạng cộng đồng</Text>
        </View>
        <Pressable onPress={() => router.push('/community' as Href)} style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ fontSize: 12.5, fontWeight: '700', color: COLORS.accent }}>Xem toàn bộ</Text>
          <ChevronRight size={16} color={COLORS.accent} />
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {leaderboard.map((entry) => (
          <RankPill key={entry.userId} entry={entry} isMe={entry.rank === myRanking?.rank} />
        ))}

        {showMyRankPin && myRanking && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 20, borderWidth: 1, borderColor: COLORS.line, borderStyle: 'dashed', paddingHorizontal: 12, paddingVertical: 6 }}>
            <Text style={{ fontSize: 13, color: COLORS.inkMuted, fontWeight: '600' }}>
              Bạn: <Text style={{ color: COLORS.accent }}>#{myRanking.rank}</Text> · {myRanking.totalXp} XP
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function rankStyle(rank: number) {
  if (rank === 1) return { border: '#FDE68A', bg: '#FFFBEB', text: COLORS.star };
  if (rank === 2) return { border: COLORS.lineSoft, bg: COLORS.surface, text: COLORS.inkFaint };
  if (rank === 3) return { border: '#FED7AA', bg: '#FFF7ED', text: '#EA580C' };
  return { border: COLORS.lineSoft, bg: COLORS.white, text: COLORS.lineDot };
}

function RankPill({ entry, isMe }: { entry: LeaderboardEntry; isMe: boolean }) {
  const style = rankStyle(entry.rank);
  return (
    <Pressable
      onPress={() => router.push(`/u/${entry.userId}?tab=certificates` as Href)}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 20, borderWidth: isMe ? 2 : 1, borderColor: isMe ? COLORS.accent : style.border, backgroundColor: style.bg, paddingHorizontal: 12, paddingVertical: 6 }}
    >
      <Text style={{ fontSize: 12, fontWeight: '700', color: style.text }}>#{entry.rank}</Text>
      {entry.avatarUrl ? (
        <Image source={{ uri: entry.avatarUrl }} style={{ width: 24, height: 24, borderRadius: 12 }} />
      ) : (
        <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: COLORS.line }} />
      )}
      <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.ink, maxWidth: 100 }} numberOfLines={1}>{entry.fullName}</Text>
      <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.star }}>{entry.totalXp}</Text>
    </Pressable>
  );
}
