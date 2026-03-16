using Microsoft.EntityFrameworkCore;
using padel.Dtos.Requests;
using padel.Dtos.Results;
using padel.Models;

namespace padel.Services;

public class TournamentService(PadelDbContext db)
{
    private IQueryable<Tournament> FullTournamentQuery() =>
        db.Tournaments
            .Include(t => t.Matches)
                .ThenInclude(m => m.TeamMatches)
                    .ThenInclude(tm => tm.Team)
                        .ThenInclude(t => t.PlayerTeams)
                            .ThenInclude(pt => pt.Player);

    public async Task<List<TournamentResult>> GetTournaments(GetTournamentsRequest request)
    {
        var query = db.Tournaments
            .Include(t => t.Club)
            .Include(t => t.Matches)
                .ThenInclude(m => m.TeamMatches)
                    .ThenInclude(tm => tm.Team)
                        .ThenInclude(t => t.PlayerTeams)
                            .ThenInclude(pt => pt.Player)
            .AsQueryable();

        if (request.SeasonId.HasValue)
            query = query.Where(t => t.SeasonId == request.SeasonId.Value);

        if (request.IsBalanced.HasValue)
            query = query.Where(t => t.IsBalanced == request.IsBalanced.Value);

        if (request.InSeason == true)
            query = query.Where(t => t.SeasonId != null);
        else if (request.InSeason == false)
            query = query.Where(t => t.SeasonId == null);

        if (request.ClubId.HasValue)
            query = query.Where(t => t.ClubId == request.ClubId.Value);
        else if (request.ClubIds is { Count: > 0 })
            query = query.Where(t => t.ClubId.HasValue && request.ClubIds.Contains(t.ClubId.Value));

        if (request.IncludeCancelled != true)
            query = query.Where(t => !t.IsCancelled);

        if (request.PlayerId.HasValue)
        {
            var playerId = request.PlayerId.Value;
            query = query.Where(t => t.Matches.Any(m =>
                m.TeamMatches.Any(tm =>
                    tm.Team.PlayerTeams.Any(pt => pt.PlayerId == playerId))));
        }

        // Exclude broken tournaments with no valid matches (need teams with players)
        query = query.Where(t => t.Matches.Any(m =>
            m.TeamMatches.Count >= 2 &&
            m.TeamMatches.All(tm => tm.Team.PlayerTeams.Count >= 2)));

        var tournaments = await query.OrderByDescending(t => t.Date).ToListAsync();

        return tournaments.Select(TournamentMapper.ToResult).ToList();
    }

    public async Task<TournamentResult> SaveTournament(SaveTournamentRequest request, int? clubId = null)
    {
        var now = DateTime.UtcNow;
        int? seasonId = null;

        if (request.InSeason)
        {
            var currentSeason = await db.Seasons.FirstOrDefaultAsync(s => s.SeasonStart <= now && s.SeasonEnd > now);
            seasonId = currentSeason?.Id;
        }

        var tournament = new Tournament
        {
            Date = now,
            IsBalanced = request.IsBalanced,
            SeasonId = seasonId,
            ClubId = clubId
        };
        db.Tournaments.Add(tournament);
        await db.SaveChangesAsync();

        foreach (var matchReq in request.Matches)
        {
            var match = new Match { TournamentId = tournament.Id };
            db.Matches.Add(match);
            await db.SaveChangesAsync();

            var teamOne = await FindOrCreateTeam(matchReq.TeamOne.FirstPlayerId, matchReq.TeamOne.SecondPlayerId);
            var teamTwo = await FindOrCreateTeam(matchReq.TeamTwo.FirstPlayerId, matchReq.TeamTwo.SecondPlayerId);

            db.TeamMatches.Add(new TeamMatch { TeamId = teamOne.Id, MatchId = match.Id, Score = matchReq.TeamOne.Score });
            db.TeamMatches.Add(new TeamMatch { TeamId = teamTwo.Id, MatchId = match.Id, Score = matchReq.TeamTwo.Score });
            await db.SaveChangesAsync();
        }

        // Reload with all includes
        var saved = await db.Tournaments
            .Include(t => t.Matches)
                .ThenInclude(m => m.TeamMatches)
                    .ThenInclude(tm => tm.Team)
                        .ThenInclude(t => t.PlayerTeams)
                            .ThenInclude(pt => pt.Player)
            .FirstAsync(t => t.Id == tournament.Id);

        return TournamentMapper.ToResult(saved);
    }

