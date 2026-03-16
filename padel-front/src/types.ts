export type Player = { id: number; name: string; imageUrl?: string | null; isAdmin?: boolean };

export type TournamentFormat = 'balanced' | 'fixed-5' | 'fixed-10';

export type FormatOption = {
  label: string;
  matchCount: number;
  generationMode: 'balanced' | 'fixed';
  k?: number;
};

export type Match = {
  team1: [number, number];
  team2: [number, number];
  resting: number[];
  score1?: number;
  score2?: number;
  startedAt?: string;
};

export type Tournament = {
  players: Player[];
  matches: Match[];
  currentMatchIndex: number;
  format?: TournamentFormat;
  id?: number;
  hostPlayerId?: number;
  isFinished?: boolean;
};
