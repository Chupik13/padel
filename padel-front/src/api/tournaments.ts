import { apiFetch } from './client';
import type { TournamentResult, SaveTournamentRequest, CreateLiveTournamentRequest, UpdateScoreRequest } from '../types/api';

export function getTournaments(): Promise<TournamentResult[]> {
  return apiFetch<TournamentResult[]>('/api/tournaments');
}

export function saveTournament(data: SaveTournamentRequest): Promise<TournamentResult> {
  return apiFetch<TournamentResult>('/api/tournaments', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function createLiveTournament(data: CreateLiveTournamentRequest): Promise<TournamentResult> {
  return apiFetch<TournamentResult>('/api/tournaments/live', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function getActiveTournament(): Promise<TournamentResult | undefined> {
  return apiFetch<TournamentResult | undefined>('/api/tournaments/active');
}

export function updateMatchScore(id: number, data: UpdateScoreRequest): Promise<TournamentResult> {
  return apiFetch<TournamentResult>(`/api/tournaments/${id}/score`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function navigateMatch(id: number, matchIndex: number): Promise<void> {
  return apiFetch<void>(`/api/tournaments/${id}/navigate`, {
    method: 'PUT',
    body: JSON.stringify({ matchIndex }),
  });
}

export function finishTournament(id: number): Promise<void> {
  return apiFetch<void>(`/api/tournaments/${id}/finish`, {
    method: 'PUT',
  });
}

export function earlyFinishTournament(id: number): Promise<void> {
  return apiFetch<void>(`/api/tournaments/${id}/early-finish`, {
    method: 'PUT',
  });
}

export function cancelTournament(id: number): Promise<void> {
  return apiFetch<void>(`/api/tournaments/${id}`, {
    method: 'DELETE',
  });
}