    public async Task<TournamentResult> CreateLiveTournament(int hostPlayerId, CreateLiveTournamentRequest request, int? clubId = null)
    {
        var now = DateTime.UtcNow;
        int? seasonId = null;

        if (request.InSeason)
        {
            var currentSeason = await db.Seasons.FirstOrDefaultAsync(s => s.SeasonStart <= now && s.SeasonEnd > now);
            seasonId = currentSeason?.Id;
        }

        var tournament = new Tournament
        {
            Date = now,
            IsBalanced = request.IsBalanced,
            SeasonId = seasonId,
            HostPlayerId = hostPlayerId,
            CurrentMatchIndex = 0,
            IsFinished = false,
            ClubId = clubId
        };
        db.Tournaments.Add(tournament);
        await db.SaveChangesAsync();

        for (var i = 0; i < request.Matches.Count; i++)
        {
            var matchReq = request.Matches[i];
            var match = new Match { TournamentId = tournament.Id, MatchOrder = i, StartedAt = i == 0 ? now : null };
            db.Matches.Add(match);
            await db.SaveChangesAsync();

            var teamOne = await FindOrCreateTeam(matchReq.TeamOne.FirstPlayerId, matchReq.TeamOne.SecondPlayerId);
            var teamTwo = await FindOrCreateTeam(matchReq.TeamTwo.FirstPlayerId, matchReq.TeamTwo.SecondPlayerId);

            db.TeamMatches.Add(new TeamMatch { TeamId = teamOne.Id, MatchId = match.Id, Score = 0 });
            db.TeamMatches.Add(new TeamMatch { TeamId = teamTwo.Id, MatchId = match.Id, Score = 0 });
            await db.SaveChangesAsync();
        }

        var saved = await FullTournamentQuery().FirstAsync(t => t.Id == tournament.Id);
        return TournamentMapper.ToResult(saved);
    }

    public async Task<TournamentResult?> GetActiveTournament(int playerId)
    {
        var tournament = await FullTournamentQuery()
            .Where(t => !t.IsFinished && !t.IsCancelled && t.HostPlayerId != null)
            .Where(t => t.Matches.Any(m =>
                m.TeamMatches.Count >= 2 &&
                m.TeamMatches.All(tm => tm.Team.PlayerTeams.Count >= 2)))
            .Where(t => t.HostPlayerId == playerId || t.Matches.Any(m =>
                m.TeamMatches.Any(tm =>
                    tm.Team.PlayerTeams.Any(pt => pt.PlayerId == playerId))))
            .OrderByDescending(t => t.Date)
            .FirstOrDefaultAsync();

        return tournament is null ? null : TournamentMapper.ToResult(tournament);
    }

    public async Task<TournamentResult?> UpdateMatchScore(int tournamentId, int hostPlayerId, UpdateScoreRequest request, bool isAdmin = false)
    {
        var tournament = await FullTournamentQuery().FirstOrDefaultAsync(t => t.Id == tournamentId);
        if (tournament is null || (!isAdmin && tournament.HostPlayerId != hostPlayerId) || tournament.IsFinished)
            return null;

        var matches = tournament.Matches.OrderBy(m => m.MatchOrder).ToList();
        if (request.MatchIndex < 0 || request.MatchIndex >= matches.Count)
            return null;

        var match = matches[request.MatchIndex];
        match.TeamMatches[0].Score = request.TeamOneScore;
        match.TeamMatches[1].Score = request.TeamTwoScore;
        await db.SaveChangesAsync();

        return TournamentMapper.ToResult(tournament);
    }

