using System.Security.Claims;
using padel.Dtos.Requests;
using padel.Services;

namespace padel.Endpoints;

public static class SeasonEndpoints
{
    public static void MapSeasonEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/seasons").RequireAuthorization();

        group.MapGet("/", async (SeasonService seasonService) =>
        {
            var result = await seasonService.GetSeasons();
            return Results.Ok(result);
        });

        group.MapGet("/{id:int}", async (int id, SeasonService seasonService) =>
        {
            var result = await seasonService.GetSeason(id);
            return result is null ? Results.NotFound() : Results.Ok(result);
        });

        group.MapPost("/{id:int}/supergame", async (int id, CreateSuperGameRequest request,
            SeasonService seasonService, HttpContext httpContext) =>
        {
            var playerIdStr = httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (playerIdStr is null || !int.TryParse(playerIdStr, out var playerId))
                return Results.Unauthorized();
            var result = await seasonService.CreateSuperGame(id, playerId, request);
            return result is null ? Results.BadRequest() : Results.Created($"/api/tournaments/{result.Id}", result);
        });
    }
}
