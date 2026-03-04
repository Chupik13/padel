import type { TournamentResult } from '../types/api';

export interface PartnerStatEntry {
  playerId: number;
  playerLogin: string;
  playerName: string;
  playerImageUrl: string | null;
  gamesTogether: number;
  wins: number;
  losses: number;
  winRate: number;
  avgTeamScore: number;
}

export function computePartnerStats(
  tournaments: TournamentResult[],
  playerId: number,
): PartnerStatEntry[] {
  const partnerMap = new Map<
    number,
    { login: string; name: string; imageUrl: string | null; games: number; wins: number; losses: number; totalScore: number }
  >();

  for (const tr of tournaments) {
    for (const m of tr.matches) {
      const t1 = [m.teamOnePlayer1, m.teamOnePlayer2];
      const t2 = [m.teamTwoPlayer1, m.teamTwoPlayer2];

      const inTeam1 = t1.some((p) => p.id === playerId);
      const inTeam2 = t2.some((p) => p.id === playerId);

      if (!inTeam1 && !inTeam2) continue;

      const myTeam = inTeam1 ? t1 : t2;
      const myScore = inTeam1 ? m.teamOneScore : m.teamTwoScore;
      const oppScore = inTeam1 ? m.teamTwoScore : m.teamOneScore;

      const partner = myTeam.find((p) => p.id !== playerId);
      if (!partner) continue;

      let entry = partnerMap.get(partner.id);
      if (!entry) {
        entry = { login: partner.login, name: partner.name, imageUrl: partner.imageUrl, games: 0, wins: 0, losses: 0, totalScore: 0 };
        partnerMap.set(partner.id, entry);
      }

      entry.games++;
      entry.totalScore += myScore;
      if (myScore > oppScore) entry.wins++;
      else if (oppScore > myScore) entry.losses++;
    }
  }

  return Array.from(partnerMap.entries())
    .map(([id, e]) => ({
      playerId: id,
      playerLogin: e.login,
      playerName: e.name,
      playerImageUrl: e.imageUrl,
      gamesTogether: e.games,
      wins: e.wins,
      losses: e.losses,
      winRate: e.games > 0 ? Math.round((e.wins / e.games) * 100) : 0,
      avgTeamScore: e.games > 0 ? Math.round((e.totalScore / e.games) * 10) / 10 : 0,
    }))
    .sort((a, b) => b.winRate - a.winRate || b.gamesTogether - a.gamesTogether);
}
