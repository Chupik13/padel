using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using padel.Models;

namespace padel.Endpoints;

public static class EndpointHelpers
{
    public static async Task<int?> GetPlayerClubId(HttpContext httpContext, PadelDbContext db)
    {
        var playerIdStr = httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (playerIdStr is null || !int.TryParse(playerIdStr, out var playerId))
            return null;

        var player = await db.Players.FirstOrDefaultAsync(p => p.Id == playerId);
        return player?.ClubId;
    }

    public static int? GetPlayerId(HttpContext httpContext)
    {
        var playerIdStr = httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (playerIdStr is null || !int.TryParse(playerIdStr, out var playerId))
            return null;
        return playerId;
    }
}
