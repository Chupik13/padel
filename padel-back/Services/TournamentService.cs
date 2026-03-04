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
            var match = new Match { TournamentId = tournament.Id, MatchOrder = i };
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
        var tournament = await db.Tournaments.FirstOrDefaultAsync(t => t.Id == tournamentId);
        if (tournament is null || (!isAdmin && tournament.HostPlayerId != hostPlayerId) || tournament.IsFinished)
            return false;

        tournament.CurrentMatchIndex = matchIndex;
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
        var tournament = await db.Tournaments.FirstOrDefaultAsync(t => t.Id == tournamentId);
        if (tournament is null || (!isAdmin && tournament.HostPlayerId != hostPlayerId))
            return false;

        tournament.IsFinished = true;
        await db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> EarlyFinishTournament(int tournamentId, int hostPlayerId, bool isAdmin = false)
    {
        var tournament = await FullTournamentQuery().FirstOrDefaultAsync(t => t.Id == tournamentId);
        if (tournament is null || (!isAdmin && tournament.HostPlayerId != hostPlayerId) || tournament.IsFinished)
            return false;

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
        await db.SaveChangesAsync();
        return true;
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
        await db.SaveChangesAsync();
        return true;
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
