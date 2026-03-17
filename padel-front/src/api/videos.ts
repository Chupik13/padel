import { apiFetch } from './client';
import type { MatchVideoResult, OperatorResult } from '../types/api';

export function uploadVideoSegment(matchId: number, cameraSide: number, blob: Blob, contentType: string, orientation = 'landscape'): Promise<unknown> {
  const formData = new FormData();
  const ext = contentType.includes('mp4') ? 'mp4' : 'webm';
  formData.append('file', blob, `side${cameraSide}.${ext}`);
  return apiFetch(`/api/videos/${matchId}/upload?cameraSide=${cameraSide}&orientation=${orientation}`, {
    method: 'POST',
    body: formData,
  });
}

export function getMatchVideo(matchId: number): Promise<MatchVideoResult> {
  return apiFetch(`/api/videos/${matchId}`);
}

export function getTournamentVideos(tournamentId: number): Promise<MatchVideoResult[]> {
  return apiFetch(`/api/videos/tournament/${tournamentId}`);
}

export function registerOperator(tournamentId: number, cameraSide: number): Promise<OperatorResult> {
  return apiFetch(`/api/videos/tournament/${tournamentId}/register-operator`, {
    method: 'POST',
    body: JSON.stringify({ cameraSide }),
  });
}

export function notifyRecordingStarted(tournamentId: number): Promise<void> {
  return apiFetch(`/api/videos/tournament/${tournamentId}/notify-recording`, {
    method: 'POST',
  });
}

export function getOperators(tournamentId: number): Promise<OperatorResult[]> {
  return apiFetch(`/api/videos/tournament/${tournamentId}/operators`);
}
