import { apiFetch } from './client';
import type { ProfileResult, ProfileMiniResult } from '../types/api';

export function getProfile(): Promise<ProfileResult> {
  return apiFetch<ProfileResult>('/api/profile/');
}

export function getMiniProfile(): Promise<ProfileMiniResult> {
  return apiFetch<ProfileMiniResult>('/api/profile/mini');
}

export function getProfileByLogin(login: string): Promise<ProfileResult> {
  return apiFetch<ProfileResult>(`/api/profile/${encodeURIComponent(login)}`);
}

export function uploadAvatar(file: File): Promise<void> {
  const formData = new FormData();
  formData.append('file', file);
  return apiFetch<void>('/api/profile/avatar', {
    method: 'POST',
    headers: {},
    body: formData,
  });
}
