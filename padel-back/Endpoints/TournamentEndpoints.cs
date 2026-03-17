using System.Security.Claims;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using padel.Dtos.Requests;
using padel.Hubs;
using padel.Models;
using padel.Services;

namespace padel.Endpoints;

public static class TournamentEndpoints
{
    public static void MapTournamentEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/tournaments").RequireAuthorization();

        group.MapGet("/", async (int? seasonId, int? playerId, bool? isBalanced, bool? inSeason, bool? includeCancelled, int? clubId, TournamentService tournamentService, HttpContext httpContext, PadelDbContext db) =>
        {
            var request = new GetTournamentsRequest
            {
                SeasonId = seasonId,
                PlayerId = playerId,
                IsBalanced = isBalanced,
                InSeason = inSeason,
                IncludeCancelled = includeCancelled
            };

            if (clubId.HasValue)
            {
                request.ClubId = clubId;
            }
            else
            {
                request.ClubIds = await EndpointHelpers.GetPlayerClubIds(httpContext, db);
            }

            var result = await tournamentService.GetTournaments(request);
            return Results.Ok(result);
        });

        group.MapPost("/", async (SaveTournamentRequest request, TournamentService tournamentService, HttpContext httpContext, PadelDbContext db, AuditLogService auditLogService) =>
        {
            var clubId = await EndpointHelpers.GetPlayerClubId(httpContext, db);
            var playerId = EndpointHelpers.GetPlayerId(httpContext);
            var result = await tournamentService.SaveTournament(request, clubId);
            await auditLogService.Log(playerId, "create_tournament", $"tournamentId={result.Id}");
            return Results.Created($"/api/tournaments/{result.Id}", result);
        });

        group.MapPost("/live", async (CreateLiveTournamentRequest request, TournamentService tournamentService, HttpContext httpContext, PadelDbContext db, AuditLogService auditLogService) =>
        {
            var playerIdStr = httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (playerIdStr is null || !int.TryParse(playerIdStr, out var playerId))
                return Results.Unauthorized();

            int? clubId;
            if (request.ClubId.HasValue)
            {
                var isMember = await db.PlayerClubs.AnyAsync(pc => pc.PlayerId == playerId && pc.ClubId == request.ClubId.Value);
                if (!isMember) return Results.BadRequest();
                clubId = request.ClubId.Value;
            }
            else
            {
                clubId = await EndpointHelpers.GetPlayerClubId(httpContext, db);
            }
            if (!clubId.HasValue) return Results.BadRequest();
            var result = await tournamentService.CreateLiveTournament(playerId, request, clubId);
            await auditLogService.Log(playerId, "create_live_tournament", $"tournamentId={result.Id}" + (request.HasVideoMode ? ", videoMode=true" : ""));
            return Results.Created($"/api/tournaments/{result.Id}", result);
        });

        group.MapGet("/club-active", async (TournamentService tournamentService, HttpContext httpContext, PadelDbContext db) =>
        {
            var clubId = await EndpointHelpers.GetPlayerClubId(httpContext, db);
            var result = await tournamentService.GetClubActiveTournaments(clubId);
            return Results.Ok(result);
        });

        group.MapGet("/active", async (TournamentService tournamentService, HttpContext httpContext) =>
        {
            var playerIdStr = httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (playerIdStr is null || !int.TryParse(playerIdStr, out var playerId))
                return Results.Unauthorized();

            var result = await tournamentService.GetActiveTournament(playerId);
            return result is null ? Results.NoContent() : Results.Ok(result);
        });

        group.MapGet("/unfinished", async (TournamentService tournamentService, HttpContext httpContext, PadelDbContext db) =>
        {
            var playerIdStr = httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (playerIdStr is null || !int.TryParse(playerIdStr, out var playerId))
                return Results.Unauthorized();

            var clubId = await EndpointHelpers.GetPlayerClubId(httpContext, db);
            var result = await tournamentService.GetUnfinishedTournaments(playerId, await EndpointHelpers.IsAdmin(httpContext, db), clubId);
            return Results.Ok(result);
        });

        group.MapPut("/{id}/score", async (int id, UpdateScoreRequest request, TournamentService tournamentService,
            IHubContext<TournamentHub> hub, HttpContext httpContext, PadelDbContext db) =>
        {
            var playerIdStr = httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (playerIdStr is null || !int.TryParse(playerIdStr, out var playerId))
                return Results.Unauthorized();

            var result = await tournamentService.UpdateMatchScore(id, playerId, request, await EndpointHelpers.IsAdmin(httpContext, db));
            if (result is null)
                return Results.Forbid();

            await hub.Clients.Group($"tournament-{id}").SendAsync("ScoreUpdated",
                id, request.MatchIndex, request.TeamOneScore, request.TeamTwoScore);

            return Results.Ok(result);
        });

