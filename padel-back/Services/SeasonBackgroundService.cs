using Microsoft.EntityFrameworkCore;
using padel.Models;

namespace padel.Services;

public class SeasonBackgroundService(IServiceProvider serviceProvider, ILogger<SeasonBackgroundService> logger) : BackgroundService
{
    private static readonly TimeSpan CheckInterval = TimeSpan.FromHours(1);
    private static readonly TimeSpan SeasonDuration = TimeSpan.FromDays(8 * 7); // 8 weeks
    private static readonly TimeSpan OffSeasonDuration = TimeSpan.FromDays(2 * 7); // 2 weeks
    private const int RequireGamesCount = 6;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await EnsureSeasons(stoppingToken);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error ensuring seasons exist");
            }

            await Task.Delay(CheckInterval, stoppingToken);
        }
    }

    private async Task EnsureSeasons(CancellationToken ct)
    {
        using var scope = serviceProvider.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<PadelDbContext>();

        var now = DateTime.UtcNow;
        var currentSeason = await db.Seasons.FirstOrDefaultAsync(s => s.SeasonStart <= now && s.SeasonEnd > now, ct);

        if (currentSeason is null)
        {
            currentSeason = new Season
            {
                SeasonStart = now,
                SeasonEnd = now + SeasonDuration,
                RequireGamesCount = RequireGamesCount
            };
            db.Seasons.Add(currentSeason);
            await db.SaveChangesAsync(ct);
            logger.LogInformation("Created current season: {Start} - {End}", currentSeason.SeasonStart, currentSeason.SeasonEnd);
        }

        var nextSeasonStart = currentSeason.SeasonEnd + OffSeasonDuration;
        var nextSeasonEnd = nextSeasonStart + SeasonDuration;

        var hasNext = await db.Seasons.AnyAsync(s => s.SeasonStart >= currentSeason.SeasonEnd, ct);
        if (!hasNext)
        {
            var nextSeason = new Season
            {
                SeasonStart = nextSeasonStart,
                SeasonEnd = nextSeasonEnd,
                RequireGamesCount = RequireGamesCount
            };
            db.Seasons.Add(nextSeason);
            await db.SaveChangesAsync(ct);
            logger.LogInformation("Created next season: {Start} - {End}", nextSeason.SeasonStart, nextSeason.SeasonEnd);
        }
    }
}
