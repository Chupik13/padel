using Microsoft.EntityFrameworkCore;
using padel.Models;

namespace padel.Services;

public class VideoMergeBackgroundService(IServiceProvider serviceProvider, ILogger<VideoMergeBackgroundService> logger) : BackgroundService
{
    private static readonly TimeSpan CheckInterval = TimeSpan.FromSeconds(10);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ProcessPendingMerges(stoppingToken);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error during video merge processing");
            }

            await Task.Delay(CheckInterval, stoppingToken);
        }
    }

    private async Task ProcessPendingMerges(CancellationToken ct)
    {
        using var scope = serviceProvider.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<PadelDbContext>();
        var videoService = scope.ServiceProvider.GetRequiredService<VideoService>();

        // Find matches that have both sides uploaded and at least one is Pending
        var matchIdsWithPending = await db.MatchVideos
            .Where(v => v.MergeStatus == MergeStatus.Pending)
            .Select(v => v.MatchId)
            .Distinct()
            .ToListAsync(ct);

        foreach (var matchId in matchIdsWithPending)
        {
            var videoCount = await db.MatchVideos
                .CountAsync(v => v.MatchId == matchId, ct);

            if (videoCount >= 2)
            {
                logger.LogInformation("Starting merge for match {MatchId}", matchId);
                await videoService.MergeSideBySide(matchId);
            }
        }
    }
}