    public async Task<bool> NavigateMatch(int tournamentId, int hostPlayerId, int matchIndex, bool isAdmin = false)
    {
        var tournament = await FullTournamentQuery().FirstOrDefaultAsync(t => t.Id == tournamentId);
        if (tournament is null || (!isAdmin && tournament.HostPlayerId != hostPlayerId) || tournament.IsFinished)
            return false;

        tournament.CurrentMatchIndex = matchIndex;

        // Set StartedAt for the new match if not already set
        var match = tournament.Matches.OrderBy(m => m.MatchOrder).ElementAtOrDefault(matchIndex);
        if (match is not null && match.StartedAt is null)
            match.StartedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();
        return true;
    }

    public async Task<List<TournamentResult>> GetUnfinishedTournaments(int playerId, bool isAdmin = false, int? clubId = null)
    {
        var query = FullTournamentQuery()
            .Where(t => !t.IsFinished && !t.IsCancelled && t.Matches.Any(m =>
                m.TeamMatches.Count >= 2 &&
                m.TeamMatches.All(tm => tm.Team.PlayerTeams.Count >= 2)));

        if (clubId.HasValue)
            query = query.Where(t => t.ClubId == clubId.Value);

        if (!isAdmin)
        {
            query = query.Where(t => t.HostPlayerId == playerId || t.Matches.Any(m =>
                m.TeamMatches.Any(tm =>
                    tm.Team.PlayerTeams.Any(pt => pt.PlayerId == playerId))));
        }

        var tournaments = await query.OrderByDescending(t => t.Date).ToListAsync();
        return tournaments.Select(TournamentMapper.ToResult).ToList();
    }

    public async Task<bool> FinishTournament(int tournamentId, int hostPlayerId, bool isAdmin = false)
    {
        var tournament = await FullTournamentQuery().FirstOrDefaultAsync(t => t.Id == tournamentId);
        if (tournament is null || (!isAdmin && tournament.HostPlayerId != hostPlayerId))
            return false;

        tournament.IsFinished = true;
        tournament.FinishedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        await TryAwardSuperGameMedals(tournament);
        await TryAwardOnFire(tournament);
        return true;
    }

    public async Task<(bool Success, string? Error)> EarlyFinishTournament(int tournamentId, int hostPlayerId, bool isAdmin = false)
    {
        var tournament = await FullTournamentQuery().FirstOrDefaultAsync(t => t.Id == tournamentId);
        if (tournament is null || (!isAdmin && tournament.HostPlayerId != hostPlayerId) || tournament.IsFinished)
            return (false, null);

        // Check minimum 60% games played
        var totalMatches = tournament.Matches.Count;
        var playedMatches = tournament.Matches.Count(m =>
            m.TeamMatches.Count >= 2 && (m.TeamMatches[0].Score != 0 || m.TeamMatches[1].Score != 0));
        if (totalMatches > 0 && (double)playedMatches / totalMatches < 0.6)
            return (false, "earlyFinishMinGames");

        // Set all 0:0 matches to 8:8
        foreach (var match in tournament.Matches)
        {
            if (match.TeamMatches.Count >= 2 &&
                match.TeamMatches[0].Score == 0 && match.TeamMatches[1].Score == 0)
            {
                match.TeamMatches[0].Score = 8;
                match.TeamMatches[1].Score = 8;
            }
        }

        tournament.IsEarlyFinished = true;
        tournament.IsFinished = true;
        tournament.FinishedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        await TryAwardSuperGameMedals(tournament);
        await TryAwardOnFire(tournament);
        return (true, null);
    }

