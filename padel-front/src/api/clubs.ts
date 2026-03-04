import { apiFetch } from './client';
import type { ClubResult, PlayerResult } from '../types/api';

export function getClubs(): Promise<ClubResult[]> {
  return apiFetch<ClubResult[]>('/api/clubs');
}

export function getMyClub(): Promise<ClubResult | null> {
  return apiFetch<ClubResult | null>('/api/clubs/my');
}

export function createClub(name: string): Promise<ClubResult> {
  return apiFetch<ClubResult>('/api/clubs', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export function getClubMembers(clubId: number): Promise<PlayerResult[]> {
  return apiFetch<PlayerResult[]>(`/api/clubs/${clubId}/members`);
}

export function joinClub(clubId: number): Promise<void> {
  return apiFetch<void>(`/api/clubs/${clubId}/join`, { method: 'POST' });
}

export function leaveClub(): Promise<void> {
  return apiFetch<void>('/api/clubs/leave', { method: 'POST' });
}
