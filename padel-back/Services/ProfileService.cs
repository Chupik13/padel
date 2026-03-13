using Microsoft.EntityFrameworkCore;
using padel.Dtos.Results;
using padel.Models;

namespace padel.Services;

public class ProfileService(PadelDbContext db)
{
    public async Task<ProfileResult?> GetProfile(string userLogin)
    {
        var player = await db.Players.Include(p => p.Club).FirstOrDefaultAsync(p => p.Login == userLogin);
        if (player is null) return null;

        var now = DateTime.UtcNow;
        var currentSeason = await db.Seasons.FirstOrDefaultAsync(s => s.SeasonStart <= now && s.SeasonEnd > now);
        var allSeasons = await db.Seasons.Where(s => s.SeasonEnd <= now).OrderByDescending(s => s.SeasonEnd).ToListAsync();

        var playerTournaments = await GetPlayerTournaments(player.Id, player.ClubId);

        SeasonStatisticResult? currentSeasonStat = null;
        if (currentSeason is not null)
        {
            currentSeasonStat = await BuildSeasonStatistic(player.Id, currentSeason, playerTournaments, player.ClubId);
        }

        var previousSeasons = new List<SeasonStatisticResult>();
        foreach (var season in allSeasons)
        {
            previousSeasons.Add(await BuildSeasonStatistic(player.Id, season, playerTournaments, player.ClubId));
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

    public async Task<HeadToHeadResult?> GetHeadToHead(string currentUserLogin, string targetUserLogin)
    {
        var player1 = await db.Players.FirstOrDefaultAsync(p => p.Login == currentUserLogin);
        var player2 = await db.Players.FirstOrDefaultAsync(p => p.Login == targetUserLogin);
        if (player1 is null || player2 is null) return null;

        var clubId = player1.ClubId;

        // Get tournaments where both players participated
        var tournaments = await db.Tournaments
            .Include(t => t.Matches)
                .ThenInclude(m => m.TeamMatches)
                    .ThenInclude(tm => tm.Team)
                        .ThenInclude(t => t.PlayerTeams)
                            .ThenInclude(pt => pt.Player)
            .Where(t => !t.IsCancelled
                && (!clubId.HasValue || t.ClubId == clubId.Value)
                && t.Matches.Any(m => m.TeamMatches.Any(tm => tm.Team.PlayerTeams.Any(pt => pt.PlayerId == player1.Id)))
                && t.Matches.Any(m => m.TeamMatches.Any(tm => tm.Team.PlayerTeams.Any(pt => pt.PlayerId == player2.Id))))
            .ToListAsync();

        int matchesAsOpponents = 0, p1Wins = 0, p2Wins = 0, draws = 0;
        int matchesAsPartners = 0, winsAsPartners = 0;
        double p1TotalScore = 0, p2TotalScore = 0;
        int p1Matches = 0, p2Matches = 0;

        foreach (var tournament in tournaments)
        {
            foreach (var match in tournament.Matches)
            {
                if (match.TeamMatches.Count < 2) continue;
                var tm1 = match.TeamMatches[0];
                var tm2 = match.TeamMatches[1];

                var team1Ids = tm1.Team.PlayerTeams.Select(pt => pt.PlayerId).ToHashSet();
                var team2Ids = tm2.Team.PlayerTeams.Select(pt => pt.PlayerId).ToHashSet();

                var p1InTeam1 = team1Ids.Contains(player1.Id);
                var p1InTeam2 = team2Ids.Contains(player1.Id);
                var p2InTeam1 = team1Ids.Contains(player2.Id);
                var p2InTeam2 = team2Ids.Contains(player2.Id);

                if (!((p1InTeam1 || p1InTeam2) && (p2InTeam1 || p2InTeam2))) continue;

                // Track scores
                if (p1InTeam1) { p1TotalScore += tm1.Score; p1Matches++; }
                else if (p1InTeam2) { p1TotalScore += tm2.Score; p1Matches++; }
                if (p2InTeam1) { p2TotalScore += tm1.Score; p2Matches++; }
                else if (p2InTeam2) { p2TotalScore += tm2.Score; p2Matches++; }

                bool sameTeam = (p1InTeam1 && p2InTeam1) || (p1InTeam2 && p2InTeam2);

                if (sameTeam)
                {
                    matchesAsPartners++;
                    var myTeamScore = p1InTeam1 ? tm1.Score : tm2.Score;
                    var oppTeamScore = p1InTeam1 ? tm2.Score : tm1.Score;
                    if (myTeamScore > oppTeamScore) winsAsPartners++;
                }
                else
                {
                    matchesAsOpponents++;
                    var p1Score = p1InTeam1 ? tm1.Score : tm2.Score;
                    var p2Score = p2InTeam1 ? tm1.Score : tm2.Score;
                    if (p1Score > p2Score) p1Wins++;
                    else if (p2Score > p1Score) p2Wins++;
                    else draws++;
                }
            }
        }

        return new HeadToHeadResult
        {
            Player1 = TournamentMapper.MapPlayer(player1),
            Player2 = TournamentMapper.MapPlayer(player2),
            MatchesAsOpponents = matchesAsOpponents,
            Player1Wins = p1Wins,
            Player2Wins = p2Wins,
            Draws = draws,
            MatchesAsPartners = matchesAsPartners,
            WinsAsPartners = winsAsPartners,
            WinRateAsPartners = matchesAsPartners > 0 ? Math.Round((double)winsAsPartners / matchesAsPartners * 100, 1) : 0,
            Player1AvgScore = p1Matches > 0 ? Math.Round(p1TotalScore / p1Matches, 1) : 0,
            Player2AvgScore = p2Matches > 0 ? Math.Round(p2TotalScore / p2Matches, 1) : 0,
        };
    }

    public async Task<ProfileMiniResult?> GetMiniProfile(string userLogin)
    {
        var player = await db.Players.Include(p => p.Club).FirstOrDefaultAsync(p => p.Login == userLogin);
        if (player is null) return null;

        var now = DateTime.UtcNow;
        var currentSeason = await db.Seasons.FirstOrDefaultAsync(s => s.SeasonStart <= now && s.SeasonEnd > now);

        double seasonScore = 0;
        if (currentSeason is not null)
        {
            var playerTournaments = await GetPlayerTournaments(player.Id, player.ClubId);
            var seasonTournaments = playerTournaments.Where(t => t.SeasonId == currentSeason.Id).ToList();
            seasonScore = CalculateSeasonScore(player.Id, seasonTournaments, currentSeason.RequireGamesCount);
        }

        return new ProfileMiniResult
        {
            Name = player.Name,
            SeasonScore = Math.Round(seasonScore, 2),
            ClubId = player.ClubId,
            ClubName = player.Club?.Name
        };
    }

    private async Task<List<Tournament>> GetPlayerTournaments(int playerId, int? clubId = null)
    {
        var query = db.Tournaments
            .Include(t => t.Matches)
                .ThenInclude(m => m.TeamMatches)
                    .ThenInclude(tm => tm.Team)
                        .ThenInclude(t => t.PlayerTeams)
                            .ThenInclude(pt => pt.Player)
            .Where(t => !t.IsCancelled && t.IsFinished && t.Matches.Any(m =>
                m.TeamMatches.Any(tm =>
                    tm.Team.PlayerTeams.Any(pt => pt.PlayerId == playerId))));

        if (clubId.HasValue)
            query = query.Where(t => t.ClubId == clubId.Value);

        return await query.OrderByDescending(t => t.Date).ToListAsync();
    }

    private async Task<SeasonStatisticResult> BuildSeasonStatistic(int playerId, Season season, List<Tournament> allPlayerTournaments, int? clubId = null)
    {
        var seasonTournaments = allPlayerTournaments.Where(t => t.SeasonId == season.Id).ToList();
        var maxGames = season.RequireGamesCount;
        var score = CalculateSeasonScore(playerId, seasonTournaments, maxGames);
        var tournamentsPlayed = seasonTournaments.Count;
        var countedGames = Math.Min(tournamentsPlayed, maxGames);
        var mediumScore = countedGames > 0 ? score / countedGames : 0;

        // Calculate rating place
        var allPlayersInSeason = await GetAllPlayerScoresForSeason(season.Id, maxGames, clubId);
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
            SeasonId = season.Id,
            Score = Math.Round(score, 2),
            MediumScoreAllTournaments = Math.Round(mediumScore, 2),
            TournamentsPlayed = tournamentsPlayed,
            TournamentsRequired = season.RequireGamesCount,
            RatingPlace = ratingPlace,
            SuperGamePlace = superGamePlace
        };
    }

    private async Task<Dictionary<int, double>> GetAllPlayerScoresForSeason(int seasonId, int maxGames, int? clubId = null)
    {
        var query = db.Tournaments
            .Include(t => t.Matches)
                .ThenInclude(m => m.TeamMatches)
                    .ThenInclude(tm => tm.Team)
                        .ThenInclude(t => t.PlayerTeams)
            .Where(t => t.SeasonId == seasonId && !t.IsCancelled && t.IsFinished);

        if (clubId.HasValue)
            query = query.Where(t => t.ClubId == clubId.Value);

        var tournaments = await query.ToListAsync();

        var playerTournamentAvgs = new Dictionary<int, List<double>>();

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
                if (!playerTournamentAvgs.ContainsKey(playerId))
                    playerTournamentAvgs[playerId] = new List<double>();
                playerTournamentAvgs[playerId].Add(tournamentScore);
            }
        }

        return playerTournamentAvgs.ToDictionary(
            kvp => kvp.Key,
            kvp => kvp.Value.OrderByDescending(a => a).Take(maxGames).Sum()
        );
    }

    private static double CalculateSeasonScore(int playerId, List<Tournament> seasonTournaments, int maxGames)
    {
        var averages = new List<double>();

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
                averages.Add(tournamentTotalScore / matchCount);
        }

        return averages.OrderByDescending(a => a).Take(maxGames).Sum();
    }
}
