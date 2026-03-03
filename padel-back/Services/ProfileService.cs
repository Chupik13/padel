using Microsoft.EntityFrameworkCore;
using padel.Dtos.Results;
using padel.Models;

namespace padel.Services;

public class ProfileService(PadelDbContext db)
{
    public async Task<ProfileResult?> GetProfile(string userLogin)
    {
        var player = await db.Players.FirstOrDefaultAsync(p => p.Login == userLogin);
        if (player is null) return null;

        var now = DateTime.UtcNow;
        var currentSeason = await db.Seasons.FirstOrDefaultAsync(s => s.SeasonStart <= now && s.SeasonEnd > now);
        var allSeasons = await db.Seasons.Where(s => s.SeasonEnd <= now).OrderByDescending(s => s.SeasonEnd).ToListAsync();

        var playerTournaments = await GetPlayerTournaments(player.Id);

        SeasonStatisticResult? currentSeasonStat = null;
        if (currentSeason is not null)
        {
            currentSeasonStat = await BuildSeasonStatistic(player.Id, currentSeason, playerTournaments);
        }

        var previousSeasons = new List<SeasonStatisticResult>();
        foreach (var season in allSeasons)
        {
            previousSeasons.Add(await BuildSeasonStatistic(player.Id, season, playerTournaments));
        }

        var tournamentResults = playerTournaments.Select(TournamentMapper.ToResult).ToList();

        return new ProfileResult
        {
            Id = player.Id,
            Name = player.Name,
            ImageUrl = player.ImageUrl,
            CurrentSeason = currentSeasonStat,
            PreviousSeasons = previousSeasons,
            PlayerTournaments = tournamentResults
        };
    }

    public async Task<ProfileMiniResult?> GetMiniProfile(string userLogin)
    {
        var player = await db.Players.FirstOrDefaultAsync(p => p.Login == userLogin);
        if (player is null) return null;

        var now = DateTime.UtcNow;
        var currentSeason = await db.Seasons.FirstOrDefaultAsync(s => s.SeasonStart <= now && s.SeasonEnd > now);

        double seasonScore = 0;
        if (currentSeason is not null)
        {
            var playerTournaments = await GetPlayerTournaments(player.Id);
            var seasonTournaments = playerTournaments.Where(t => t.SeasonId == currentSeason.Id).ToList();
            seasonScore = CalculateSeasonScore(player.Id, seasonTournaments);
        }

        return new ProfileMiniResult
        {
            Name = player.Name,
            SeasonScore = Math.Round(seasonScore, 2)
        };
    }

    private async Task<List<Tournament>> GetPlayerTournaments(int playerId)
    {
        return await db.Tournaments
            .Include(t => t.Matches)
                .ThenInclude(m => m.TeamMatches)
                    .ThenInclude(tm => tm.Team)
                        .ThenInclude(t => t.PlayerTeams)
                            .ThenInclude(pt => pt.Player)
            .Where(t => !t.IsCancelled && t.Matches.Any(m =>
                m.TeamMatches.Any(tm =>
                    tm.Team.PlayerTeams.Any(pt => pt.PlayerId == playerId))))
            .OrderByDescending(t => t.Date)
            .ToListAsync();
    }

