using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using padel.Hubs;
using padel.Models;

namespace padel.Services;

public class TournamentAutoCleanupService(IServiceProvider serviceProvider, ILogger<TournamentAutoCleanupService> logger) : BackgroundService
{
    private static readonly TimeSpan CheckInterval = TimeSpan.FromMinutes(5);
    private static readonly TimeSpan MatchTimeout = TimeSpan.FromMinutes(40);
    private const double MinPlayedRatio = 0.6;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await CleanupStaleTournaments(stoppingToken);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error during tournament auto-cleanup");
            }

            await Task.Delay(CheckInterval, stoppingToken);
        }
    }

    private async Task CleanupStaleTournaments(CancellationToken ct)
    {
        using var scope = serviceProvider.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<PadelDbContext>();
        var hub = scope.ServiceProvider.GetRequiredService<IHubContext<TournamentHub>>();

        var now = DateTime.UtcNow;

        var activeTournaments = await db.Tournaments
            .Include(t => t.Matches)
                .ThenInclude(m => m.TeamMatches)
            .Where(t => !t.IsFinished && !t.IsCancelled && t.HostPlayerId != null)
            .ToListAsync(ct);

        foreach (var tournament in activeTournaments)
        {
            var matches = tournament.Matches.OrderBy(m => m.MatchOrder).ToList();
            if (matches.Count == 0) continue;

            var currentMatch = matches.ElementAtOrDefault(tournament.CurrentMatchIndex);
            if (currentMatch?.StartedAt is null) continue;

            var elapsed = now - currentMatch.StartedAt.Value;
            if (elapsed < MatchTimeout) continue;

            // Check if current match is still 0:0
            if (currentMatch.TeamMatches.Count < 2) continue;
            if (currentMatch.TeamMatches[0].Score != 0 || currentMatch.TeamMatches[1].Score != 0) continue;

            var totalMatches = matches.Count;
            var playedMatches = matches.Count(m =>
                m.TeamMatches.Count >= 2 && (m.TeamMatches[0].Score != 0 || m.TeamMatches[1].Score != 0));
            var ratio = totalMatches > 0 ? (double)playedMatches / totalMatches : 0;

            if (ratio < MinPlayedRatio)
            {
                // Cancel
                var season = await db.Seasons.FirstOrDefaultAsync(s => s.SuperGameTournamentId == tournament.Id, ct);
                if (season is not null)
                    season.SuperGameTournamentId = null;

                tournament.IsCancelled = true;
                tournament.IsFinished = true;
                tournament.FinishedAt = now;
                await db.SaveChangesAsync(ct);

                await hub.Clients.Group($"tournament-{tournament.Id}").SendAsync("TournamentCancelled", tournament.Id, ct);
                logger.LogInformation("Auto-cancelled tournament {Id} (played {Played}/{Total})", tournament.Id, playedMatches, totalMatches);
            }
            else
            {
                // Early finish: set all 0:0 matches to 8:8
                foreach (var match in matches)
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
                tournament.FinishedAt = now;
                await db.SaveChangesAsync(ct);

                await hub.Clients.Group($"tournament-{tournament.Id}").SendAsync("TournamentFinished", tournament.Id, ct);
                logger.LogInformation("Auto-finished tournament {Id} early (played {Played}/{Total})", tournament.Id, playedMatches, totalMatches);
            }
        }
    }
}
