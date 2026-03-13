using System.Security.Claims;
using Microsoft.AspNetCore.SignalR;
using padel.Dtos.Requests;
using padel.Hubs;
using padel.Models;
using padel.Services;

namespace padel.Endpoints;

public static class TournamentEndpoints
{
    private const string AdminLogin = "t224215";

    private static bool IsAdmin(HttpContext httpContext) =>
        httpContext.User.FindFirstValue(ClaimTypes.Name) == AdminLogin;

    public static void MapTournamentEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/tournaments").RequireAuthorization();

        group.MapGet("/", async (int? seasonId, int? playerId, bool? isBalanced, bool? inSeason, bool? includeCancelled, TournamentService tournamentService, HttpContext httpContext, PadelDbContext db) =>
        {
            var clubId = await EndpointHelpers.GetPlayerClubId(httpContext, db);
            var request = new GetTournamentsRequest
            {
                SeasonId = seasonId,
                PlayerId = playerId,
                IsBalanced = isBalanced,
                InSeason = inSeason,
                ClubId = clubId,
                IncludeCancelled = includeCancelled
            };
            var result = await tournamentService.GetTournaments(request);
            return Results.Ok(result);
        });

        group.MapPost("/", async (SaveTournamentRequest request, TournamentService tournamentService, HttpContext httpContext, PadelDbContext db) =>
        {
            var clubId = await EndpointHelpers.GetPlayerClubId(httpContext, db);
            var result = await tournamentService.SaveTournament(request, clubId);
            return Results.Created($"/api/tournaments/{result.Id}", result);
        });

        group.MapPost("/live", async (CreateLiveTournamentRequest request, TournamentService tournamentService, HttpContext httpContext, PadelDbContext db) =>
        {
            var playerIdStr = httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (playerIdStr is null || !int.TryParse(playerIdStr, out var playerId))
                return Results.Unauthorized();

            var clubId = await EndpointHelpers.GetPlayerClubId(httpContext, db);
            var result = await tournamentService.CreateLiveTournament(playerId, request, clubId);
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
            var result = await tournamentService.GetUnfinishedTournaments(playerId, IsAdmin(httpContext), clubId);
            return Results.Ok(result);
        });

        group.MapPut("/{id}/score", async (int id, UpdateScoreRequest request, TournamentService tournamentService,
            IHubContext<TournamentHub> hub, HttpContext httpContext) =>
        {
            var playerIdStr = httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (playerIdStr is null || !int.TryParse(playerIdStr, out var playerId))
                return Results.Unauthorized();

            var result = await tournamentService.UpdateMatchScore(id, playerId, request, IsAdmin(httpContext));
            if (result is null)
                return Results.Forbid();

            await hub.Clients.Group($"tournament-{id}").SendAsync("ScoreUpdated",
                id, request.MatchIndex, request.TeamOneScore, request.TeamTwoScore);

            return Results.Ok(result);
        });

        group.MapPut("/{id}/navigate", async (int id, NavigateRequest request, TournamentService tournamentService,
            IHubContext<TournamentHub> hub, HttpContext httpContext) =>
        {
            var playerIdStr = httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (playerIdStr is null || !int.TryParse(playerIdStr, out var playerId))
                return Results.Unauthorized();

            var success = await tournamentService.NavigateMatch(id, playerId, request.MatchIndex, IsAdmin(httpContext));
            if (!success)
                return Results.Forbid();

            await hub.Clients.Group($"tournament-{id}").SendAsync("MatchNavigated", id, request.MatchIndex);

            return Results.Ok();
        });

        group.MapPut("/{id}/finish", async (int id, TournamentService tournamentService,
            IHubContext<TournamentHub> hub, HttpContext httpContext) =>
        {
            var playerIdStr = httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (playerIdStr is null || !int.TryParse(playerIdStr, out var playerId))
                return Results.Unauthorized();

            var success = await tournamentService.FinishTournament(id, playerId, IsAdmin(httpContext));
            if (!success)
                return Results.Forbid();

            await hub.Clients.Group($"tournament-{id}").SendAsync("TournamentFinished", id);

            return Results.Ok();
        });

        group.MapPut("/{id}/early-finish", async (int id, TournamentService tournamentService,
            IHubContext<TournamentHub> hub, HttpContext httpContext) =>
        {
            var playerIdStr = httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (playerIdStr is null || !int.TryParse(playerIdStr, out var playerId))
                return Results.Unauthorized();

            var (success, error) = await tournamentService.EarlyFinishTournament(id, playerId, IsAdmin(httpContext));
            if (!success)
            {
                if (error == "earlyFinishMinGames")
                    return Results.BadRequest(new { error = "earlyFinishMinGames" });
                return Results.Forbid();
            }

            await hub.Clients.Group($"tournament-{id}").SendAsync("TournamentFinished", id);

            return Results.Ok();
        });

        group.MapDelete("/{id}/permanent", async (int id, TournamentService tournamentService, HttpContext httpContext) =>
        {
            if (!IsAdmin(httpContext))
                return Results.Forbid();

            var success = await tournamentService.DeleteTournamentPermanent(id);
            return success ? Results.NoContent() : Results.NotFound();
        });

        group.MapDelete("/{id}", async (int id, TournamentService tournamentService,
            IHubContext<TournamentHub> hub, HttpContext httpContext) =>
        {
            var playerIdStr = httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (playerIdStr is null || !int.TryParse(playerIdStr, out var playerId))
                return Results.Unauthorized();

            var success = await tournamentService.CancelTournament(id, playerId, IsAdmin(httpContext));
            if (!success)
                return Results.Forbid();

            await hub.Clients.Group($"tournament-{id}").SendAsync("TournamentCancelled", id);

            return Results.NoContent();
        });
    }
}
