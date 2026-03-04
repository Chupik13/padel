using System.Security.Claims;
using padel.Services;

namespace padel.Endpoints;

public static class ClubEndpoints
{
    public static void MapClubEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/clubs").RequireAuthorization();

        group.MapGet("/", async (ClubService clubService) =>
        {
            var result = await clubService.GetAll();
            return Results.Ok(result);
        });

        group.MapGet("/my", async (ClubService clubService, HttpContext httpContext) =>
        {
            var playerIdStr = httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (playerIdStr is null || !int.TryParse(playerIdStr, out var playerId))
                return Results.Unauthorized();

            var result = await clubService.GetMyClub(playerId);
            return result is null ? Results.NoContent() : Results.Ok(result);
        });

        group.MapPost("/", async (CreateClubRequest request, ClubService clubService, HttpContext httpContext) =>
        {
            var playerIdStr = httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (playerIdStr is null || !int.TryParse(playerIdStr, out var playerId))
                return Results.Unauthorized();

            var result = await clubService.Create(request.Name, playerId);
            return Results.Created($"/api/clubs/{result.Id}", result);
        });

        group.MapGet("/{id:int}/members", async (int id, PlayerService playerService) =>
        {
            var result = await playerService.GetAllUsers(id);
            return Results.Ok(result);
        });

        group.MapPost("/{id:int}/join", async (int id, ClubService clubService, HttpContext httpContext) =>
        {
            var playerIdStr = httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (playerIdStr is null || !int.TryParse(playerIdStr, out var playerId))
                return Results.Unauthorized();

            var success = await clubService.Join(playerId, id);
            return success ? Results.Ok() : Results.BadRequest();
        });

        group.MapPost("/leave", async (ClubService clubService, HttpContext httpContext) =>
        {
            var playerIdStr = httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (playerIdStr is null || !int.TryParse(playerIdStr, out var playerId))
                return Results.Unauthorized();

            var success = await clubService.Leave(playerId);
            return success ? Results.Ok() : Results.BadRequest();
        });
    }
}

public record CreateClubRequest(string Name);
