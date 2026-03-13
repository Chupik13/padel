import { apiFetch } from './client';
import type { PlayerResult, GlobalLeaderboardResult } from '../types/api';

export function getPlayers(): Promise<PlayerResult[]> {
  return apiFetch<PlayerResult[]>('/api/players');
}

export function getGlobalLeaderboard(clubId?: number): Promise<GlobalLeaderboardResult> {
  const url = clubId != null ? `/api/players/leaderboard?clubId=${clubId}` : '/api/players/leaderboard';
  return apiFetch<GlobalLeaderboardResult>(url);
}
