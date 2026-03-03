using System.Security.Claims;
using Microsoft.AspNetCore.SignalR;
using padel.Dtos.Requests;
using padel.Hubs;
using padel.Services;

namespace padel.Endpoints;

public static class TournamentEndpoints
{
    public static void MapTournamentEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/tournaments").RequireAuthorization();

        group.MapGet("/", async (int? seasonId, int? playerId, bool? isBalanced, bool? inSeason, TournamentService tournamentService) =>
        {
            var request = new GetTournamentsRequest
            {
                SeasonId = seasonId,
                PlayerId = playerId,
                IsBalanced = isBalanced,
                InSeason = inSeason
            };
            var result = await tournamentService.GetTournaments(request);
            return Results.Ok(result);
        });

        group.MapPost("/", async (SaveTournamentRequest request, TournamentService tournamentService) =>
        {
            var result = await tournamentService.SaveTournament(request);
            return Results.Created($"/api/tournaments/{result.Id}", result);
        });

        group.MapPost("/live", async (CreateLiveTournamentRequest request, TournamentService tournamentService, HttpContext httpContext) =>
        {
            var playerIdStr = httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (playerIdStr is null || !int.TryParse(playerIdStr, out var playerId))
                return Results.Unauthorized();

            var result = await tournamentService.CreateLiveTournament(playerId, request);
            return Results.Created($"/api/tournaments/{result.Id}", result);
        });

        group.MapGet("/active", async (TournamentService tournamentService, HttpContext httpContext) =>
        {
            var playerIdStr = httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (playerIdStr is null || !int.TryParse(playerIdStr, out var playerId))
                return Results.Unauthorized();

            var result = await tournamentService.GetActiveTournament(playerId);
            return result is null ? Results.NoContent() : Results.Ok(result);
        });

        group.MapPut("/{id}/score", async (int id, UpdateScoreRequest request, TournamentService tournamentService,
            IHubContext<TournamentHub> hub, HttpContext httpContext) =>
        {
            var playerIdStr = httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (playerIdStr is null || !int.TryParse(playerIdStr, out var playerId))
                return Results.Unauthorized();

            var result = await tournamentService.UpdateMatchScore(id, playerId, request);
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

            var success = await tournamentService.NavigateMatch(id, playerId, request.MatchIndex);
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

            var success = await tournamentService.FinishTournament(id, playerId);
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

            var success = await tournamentService.EarlyFinishTournament(id, playerId);
            if (!success)
                return Results.Forbid();

            await hub.Clients.Group($"tournament-{id}").SendAsync("TournamentFinished", id);

            return Results.Ok();
        });

        group.MapDelete("/{id}", async (int id, TournamentService tournamentService,
            IHubContext<TournamentHub> hub, HttpContext httpContext) =>
        {
            var playerIdStr = httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (playerIdStr is null || !int.TryParse(playerIdStr, out var playerId))
                return Results.Unauthorized();

            var success = await tournamentService.CancelTournament(id, playerId);
            if (!success)
                return Results.Forbid();

            await hub.Clients.Group($"tournament-{id}").SendAsync("TournamentCancelled", id);

            return Results.NoContent();
        });
    }
}
