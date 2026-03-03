import type { Tournament } from '../types';

const STORAGE_KEY = 'padel-tournament';

export function saveTournament(tournament: Tournament): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tournament));
}

export function loadTournament(): Tournament | null {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data) as Tournament;
  } catch {
    return null;
  }
}

export function clearTournament(): void {
  localStorage.removeItem(STORAGE_KEY);
}
