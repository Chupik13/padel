using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using padel.Models;
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

            var result = await clubService.GetMyClubs(playerId);
            return Results.Ok(result);
        });

        group.MapPost("/", async (CreateClubRequest request, ClubService clubService, HttpContext httpContext, AuditLogService auditLogService) =>
        {
            var playerIdStr = httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (playerIdStr is null || !int.TryParse(playerIdStr, out var playerId))
                return Results.Unauthorized();

            var result = await clubService.Create(request.Name, playerId);
            await auditLogService.Log(playerId, "create_club", $"club={request.Name}");
            return Results.Created($"/api/clubs/{result.Id}", result);
        });

        group.MapGet("/{id:int}/members", async (int id, PlayerService playerService) =>
        {
            var result = await playerService.GetAllUsers(id);
            return Results.Ok(result);
        });

        group.MapPost("/{id:int}/join", async (int id, ClubService clubService, HttpContext httpContext, AuditLogService auditLogService) =>
        {
            var playerIdStr = httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (playerIdStr is null || !int.TryParse(playerIdStr, out var playerId))
                return Results.Unauthorized();

            var success = await clubService.Join(playerId, id);
            if (success)
                await auditLogService.Log(playerId, "join_club", $"clubId={id}");
            return success ? Results.Ok() : Results.BadRequest();
        });

        group.MapPost("/{id:int}/leave", async (int id, ClubService clubService, HttpContext httpContext, AuditLogService auditLogService) =>
        {
            var playerIdStr = httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (playerIdStr is null || !int.TryParse(playerIdStr, out var playerId))
                return Results.Unauthorized();

            var success = await clubService.Leave(playerId, id);
            if (success)
                await auditLogService.Log(playerId, "leave_club", $"clubId={id}");
            return success ? Results.Ok() : Results.BadRequest();
        });

        group.MapPut("/{id:int}/primary", async (int id, ClubService clubService, HttpContext httpContext, AuditLogService auditLogService) =>
        {
            var playerIdStr = httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (playerIdStr is null || !int.TryParse(playerIdStr, out var playerId))
                return Results.Unauthorized();

            var success = await clubService.SetPrimaryClub(playerId, id);
            if (success)
                await auditLogService.Log(playerId, "set_primary_club", $"clubId={id}");
            return success ? Results.Ok() : Results.BadRequest();
        });

        group.MapPost("/{id:int}/archive", async (int id, ClubService clubService, HttpContext httpContext, PadelDbContext db, AuditLogService auditLogService) =>
        {
            var playerIdStr = httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (playerIdStr is null || !int.TryParse(playerIdStr, out var playerId))
                return Results.Unauthorized();

            var (success, error) = await clubService.Archive(playerId, id, await EndpointHelpers.IsAdmin(httpContext, db));
            if (!success)
            {
                return error switch
                {
                    "not_found" => Results.NotFound(),
                    "forbidden" => Results.Forbid(),
                    "has_unfinished" => Results.BadRequest("Club has unfinished tournaments"),
                    _ => Results.BadRequest()
                };
            }
            await auditLogService.Log(playerId, "archive_club", $"clubId={id}");
            return Results.Ok();
        });

        group.MapPost("/{id:int}/avatar", async (int id, IFormFile file, HttpContext httpContext, PadelDbContext db, AvatarService avatarService, AuditLogService auditLogService) =>
        {
            var playerIdStr = httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (playerIdStr is null || !int.TryParse(playerIdStr, out var playerId))
                return Results.Unauthorized();

            var isMember = await db.PlayerClubs.AnyAsync(pc => pc.PlayerId == playerId && pc.ClubId == id);
            if (!isMember) return Results.Forbid();

            var club = await db.Clubs.FindAsync(id);
            if (club is null) return Results.NotFound();

            await using var stream = file.OpenReadStream();
            club.ImageUrl = await avatarService.ProcessAndSaveClubAvatar(stream, id);
            await db.SaveChangesAsync();

            await auditLogService.Log(playerId, "upload_club_avatar", $"clubId={id}");
            return Results.Ok();
        }).DisableAntiforgery();
    }
}

public record CreateClubRequest(string Name);
