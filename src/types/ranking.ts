export interface LeaderboardEntry {
  rank: number;
  userId: number;
  fullName: string;
  avatarUrl: string | null;
  totalXp: number;
}

export interface MyRanking {
  ranked: boolean;
  rank: number | null;
  totalXp: number;
}
