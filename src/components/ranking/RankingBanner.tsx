import { useQuery } from '@tanstack/react-query';
import { View, Text, ScrollView, Image } from 'react-native';
import { Trophy } from 'lucide-react-native';

import { rankingApi } from '@/lib/api/ranking';
import { useAuth } from '@/lib/auth/AuthContext';
import type { LeaderboardEntry } from '@/types/ranking';

export function RankingBanner() {
  const { isAuthenticated } = useAuth();
  
  const { data: leaderboard, isLoading } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: () => rankingApi.getLeaderboard(5),
  });

  const { data: myRanking } = useQuery({
    queryKey: ['myRanking'],
    queryFn: () => rankingApi.getMyRanking(),
    enabled: isAuthenticated === true,
  });

  if (isLoading || !leaderboard || leaderboard.length === 0) return null;

  // Ở public, myRanking sẽ undefined nên luôn false.
  const isMeInTopList = myRanking?.rank ? leaderboard.some((entry) => entry.rank === myRanking.rank) : false;
  const showMyRankPin = isAuthenticated && myRanking?.ranked && !isMeInTopList;

  return (
    <View style={{ backgroundColor: '#FEF3C7', marginHorizontal: 16, marginTop: 16, borderRadius: 12, padding: 16, borderColor: '#FDE68A', borderWidth: 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Trophy size={20} color="#F59E0B" />
        <Text style={{ fontSize: 16, fontWeight: '700', color: '#0F172A' }}>Bảng xếp hạng cộng đồng</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {leaderboard.map((entry) => (
          <RankPill key={entry.userId} entry={entry} isMe={entry.rank === myRanking?.rank} />
        ))}

        {showMyRankPin && myRanking && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 20, borderWidth: 1, borderColor: '#CBD5E1', borderStyle: 'dashed', paddingHorizontal: 12, paddingVertical: 6 }}>
            <Text style={{ fontSize: 13, color: '#475569', fontWeight: '600' }}>
              Bạn: <Text style={{ color: '#2563EB' }}>#{myRanking.rank}</Text> · {myRanking.totalXp} XP
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function rankStyle(rank: number) {
  if (rank === 1) return { border: '#FDE68A', bg: '#FFFBEB', text: '#F59E0B' };
  if (rank === 2) return { border: '#E2E8F0', bg: '#F8FAFC', text: '#64748B' };
  if (rank === 3) return { border: '#FED7AA', bg: '#FFF7ED', text: '#EA580C' };
  return { border: '#E2E8F0', bg: '#FFFFFF', text: '#94A3B8' };
}

function RankPill({ entry, isMe }: { entry: LeaderboardEntry; isMe: boolean }) {
  const style = rankStyle(entry.rank);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 20, borderWidth: isMe ? 2 : 1, borderColor: isMe ? '#2563EB' : style.border, backgroundColor: style.bg, paddingHorizontal: 12, paddingVertical: 6 }}>
      <Text style={{ fontSize: 12, fontWeight: '700', color: style.text }}>#{entry.rank}</Text>
      {entry.avatarUrl ? (
        <Image source={{ uri: entry.avatarUrl }} style={{ width: 24, height: 24, borderRadius: 12 }} />
      ) : (
        <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#CBD5E1' }} />
      )}
      <Text style={{ fontSize: 13, fontWeight: '600', color: '#0F172A', maxWidth: 100 }} numberOfLines={1}>{entry.fullName}</Text>
      <Text style={{ fontSize: 12, fontWeight: '700', color: '#F59E0B' }}>{entry.totalXp}</Text>
    </View>
  );
}
