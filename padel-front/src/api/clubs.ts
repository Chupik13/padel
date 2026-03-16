import { apiFetch } from './client';
import type { ClubResult, PlayerResult } from '../types/api';

export function getClubs(): Promise<ClubResult[]> {
  return apiFetch<ClubResult[]>('/api/clubs');
}

export function getMyClubs(): Promise<ClubResult[]> {
  return apiFetch<ClubResult[]>('/api/clubs/my');
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

export function leaveClub(clubId: number): Promise<void> {
  return apiFetch<void>(`/api/clubs/${clubId}/leave`, { method: 'POST' });
}

export function setPrimaryClub(clubId: number): Promise<void> {
  return apiFetch<void>(`/api/clubs/${clubId}/primary`, { method: 'PUT' });
}

export function archiveClub(clubId: number): Promise<void> {
  return apiFetch<void>(`/api/clubs/${clubId}/archive`, { method: 'POST' });
}

export function uploadClubAvatar(clubId: number, file: File): Promise<void> {
  const formData = new FormData();
  formData.append('file', file);
  return apiFetch<void>(`/api/clubs/${clubId}/avatar`, {
    method: 'POST',
    headers: {},
    body: formData,
  });
}
