using System.Security.Claims;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using padel.Dtos.Requests;
using padel.Dtos.Results;
using padel.Hubs;
using padel.Models;
using padel.Services;

namespace padel.Endpoints;

public static class VideoEndpoints
{
    public static void MapVideoEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/videos").RequireAuthorization();

        group.MapPost("/{matchId}/upload", async (int matchId, int cameraSide, IFormFile file,
            VideoService videoService, HttpContext httpContext, PadelDbContext db) =>
        {
            var playerIdStr = httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (playerIdStr is null || !int.TryParse(playerIdStr, out var playerId))
                return Results.Unauthorized();

            var match = await db.Matches.FirstOrDefaultAsync(m => m.Id == matchId);
            if (match is null)
                return Results.NotFound();

            // Verify player is an operator for this tournament
            var isOperator = await db.TournamentOperators
                .AnyAsync(o => o.TournamentId == match.TournamentId && o.PlayerId == playerId && o.CameraSide == cameraSide && o.IsActive);
            if (!isOperator)
                return Results.Forbid();

            await using var stream = file.OpenReadStream();
            var result = await videoService.SaveVideoSegment(stream, matchId, cameraSide, playerId, file.ContentType);

            return Results.Ok(new { result.Id, result.MatchId, result.CameraSide, result.FileSize });
        }).DisableAntiforgery();

        group.MapGet("/{matchId}", async (int matchId, VideoService videoService) =>
        {
            var result = await videoService.GetVideoInfo(matchId);
            return Results.Ok(result);
        });

        group.MapGet("/tournament/{tournamentId}", async (int tournamentId, VideoService videoService) =>
        {
            var results = await videoService.GetTournamentVideos(tournamentId);
            return Results.Ok(results);
        });

        group.MapPost("/tournament/{tournamentId}/register-operator", async (int tournamentId,
            RegisterOperatorRequest request, PadelDbContext db, IHubContext<TournamentHub> hub, HttpContext httpContext, AuditLogService auditLogService) =>
        {
            var playerIdStr = httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (playerIdStr is null || !int.TryParse(playerIdStr, out var playerId))
                return Results.Unauthorized();

            if (request.CameraSide is not (1 or 2))
                return Results.BadRequest(new { error = "CameraSide must be 1 or 2" });

            // Check tournament exists and is active
            var tournament = await db.Tournaments.FirstOrDefaultAsync(t => t.Id == tournamentId && !t.IsFinished && !t.IsCancelled);
            if (tournament is null)
                return Results.NotFound();

            // Remove previous assignment for this side or this player
            var stale = await db.TournamentOperators
                .Where(o => o.TournamentId == tournamentId && (o.PlayerId == playerId || o.CameraSide == request.CameraSide))
                .ToListAsync();
            if (stale.Count > 0)
                db.TournamentOperators.RemoveRange(stale);

            var op = new TournamentOperator
            {
                TournamentId = tournamentId,
                PlayerId = playerId,
                CameraSide = request.CameraSide,
                IsActive = true
            };
            db.TournamentOperators.Add(op);
            await db.SaveChangesAsync();

            await hub.Clients.Group($"tournament-{tournamentId}")
                .SendAsync("OperatorJoined", playerId, request.CameraSide);

            await auditLogService.Log(playerId, "register_operator", $"tournamentId={tournamentId}, side={request.CameraSide}");

            return Results.Ok(new OperatorResult
            {
                PlayerId = playerId,
                CameraSide = request.CameraSide,
                IsActive = true
            });
        });

        group.MapGet("/tournament/{tournamentId}/operators", async (int tournamentId, PadelDbContext db) =>
        {
            var operators = await db.TournamentOperators
                .Include(o => o.Player)
                .Where(o => o.TournamentId == tournamentId && o.IsActive)
                .Select(o => new OperatorResult
                {
                    PlayerId = o.PlayerId,
                    PlayerName = o.Player.Name,
                    CameraSide = o.CameraSide,
                    IsActive = o.IsActive
                })
                .ToListAsync();

            return Results.Ok(operators);
        });

        group.MapPost("/tournament/{tournamentId}/notify-recording", async (int tournamentId,
            PadelDbContext db, IHubContext<TournamentHub> hub, HttpContext httpContext) =>
        {
            var playerIdStr = httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (playerIdStr is null || !int.TryParse(playerIdStr, out var playerId))
                return Results.Unauthorized();

            var op = await db.TournamentOperators
                .FirstOrDefaultAsync(o => o.TournamentId == tournamentId && o.PlayerId == playerId && o.IsActive);
            if (op is null)
                return Results.Forbid();

            await hub.Clients.Group($"tournament-{tournamentId}")
                .SendAsync("OperatorRecordingStarted", playerId, op.CameraSide);

            return Results.Ok();
        });

        // Serve video file from data directory
        group.MapGet("/{matchId}/file/{fileName}", async (int matchId, string fileName, VideoService videoService) =>
        {
            var filePath = videoService.GetVideoFilePath(matchId, fileName);
            if (filePath is null || !File.Exists(filePath))
                return Results.NotFound();

            var contentType = Path.GetExtension(filePath).ToLower() switch
            {
                ".mp4" => "video/mp4",
                ".webm" => "video/webm",
                _ => "application/octet-stream"
            };
            return Results.File(filePath, contentType, enableRangeProcessing: true);
        });

        // Manual merge retry
        group.MapPost("/{matchId}/merge", async (int matchId, VideoService videoService, HttpContext httpContext, PadelDbContext db) =>
        {
            if (!await EndpointHelpers.IsAdmin(httpContext, db))
                return Results.Forbid();

            var videoCount = await db.MatchVideos.CountAsync(v => v.MatchId == matchId);
            if (videoCount < 2)
                return Results.BadRequest(new { error = "Need both sides uploaded", videoCount });

            await videoService.MergeSideBySide(matchId);

            var info = await videoService.GetVideoInfo(matchId);
            return Results.Ok(info);
        });
    }
}
