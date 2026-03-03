import { apiFetch } from './client';
import type { PlayerResult, GlobalLeaderboardResult } from '../types/api';

export function getPlayers(): Promise<PlayerResult[]> {
  return apiFetch<PlayerResult[]>('/api/players');
}

export function getGlobalLeaderboard(): Promise<GlobalLeaderboardResult> {
  return apiFetch<GlobalLeaderboardResult>('/api/players/leaderboard');
}
