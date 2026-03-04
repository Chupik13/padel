using Microsoft.EntityFrameworkCore;
using padel.Dtos.Results;
using padel.Models;

namespace padel.Services;

public class PlayerService(PadelDbContext db)
{
    public async Task<List<UserResult>> GetAllUsers(int? clubId = null)
    {
        var query = db.Users.Include(u => u.Player).AsQueryable();

        if (clubId.HasValue)
            query = query.Where(u => u.Player.ClubId == clubId);

        return await query
            .Select(u => new UserResult
            {
                Id = u.Player.Id,
                Login = u.Login,
                Name = u.Player.Name,
                ImageUrl = u.Player.ImageUrl
            })
            .ToListAsync();
    }

    public async Task<GlobalLeaderboardResult> GetGlobalLeaderboard()
    {
        var tournaments = await db.Tournaments
            .Where(t => t.IsFinished && !t.IsCancelled && t.Matches.Any())
            .Include(t => t.Matches)
                .ThenInclude(m => m.TeamMatches)
                    .ThenInclude(tm => tm.Team)
                        .ThenInclude(t => t.PlayerTeams)
                            .ThenInclude(pt => pt.Player)
            .ToListAsync();

        // Per player: accumulate average score per tournament, count tournaments
        var allStats = new Dictionary<int, (Player Player, double TotalPoints, int TotalGames, double SeasonTotalPoints, int SeasonGames)>();

        foreach (var tournament in tournaments)
        {
            var result = TournamentMapper.ToResult(tournament);

            foreach (var ps in result.Results)
            {
                if (!allStats.ContainsKey(ps.Player.Id))
                {
                    // We need the actual Player model for mapping
                    var player = tournament.Matches
                        .SelectMany(m => m.TeamMatches)
                        .SelectMany(tm => tm.Team.PlayerTeams)
                        .Select(pt => pt.Player)
                        .First(p => p.Id == ps.Player.Id);
                    allStats[ps.Player.Id] = (player, 0, 0, 0, 0);
                }

                var current = allStats[ps.Player.Id];
                var newTotal = current.TotalPoints + ps.Score;
                var newGames = current.TotalGames + 1;
                var newSeasonTotal = current.SeasonTotalPoints + (tournament.SeasonId != null ? ps.Score : 0);
                var newSeasonGames = current.SeasonGames + (tournament.SeasonId != null ? 1 : 0);
                allStats[ps.Player.Id] = (current.Player, newTotal, newGames, newSeasonTotal, newSeasonGames);
            }
        }

        var players = allStats.Values
            .Select(s => new GlobalPlayerStats
            {
                Player = TournamentMapper.MapPlayer(s.Player),
                TotalGames = s.TotalGames,
                TotalPoints = Math.Round(s.TotalPoints, 2),
                AveragePointsPerGame = s.TotalGames > 0 ? Math.Round(s.TotalPoints / s.TotalGames, 2) : 0,
                SeasonGames = s.SeasonGames,
                SeasonTotalPoints = Math.Round(s.SeasonTotalPoints, 2),
                SeasonAveragePoints = s.SeasonGames > 0 ? Math.Round(s.SeasonTotalPoints / s.SeasonGames, 2) : 0
            })
            .OrderByDescending(s => s.AveragePointsPerGame)
            .ToList();

        return new GlobalLeaderboardResult { Players = players };
    }
}
