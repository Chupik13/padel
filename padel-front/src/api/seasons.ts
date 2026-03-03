import { apiFetch } from './client';
import type { SeasonResult, CreateSuperGameRequest, TournamentResult } from '../types/api';

export function getSeasons(): Promise<SeasonResult[]> {
  return apiFetch<SeasonResult[]>('/api/seasons');
}

export function getSeason(id: number): Promise<SeasonResult> {
  return apiFetch<SeasonResult>(`/api/seasons/${id}`);
}

export function createSuperGame(seasonId: number, data: CreateSuperGameRequest): Promise<TournamentResult> {
  return apiFetch<TournamentResult>(`/api/seasons/${seasonId}/supergame`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