        group.MapPut("/{id}/navigate", async (int id, NavigateRequest request, TournamentService tournamentService,
            IHubContext<TournamentHub> hub, HttpContext httpContext, PadelDbContext db) =>
        {
            var playerIdStr = httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (playerIdStr is null || !int.TryParse(playerIdStr, out var playerId))
                return Results.Unauthorized();

            var success = await tournamentService.NavigateMatch(id, playerId, request.MatchIndex, await EndpointHelpers.IsAdmin(httpContext, db));
            if (!success)
                return Results.Forbid();

            await hub.Clients.Group($"tournament-{id}").SendAsync("MatchNavigated", id, request.MatchIndex);
            await hub.Clients.Group($"tournament-{id}").SendAsync("StartRecording", request.MatchIndex);

            return Results.Ok();
        });

        group.MapPut("/{id}/finish", async (int id, TournamentService tournamentService,
            IHubContext<TournamentHub> hub, HttpContext httpContext, PadelDbContext db, AuditLogService auditLogService) =>
        {
            var playerIdStr = httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (playerIdStr is null || !int.TryParse(playerIdStr, out var playerId))
                return Results.Unauthorized();

            var success = await tournamentService.FinishTournament(id, playerId, await EndpointHelpers.IsAdmin(httpContext, db));
            if (!success)
                return Results.Forbid();

            await hub.Clients.Group($"tournament-{id}").SendAsync("StopRecording", -1);
            await hub.Clients.Group($"tournament-{id}").SendAsync("TournamentFinished", id);
            await auditLogService.Log(playerId, "finish_tournament", $"tournamentId={id}");

            return Results.Ok();
        });

        group.MapPut("/{id}/early-finish", async (int id, TournamentService tournamentService,
            IHubContext<TournamentHub> hub, HttpContext httpContext, PadelDbContext db, AuditLogService auditLogService) =>
        {
            var playerIdStr = httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (playerIdStr is null || !int.TryParse(playerIdStr, out var playerId))
                return Results.Unauthorized();

            var (success, error) = await tournamentService.EarlyFinishTournament(id, playerId, await EndpointHelpers.IsAdmin(httpContext, db));
            if (!success)
            {
                if (error == "earlyFinishMinGames")
                    return Results.BadRequest(new { error = "earlyFinishMinGames" });
                return Results.Forbid();
            }

            await hub.Clients.Group($"tournament-{id}").SendAsync("StopRecording", -1);
            await hub.Clients.Group($"tournament-{id}").SendAsync("TournamentFinished", id);
            await auditLogService.Log(playerId, "early_finish_tournament", $"tournamentId={id}");

            return Results.Ok();
        });

        group.MapDelete("/{id}/permanent", async (int id, TournamentService tournamentService, HttpContext httpContext, PadelDbContext db, AuditLogService auditLogService) =>
        {
            if (!await EndpointHelpers.IsAdmin(httpContext, db))
                return Results.Forbid();

            var playerId = EndpointHelpers.GetPlayerId(httpContext);
            var success = await tournamentService.DeleteTournamentPermanent(id);
            if (success)
                await auditLogService.Log(playerId, "delete_tournament", $"tournamentId={id}");
            return success ? Results.NoContent() : Results.NotFound();
        });

        group.MapPut("/{id}/start-game", async (int id, TournamentService tournamentService,
            IHubContext<TournamentHub> hub, HttpContext httpContext, PadelDbContext db, AuditLogService auditLogService) =>
        {
            var playerIdStr = httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (playerIdStr is null || !int.TryParse(playerIdStr, out var playerId))
                return Results.Unauthorized();

            var tournament = await db.Tournaments
                .Include(t => t.Matches.OrderBy(m => m.MatchOrder))
                .FirstOrDefaultAsync(t => t.Id == id);
            if (tournament is null)
                return Results.NotFound();

            var isAdmin = await EndpointHelpers.IsAdmin(httpContext, db);
            if (!isAdmin && tournament.HostPlayerId != playerId)
                return Results.Forbid();

            if (!tournament.HasVideoMode || tournament.IsGameStarted)
                return Results.BadRequest(new { error = "Game already started or no video mode" });

            tournament.IsGameStarted = true;
            var firstMatch = tournament.Matches.FirstOrDefault();
            if (firstMatch is not null)
                firstMatch.StartedAt = DateTime.UtcNow;

            await db.SaveChangesAsync();

            await hub.Clients.Group($"tournament-{id}").SendAsync("GameStarted", id);

            await auditLogService.Log(playerId, "start_game", $"tournamentId={id}");

            return Results.Ok();
        });

        group.MapDelete("/{id}", async (int id, TournamentService tournamentService,
            IHubContext<TournamentHub> hub, HttpContext httpContext, PadelDbContext db, AuditLogService auditLogService) =>
        {
            var playerIdStr = httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (playerIdStr is null || !int.TryParse(playerIdStr, out var playerId))
                return Results.Unauthorized();

            var success = await tournamentService.CancelTournament(id, playerId, await EndpointHelpers.IsAdmin(httpContext, db));
            if (!success)
                return Results.Forbid();

            await hub.Clients.Group($"tournament-{id}").SendAsync("TournamentCancelled", id);
            await auditLogService.Log(playerId, "cancel_tournament", $"tournamentId={id}");

            return Results.NoContent();
        });
    }
}
