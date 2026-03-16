import { apiFetch } from './client';
import type { BadgeTypeResult, PlayerBadgeResult, AssignBadgeRequest } from '../types/api';

export function getBadgeTypes(): Promise<BadgeTypeResult[]> {
  return apiFetch<BadgeTypeResult[]>('/api/badges/types');
}

export function getPlayerBadges(playerId: number): Promise<PlayerBadgeResult[]> {
  return apiFetch<PlayerBadgeResult[]>(`/api/badges/player/${playerId}`);
}

export function assignBadge(request: AssignBadgeRequest): Promise<PlayerBadgeResult> {
  return apiFetch<PlayerBadgeResult>('/api/badges', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

export function removeBadge(id: number): Promise<void> {
  return apiFetch<void>(`/api/badges/${id}`, { method: 'DELETE' });
}
