// --- Result types (matching backend DTOs) ---

export interface UserResult {
  id: number;
  login: string;
  name: string;
  imageUrl: string | null;
  hasEmail: boolean;
}

export interface ClubMiniResult {
  id: number;
  name: string;
  imageUrl: string | null;
}

export interface ProfileMiniResult {
  name: string;
  seasonScore: number;
  clubId: number | null;
  clubName: string | null;
  clubs: ClubMiniResult[];
}

export interface ClubResult {
  id: number;
  name: string;
  imageUrl: string | null;
  memberCount: number;
  isPrimary: boolean;
}

export interface ProfileResult {
  id: number;
  name: string;
  imageUrl: string | null;
  currentSeason: SeasonStatisticResult | null;
  previousSeasons: SeasonStatisticResult[];
  playerTournaments: TournamentResult[];
}

export interface SeasonStatisticResult {
  seasonId: number;
  score: number;
  mediumScoreAllTournaments: number;
  tournamentsPlayed: number;
  tournamentsRequired: number;
  ratingPlace: number;
  superGamePlace: number | null;
}

export interface PlayerResult {
  id: number;
  name: string;
  login: string;
  imageUrl: string | null;
}

export interface MatchResult {
  id: number;
  teamOnePlayer1: PlayerResult;
  teamOnePlayer2: PlayerResult;
  teamTwoPlayer1: PlayerResult;
  teamTwoPlayer2: PlayerResult;
  teamOneScore: number;
  teamTwoScore: number;
  startedAt?: string;
}

export interface PlayerScoreResult {
  player: PlayerResult;
  score: number;
}

export interface TournamentResult {
  id: number;
  date: string;
  matches: MatchResult[];
  isBalanced: boolean;
  seasonId: number | null;
  results: PlayerScoreResult[];
  currentMatchIndex: number;
  hostPlayerId: number | null;
  isFinished: boolean;
  isEarlyFinished: boolean;
  isCancelled: boolean;
  finishedAt?: string;
  clubId: number | null;
  clubName: string | null;
  clubImageUrl: string | null;
}

export interface SuperGameResult {
  tournamentId: number;
  isFinished: boolean;
  podium: PlayerScoreResult[];
}

export interface SeasonResult {
  id: number;
  seasonStart: string;
  seasonEnd: string;
  requireGamesCount: number;
  tournamentsPlayed: number;
  isCurrent: boolean;
  leaderBoard: LeaderBoardResult;
  superGame: SuperGameResult | null;
}

export interface LeaderBoardResult {
  seasonId: number;
  players: PlayerSeasonScoreResult[];
}

export interface TournamentScoreEntry {
  date: string;
  averageScore: number;
  isCounted: boolean;
}

export interface PlayerSeasonScoreResult extends PlayerScoreResult {
  mediumScoreByTournaments: number;
  tournamentsPlayed: number;
  tournamentScores: TournamentScoreEntry[];
}

export interface HeadToHeadResult {
  player1: PlayerResult;
  player2: PlayerResult;
  matchesAsOpponents: number;
  player1Wins: number;
  player2Wins: number;
  draws: number;
  matchesAsPartners: number;
  winsAsPartners: number;
  winRateAsPartners: number;
  player1AvgScore: number;
  player2AvgScore: number;
}

export interface GlobalPlayerStats {
  player: PlayerResult;
  totalGames: number;
  totalPoints: number;
  averagePointsPerGame: number;
  seasonGames: number;
  seasonTotalPoints: number;
  seasonAveragePoints: number;
}

export interface GlobalLeaderboardResult {
  players: GlobalPlayerStats[];
}

// --- Request types ---

export interface LoginRequest {
  login: string;
  password: string;
}

export interface RegisterRequest {
  login: string;
  password: string;
  name: string;
  email: string;
}

export interface TeamRequest {
  firstPlayerId: number;
  secondPlayerId: number;
  score: number;
}

export interface MatchRequest {
  teamOne: TeamRequest;
  teamTwo: TeamRequest;
}

export interface SaveTournamentRequest {
  isBalanced: boolean;
  inSeason: boolean;
  matches: MatchRequest[];
}

export interface TeamSetupRequest {
  firstPlayerId: number;
  secondPlayerId: number;
}

export interface MatchSetupRequest {
  teamOne: TeamSetupRequest;
  teamTwo: TeamSetupRequest;
}

export interface CreateLiveTournamentRequest {
  isBalanced: boolean;
  inSeason: boolean;
  clubId?: number;
  matches: MatchSetupRequest[];
}

export interface CreateSuperGameRequest {
  matches: MatchSetupRequest[];
}

export interface UpdateScoreRequest {
  matchIndex: number;
  teamOneScore: number;
  teamTwoScore: number;
}