    public async Task<bool> CancelTournament(int tournamentId, int hostPlayerId, bool isAdmin = false)
    {
        var tournament = await db.Tournaments.FirstOrDefaultAsync(t => t.Id == tournamentId);

        if (tournament is null || (!isAdmin && tournament.HostPlayerId != hostPlayerId) || tournament.IsFinished)
            return false;

        var season = await db.Seasons.FirstOrDefaultAsync(s => s.SuperGameTournamentId == tournamentId);
        if (season is not null)
            season.SuperGameTournamentId = null;

        tournament.IsCancelled = true;
        tournament.IsFinished = true;
        tournament.FinishedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteTournamentPermanent(int tournamentId)
    {
        var tournament = await db.Tournaments
            .Include(t => t.Matches)
                .ThenInclude(m => m.TeamMatches)
            .FirstOrDefaultAsync(t => t.Id == tournamentId);

        if (tournament is null) return false;

        // Clear SuperGameTournamentId if referenced
        var season = await db.Seasons.FirstOrDefaultAsync(s => s.SuperGameTournamentId == tournamentId);
        if (season is not null)
            season.SuperGameTournamentId = null;

        // Delete TeamMatches → Matches → Tournament
        foreach (var match in tournament.Matches)
        {
            db.TeamMatches.RemoveRange(match.TeamMatches);
        }
        db.Matches.RemoveRange(tournament.Matches);
        db.Tournaments.Remove(tournament);

        await db.SaveChangesAsync();
        return true;
    }

    public async Task<List<TournamentResult>> GetClubActiveTournaments(int? clubId)
    {
        var query = FullTournamentQuery()
            .Where(t => !t.IsFinished && !t.IsCancelled && t.HostPlayerId != null)
            .Where(t => t.Matches.Any(m =>
                m.TeamMatches.Count >= 2 &&
                m.TeamMatches.All(tm => tm.Team.PlayerTeams.Count >= 2)));

        if (clubId.HasValue)
            query = query.Where(t => t.ClubId == clubId.Value);

        var tournaments = await query.OrderByDescending(t => t.Date).ToListAsync();
        return tournaments.Select(TournamentMapper.ToResult).ToList();
    }

    private static readonly string[] MedalKeys = ["gold_medal", "silver_medal", "bronze_medal"];
    private static readonly string[] SuperGameBadgeKeys = ["gold_medal", "silver_medal", "bronze_medal", "most_active", "almost_win", "almost_loss"];

    private async Task TryAwardSuperGameMedals(Tournament tournament)
    {
        // Check if this tournament is a super game for some season
        var season = await db.Seasons
            .Include(s => s.Tournaments)
                .ThenInclude(t => t.Matches)
                    .ThenInclude(m => m.TeamMatches)
                        .ThenInclude(tm => tm.Team)
                            .ThenInclude(t => t.PlayerTeams)
                                .ThenInclude(pt => pt.Player)
            .FirstOrDefaultAsync(s => s.SuperGameTournamentId == tournament.Id);
        if (season is null) return;

        // Calculate podium (top 3 by average score)
        var playerScores = new Dictionary<int, (int PlayerId, double Total, int Count)>();
        foreach (var match in tournament.Matches)
        {
            foreach (var tm in match.TeamMatches)
            {
                foreach (var pt in tm.Team.PlayerTeams)
                {
                    if (!playerScores.ContainsKey(pt.PlayerId))
                        playerScores[pt.PlayerId] = (pt.PlayerId, 0, 0);
                    var cur = playerScores[pt.PlayerId];
                    playerScores[pt.PlayerId] = (pt.PlayerId, cur.Total + tm.Score, cur.Count + 1);
                }
            }
        }

        var podium = playerScores.Values
            .Where(x => x.Count > 0)
            .OrderByDescending(x => x.Total / x.Count)
            .Take(3)
            .ToList();

        if (podium.Count == 0) return;

        // Get all badge types needed for super game awards
        var badgeTypes = await db.BadgeTypes
            .Where(bt => SuperGameBadgeKeys.Contains(bt.Key))
            .ToListAsync();

        var badgeByKey = badgeTypes.ToDictionary(bt => bt.Key);

        // Season number for note
        var allSeasons = await db.Seasons.OrderBy(s => s.SeasonStart).ToListAsync();
        var seasonNumber = allSeasons.FindIndex(s => s.Id == season.Id) + 1;
        var seasonNote = $"Сезон {seasonNumber}";

        // Award medals (gold/silver/bronze)
        for (var i = 0; i < podium.Count && i < MedalKeys.Length; i++)
        {
            if (!badgeByKey.TryGetValue(MedalKeys[i], out var badgeType)) continue;

            var alreadyAwarded = await db.PlayerBadges.AnyAsync(pb =>
                pb.PlayerId == podium[i].PlayerId &&
                pb.BadgeTypeId == badgeType.Id &&
                pb.Note == seasonNote);
            if (alreadyAwarded) continue;

            db.PlayerBadges.Add(new PlayerBadge
            {
                PlayerId = podium[i].PlayerId,
                BadgeTypeId = badgeType.Id,
                AwardedAt = DateTime.UtcNow,
                Note = seasonNote
            });
        }

        // Award most_active: player with most tournaments in the season
        if (badgeByKey.TryGetValue("most_active", out var mostActiveBadge))
        {
            var finishedTournaments = season.Tournaments.Where(t => t.IsFinished && !t.IsCancelled).ToList();
            var tournamentCounts = new Dictionary<int, int>();
            foreach (var t in finishedTournaments)
            {
                var playerIds = t.Matches
                    .SelectMany(m => m.TeamMatches)
                    .SelectMany(tm => tm.Team.PlayerTeams)
                    .Select(pt => pt.PlayerId)
                    .Distinct();
                foreach (var pid in playerIds)
                {
                    tournamentCounts.TryGetValue(pid, out var count);
                    tournamentCounts[pid] = count + 1;
                }
            }

            if (tournamentCounts.Count > 0)
            {
                var maxCount = tournamentCounts.Values.Max();
                var mostActivePlayerId = tournamentCounts.First(kv => kv.Value == maxCount).Key;

                var alreadyAwarded = await db.PlayerBadges.AnyAsync(pb =>
                    pb.PlayerId == mostActivePlayerId &&
                    pb.BadgeTypeId == mostActiveBadge.Id &&
                    pb.Note == seasonNote);
                if (!alreadyAwarded)
                {
                    db.PlayerBadges.Add(new PlayerBadge
                    {
                        PlayerId = mostActivePlayerId,
                        BadgeTypeId = mostActiveBadge.Id,
                        AwardedAt = DateTime.UtcNow,
                        Note = seasonNote
                    });
                }
            }
        }

        // Award almost_win / almost_loss
        var leaderBoard = SeasonService.BuildLeaderBoard(season);
        var ratingFirstId = leaderBoard.Players.FirstOrDefault()?.Player.Id;
        var superGameFirstId = podium.FirstOrDefault().PlayerId;

        if (ratingFirstId.HasValue && superGameFirstId != 0 && ratingFirstId.Value != superGameFirstId)
        {
            // almost_win: 1st in rating but NOT 1st in super game
            if (badgeByKey.TryGetValue("almost_win", out var almostWinBadge))
            {
                var alreadyAwarded = await db.PlayerBadges.AnyAsync(pb =>
                    pb.PlayerId == ratingFirstId.Value &&
                    pb.BadgeTypeId == almostWinBadge.Id &&
                    pb.Note == seasonNote);
                if (!alreadyAwarded)
                {
                    db.PlayerBadges.Add(new PlayerBadge
                    {
                        PlayerId = ratingFirstId.Value,
                        BadgeTypeId = almostWinBadge.Id,
                        AwardedAt = DateTime.UtcNow,
                        Note = seasonNote
                    });
                }
            }

            // almost_loss: 1st in super game but NOT 1st in rating
            if (badgeByKey.TryGetValue("almost_loss", out var almostLossBadge))
            {
                var alreadyAwarded = await db.PlayerBadges.AnyAsync(pb =>
                    pb.PlayerId == superGameFirstId &&
                    pb.BadgeTypeId == almostLossBadge.Id &&
                    pb.Note == seasonNote);
                if (!alreadyAwarded)
                {
                    db.PlayerBadges.Add(new PlayerBadge
                    {
                        PlayerId = superGameFirstId,
                        BadgeTypeId = almostLossBadge.Id,
                        AwardedAt = DateTime.UtcNow,
                        Note = seasonNote
                    });
                }
            }
        }

        await db.SaveChangesAsync();
    }

    private async Task TryAwardOnFire(Tournament tournament)
    {
        // Only for seasonal tournaments (not super games)
        if (tournament.SeasonId is null) return;
        var season = await db.Seasons.FirstOrDefaultAsync(s => s.Id == tournament.SeasonId);
        if (season is null || season.SuperGameTournamentId == tournament.Id) return;

        // Find the winner of this tournament (top by avg score)
        var playerScores = new Dictionary<int, (int PlayerId, double Total, int Count)>();
        foreach (var match in tournament.Matches)
        {
            foreach (var tm in match.TeamMatches)
            {
                foreach (var pt in tm.Team.PlayerTeams)
                {
                    if (!playerScores.ContainsKey(pt.PlayerId))
                        playerScores[pt.PlayerId] = (pt.PlayerId, 0, 0);
                    var cur = playerScores[pt.PlayerId];
                    playerScores[pt.PlayerId] = (pt.PlayerId, cur.Total + tm.Score, cur.Count + 1);
                }
            }
        }

        var winner = playerScores.Values
            .Where(x => x.Count > 0)
            .OrderByDescending(x => x.Total / x.Count)
            .FirstOrDefault();
        if (winner.PlayerId == 0) return;

        // Get last 3 finished seasonal tournaments for this season (including current one)
        var recentTournaments = await db.Tournaments
            .Include(t => t.Matches)
                .ThenInclude(m => m.TeamMatches)
                    .ThenInclude(tm => tm.Team)
                        .ThenInclude(t => t.PlayerTeams)
            .Where(t => t.SeasonId == tournament.SeasonId && t.IsFinished && !t.IsCancelled)
            .Where(t => season.SuperGameTournamentId == null || t.Id != season.SuperGameTournamentId)
            .OrderByDescending(t => t.Date)
            .Take(3)
            .ToListAsync();

        if (recentTournaments.Count < 3) return;

        // Check if the winner won all 3 tournaments
        var wonAll = recentTournaments.All(t =>
        {
            var scores = new Dictionary<int, (double Total, int Count)>();
            foreach (var m in t.Matches)
            {
                foreach (var tm in m.TeamMatches)
                {
                    foreach (var pt in tm.Team.PlayerTeams)
                    {
                        if (!scores.ContainsKey(pt.PlayerId))
                            scores[pt.PlayerId] = (0, 0);
                        var c = scores[pt.PlayerId];
                        scores[pt.PlayerId] = (c.Total + tm.Score, c.Count + 1);
                    }
                }
            }
            var topPlayer = scores
                .Where(x => x.Value.Count > 0)
                .OrderByDescending(x => x.Value.Total / x.Value.Count)
                .FirstOrDefault();
            return topPlayer.Key == winner.PlayerId;
        });

        if (!wonAll) return;

        var onFireBadge = await db.BadgeTypes.FirstOrDefaultAsync(bt => bt.Key == "on_fire");
        if (onFireBadge is null) return;

        // Season note for deduplication
        var allSeasons = await db.Seasons.OrderBy(s => s.SeasonStart).ToListAsync();
        var seasonNumber = allSeasons.FindIndex(s => s.Id == season.Id) + 1;
        var seasonNote = $"Сезон {seasonNumber}";

        var alreadyAwarded = await db.PlayerBadges.AnyAsync(pb =>
            pb.PlayerId == winner.PlayerId &&
            pb.BadgeTypeId == onFireBadge.Id &&
            pb.Note == seasonNote);
        if (alreadyAwarded) return;

        db.PlayerBadges.Add(new PlayerBadge
        {
            PlayerId = winner.PlayerId,
            BadgeTypeId = onFireBadge.Id,
            AwardedAt = DateTime.UtcNow,
            Note = seasonNote
        });
        await db.SaveChangesAsync();
    }

    private async Task<Team> FindOrCreateTeam(int player1Id, int player2Id)
    {
        // Find existing team with these two players
        var team = await db.Teams
            .Include(t => t.PlayerTeams)
            .Where(t => t.PlayerTeams.Count == 2
                && t.PlayerTeams.Any(pt => pt.PlayerId == player1Id)
                && t.PlayerTeams.Any(pt => pt.PlayerId == player2Id))
            .FirstOrDefaultAsync();

        if (team is not null)
            return team;

        team = new Team();
        db.Teams.Add(team);
        await db.SaveChangesAsync();

        db.PlayerTeams.Add(new PlayerTeam { PlayerId = player1Id, TeamId = team.Id });
        db.PlayerTeams.Add(new PlayerTeam { PlayerId = player2Id, TeamId = team.Id });
        await db.SaveChangesAsync();

        // Reload
        return await db.Teams.Include(t => t.PlayerTeams).FirstAsync(t => t.Id == team.Id);
    }
}
