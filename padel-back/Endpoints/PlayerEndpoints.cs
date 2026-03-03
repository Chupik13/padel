using padel.Services;

namespace padel.Endpoints;

public static class PlayerEndpoints
{
    public static void MapPlayerEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/players").RequireAuthorization();

        group.MapGet("/", async (PlayerService playerService) =>
        {
            var result = await playerService.GetAllUsers();
            return Results.Ok(result);
        });

        group.MapGet("/leaderboard", async (PlayerService playerService) =>
        {
            var result = await playerService.GetGlobalLeaderboard();
            return Results.Ok(result);
        });
    }
}
