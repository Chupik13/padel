using Microsoft.EntityFrameworkCore;
using padel.Dtos.Requests;
using padel.Dtos.Results;
using padel.Models;

namespace padel.Services;

public class SeasonService(PadelDbContext db, TournamentService tournamentService)
{
    public async Task<List<SeasonResult>> GetSeasons()
    {
        var seasons = await db.Seasons
            .Include(s => s.Tournaments)
                .ThenInclude(t => t.Matches)
                    .ThenInclude(m => m.TeamMatches)
                        .ThenInclude(tm => tm.Team)
                            .ThenInclude(t => t.PlayerTeams)
                                .ThenInclude(pt => pt.Player)
            .Include(s => s.SuperGameTournament)
                .ThenInclude(t => t!.Matches)
                    .ThenInclude(m => m.TeamMatches)
                        .ThenInclude(tm => tm.Team)
                            .ThenInclude(t => t.PlayerTeams)
                                .ThenInclude(pt => pt.Player)
            .OrderByDescending(s => s.SeasonStart)
            .ToListAsync();

        var now = DateTime.UtcNow;
        return seasons.Select(s => MapSeason(s, now)).ToList();
    }

    public async Task<SeasonResult?> GetSeason(int id)
    {
        var season = await db.Seasons
            .Include(s => s.Tournaments)
                .ThenInclude(t => t.Matches)
                    .ThenInclude(m => m.TeamMatches)
                        .ThenInclude(tm => tm.Team)
                            .ThenInclude(t => t.PlayerTeams)
                                .ThenInclude(pt => pt.Player)
            .Include(s => s.SuperGameTournament)
                .ThenInclude(t => t!.Matches)
                    .ThenInclude(m => m.TeamMatches)
                        .ThenInclude(tm => tm.Team)
                            .ThenInclude(t => t.PlayerTeams)
                                .ThenInclude(pt => pt.Player)
            .FirstOrDefaultAsync(s => s.Id == id);

        if (season is null) return null;

        return MapSeason(season, DateTime.UtcNow);
    }

    public async Task<TournamentResult?> CreateSuperGame(int seasonId, int hostPlayerId, CreateSuperGameRequest request)
    {
        var season = await db.Seasons
            .Include(s => s.Tournaments)
                .ThenInclude(t => t.Matches)
                    .ThenInclude(m => m.TeamMatches)
                        .ThenInclude(tm => tm.Team)
                            .ThenInclude(t => t.PlayerTeams)
                                .ThenInclude(pt => pt.Player)
            .FirstOrDefaultAsync(s => s.Id == seasonId);

        if (season is null) return null;
        if (season.SeasonEnd > DateTime.UtcNow) return null;
        if (season.SuperGameTournamentId is not null) return null;
        if (request.Matches.Count != 9) return null;

        var leaderBoard = BuildLeaderBoard(season);
        var top4Ids = leaderBoard.Players.Take(4).Select(p => p.Player.Id).ToList();
        if (!top4Ids.Contains(hostPlayerId)) return null;

        var result = await tournamentService.CreateLiveTournament(hostPlayerId, new CreateLiveTournamentRequest
        {
            IsBalanced = true,
            InSeason = false,
            Matches = request.Matches
        });

        season.SuperGameTournamentId = result.Id;
        await db.SaveChangesAsync();

        return result;
    }

    private static SeasonResult MapSeason(Season season, DateTime now)
    {
        var isCurrent = season.SeasonStart <= now && season.SeasonEnd > now;
        var leaderBoard = BuildLeaderBoard(season);

        SuperGameResult? superGame = null;
        if (season.SuperGameTournament is not null)
        {
            var tournament = season.SuperGameTournament;
            List<PlayerScoreResult> podium = [];

            if (tournament.IsFinished)
            {
                var playerScores = new Dictionary<int, (Player Player, double TotalScore, int MatchCount)>();
                foreach (var match in tournament.Matches)
                {
                    foreach (var teamMatch in match.TeamMatches)
                    {
                        foreach (var pt in teamMatch.Team.PlayerTeams)
                        {
                            if (!playerScores.ContainsKey(pt.PlayerId))
                                playerScores[pt.PlayerId] = (pt.Player, 0, 0);

                            var current = playerScores[pt.PlayerId];
                            playerScores[pt.PlayerId] = (current.Player, current.TotalScore + teamMatch.Score, current.MatchCount + 1);
                        }
                    }
                }

                podium = playerScores.Values
                    .Select(ps => new PlayerScoreResult
                    {
                        Player = TournamentMapper.MapPlayer(ps.Player),
                        Score = ps.MatchCount > 0 ? Math.Round(ps.TotalScore / ps.MatchCount, 2) : 0
                    })
                    .OrderByDescending(ps => ps.Score)
                    .Take(3)
                    .ToList();
            }

            superGame = new SuperGameResult
            {
                TournamentId = tournament.Id,
                IsFinished = tournament.IsFinished,
                Podium = podium
            };
        }

        return new SeasonResult
        {
            Id = season.Id,
            SeasonStart = season.SeasonStart,
            SeasonEnd = season.SeasonEnd,
            RequireGamesCount = season.RequireGamesCount,
            TournamentsPlayed = season.Tournaments.Count,
            IsCurrent = isCurrent,
            LeaderBoard = leaderBoard,
            SuperGame = superGame
        };
    }

    private static LeaderBoardResult BuildLeaderBoard(Season season)
    {
        var playerScores = new Dictionary<int, (Player Player, double TotalSeasonScore, int TournamentCount)>();

        foreach (var tournament in season.Tournaments)
        {
            var tournamentPlayerScores = new Dictionary<int, (Player Player, double TotalScore, int MatchCount)>();

            foreach (var match in tournament.Matches)
            {
                foreach (var teamMatch in match.TeamMatches)
                {
                    foreach (var pt in teamMatch.Team.PlayerTeams)
                    {
                        if (!tournamentPlayerScores.ContainsKey(pt.PlayerId))
                            tournamentPlayerScores[pt.PlayerId] = (pt.Player, 0, 0);

                        var current = tournamentPlayerScores[pt.PlayerId];
                        tournamentPlayerScores[pt.PlayerId] = (current.Player, current.TotalScore + teamMatch.Score, current.MatchCount + 1);
                    }
                }
            }

            foreach (var (playerId, (player, totalScore, matchCount)) in tournamentPlayerScores)
            {
                var tournamentAvg = matchCount > 0 ? totalScore / matchCount : 0;
                if (!playerScores.ContainsKey(playerId))
                    playerScores[playerId] = (player, 0, 0);

                var current = playerScores[playerId];
                playerScores[playerId] = (current.Player, current.TotalSeasonScore + tournamentAvg, current.TournamentCount + 1);
            }
        }

        var players = playerScores.Values
            .Select(ps => new PlayerSeasonScoreResult
            {
                Player = TournamentMapper.MapPlayer(ps.Player),
                Score = Math.Round(ps.TotalSeasonScore, 2),
                MediumScoreByTournaments = ps.TournamentCount > 0
                    ? Math.Round(ps.TotalSeasonScore / ps.TournamentCount, 2)
                    : 0,
                TournamentsPlayed = ps.TournamentCount
            })
            .OrderByDescending(p => p.Score)
            .ToList();

        return new LeaderBoardResult
        {
            SeasonId = season.Id,
            Players = players
        };
    }
}
