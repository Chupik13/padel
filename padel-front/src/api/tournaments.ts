import { apiFetch, ApiError } from './client';
import type { TournamentResult, SaveTournamentRequest, CreateLiveTournamentRequest, UpdateScoreRequest } from '../types/api';

export function getTournaments(includeCancelled = false, clubId?: number): Promise<TournamentResult[]> {
  const params = new URLSearchParams();
  if (includeCancelled) params.set('includeCancelled', 'true');
  if (clubId !== undefined) params.set('clubId', String(clubId));
  const qs = params.toString();
  return apiFetch<TournamentResult[]>(`/api/tournaments${qs ? `?${qs}` : ''}`);
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

export function getUnfinishedTournaments(): Promise<TournamentResult[]> {
  return apiFetch<TournamentResult[]>('/api/tournaments/unfinished');
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

export async function earlyFinishTournament(id: number): Promise<void> {
  try {
    return await apiFetch<void>(`/api/tournaments/${id}/early-finish`, {
      method: 'PUT',
    });
  } catch (e) {
    if (e instanceof ApiError && e.status === 400) {
      throw new ApiError(400, 'earlyFinishMinGames');
    }
    throw e;
  }
}

export function getClubActiveTournaments(): Promise<TournamentResult[]> {
  return apiFetch<TournamentResult[]>('/api/tournaments/club-active');
}

export function cancelTournament(id: number): Promise<void> {
  return apiFetch<void>(`/api/tournaments/${id}`, {
    method: 'DELETE',
  });
}

export function deleteTournamentPermanent(id: number): Promise<void> {
  return apiFetch<void>(`/api/tournaments/${id}/permanent`, {
    method: 'DELETE',
  });
}