    private async Task<SeasonStatisticResult> BuildSeasonStatistic(int playerId, Season season, List<Tournament> allPlayerTournaments)
    {
        var seasonTournaments = allPlayerTournaments.Where(t => t.SeasonId == season.Id).ToList();
        var score = CalculateSeasonScore(playerId, seasonTournaments);
        var tournamentsPlayed = seasonTournaments.Count;
        var mediumScore = tournamentsPlayed > 0 ? score / tournamentsPlayed : 0;

        // Calculate rating place
        var allPlayersInSeason = await GetAllPlayerScoresForSeason(season.Id);
        var sorted = allPlayersInSeason.OrderByDescending(x => x.Value).ToList();
        var ratingPlace = sorted.FindIndex(x => x.Key == playerId) + 1;
        if (ratingPlace == 0) ratingPlace = sorted.Count + 1;

        // Super game place
        int? superGamePlace = null;
        var seasonWithSuperGame = await db.Seasons
            .Include(s => s.SuperGameTournament)
                .ThenInclude(t => t!.Matches)
                    .ThenInclude(m => m.TeamMatches)
                        .ThenInclude(tm => tm.Team)
                            .ThenInclude(t => t.PlayerTeams)
            .FirstOrDefaultAsync(s => s.Id == season.Id && s.SuperGameTournamentId != null);

        if (seasonWithSuperGame?.SuperGameTournament is { IsFinished: true } superGame)
        {
            var playerScores = new Dictionary<int, (double TotalScore, int MatchCount)>();
            foreach (var match in superGame.Matches)
            {
                foreach (var teamMatch in match.TeamMatches)
                {
                    foreach (var pt in teamMatch.Team.PlayerTeams)
                    {
                        if (!playerScores.ContainsKey(pt.PlayerId))
                            playerScores[pt.PlayerId] = (0, 0);
                        var current = playerScores[pt.PlayerId];
                        playerScores[pt.PlayerId] = (current.TotalScore + teamMatch.Score, current.MatchCount + 1);
                    }
                }
            }

            var podium = playerScores
                .Select(ps => new { ps.Key, Avg = ps.Value.MatchCount > 0 ? ps.Value.TotalScore / ps.Value.MatchCount : 0 })
                .OrderByDescending(x => x.Avg)
                .ToList();

            var place = podium.FindIndex(x => x.Key == playerId);
            if (place >= 0 && place < 3)
                superGamePlace = place + 1;
        }

        return new SeasonStatisticResult
        {
            Score = Math.Round(score, 2),
            MediumScoreAllTournaments = Math.Round(mediumScore, 2),
            TournamentsPlayed = tournamentsPlayed,
            TournamentsRequired = season.RequireGamesCount,
            RatingPlace = ratingPlace,
            SuperGamePlace = superGamePlace
        };
    }

    private async Task<Dictionary<int, double>> GetAllPlayerScoresForSeason(int seasonId)
    {
        var tournaments = await db.Tournaments
            .Include(t => t.Matches)
                .ThenInclude(m => m.TeamMatches)
                    .ThenInclude(tm => tm.Team)
                        .ThenInclude(t => t.PlayerTeams)
            .Where(t => t.SeasonId == seasonId && !t.IsCancelled)
            .ToListAsync();

        var playerScores = new Dictionary<int, double>();

        foreach (var tournament in tournaments)
        {
            var tournamentPlayerScores = new Dictionary<int, (double TotalScore, int MatchCount)>();

            foreach (var match in tournament.Matches)
            {
                foreach (var teamMatch in match.TeamMatches)
                {
                    foreach (var pt in teamMatch.Team.PlayerTeams)
                    {
                        if (!tournamentPlayerScores.ContainsKey(pt.PlayerId))
                            tournamentPlayerScores[pt.PlayerId] = (0, 0);

                        var current = tournamentPlayerScores[pt.PlayerId];
                        tournamentPlayerScores[pt.PlayerId] = (current.TotalScore + teamMatch.Score, current.MatchCount + 1);
                    }
                }
            }

            foreach (var (playerId, (totalScore, matchCount)) in tournamentPlayerScores)
            {
                var tournamentScore = matchCount > 0 ? totalScore / matchCount : 0;
                if (!playerScores.ContainsKey(playerId))
                    playerScores[playerId] = 0;
                playerScores[playerId] += tournamentScore;
            }
        }

        return playerScores;
    }

    private static double CalculateSeasonScore(int playerId, List<Tournament> seasonTournaments)
    {
        double totalScore = 0;

        foreach (var tournament in seasonTournaments)
        {
            double tournamentTotalScore = 0;
            int matchCount = 0;

            foreach (var match in tournament.Matches)
            {
                foreach (var teamMatch in match.TeamMatches)
                {
                    if (teamMatch.Team.PlayerTeams.Any(pt => pt.PlayerId == playerId))
                    {
                        tournamentTotalScore += teamMatch.Score;
                        matchCount++;
                    }
                }
            }

            if (matchCount > 0)
                totalScore += tournamentTotalScore / matchCount;
        }

        return totalScore;
    }
}
